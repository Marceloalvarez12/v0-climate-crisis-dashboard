import { getDb } from "@/lib/db"
import { requireStaff } from "@/lib/auth"
import { apiSuccess, apiError } from "@/lib/services/api-response"

export async function GET() {
  try { await requireStaff() } catch { return apiError("No autorizado", 401) }
  try {
    const data = await (await getDb()).listAgentEvents(40)
    return apiSuccess(data)
  } catch {
    return apiError("Registros del agente no disponibles", 503)
  }
}

export async function POST() {
  return apiError("Los eventos se registran desde los servicios del agente", 405)
}
