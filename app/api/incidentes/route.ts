import { NextRequest } from "next/server"
import { IncidentService } from "@/lib/services/incident-service"
import { apiSuccess, apiError, apiValidationError } from "@/lib/services/api-response"
import { IncidentCreateSchema, IncidentPatchSchema } from "@/lib/validation"
import { requireStaff } from "@/lib/auth"
import { getDb } from "@/lib/db"
import { isNonReportIncident } from "@/lib/types"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const estado = searchParams.get("estado") || "activo"

    const data = estado === "atendido"
      ? await IncidentService.getAttendedIncidents()
      : await IncidentService.getActiveIncidents()

    return apiSuccess(data)
  } catch (err) {
    return apiError(String(err))
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const parsed = IncidentCreateSchema.safeParse(body)
    if (!parsed.success) {
      return apiValidationError(parsed.error.flatten())
    }

    const validatedBody = { ...parsed.data, fuente_detalles: parsed.data.fuente_detalles ?? {} }

    const existing = await IncidentService.findByLocation(validatedBody.ubicacion)

    if (existing) {
      if (existing.estado === "activo") {
        return apiSuccess(existing)
      }

      if (!(await IncidentService.canCreateMore())) {
        return apiSuccess({ skipped: true, reason: "max_active_reached" })
      }

      const updated = await IncidentService.update(existing.id, {
        ...validatedBody,
        estado: "activo",
      })
      return apiSuccess(updated)
    }

    if (!(await IncidentService.canCreateMore())) {
      return apiSuccess({ skipped: true, reason: "max_active_reached" })
    }

    const created = await IncidentService.create(validatedBody)
    return apiSuccess(created)
  } catch (err) {
    return apiError(String(err))
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()

    const parsed = IncidentPatchSchema.safeParse(body)
    if (!parsed.success) {
      return apiValidationError(parsed.error.flatten())
    }

    const { id, ...updates } = parsed.data
    const { user, profile } = await requireStaff()
    if (!["admin", "operador"].includes(profile.rol)) return apiError("Acceso denegado", 403)
    const incident = await IncidentService.findById(id)
    if (!incident || isNonReportIncident(incident)) return apiError("Incidente no encontrado", 404)
    if (updates.estado === "atendido") {
      const assigned = await (await getDb()).listIncidentResources(id)
      if (assigned.some(r => ["busy", "dispatched"].includes(r.estado))) return apiError("Confirmá la liberación de los recursos antes de finalizar la atención", 409)
      const updated = await IncidentService.update(id, { ...updates, fuente_detalles: { ...incident.fuente_detalles, resolved_at: new Date().toISOString(), resolved_by: user.id } })
      return apiSuccess(updated)
    }
    const updated = await IncidentService.update(id, updates)
    return apiSuccess(updated)
  } catch (err) {
    return apiError(String(err))
  }
}

export async function DELETE(request: NextRequest) {
  try { await requireStaff("admin") } catch { return apiError("Acceso denegado", 403) }
  try {
    const body = await request.json()
    const { id } = body

    if (id) {
      await IncidentService.deleteById(id)
      return apiSuccess({ deleted: id })
    }

    return apiValidationError({ formErrors: ["Se requiere el ID del incidente"], fieldErrors: {} })
  } catch (err) {
    return apiError(String(err))
  }
}
