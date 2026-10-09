import { getDb } from "@/lib/db"
import { apiSuccess, apiError } from "@/lib/services/api-response"
import { getConfigNumber } from "@/lib/services/config-service"

export async function POST() {
  try {
    const db = await getDb()
    const minutes = await getConfigNumber("auto_resolve_minutes", 5)
    const cutoff = new Date(Date.now() - minutes * 60 * 1000).toISOString()

    const updated = await db.resolveStaleSimulated(cutoff)

    return apiSuccess({
      resolved: updated.length,
      locations: updated.map(i => i.ubicacion),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return apiError(message)
  }
}
