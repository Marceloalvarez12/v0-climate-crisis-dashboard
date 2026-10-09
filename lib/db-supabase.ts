/**
 * lib/db-supabase.ts
 *
 * Implementación Supabase del DataStore (modo real). Se usa sólo cuando
 * hay credenciales en .env.local — ver `getDb()` en lib/db.ts.
 */

import { supabase } from "@/lib/supabase"
import type { DbIncident, DbResource } from "./types"
import type { DataStore, ListIncidentsOptions, Perfil } from "./db"

function assertNoError(error: { message: string } | null, context: string) {
  if (error) throw new Error(`${context}: ${error.message}`)
}

export const supabaseDb: DataStore = {
  mode: "supabase",

  // ── Incidentes ──────────────────────────────────────────────────────────

  async listIncidents({ estado, sinceIso, limit }: ListIncidentsOptions = {}) {
    let query = supabase.from("incidentes").select("*").order("created_at", { ascending: false })
    if (estado) query = query.eq("estado", estado)
    if (sinceIso) query = query.gte("created_at", sinceIso)
    if (typeof limit === "number") query = query.limit(limit)
    const { data, error } = await query
    assertNoError(error, "Failed to fetch incidents")
    return (data ?? []) as DbIncident[]
  },

  async findIncidentById(id) {
    const { data, error } = await supabase.from("incidentes").select("*").eq("id", id).maybeSingle()
    assertNoError(error, "Failed to fetch incident")
    return (data as DbIncident | null) ?? null
  },

  async findIncidentByUbicacion(ubicacion, { estado } = {}) {
    let query = supabase.from("incidentes").select("*").eq("ubicacion", ubicacion)
    if (estado) query = query.eq("estado", estado)
    const { data, error } = await query
    assertNoError(error, "Failed to find incident")
    return ((data ?? []) as DbIncident[])[0] ?? null
  },

  async findIncidentByPostId(postId) {
    const { data, error } = await supabase
      .from("incidentes")
      .select("*")
      .contains("fuente_detalles", { related_post_ids: [postId] })
      .limit(1)
    assertNoError(error, "Failed to check duplicate post")
    return ((data ?? []) as DbIncident[])[0] ?? null
  },

  async findIncidentByArkivKey(key) {
    const { data } = await supabase
      .from("incidentes")
      .select("*")
      .or(`fuente_detalles->>arkiv_entity_key.eq.${key},fuente_detalles->ai_analysis->>arkiv_entity_key.eq.${key},fuente_detalles->>detection_arkiv_key.eq.${key}`)
      .maybeSingle()
    return (data as DbIncident | null) ?? null
  },

  async insertIncident(row) {
    const { data, error } = await supabase.from("incidentes").insert(row).select().single()
    assertNoError(error, "Failed to create incident")
    return data as DbIncident
  },

  async updateIncident(id, updates) {
    const { data, error } = await supabase
      .from("incidentes")
      .update(updates)
      .eq("id", id)
      .select()
      .single()
    assertNoError(error, "Failed to update incident")
    return data as DbIncident
  },

  async deleteIncident(id) {
    const { error } = await supabase.from("incidentes").delete().eq("id", id)
    assertNoError(error, "Failed to delete incident")
  },

  async deleteSimulatedIncidents(estado) {
    let query = supabase.from("incidentes").delete().contains("fuente_detalles", { simulated: true })
    if (estado) query = query.eq("estado", estado)
    const { error } = await query
    assertNoError(error, "Failed to delete simulated incidents")
    return 0
  },

  // ── Recursos ────────────────────────────────────────────────────────────

  async listResources() {
    const { data, error } = await supabase
      .from("recursos")
      .select("id, tipo, nombre, cantidad, cantidad_disponible, estado, ubicacion, incidente_id, updated_at")
      .neq("estado", "retired")
      .order("tipo", { ascending: true })
    assertNoError(error, "Failed to fetch resources")
    return (data ?? []) as DbResource[]
  },

  async findResourceById(id) {
    const { data } = await supabase
      .from("recursos")
      .select("id, tipo, nombre, cantidad, cantidad_disponible, estado, ubicacion, incidente_id, updated_at")
      .eq("id", id)
      .maybeSingle()
    return (data as DbResource | null) ?? null
  },

  async insertResource(row) {
    const { data, error } = await supabase.from("recursos").insert(row).select().single()
    assertNoError(error, "Failed to create resource")
    return data as DbResource
  },

  async updateResource(id, updates, { requireEstado } = {}) {
    let query = supabase.from("recursos").update(updates).eq("id", id)
    if (requireEstado) query = query.eq("estado", requireEstado)
    const { data, error } = await query.select().maybeSingle()
    assertNoError(error, "Failed to update resource")
    return (data as DbResource | null) ?? null
  },

  // ── config_sistema ──────────────────────────────────────────────────────

  async getConfig<T>(clave: string): Promise<T | null> {
    const { data, error } = await supabase
      .from("config_sistema")
      .select("valor")
      .eq("clave", clave)
      .single()
    if (error || !data) return null
    return data.valor as T
  },

  async upsertConfig(clave, valor) {
    const { error } = await supabase
      .from("config_sistema")
      .upsert({ clave, valor }, { onConflict: "clave" })
    assertNoError(error, "Failed to upsert config")
  },

  async upsertConfigs(rows) {
    const { error } = await supabase.from("config_sistema").upsert(rows, { onConflict: "clave" })
    assertNoError(error, "Failed to upsert config")
  },

  // ── Perfiles / administración ───────────────────────────────────────────

  async listProfiles() {
    const { data: profiles, error } = await supabase
      .from("perfiles")
      .select("id, nombre, rol, status")
      .order("nombre")
    assertNoError(error, "Failed to load profiles")
    const users = []
    for (let page = 1; page <= 20; page++) {
      const { data, error: authError } = await supabase.auth.admin.listUsers({ page, perPage: 100 })
      if (authError) break
      users.push(...data.users)
      if (data.users.length < 100) break
    }
    const byId = new Map(users.map((user) => [user.id, user]))
    return ((profiles ?? []) as Perfil[]).map((profile) => ({
      ...profile,
      email: byId.get(profile.id)?.email ?? "",
      last_sign_in_at: byId.get(profile.id)?.last_sign_in_at ?? null,
    }))
  },

  async createOperator({ nombre, email, password }) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nombre },
    })
    if (error || !data.user) throw new Error("No se pudo crear el operador")
    const { error: profileError } = await supabase
      .from("perfiles")
      .update({ rol: "operador", status: "activo" })
      .eq("id", data.user.id)
      .select("id")
      .single()
    if (profileError) {
      throw new Error("Usuario creado, pero su perfil no pudo activarse. Revisá la configuración de perfiles en Supabase")
    }
    return { id: data.user.id, nombre, email, rol: "operador", status: "activo", last_sign_in_at: null }
  },

  async updateProfile(id, updates) {
    const { error } = await supabase.from("perfiles").update(updates).eq("id", id)
    assertNoError(error, "Failed to update profile")
  },

  async resetUserPassword(id, redirectTo) {
    const { data: target, error } = await supabase.auth.admin.getUserById(id)
    if (error || !target.user?.email) throw new Error("Usuario no encontrado")
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(target.user.email, {
      redirectTo,
    })
    if (resetError) throw new Error("No se pudo enviar el enlace de recuperación")
  },

  async getAssignments(operadorId) {
    const { data, error } = await supabase
      .from("asignaciones_recursos")
      .select("recurso_id")
      .eq("operador_id", operadorId)
    assertNoError(error, "Failed to load assignments")
    return (data ?? []).map((row) => row.recurso_id as string)
  },

  async replaceAssignments(operadorId, recursoIds) {
    const { error } = await supabase.rpc("replace_operator_resources", {
      p_operator_id: operadorId,
      p_resource_ids: [...new Set(recursoIds)],
    })
    assertNoError(error, "No se pudieron guardar las asignaciones. Aplicá la migración de seguridad en Supabase")
  },

  async logAudit(accion, detalle) {
    const { error } = await supabase.rpc("registrar_auditoria", { p_accion: accion, p_detalle: detalle })
    if (error) console.warn("[audit] registrar_auditoria falló:", error.message)
  },
}
