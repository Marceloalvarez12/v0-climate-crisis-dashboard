import { betterAuth, APIError } from "better-auth"
import { nextCookies } from "better-auth/next-js"
import { randomUUID } from "node:crypto"
import { getPool } from "./postgres"
import { sendMail } from "./services/resend-service"

function createAuth() {
  const secret = process.env.BETTER_AUTH_SECRET
  const origin = process.env.APP_URL
  if (!secret || secret.length < 32 || !origin) throw new Error("Autenticación no configurada")
  return betterAuth({
    appName: "Zntinel",
    secret,
    baseURL: origin,
    trustedOrigins: [new URL(origin).origin],
    database: getPool(),
    databaseHooks: { session: { create: { before: async session => {
      const profile = await getPool().query("SELECT id FROM perfiles WHERE id=$1 AND status='activo'", [session.userId])
      if (!profile.rowCount) throw new APIError("FORBIDDEN", { message: "Acceso denegado" })
      return { data: session }
    } } } },
    emailAndPassword: {
      enabled: true, disableSignUp: true, minPasswordLength: 12, maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        const safe = url.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;")
        const result = await sendMail(user.email, "Restablecer contraseña de Zntinel", `<p>Solicitaste cambiar tu contraseña.</p><p><a href="${safe}">Crear una nueva contraseña</a></p><p>Si no lo solicitaste, ignorá este correo.</p>`)
        if (!result.sent) throw new Error("Correo de recuperación no disponible")
      },
    },
    session: { expiresIn: 8 * 60 * 60, updateAge: 60 * 60, cookieCache: { enabled: false } },
    advanced: { database: { generateId: () => randomUUID() } },
    rateLimit: { enabled: true, storage: "database", window: 60, max: 30, customRules: {
      "/sign-in/email": { window: 600, max: 10 },
      "/request-password-reset": { window: 600, max: 5 },
    } },
    plugins: [nextCookies()],
  })
}

let instance: ReturnType<typeof createAuth> | undefined
export function getAuth() {
  return instance ??= createAuth()
}
