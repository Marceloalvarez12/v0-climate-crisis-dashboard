/**
 * lib/db.ts
 *
 * Capa de acceso a datos dual:
 *   - Si `.env.local` define NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *     → usa Supabase (PostgreSQL real, mismo schema que el repo PMV).
 *   - Si no → usa el store en memoria de `lib/mock-db.ts`, con datos
 *     simulados precargados (incidentes, recursos, config, perfiles demo).
 *
 * Toda la aplicación pasa por `getDb()`; ninguna ruta o servicio debería
 * importar `@/lib/supabase` directamente.
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
  mode: "supabase" | "memory"

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
  deleteSimulatedIncidents(estado?: "activo" | "atendido"): Promise<number>
  /** Auto-resolve de mantenimiento: marca "atendido" a los simulados activos con updated_at < cutoffIso */
  resolveStaleSimulated(cutoffIso: string): Promise<DbIncident[]>

  // ── Recursos ────────────────────────────────────────────────────────────
  listResources(): Promise<DbResource[]>
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
  replaceAssignments(operadorId: string, recursoIds: string[]): Promise<void>
  logAudit(accion: string, detalle: Record<string, unknown>): Promise<void>
}

export function hasSupabaseConfig(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

let cached: DataStore | null = null

export async function getDb(): Promise<DataStore> {
  if (cached) return cached
  if (hasSupabaseConfig()) {
    const { supabaseDb } = await import("./db-supabase")
    cached = supabaseDb
  } else {
    const { memoryDb } = await import("./mock-db")
    cached = memoryDb
  }
  return cached
}
