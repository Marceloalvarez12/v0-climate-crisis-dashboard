import { getAuth } from "@/lib/auth-server"
import { isMailConfigured } from "@/lib/services/resend-service"

export const runtime = "nodejs"
async function handle(request: Request) {
  if (new URL(request.url).pathname === "/api/auth/request-password-reset" && !isMailConfigured()) {
    return Response.json({ error: "Recuperación temporalmente no disponible" }, { status: 503 })
  }
  try { return await getAuth().handler(request) }
  catch { return Response.json({ error: "Autenticación temporalmente no disponible" }, { status: 503 }) }
}
export { handle as GET, handle as POST }
