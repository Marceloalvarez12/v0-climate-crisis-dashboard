import { getDb, type DataStore } from "@/lib/db"
import { CONFIG } from "@/lib/config"
import { buildRespawnIncident, RESPAWN_ZONES } from "@/lib/mock-data"
import { getConfigNumber } from "@/lib/services/config-service"
import { isSimulatedIncident as isSimulated, type DbIncident } from "@/lib/types"

// ---------------------------------------------------------------------------
// Simulación server-side: mantiene hasta MAX_ACTIVE_SIMULATED incidentes
// simulados activos y, pasado su tiempo de vida sin atención, los pasa al
// historial como "pendientes de confirmación". Corre de forma perezosa en los
// GET que el dashboard ya consulta (throttled por proceso), sin depender del
// panel ?dev=true ni de que haya una pestaña abierta haciendo de "cron".
// Sólo toca filas con fuente_detalles.simulated === true.
// ---------------------------------------------------------------------------

interface SimulationState {
  lastTickAt: number
  lastSpawnAt: number
  running: Promise<void> | null
}

declare global {
  var __zntinelSimulationState: SimulationState | undefined
}

const state: SimulationState = globalThis.__zntinelSimulationState ?? { lastTickAt: 0, lastSpawnAt: 0, running: null }
globalThis.__zntinelSimulationState = state

/** Memoria: siempre. Supabase: sólo con SIMULATION_AUTOSPAWN=true para no ensuciar una base real. */
function spawnEnabled(db: DataStore): boolean {
  return db.mode === "memory" || process.env.SIMULATION_AUTOSPAWN === "true"
}

/** Vida aleatoria (±40%) para que los incidentes no se resuelvan todos juntos. */
function randomLifetimeMs(minutes: number): number {
  return Math.round(minutes * 60_000 * (0.6 + Math.random() * 0.8))
}

export function simulatedLifecycleDetails(minutes: number, from = Date.now()) {
  return { simulated: true, auto_spawned: true, auto_resolve_at: new Date(from + randomLifetimeMs(minutes)).toISOString() }
}

/** Pasa al historial (pendiente de confirmación) los simulados activos vencidos. */
export async function resolveExpiredSimulated(): Promise<DbIncident[]> {
  const db = await getDb()
  const minutes = await getConfigNumber("auto_resolve_minutes", CONFIG.SIMULATION.DEFAULT_LIFETIME_MINUTES)
  const now = Date.now()
  const fallbackCutoff = now - minutes * 60_000
  const active = await db.listIncidents({ estado: "activo" })

  const expired = active.filter((i) => {
    if (!isSimulated(i)) return false
    const at = i.fuente_detalles.auto_resolve_at
    return typeof at === "string" ? Date.parse(at) <= now : Date.parse(i.updated_at) <= fallbackCutoff
  })

  const resolvedAt = new Date(now).toISOString()
  const updated = await Promise.all(expired.map((i) => db.updateIncident(i.id, {
    estado: "atendido",
    fuente_detalles: { ...i.fuente_detalles, auto_resolved: true, auto_resolved_at: resolvedAt, pending_confirmation: true },
  })))
  return updated.filter((i): i is DbIncident => i !== null)
}

async function spawnSimulated(db: DataStore, active: DbIncident[]): Promise<void> {
  const now = Date.now()
  const simulatedActive = active.filter(isSimulated).length
  if (simulatedActive >= CONFIG.SIMULATION.MAX_ACTIVE_SIMULATED) return
  if (now - state.lastSpawnAt < CONFIG.SIMULATION.SPAWN_INTERVAL_MS) return

  const taken = new Set(active.map((i) => i.ubicacion))
  const free = RESPAWN_ZONES.map((_, idx) => idx).filter((idx) => !taken.has(RESPAWN_ZONES[idx].nombre))
  if (free.length === 0) return

  const minutes = await getConfigNumber("auto_resolve_minutes", CONFIG.SIMULATION.DEFAULT_LIFETIME_MINUTES)
  const base = buildRespawnIncident({ zonaIndex: free[Math.floor(Math.random() * free.length)] })
  // Sin clave Arkiv falsa: el sello on-chain recién existe al confirmar.
  const details = { ...base.fuente_detalles }
  const analysis = { ...(details.ai_analysis as Record<string, unknown> | undefined) }
  delete details.arkiv_entity_key
  delete analysis.arkiv_entity_key
  const iso = new Date(now).toISOString()

  state.lastSpawnAt = now
  await db.insertIncident({
    ...base,
    latitud: base.latitud + (Math.random() - 0.5) * 0.004,
    longitud: base.longitud + (Math.random() - 0.5) * 0.004,
    fuente_detalles: { ...details, ai_analysis: analysis, ...simulatedLifecycleDetails(minutes, now) },
    created_at: iso,
    updated_at: iso,
  })
}

async function tick(): Promise<void> {
  const db = await getDb()
  await resolveExpiredSimulated()
  if (!spawnEnabled(db)) return
  await spawnSimulated(db, await db.listIncidents({ estado: "activo" }))
}

/** Throttled: como mucho un tick cada TICK_INTERVAL_MS por proceso. Nunca rompe la lectura que lo invoca. */
export async function runSimulationTick(): Promise<void> {
  const now = Date.now()
  if (state.running) return state.running
  if (now - state.lastTickAt < CONFIG.SIMULATION.TICK_INTERVAL_MS) return
  state.lastTickAt = now
  state.running = tick()
    .catch((err) => console.warn("[simulation] tick failed:", err))
    .finally(() => { state.running = null })
  return state.running
}
