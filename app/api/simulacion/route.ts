import { demoAction, demoStatus } from "@/lib/services/demo-simulation"
import { apiError, apiSuccess } from "@/lib/services/api-response"

export const dynamic = "force-dynamic"
export async function GET() {
  try { return apiSuccess(await demoStatus()) }
  catch { return apiError("No se pudo iniciar el monitoreo. Se intentará nuevamente.", 503) }
}
export async function POST(request: Request) {
  try {
    const { action } = await request.json()
    if (!["reset", "spawn"].includes(action)) return apiError("Acción desconocida", 400)
    return apiSuccess(await demoAction(action))
  } catch (error) { return apiError(error instanceof Error ? error.message : "No se pudo actualizar la simulación", 400) }
}
