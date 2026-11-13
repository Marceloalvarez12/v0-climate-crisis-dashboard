/**
 * lib/auth.ts
 *
 * Stub de autenticación: esta build corre SIN login (modo simulación).
 * `requireStaff` devuelve siempre un perfil admin demo para que las rutas
 * y páginas protegidas funcionen igual que con una sesión real.
 * `auditAdmin` persiste la acción en el store (memoria o auditoria_admin
 * si hay Supabase configurado).
 */

import { getDb } from "@/lib/db"
import type { Perfil } from "@/lib/db"

export type StaffRole = "admin" | "operador" | "agente_ia" | "visualizador"

const DEMO_USER_ID = "00000000-0000-4000-8000-000000000001"

const DEMO_PROFILE: Perfil = {
  id: DEMO_USER_ID,
  nombre: "Operador Demo",
  rol: "admin",
  status: "activo",
}

export async function requireStaff(_role?: StaffRole) {
  return {
    client: null,
    user: { id: DEMO_USER_ID, email: "demo@zntinel.local" },
    profile: DEMO_PROFILE,
  }
}

export async function auditAdmin(
  _client: unknown,
  accion: string,
  detalle: Record<string, unknown>,
) {
  const db = await getDb()
  await db.logAudit(accion, { ...detalle, ejecutado_por: DEMO_PROFILE.nombre })
}
