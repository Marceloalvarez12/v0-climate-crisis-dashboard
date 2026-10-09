import { randomUUID } from "crypto"
import type { DbIncident, DbResource, IncidentType, IncidentSeverity, IncidentSource } from "./types"
import type { DataStore, Perfil } from "./db"

// ---------------------------------------------------------------------------
// Store en memoria: se usa cuando NO hay credenciales de Supabase (.env.local).
// Persiste en globalThis para sobrevivir al HMR de Next.js dev.
// Los IDs son UUIDs reales: el schema de despacho y la ruta pública
// /seguimiento/[id] exigen formato uuid.
// ---------------------------------------------------------------------------

interface MemoryState {
  incidents: DbIncident[]
  resources: DbResource[]
  agentLogs: Array<{ id: string; action: string; timestamp: string; details: unknown }>
  config: Map<string, unknown>
  perfiles: Perfil[]
  asignaciones: Map<string, string[]>
}

declare global {
  var __zntinelMemoryState: MemoryState | undefined
}

function seedData(): MemoryState {
  const now = () => new Date().toISOString()
  const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
  const randomFrom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

  const INCIDENT_TYPES: IncidentType[] = ["flood", "fire", "storm", "looting", "violence", "accident", "general"]
  const SEVERIDADES: IncidentSeverity[] = ["low", "medium", "high", "critical"]
  const FUENTES: IncidentSource[] = ["social", "sensor", "camera"]

  const SEED_ZONES = [
    { nombre: "Barrio San Pablo", lat: -26.84, lng: -65.25 },
    { nombre: "Parque 9 de Julio - Av. Soldati", lat: -26.8288, lng: -65.1912 },
    { nombre: "Yerba Buena", lat: -26.816, lng: -65.316 },
    { nombre: "Av. Roca y Lincoln - Zona Sur", lat: -26.8453, lng: -65.2198 },
    { nombre: "Plaza Independencia - Centro Historico", lat: -26.8305, lng: -65.2038 },
  ]

  const incidents: DbIncident[] = SEED_ZONES.map((zona) => {
    const fuente = randomFrom(FUENTES)
    return {
      id: randomUUID(),
      tipo: randomFrom(INCIDENT_TYPES),
      severidad: randomFrom(SEVERIDADES),
      ubicacion: zona.nombre,
      latitud: zona.lat + (Math.random() - 0.5) * 0.01,
      longitud: zona.lng + (Math.random() - 0.5) * 0.01,
      personas_afectadas: randomInt(5, 100),
      fuente,
      fuente_detalles: {
        platform: "Seed simulado",
        content: `Incidente semilla en ${zona.nombre}`,
        reports_count: 1,
      },
      estado: "activo",
      created_at: new Date(Date.now() - randomInt(60000, 600000)).toISOString(),
      updated_at: now(),
    }
  })

  const resourceTypes: Array<{ tipo: string; nombre: string; cantidad: number; ubicacion: string }> = [
    { tipo: "ambulance", nombre: "Ambulancia", cantidad: 3, ubicacion: "Centro" },
    { tipo: "firefighter", nombre: "Bomberos", cantidad: 2, ubicacion: "Zona Norte" },
    { tipo: "police", nombre: "Policía", cantidad: 2, ubicacion: "Comisaría Central" },
    { tipo: "helicopter", nombre: "Helicóptero", cantidad: 2, ubicacion: "Aeropuerto" },
    { tipo: "boat", nombre: "Lancha", cantidad: 2, ubicacion: "Río Salí" },
  ]

  const resources: DbResource[] = resourceTypes.flatMap((rt, typeIdx) =>
    Array.from({ length: rt.cantidad }, (_, i) => ({
      id: randomUUID(),
      tipo: rt.tipo,
      nombre: `${rt.nombre} ${String(typeIdx * 3 + i + 1).padStart(2, "0")}`,
      cantidad: 1,
      cantidad_disponible: 1,
      estado: "available",
      ubicacion: rt.ubicacion,
      incidente_id: null,
      updated_at: now(),
    })),
  )

  const config = new Map<string, unknown>([
    // Sin kill switch: la ingesta social y el agente quedan habilitados
    // para que la simulación funcione out-of-the-box.
    ["agent_mode", { autonomous: true }],
    ["auto_resolve_minutes", { value: 5 }],
    ["confidence_threshold", { value: 60 }],
  ])

  const perfiles: Perfil[] = [
    { id: randomUUID(), nombre: "Operador Demo", email: "demo@zntinel.local", rol: "admin", status: "activo", last_sign_in_at: now() },
    { id: randomUUID(), nombre: "Laura Gómez", email: "lgomez@zntinel.local", rol: "operador", status: "activo", last_sign_in_at: null },
    { id: randomUUID(), nombre: "Carlos Ruiz", email: "cruiz@zntinel.local", rol: "operador", status: "suspendido", last_sign_in_at: null },
  ]

  return {
    incidents,
    resources,
    agentLogs: [],
    config,
    perfiles,
    asignaciones: new Map(),
  }
}

const state: MemoryState = globalThis.__zntinelMemoryState ?? seedData()
globalThis.__zntinelMemoryState = state

function log(action: string, details: unknown) {
  state.agentLogs.push({ id: randomUUID(), action, timestamp: new Date().toISOString(), details })
}

function sortByCreatedDesc(rows: DbIncident[]): DbIncident[] {
  return [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at))
}

// ---------------------------------------------------------------------------
// DataStore implementation (memoria)
// ---------------------------------------------------------------------------

export const memoryDb: DataStore = {
  mode: "memory",

  async listIncidents({ estado, sinceIso, limit } = {}) {
    let rows = state.incidents
    if (estado) rows = rows.filter((i) => i.estado === estado)
    if (sinceIso) rows = rows.filter((i) => i.created_at >= sinceIso)
    rows = sortByCreatedDesc(rows)
    return typeof limit === "number" ? rows.slice(0, limit) : rows
  },

  async findIncidentById(id) {
    return state.incidents.find((i) => i.id === id) ?? null
  },

  async findIncidentByUbicacion(ubicacion, { estado } = {}) {
    return state.incidents.find((i) => i.ubicacion === ubicacion && (!estado || i.estado === estado)) ?? null
  },

  async findIncidentByPostId(postId) {
    return state.incidents.find((i) => {
      const ids = (i.fuente_detalles as { related_post_ids?: unknown }).related_post_ids
      return Array.isArray(ids) && ids.includes(postId)
    }) ?? null
  },

  async findIncidentByArkivKey(key) {
    const match = (i: DbIncident) => {
      const d = i.fuente_detalles as Record<string, unknown>
      const ai = (d.ai_analysis ?? {}) as Record<string, unknown>
      return d.arkiv_entity_key === key || ai.arkiv_entity_key === key || d.detection_arkiv_key === key
    }
    return state.incidents.find(match) ?? null
  },

  async insertIncident(row) {
    const incident: DbIncident = { ...row, id: randomUUID() }
    state.incidents.push(incident)
    log("insert_incident", incident)
    return incident
  },

  async updateIncident(id, updates) {
    const idx = state.incidents.findIndex((i) => i.id === id)
    if (idx === -1) return null
    state.incidents[idx] = { ...state.incidents[idx], ...updates, updated_at: new Date().toISOString() }
    log("update_incident", { id, updates })
    return state.incidents[idx]
  },

  async deleteIncident(id) {
    const before = state.incidents.length
    state.incidents = state.incidents.filter((i) => i.id !== id)
    if (state.incidents.length !== before) log("delete_incident", { id })
  },

  async deleteSimulatedIncidents(estado) {
    const before = state.incidents.length
    state.incidents = state.incidents.filter(
      (i) => !(i.fuente_detalles?.simulated === true && (!estado || i.estado === estado)),
    )
    return before - state.incidents.length
  },

  async resolveStaleSimulated(cutoffIso) {
    const stale = state.incidents.filter(
      (i) => i.estado === "activo" && i.fuente_detalles?.simulated === true && i.updated_at < cutoffIso,
    )
    const now = new Date().toISOString()
    for (const inc of stale) {
      inc.estado = "atendido"
      inc.updated_at = now
    }
    return stale
  },

  async listResources() {
    return [...state.resources]
      .filter((r) => r.estado !== "retired")
      .sort((a, b) => a.tipo.localeCompare(b.tipo))
  },

  async findResourceById(id) {
    return state.resources.find((r) => r.id === id) ?? null
  },

  async insertResource(row) {
    const resource: DbResource = { ...row, id: randomUUID() }
    state.resources.push(resource)
    log("insert_resource", resource)
    return resource
  },

  async updateResource(id, updates, { requireEstado } = {}) {
    const idx = state.resources.findIndex((r) => r.id === id)
    if (idx === -1) return null
    if (requireEstado && state.resources[idx].estado !== requireEstado) return null
    state.resources[idx] = { ...state.resources[idx], ...updates, updated_at: new Date().toISOString() }
    log("update_resource", { id, updates })
    return state.resources[idx]
  },

  async getConfig<T>(clave: string): Promise<T | null> {
    return (state.config.get(clave) as T) ?? null
  },

  async upsertConfig(clave, valor) {
    state.config.set(clave, valor)
  },

  async upsertConfigs(rows) {
    for (const row of rows) state.config.set(row.clave, row.valor)
  },

  async listProfiles() {
    return [...state.perfiles].sort((a, b) => a.nombre.localeCompare(b.nombre))
  },

  async createOperator({ nombre, email }) {
    const perfil: Perfil = {
      id: randomUUID(),
      nombre,
      email,
      rol: "operador",
      status: "activo",
      last_sign_in_at: null,
    }
    state.perfiles.push(perfil)
    log("create_operator", { id: perfil.id, email })
    return perfil
  },

  async updateProfile(id, updates) {
    const idx = state.perfiles.findIndex((p) => p.id === id)
    if (idx === -1) throw new Error("Perfil no encontrado")
    state.perfiles[idx] = { ...state.perfiles[idx], ...updates }
  },

  async resetUserPassword(id) {
    if (!state.perfiles.some((p) => p.id === id)) throw new Error("Usuario no encontrado")
    log("reset_user_password", { id, simulated: true })
  },

  async getAssignments(operadorId) {
    return state.asignaciones.get(operadorId) ?? []
  },

  async replaceAssignments(operadorId, recursoIds) {
    state.asignaciones.set(operadorId, [...new Set(recursoIds)])
  },

  async logAudit(accion, detalle) {
    log(`admin:${accion}`, detalle)
  },
}

// ---------------------------------------------------------------------------
// Helpers heredados (agent logs) — compatibles con /api/agent-logs
// ---------------------------------------------------------------------------

export function getAgentStatus() {
  return { status: "active", mode: "auto", lastUpdate: new Date().toISOString() }
}

export function getAgentLogs() {
  return state.agentLogs.slice(-50).reverse()
}
