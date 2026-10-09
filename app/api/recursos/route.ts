import { NextRequest } from "next/server"
import { getDb } from "@/lib/db"
import { ResourcePatchSchema, ResourceCreateSchema } from "@/lib/validation"
import { apiSuccess, apiError, apiValidationError } from "@/lib/services/api-response"
import { calculateEstado } from "@/lib/resource-helpers"
import type { DbResource } from "@/lib/types"

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

    if (estado === "dispatched") {
      if (cantidad !== undefined || cantidad_disponible !== undefined) return apiValidationError("El despacho y la edición de cantidades requieren acciones separadas")
      if (!incidente_id) return apiValidationError("Se requiere un incidente para despachar el recurso")
      const incident = await db.findIncidentById(incidente_id)
      if (!incident) return apiValidationError("El incidente no existe")
    }

    const updatePayload: Partial<DbResource> = { updated_at: new Date().toISOString() }
    if (estado !== undefined) updatePayload.estado = estado
    if (incidente_id !== undefined) updatePayload.incidente_id = incidente_id
    if (nombre !== undefined) updatePayload.nombre = nombre
    if (tipo !== undefined) updatePayload.tipo = tipo
    if (ubicacion !== undefined) updatePayload.ubicacion = ubicacion
    if (cantidad !== undefined) updatePayload.cantidad = cantidad

    if (cantidad_disponible !== undefined || cantidad !== undefined) {
      const current = await db.findResourceById(id)
      const total = cantidad ?? current?.cantidad ?? 1
      const disp = cantidad_disponible !== undefined
        ? cantidad_disponible
        : Math.min(current?.cantidad_disponible ?? total, total)
      updatePayload.cantidad_disponible = Math.max(0, Math.min(total, disp))
      updatePayload.estado = calculateEstado(total, updatePayload.cantidad_disponible)
    }

    // Compare-and-set prevents two operators from claiming the same row.
    const data = await db.updateResource(id, updatePayload, estado === "dispatched" ? { requireEstado: "available" } : undefined)

    if (!data) return apiError("El recurso ya no está disponible o no existe. Actualizá la selección.", 409)
    return apiSuccess(data)
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Error interno")
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = new URL(request.url).searchParams.get("id")
    if (!id) return apiValidationError("ID de recurso requerido")

    const db = await getDb()
    const data = await db.updateResource(id, { estado: "retired", updated_at: new Date().toISOString() })
    if (!data) return apiError("El recurso no existe", 404)
    return apiSuccess(data)
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Error interno")
  }
}
