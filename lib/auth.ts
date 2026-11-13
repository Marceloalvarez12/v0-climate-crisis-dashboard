import { headers } from "next/headers"
import { getAuth } from "./auth-server"
import { getPool } from "./postgres"
import type { Perfil } from "./db"

export type StaffRole = "admin" | "operador" | "agente_ia" | "visualizador"
export async function getStaffProfile(id: string): Promise<Perfil | null> {
  return (await getPool().query("SELECT id,nombre,rol,status FROM perfiles WHERE id=$1", [id])).rows[0] ?? null
}
export async function requireStaff(role?: StaffRole) {
  const session = await getAuth().api.getSession({ headers: await headers() })
  if (!session) throw new Error("No autorizado")
  const profile = await getStaffProfile(session.user.id)
  if (!profile || profile.status !== "activo") throw new Error("Acceso denegado")
  if (role && profile.rol !== role) throw new Error("Permisos insuficientes")
  return { user: session.user, profile }
}
export async function auditAdmin(accion: string, detalle: Record<string, unknown>) {
  const { user } = await requireStaff("admin")
  await getPool().query("INSERT INTO auditoria_admin(admin_id,accion,detalle) VALUES($1,$2,$3)", [user.id, accion, JSON.stringify(detalle)])
}
