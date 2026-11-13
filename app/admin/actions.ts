"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { getDb, hasDatabaseConfig } from "@/lib/db"
import { auditAdmin, requireStaff } from "@/lib/auth"

const idSchema = z.string().uuid()
const roleSchema = z.enum(["admin", "operador", "agente_ia"])
const operatorSchema = z.object({
  nombre: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(128),
})

export interface StaffUser {
  id: string
  name: string
  email: string
  role: "admin" | "operador" | "agente_ia" | "visualizador"
  status: "activo" | "suspendido"
  lastLogin: string | null
}

export async function getUsers(): Promise<StaffUser[]> {
  await requireStaff("admin")
  const db = await getDb()
  const profiles = await db.listProfiles()
  return profiles.map(profile => ({
    id: profile.id,
    name: profile.nombre,
    email: profile.email ?? "",
    role: profile.rol as StaffUser["role"],
    status: profile.status as StaffUser["status"],
    lastLogin: profile.last_sign_in_at ?? null,
  }))
}

export async function createOperator(input: z.infer<typeof operatorSchema>) {
  await requireStaff("admin")
  const { nombre, email, password } = operatorSchema.parse(input)
  const db = await getDb()
  const created = await db.createOperator({ nombre, email, password })
  await auditAdmin("create_operator", { user_id: created.id, email, nombre })
  revalidatePath("/admin")
}

export async function updateUserRole(userId: string, role: z.infer<typeof roleSchema>) {
  const { user } = await requireStaff("admin")
  const id = idSchema.parse(userId)
  if (id === user.id) throw new Error("No podés cambiar tu propio rol")
  const parsedRole = roleSchema.parse(role)
  const db = await getDb()
  await db.updateProfile(id, { rol: parsedRole })
  await auditAdmin("update_user_role", { user_id: id, role: parsedRole })
  revalidatePath("/admin")
}

export async function suspendUser(userId: string, status: "activo" | "suspendido") {
  const { user } = await requireStaff("admin")
  const id = idSchema.parse(userId)
  if (id === user.id) throw new Error("No podés suspender tu propia cuenta")
  const parsedStatus = z.enum(["activo", "suspendido"]).parse(status)
  const db = await getDb()
  await db.updateProfile(id, { status: parsedStatus })
  await auditAdmin("update_user_status", { user_id: id, status: parsedStatus })
  revalidatePath("/admin")
}

export async function resetUserPassword(userId: string) {
  await requireStaff("admin")
  const id = idSchema.parse(userId)
  const db = await getDb()
  if (!process.env.APP_URL) throw new Error("APP_URL no configurada para recuperación")
  await db.resetUserPassword(id, new URL("/restablecer", process.env.APP_URL).toString())
  await auditAdmin("reset_user_password", { user_id: id })
}

export async function getOperatorAssignments(userId: string): Promise<string[]> {
  await requireStaff("admin")
  const db = await getDb()
  return db.getAssignments(idSchema.parse(userId))
}

export async function assignResourcesToOperator(userId: string, resourceIds: string[]) {
  const { user } = await requireStaff("admin")
  const id = idSchema.parse(userId)
  const resources = z.array(z.string().min(1).max(100)).max(100).parse(resourceIds)
  await (await getDb()).replaceAssignments(user.id, id, [...new Set(resources)])
  revalidatePath("/admin")
}

// ============================================
// CONFIG_SISTEMA (agent control, thresholds, API keys)
// ============================================

export async function getAgentMode(): Promise<boolean> {
  await requireStaff("admin")
  const db = await getDb()
  const data = await db.getConfig<{ autonomous?: boolean }>("agent_mode")
  return data?.autonomous === true
}

export async function updateAgentMode(autonomous: boolean) {
  const { user } = await requireStaff("admin")
  const db = await getDb()
  await db.upsertConfig("agent_mode", {
    autonomous,
    updated_by: user.email,
    updated_at: new Date().toISOString(),
  })
  const { invalidateConfigCache } = await import("@/lib/services/config-service")
  invalidateConfigCache("agent_mode")
  await auditAdmin("agent_mode_toggle", { autonomous, ejecutado_por: user.email })
}

export async function getAgentThresholds(): Promise<{ confidence: number }> {
  await requireStaff("admin")
  const db = await getDb()
  const read = async (clave: string, fallback: number) => {
    const row = await db.getConfig<{ value?: number }>(clave)
    return typeof row?.value === "number" ? row.value : fallback
  }
  return { confidence: await read("confidence_threshold", 80) }
}

export async function updateAgentThresholds(confidence: number) {
  const { user } = await requireStaff("admin")
  const parsed = z.object({
    confidence: z.number().int().min(50).max(100),
  }).parse({ confidence })
  const stamp = { updated_by: user.email, updated_at: new Date().toISOString() }
  const db = await getDb()
  await db.upsertConfigs([
    { clave: "confidence_threshold", valor: { value: parsed.confidence, ...stamp } },
  ])
  const { invalidateConfigCache } = await import("@/lib/services/config-service")
  invalidateConfigCache()
  await auditAdmin("update_thresholds", { ...parsed, ejecutado_por: user.email })
}

export async function getApiCredentials(): Promise<Record<string, boolean>> {
  await requireStaff("admin")
  return {
    openrouter: Boolean(process.env.OPENROUTER_API_KEY),
    gemini: Boolean(process.env.GOOGLE_AI_API_KEY),
    twitter: Boolean(process.env.X_BEARER_TOKEN),
    neon: hasDatabaseConfig(),
    leaflet: true,
  }
}
