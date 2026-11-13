/**
 * lib/db.ts
 *
 * Datos operativos persistentes de Neon/PostgreSQL. Sin credenciales falla
 * explícitamente; nunca inventa datos en memoria.
 *
 * Toda la aplicación pasa por `getDb()`; ninguna ruta o servicio debería
 * acceder a la conexión directamente.
 */

import type { DbIncident, DbResource } from "./types"

export interface Perfil {
  id: string
  nombre: string
  email?: string
  rol: "admin" | "operador" | "agente_ia" | "visualizador" | string
  status: "activo" | "suspendido" | string
  last_sign_in_at?: string | null
}

export interface ListIncidentsOptions {
  estado?: string
  /** created_at >= sinceIso */
  sinceIso?: string
  limit?: number
}

export interface DataStore {
  mode: "neon"

  // ── Incidentes ──────────────────────────────────────────────────────────
  listIncidents(opts?: ListIncidentsOptions): Promise<DbIncident[]>
  findIncidentById(id: string): Promise<DbIncident | null>
  findIncidentByUbicacion(ubicacion: string, opts?: { estado?: string }): Promise<DbIncident | null>
  /** Dedup de posts: incidente cuyo fuente_detalles.related_post_ids contiene postId */
  findIncidentByPostId(postId: string): Promise<DbIncident | null>
  /** Búsqueda por clave Arkiv en las 3 rutas posibles de fuente_detalles */
  findIncidentByArkivKey(key: string): Promise<DbIncident | null>
  insertIncident(row: Omit<DbIncident, "id">): Promise<DbIncident>
  updateIncident(id: string, updates: Partial<DbIncident>): Promise<DbIncident | null>
  deleteIncident(id: string): Promise<void>

  // ── Recursos ────────────────────────────────────────────────────────────
  listResources(): Promise<DbResource[]>
  listIncidentResources(incidentId: string): Promise<Array<Pick<DbResource, "estado">>>
  findResourceById(id: string): Promise<DbResource | null>
  insertResource(row: Omit<DbResource, "id">): Promise<DbResource>
  /** requireEstado implementa el compare-and-set del despacho (409 si está tomado) */
  updateResource(id: string, updates: Partial<DbResource>, opts?: { requireEstado?: string }): Promise<DbResource | null>

  // ── config_sistema ──────────────────────────────────────────────────────
  getConfig<T>(clave: string): Promise<T | null>
  upsertConfig(clave: string, valor: unknown): Promise<void>
  upsertConfigs(rows: Array<{ clave: string; valor: unknown }>): Promise<void>

  // ── Perfiles / administración ───────────────────────────────────────────
  listProfiles(): Promise<Perfil[]>
  createOperator(input: { nombre: string; email: string; password: string }): Promise<Perfil>
  updateProfile(id: string, updates: { rol?: string; status?: string }): Promise<void>
  resetUserPassword(id: string, redirectTo?: string): Promise<void>
  getAssignments(operadorId: string): Promise<string[]>
  replaceAssignments(actorId: string, operadorId: string, resourceIds: string[]): Promise<void>
  listAgentEvents(limit?: number): Promise<Array<{ id: string; type: string; message: string; source: string; created_at: string }>>
  recordAgentEvent(type: string, message: string, source: string): Promise<void>
  lastAgentScan(): Promise<string | null>
}

export function hasDatabaseConfig(): boolean {
  return Boolean(process.env.DATABASE_URL)
}

let cached: DataStore | null = null

export async function getDb(): Promise<DataStore> {
  if (cached) return cached
  if (hasDatabaseConfig()) {
    const { neonDb } = await import("./db-neon")
    cached = neonDb
  } else throw new Error("Base de datos no configurada")
  return cached
}
