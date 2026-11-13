"use server"

import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { z } from "zod"
import { getAuth } from "@/lib/auth-server"
import { getStaffProfile } from "@/lib/auth"
import { checkRateLimit } from "@/lib/rate-limit"
import { isMailConfigured } from "@/lib/services/resend-service"

async function allowAuthAttempt() {
  const requestHeaders = await headers()
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || "unknown"
  try { return (await checkRateLimit(`login:${ip}`, 10, 600000)).allowed } catch { return false }
}
export async function login(form: FormData) {
  if (!(await allowAuthAttempt())) redirect("/login?error=limited")
  const parsed = z.object({ email: z.string().trim().email().max(254), password: z.string().min(1).max(128) }).safeParse({ email: form.get("email"), password: form.get("password") })
  if (!parsed.success) redirect("/login?error=invalid")
  let target = "/"
  try {
    const result = await getAuth().api.signInEmail({ body: parsed.data, headers: await headers() })
    const profile = await getStaffProfile(result.user.id)
    if (!profile || profile.status !== "activo") target = "/login?error=forbidden"
  } catch (error) {
    target = typeof error === "object" && error !== null && "status" in error && error.status === "UNAUTHORIZED" ? "/login?error=invalid" : "/login?error=unavailable"
  }
  redirect(target)
}
export async function logout() {
  try { await getAuth().api.signOut({ headers: await headers() }) } catch { /* Expired sessions already have no access. */ }
  redirect("/login")
}
export async function recoverPassword(form: FormData) {
  if (!(await allowAuthAttempt())) redirect("/recuperar?error=limited")
  const parsed = z.string().trim().email().max(254).safeParse(form.get("email"))
  if (!parsed.success) redirect("/recuperar?error=invalid")
  try {
    if (!isMailConfigured() || !process.env.APP_URL) throw new Error("Recuperación no configurada")
    await getAuth().api.requestPasswordReset({ body: { email: parsed.data, redirectTo: new URL("/restablecer", process.env.APP_URL).toString() }, headers: await headers() })
  } catch { redirect("/recuperar?error=unavailable") }
  redirect("/recuperar?sent=true")
}
export async function resetPassword(form: FormData) {
  if (!(await allowAuthAttempt())) redirect("/recuperar?error=limited")
  const token = z.string().min(1).max(500).safeParse(form.get("token"))
  if (!token.success) redirect("/recuperar?error=invalid")
  const retry = `/restablecer?token=${encodeURIComponent(token.data)}`
  const parsed = z.string().min(12).max(128).safeParse(form.get("password"))
  if (!parsed.success || form.get("password") !== form.get("confirm")) redirect(`${retry}&error=invalid`)
  try { await getAuth().api.resetPassword({ body: { newPassword: parsed.data, token: token.data }, headers: await headers() }) }
  catch { redirect(`${retry}&error=unavailable`) }
  redirect("/login?reset=true")
}
