import { getDb } from "@/lib/db"
import { TUCUMAN_PLACES } from "@/lib/agents/tucuman-gazetteer"
import type { DataStore } from "@/lib/db"
import type { DbIncident } from "@/lib/types"

type Phase = "en_camino" | "trabajando" | "regresando"
type Assignment = { incidentId: string; resourceId: string; resourceName: string; location: string; phase: Phase; remaining: number }
type DemoEvent = { id: number; at: string; message: string; kind: "incident" | "dispatch" | "arrival" | "resolved" | "return" | "info" }
type DemoState = { running: boolean; clock: number; nextSpawn: number; assignments: Assignment[]; events: DemoEvent[]; sequence: number; timer?: ReturnType<typeof setInterval>; queue: Promise<void>; lastError: string | null; retryAt?: number; loaded?: boolean }

declare global { var __zntinelDemo: DemoState | undefined }
const state = globalThis.__zntinelDemo ??= { running: false, clock: Date.now(), nextSpawn: 0, assignments: [], events: [], sequence: 0, queue: Promise.resolve(), lastError: null }
const kinds = [
  { tipo: "flood", label: "Inundación", resource: "boat", text: "Una calle anegada dificulta el paso de vecinos." },
  { tipo: "fire", label: "Incendio", resource: "firefighter", text: "Se observa humo y fuego en la zona." },
  { tipo: "accident", label: "Accidente", resource: "ambulance", text: "Se reportan personas heridas en la vía pública." },
  { tipo: "storm", label: "Tormenta", resource: "firefighter", text: "El viento provocó caída de ramas y daños." },
  { tipo: "violence", label: "Emergencia de seguridad", resource: "police", text: "Vecinos solicitan asistencia de seguridad." },
] as const
const preferred: Record<string, string> = { flood: "boat", fire: "firefighter", accident: "ambulance", storm: "firefighter", violence: "police", looting: "police", general: "ambulance" }
const pick = <T,>(values: readonly T[]): T => values[Math.floor(Math.random() * values.length)]
function event(kind: DemoEvent["kind"], message: string) {
  state.events.unshift({ id: ++state.sequence, at: new Date().toISOString(), message, kind })
  state.events = state.events.slice(0, 30)
}
function serial<T>(action: () => Promise<T>): Promise<T> {
  const next = state.queue.then(action, action)
  state.queue = next.then(() => undefined, () => undefined)
  return next
}
async function loadState(db: DataStore) {
  if (state.loaded) return
  if (db.mode === "supabase") {
    const saved = await db.getConfig<Pick<DemoState, "running" | "nextSpawn" | "assignments" | "events" | "sequence">>("demo_simulation_state")
    if (saved && Array.isArray(saved.assignments) && Array.isArray(saved.events)) {
      state.running = saved.running === true; state.nextSpawn = saved.nextSpawn || 20
      state.assignments = saved.assignments; state.events = saved.events; state.sequence = saved.sequence || 0
    }
  }
  state.clock = Date.now(); state.loaded = true
}
async function saveState(db: DataStore) {
  if (db.mode === "supabase") await db.upsertConfig("demo_simulation_state", { running: state.running, nextSpawn: state.nextSpawn, assignments: state.assignments, events: state.events, sequence: state.sequence })
}
async function spawn(db: DataStore) {
  const active = await db.listIncidents({ estado: "activo" })
  if (active.length >= 6) return
  const places = TUCUMAN_PLACES.filter(p => !active.some(i => i.ubicacion === p.nombre))
  if (!places.length) return
  const place = pick(places), scenario = pick(kinds), now = new Date().toISOString()
  const incident = await db.insertIncident({
    tipo: scenario.tipo, severidad: pick(["medium", "high", "low"]), ubicacion: place.nombre,
    latitud: place.lat, longitud: place.lng, personas_afectadas: 1 + Math.floor(Math.random() * 12),
    fuente: "social", estado: "activo", created_at: now, updated_at: now,
    fuente_detalles: { simulated: true, simulation_engine: true, platform: "facebook", username: "Vecinos de Tucumán", content: `${scenario.text} #AlertaTucuman`, hashtag: "#AlertaTucuman", ai_analysis: { summary: scenario.text, reasoning: "Clasificación de ejemplo generada por el simulador; no se consultó un modelo de IA." } },
  })
  event("incident", `Alerta de ${scenario.label.toLocaleLowerCase("es-AR")} en ${incident.ubicacion}. Publicación social simulada.`)
}
async function assign(db: DataStore, incident: DbIncident) {
  const existing = await db.listResources()
  if (existing.some(r => r.incidente_id === incident.id && r.estado !== "available")) return
  const type = preferred[incident.tipo] ?? "ambulance"
  const available = existing.find(r => r.estado === "available" && r.tipo === type)
  if (!available) return
  const updated = await db.updateResource(available.id, { estado: "dispatched", incidente_id: incident.id, updated_at: new Date().toISOString() }, { requireEstado: "available" })
  if (!updated) return
  state.assignments.push({ incidentId: incident.id, resourceId: available.id, resourceName: available.nombre, location: incident.ubicacion, phase: "en_camino", remaining: 15 })
  if (incident.fuente_detalles?.simulation_engine === true) await db.updateIncident(incident.id, { fuente_detalles: { ...incident.fuente_detalles, demo_validated: true }, updated_at: new Date().toISOString() })
  event("dispatch", `${available.nombre} va a ${incident.ubicacion}, por su disponibilidad y tipo de emergencia.`)
}
async function tick() {
  const now = Date.now(), elapsed = Math.max(0, (now - state.clock) / 1000)
  state.clock = now
  if (!state.running) return
  const db = await getDb()
  // Incorporate manual deployments as well, so they complete the same demo lifecycle.
  for (const resource of await db.listResources()) {
    if (!resource.incidente_id || !["dispatched", "busy"].includes(resource.estado) || state.assignments.some(a => a.resourceId === resource.id)) continue
    const incident = await db.findIncidentById(resource.incidente_id)
    if (!incident) continue
    state.assignments.push({ incidentId: incident.id, resourceId: resource.id, resourceName: resource.nombre, location: incident.ubicacion, phase: resource.estado === "busy" ? "trabajando" : "en_camino", remaining: resource.estado === "busy" ? 20 : 15 })
    event("dispatch", `${resource.nombre}: despliegue manual incorporado a la simulación.`)
  }
  for (const assignment of [...state.assignments]) {
    const resource = await db.findResourceById(assignment.resourceId)
    if (!resource || resource.incidente_id !== assignment.incidentId || !["busy", "dispatched"].includes(resource.estado)) {
      state.assignments = state.assignments.filter(a => a !== assignment)
      event("info", `${assignment.resourceName}: la asignación cambió manualmente.`)
      continue
    }
    assignment.remaining -= elapsed
    if (assignment.remaining > 0) continue
    if (assignment.phase === "en_camino") {
      await db.updateResource(resource.id, { estado: "busy", updated_at: new Date().toISOString() })
      assignment.phase = "trabajando"; assignment.remaining = 20
      event("arrival", `${resource.nombre} llegó a ${assignment.location} y comenzó la atención.`)
    } else if (assignment.phase === "trabajando") {
      const incident = await db.findIncidentById(assignment.incidentId)
      const othersWorking = state.assignments.some(a => a !== assignment && a.incidentId === assignment.incidentId && a.phase !== "regresando")
      if (incident?.estado === "activo" && !othersWorking) await db.updateIncident(incident.id, { estado: "atendido", updated_at: new Date().toISOString(), fuente_detalles: { ...incident.fuente_detalles, demo_resolved: true } })
      assignment.phase = "regresando"; assignment.remaining = 10
      event("resolved", `${resource.nombre} finalizó su trabajo en ${assignment.location} y regresa a su base.`)
    } else {
      await db.updateResource(resource.id, { estado: "available", incidente_id: null, updated_at: new Date().toISOString() })
      state.assignments = state.assignments.filter(a => a !== assignment)
      event("return", `${resource.nombre} volvió a estar disponible.`)
    }
  }
  state.nextSpawn -= elapsed
  if (state.nextSpawn <= 0) { await spawn(db); state.nextSpawn = 20 + Math.random() * 15 }
  const active = await db.listIncidents({ estado: "activo" })
  for (const incident of active) {
    if ((incident.fuente_detalles?.simulation_engine === true || incident.fuente === "citizen") && !state.assignments.some(a => a.incidentId === incident.id)) await assign(db, incident)
  }
  await saveState(db)
}
function ensureTimer() {
  if (state.timer) return
  state.timer = setInterval(() => {
    void serial(async () => {
      if (!state.running && state.lastError && Date.now() >= (state.retryAt ?? 0)) {
        state.running = true
        state.clock = Date.now()
      }
      if (state.running) { await tick(); state.lastError = null }
    }).catch(error => {
      state.running = false
      state.lastError = error instanceof Error ? error.message : "Error en el monitoreo"
      state.retryAt = Date.now() + 10_000
    })
  }, 1000)
  state.timer.unref?.()
}
async function ensureStarted(db: DataStore) {
  if (state.running || state.lastError) { ensureTimer(); return }
  try {
    state.running = true
    state.clock = Date.now()
    if (!state.events.length) {
      const active = await db.listIncidents({ estado: "activo" })
      if (!active.some(i => i.fuente_detalles?.simulation_engine === true)) { await spawn(db); await spawn(db) }
      event("info", "Monitoreo activo. Se generan alertas y se asignan recursos automáticamente.")
    }
    if (state.nextSpawn <= 0) state.nextSpawn = 20 + Math.random() * 15
    ensureTimer()
    await tick()
  } catch (error) {
    state.running = false
    state.lastError = error instanceof Error ? error.message : "Error en el monitoreo"
    state.retryAt = Date.now() + 10_000
    ensureTimer()
    throw error
  }
}
async function snapshot(db: DataStore) {
  const [incidents, resources] = await Promise.all([db.listIncidents({ estado: "activo" }), db.listResources()])
  const waiting = incidents.filter(i => (i.fuente_detalles?.simulation_engine === true || i.fuente === "citizen") && !state.assignments.some(a => a.incidentId === i.id) && !resources.some(r => r.incidente_id === i.id && r.estado !== "available"))
    .map(i => ({ id: i.id, location: i.ubicacion, resourceType: preferred[i.tipo] ?? "ambulance" }))
  return { available: true, storage: db.mode, running: state.running, assignments: state.assignments, waiting, events: state.events, error: state.lastError }
}
export function demoStatus() {
  return serial(async () => {
    const db = await getDb()
    await loadState(db)
    await ensureStarted(db)
    return snapshot(db)
  })
}
export function demoAction(action: "reset" | "spawn") {
  return serial(async () => {
    const db = await getDb()
    await loadState(db)
    await ensureStarted(db)
    if (action === "spawn") {
      await spawn(db)
    } else {
      state.running = false
      for (const a of state.assignments) {
        const r = await db.findResourceById(a.resourceId)
        if (r?.incidente_id === a.incidentId && ["busy", "dispatched"].includes(r.estado)) await db.updateResource(r.id, { estado: "available", incidente_id: null, updated_at: new Date().toISOString() })
      }
      for (const i of await db.listIncidents()) if (i.fuente_detalles?.simulation_engine === true) await db.deleteIncident(i.id)
      state.assignments = []; state.events = []; state.nextSpawn = 0; state.lastError = null
      state.running = true; state.clock = Date.now()
      event("info", "Datos de prueba reiniciados. Se conservaron los reportes ciudadanos y el monitoreo continúa.")
    }
    await saveState(db)
    return snapshot(db)
  })
}
