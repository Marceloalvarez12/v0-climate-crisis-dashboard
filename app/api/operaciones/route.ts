import { requireStaff } from "@/lib/auth"
import { getDb } from "@/lib/db"
import { isNonReportIncident } from "@/lib/types"
import { apiError, apiSuccess } from "@/lib/services/api-response"

export async function GET() {
  try { await requireStaff() } catch { return apiError("No autorizado", 401) }
  try {
    const db = await getDb()
    const [incidents, resources] = await Promise.all([db.listIncidents({ limit: 50 }), db.listResources()])
    const status: Record<string, string> = { available: "disponible", dispatched: "en camino", busy: "en atención" }
    const events = [
      ...incidents.filter(i => !isNonReportIncident(i)).map(i => ({ id: `incident:${i.id}`, at: i.updated_at || i.created_at,
        message: `${i.ubicacion}: ${i.estado === "atendido" ? "atención finalizada" : "incidente recibido / en seguimiento"}`,
        source: ({ citizen: "Reporte ciudadano", social: "Reporte social", sensor: "Fuente oficial", camera: "Cámara" } as Record<string, string>)[i.fuente] ?? i.fuente,
        responsible: typeof i.fuente_detalles?.resolved_by === "string" ? i.fuente_detalles.resolved_by : undefined })),
      ...resources.map(r => ({ id: `resource:${r.id}`, at: r.updated_at, message: `${r.nombre}: ${status[r.estado] ?? r.estado}`, source: "Registro de recursos" })),
    ].filter(e => e.at && Number.isFinite(Date.parse(e.at))).sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 25)
    return apiSuccess({ events })
  } catch { return apiError("Actividad operativa temporalmente no disponible", 503) }
}
