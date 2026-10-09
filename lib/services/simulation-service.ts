import { getDb } from "@/lib/db"
import { CONFIG } from "@/lib/config"
import { getConfigNumber } from "@/lib/services/config-service"
import { isSimulatedIncident, type DbIncident } from "@/lib/types"

/**
 * Mantenimiento de desarrollo: pasa al historial (pendiente de confirmación)
 * los incidentes simulados (posts del panel ?dev=true) activos sin atención
 * por más de `auto_resolve_minutes`. Nunca toca reportes reales.
 */
export async function resolveExpiredSimulated(): Promise<DbIncident[]> {
  const db = await getDb()
  const minutes = await getConfigNumber("auto_resolve_minutes", CONFIG.SIMULATION.DEFAULT_LIFETIME_MINUTES)
  const cutoff = Date.now() - minutes * 60_000
  const active = await db.listIncidents({ estado: "activo" })
  const expired = active.filter((i) => isSimulatedIncident(i) && Date.parse(i.updated_at) <= cutoff)

  const resolvedAt = new Date().toISOString()
  const updated = await Promise.all(expired.map((i) => db.updateIncident(i.id, {
    estado: "atendido",
    fuente_detalles: { ...i.fuente_detalles, auto_resolved: true, auto_resolved_at: resolvedAt, pending_confirmation: true },
  })))
  return updated.filter((i): i is DbIncident => i !== null)
}
