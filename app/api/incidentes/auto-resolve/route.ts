import { apiSuccess, apiError } from "@/lib/services/api-response"
import { resolveExpiredSimulated } from "@/lib/services/simulation-service"

export async function POST() {
  try {
    const updated = await resolveExpiredSimulated()

    return apiSuccess({
      resolved: updated.length,
      locations: updated.map(i => i.ubicacion),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return apiError(message)
  }
}
