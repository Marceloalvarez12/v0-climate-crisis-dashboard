import { NextRequest } from "next/server"
import { getDb } from "@/lib/db"
import { ResourcePatchSchema, ResourceCreateSchema } from "@/lib/validation"
import { apiSuccess, apiError, apiValidationError } from "@/lib/services/api-response"
import { calculateEstado } from "@/lib/resource-helpers"
import type { DbResource } from "@/lib/types"
import { isNonReportIncident } from "@/lib/types"
import { requireStaff } from "@/lib/auth"

export async function GET() {
  try {
    const db = await getDb()
    const data = await db.listResources()
    const resources = data.map(r => ({
      ...r,
      cantidad: r.cantidad ?? 1,
      cantidad_disponible: r.cantidad_disponible ?? (r.cantidad ?? 1),
    }))
    return apiSuccess(resources)
  } catch (err) {
    return apiError(String(err))
  }
}

export async function POST(request: NextRequest) {
  try { await requireStaff("admin") } catch { return apiError("Acceso denegado", 403) }
  try {
    const parsed = ResourceCreateSchema.safeParse(await request.json())
    if (!parsed.success) return apiValidationError(parsed.error.flatten())

    const db = await getDb()
    const { nombre, tipo, cantidad, ubicacion } = parsed.data
    const data = await db.insertResource({
      nombre, tipo, cantidad, cantidad_disponible: cantidad, ubicacion,
      estado: "available",
      incidente_id: null,
      updated_at: new Date().toISOString(),
    })
    return apiSuccess({ ...data, cantidad: data.cantidad ?? 1, cantidad_disponible: data.cantidad_disponible ?? 1 })
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Error interno")
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = ResourcePatchSchema.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error.flatten())

    const db = await getDb()
    const { id, estado, incidente_id, nombre, tipo, cantidad, cantidad_disponible, ubicacion } = parsed.data
    const editing = nombre !== undefined || tipo !== undefined || cantidad !== undefined || ubicacion !== undefined || estado === "retired"
    try {
      const { profile } = await requireStaff(editing ? "admin" : undefined)
      if (!editing && !["admin", "operador"].includes(profile.rol)) return apiError("Acceso denegado", 403)
    } catch { return apiError("Acceso denegado", 403) }
    const currentResource = await db.findResourceById(id)
    if (!currentResource) return apiError("El recurso no existe", 404)
    if (estado && (cantidad !== undefined || cantidad_disponible !== undefined)) return apiValidationError("El estado y las cantidades requieren acciones separadas")
    if (currentResource.estado === "retired") return apiError("El recurso está retirado", 409)
    if (estado === "busy" && currentResource.estado !== "dispatched") return apiError("Solo se confirma la llegada de un recurso en camino", 409)
    if (estado === "retired" && currentResource.estado !== "available") return apiError("Liberá el recurso antes de retirarlo", 409)
    if (incidente_id !== undefined && estado !== "dispatched" && incidente_id !== currentResource.incidente_id && !(estado === "available" && incidente_id === null)) return apiValidationError("Usá una acción de despacho para cambiar la asignación")

    if (estado === "dispatched") {
      if (cantidad !== undefined || cantidad_disponible !== undefined) return apiValidationError("El despacho y la edición de cantidades requieren acciones separadas")
      if (!incidente_id) return apiValidationError("Se requiere un incidente para despachar el recurso")
      const incident = await db.findIncidentById(incidente_id)
      if (!incident || isNonReportIncident(incident) || incident.estado !== "activo") return apiValidationError("El incidente no existe o ya está cerrado")
    }

    const updatePayload: Partial<DbResource> = { updated_at: new Date().toISOString() }
    if (estado !== undefined) updatePayload.estado = estado
    if (incidente_id !== undefined) updatePayload.incidente_id = incidente_id
    if (nombre !== undefined) updatePayload.nombre = nombre
    if (tipo !== undefined) updatePayload.tipo = tipo
    if (ubicacion !== undefined) updatePayload.ubicacion = ubicacion
    if (cantidad !== undefined) updatePayload.cantidad = cantidad
    if (estado === "busy" && !currentResource.incidente_id) return apiValidationError("El recurso no tiene un incidente asignado")
    if (estado === "available") updatePayload.incidente_id = null
    if (estado === "dispatched" || estado === "busy") updatePayload.cantidad_disponible = 0
    if (estado === "available") updatePayload.cantidad_disponible = currentResource.cantidad ?? 1

    if (cantidad_disponible !== undefined || cantidad !== undefined) {
      if (currentResource.incidente_id && ((cantidad !== undefined && cantidad !== (currentResource.cantidad ?? 1)) || (cantidad_disponible !== undefined && cantidad_disponible > 0))) return apiError("Liberá el recurso antes de modificar sus cantidades", 409)
      const current = await db.findResourceById(id)
      const total = cantidad ?? current?.cantidad ?? 1
      const disp = cantidad_disponible !== undefined
        ? cantidad_disponible
        : Math.min(current?.cantidad_disponible ?? total, total)
      updatePayload.cantidad_disponible = Math.max(0, Math.min(total, disp))
      updatePayload.estado = calculateEstado(total, updatePayload.cantidad_disponible)
      if (currentResource.incidente_id) updatePayload.estado = currentResource.estado
    }

    // Compare-and-set prevents two operators from claiming the same row.
    const data = await db.updateResource(id, updatePayload, { requireEstado: estado === "dispatched" ? "available" : currentResource.estado })

    if (!data) return apiError("El recurso ya no está disponible o no existe. Actualizá la selección.", 409)
    return apiSuccess(data)
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Error interno")
  }
}

export async function DELETE(request: NextRequest) {
  try { await requireStaff("admin") } catch { return apiError("Acceso denegado", 403) }
  try {
    const id = new URL(request.url).searchParams.get("id")
    if (!id) return apiValidationError("ID de recurso requerido")

    const db = await getDb()
    const current = await db.findResourceById(id)
    if (!current) return apiError("El recurso no existe", 404)
    if (current.estado !== "available" || current.incidente_id) return apiError("Liberá el recurso antes de retirarlo", 409)
    const data = await db.updateResource(id, { estado: "retired", updated_at: new Date().toISOString() }, { requireEstado: "available" })
    if (!data) return apiError("El recurso no existe", 404)
    return apiSuccess(data)
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Error interno")
  }
}
