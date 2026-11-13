import type { DataStore } from "./db"
import { getPool, transaction } from "./postgres"
import { createAccount } from "./accounts"

// SQL identifiers only come from these internal allowlists, never request input.
const incidentColumns = ["tipo", "severidad", "ubicacion", "latitud", "longitud", "personas_afectadas", "fuente", "fuente_detalles", "estado", "arkiv_key", "arkiv_entity_key", "created_at", "updated_at"]
const resourceColumns = ["tipo", "nombre", "estado", "ubicacion", "incidente_id", "cantidad", "cantidad_disponible", "updated_at"]
function valuesFor(input: object, columns: string[]) {
  return Object.entries(input).filter(([key, value]) => columns.includes(key) && value !== undefined)
}
function normalize<T>(row: Record<string, unknown>): T {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, value instanceof Date ? value.toISOString() : value])) as T
}
async function rows<T>(sql: string, parameters: unknown[] = []): Promise<T[]> {
  const result = await getPool().query(sql, parameters)
  return result.rows.map(row => normalize<T>(row))
}
async function one<T>(sql: string, parameters: unknown[] = []): Promise<T | null> {
  return (await rows<T>(sql, parameters))[0] ?? null
}
async function insert<T>(table: "incidentes" | "recursos", input: object, columns: string[]): Promise<T> {
  const entries = valuesFor(input, columns)
  const row = await one<T>(`INSERT INTO ${table} (${entries.map(([key]) => key).join(",")}) VALUES (${entries.map((_, i) => `$${i + 1}`).join(",")}) RETURNING *`, entries.map(([, value]) => value))
  if (!row) throw new Error("No se pudo guardar el registro")
  return row
}
async function update<T>(table: "incidentes" | "recursos", id: string, input: object, columns: string[], state?: string): Promise<T | null> {
  const entries = valuesFor(input, columns)
  if (!entries.length) return one<T>(`SELECT * FROM ${table} WHERE id=$1`, [id])
  const parameters: unknown[] = [id, ...entries.map(([, value]) => value)]
  let condition = "id=$1"
  if (state !== undefined) { parameters.push(state); condition += ` AND estado=$${parameters.length}` }
  return one<T>(`UPDATE ${table} SET ${entries.map(([key], i) => `${key}=$${i + 2}`).join(",")} WHERE ${condition} RETURNING *`, parameters)
}

export const neonDb: DataStore = {
  mode: "neon",
  async listIncidents({ estado, sinceIso, limit } = {}) {
    const conditions: string[] = [], parameters: unknown[] = []
    if (estado) { parameters.push(estado); conditions.push(`estado=$${parameters.length}`) }
    if (sinceIso) { parameters.push(sinceIso); conditions.push(`created_at >= $${parameters.length}`) }
    let sql = `SELECT * FROM incidentes${conditions.length ? ` WHERE ${conditions.join(" AND ")}` : ""} ORDER BY created_at DESC`
    if (limit !== undefined) { parameters.push(limit); sql += ` LIMIT $${parameters.length}` }
    return rows(sql, parameters)
  },
  findIncidentById: id => one("SELECT * FROM incidentes WHERE id=$1", [id]),
  findIncidentByUbicacion: (location, { estado } = {}) => one(`SELECT * FROM incidentes WHERE ubicacion=$1${estado ? " AND estado=$2" : ""} ORDER BY created_at DESC LIMIT 1`, estado ? [location, estado] : [location]),
  findIncidentByPostId: id => one("SELECT * FROM incidentes WHERE fuente_detalles @> $1::jsonb ORDER BY created_at DESC LIMIT 1", [JSON.stringify({ related_post_ids: [id] })]),
  findIncidentByArkivKey: key => one("SELECT * FROM incidentes WHERE fuente_detalles->>'arkiv_entity_key'=$1 OR fuente_detalles->'ai_analysis'->>'arkiv_entity_key'=$1 OR fuente_detalles->>'detection_arkiv_key'=$1 LIMIT 1", [key]),
  insertIncident: input => insert("incidentes", input, incidentColumns),
  updateIncident: (id, input) => update("incidentes", id, input, incidentColumns),
  async deleteIncident(id) { await getPool().query("DELETE FROM incidentes WHERE id=$1", [id]) },
  listResources: () => rows("SELECT * FROM recursos WHERE estado <> 'retired' ORDER BY tipo,nombre"),
  listIncidentResources: id => rows("SELECT estado FROM recursos WHERE incidente_id=$1 AND estado <> 'retired'", [id]),
  findResourceById: id => one("SELECT * FROM recursos WHERE id=$1", [id]),
  insertResource: input => insert("recursos", input, resourceColumns),
  updateResource: (id, input, { requireEstado } = {}) => update("recursos", id, input, resourceColumns, requireEstado),
  async getConfig<T>(key: string) { return (await one<{ valor: T }>("SELECT valor FROM config_sistema WHERE clave=$1", [key]))?.valor ?? null },
  async upsertConfig(key, value) { await this.upsertConfigs([{ clave: key, valor: value }]) },
  async upsertConfigs(input) {
    await transaction(async client => {
      for (const { clave, valor } of input) await client.query("INSERT INTO config_sistema(clave,valor) VALUES ($1,$2::jsonb) ON CONFLICT(clave) DO UPDATE SET valor=EXCLUDED.valor", [clave, JSON.stringify(valor)])
    })
  },
  listProfiles: () => rows('SELECT p.*,u.email,(SELECT max(s."createdAt") FROM session s WHERE s."userId"=p.id) AS last_sign_in_at FROM perfiles p JOIN "user" u ON u.id=p.id ORDER BY p.nombre'),
  createOperator: input => createAccount(input, "operador"),
  async updateProfile(id, input) {
    await transaction(async client => {
      const entries = valuesFor(input, ["rol", "status"])
      if (!entries.length) return
      const result = await client.query(`UPDATE perfiles SET ${entries.map(([key], i) => `${key}=$${i + 2}`).join(",")} WHERE id=$1 RETURNING id`, [id, ...entries.map(([, value]) => value)])
      if (!result.rowCount) throw new Error("Usuario no encontrado")
      await client.query('DELETE FROM session WHERE "userId"=$1', [id])
    })
  },
  async resetUserPassword(id, redirectTo) {
    const user = await one<{ email: string }>('SELECT email FROM "user" WHERE id=$1', [id])
    if (!user) throw new Error("Usuario no encontrado")
    const { getAuth } = await import("./auth-server")
    const { isMailConfigured } = await import("./services/resend-service")
    if (!isMailConfigured()) throw new Error("Correo de recuperación no configurado")
    await getAuth().api.requestPasswordReset({ body: { email: user.email, redirectTo } })
  },
  async getAssignments(id) { return (await rows<{ recurso_id: string }>("SELECT recurso_id FROM asignaciones_recursos WHERE operador_id=$1", [id])).map(row => row.recurso_id) },
  async replaceAssignments(actorId, operatorId, resourceIds) {
    await transaction(async client => {
      const actor = await client.query("SELECT id FROM perfiles WHERE id=$1 AND rol='admin' AND status='activo' FOR SHARE", [actorId])
      if (!actor.rowCount) throw new Error("Permisos insuficientes")
      const target = await client.query("SELECT id FROM perfiles WHERE id=$1 AND rol='operador' AND status='activo' FOR UPDATE", [operatorId])
      if (!target.rowCount) throw new Error("Operador activo requerido")
      const ids = [...new Set(resourceIds)]
      const resources = await client.query("SELECT id FROM recursos WHERE id=ANY($1::text[]) AND estado <> 'retired' FOR SHARE", [ids])
      if (resources.rowCount !== ids.length) throw new Error("Recurso inexistente o retirado")
      await client.query("DELETE FROM asignaciones_recursos WHERE operador_id=$1", [operatorId])
      for (const id of ids) await client.query("INSERT INTO asignaciones_recursos(operador_id,recurso_id) VALUES($1,$2)", [operatorId, id])
      await client.query("INSERT INTO auditoria_admin(admin_id,accion,detalle) VALUES($1,'assign_resources',$2)", [actorId, JSON.stringify({ user_id: operatorId, resource_ids: ids })])
    })
  },
  listAgentEvents: (limit = 40) => rows("SELECT * FROM agent_events ORDER BY created_at DESC LIMIT $1", [limit]),
  async recordAgentEvent(type, message, source) { await getPool().query("INSERT INTO agent_events(type,message,source) VALUES($1,$2,$3)", [type, message, source]) },
  async lastAgentScan() { return (await one<{ created_at: string }>("SELECT created_at FROM agent_events WHERE type='complete' AND source='Escaneo social' ORDER BY created_at DESC LIMIT 1"))?.created_at ?? null },
}
