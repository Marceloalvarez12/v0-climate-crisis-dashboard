import { NextRequest, NextResponse } from "next/server"
import { getAuth } from "@/lib/auth-server"
import { getStaffProfile } from "@/lib/auth"
import { timingSafeEqual } from "node:crypto"
import { isPublicPath, isServicePath, roleCanAccess } from "@/lib/access-policy"
import { checkRateLimit, RateLimitUnavailableError, type RateLimitResult } from "@/lib/rate-limit"
import { CONFIG } from "@/lib/config"

/**
 * Sesión verificada y perfil activo para el centro operativo.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isApi = pathname.startsWith("/api/")
  if (isApi) {

  const contentLength = request.headers.get("content-length")
  if (contentLength && /^\d+$/.test(contentLength) && Number(contentLength) > CONFIG.HTTP.MAX_API_BODY_BYTES) {
    return NextResponse.json({ error: "Solicitud demasiado grande" }, { status: 413 })
  }
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip") || "unknown"
  const rejectQuota = (quota: RateLimitResult) => NextResponse.json({ error: "Demasiadas solicitudes" }, {
    status: 429,
    headers: {
      "Retry-After": String(Math.max(1, Math.ceil((quota.resetAt - Date.now()) / 1000))),
      "X-RateLimit-Remaining": "0",
      "X-RateLimit-Reset": String(Math.ceil(quota.resetAt / 1000)),
    },
  })
  try {
    const globalQuota = await checkRateLimit(`api:${ip}`)
    if (!globalQuota.allowed) return rejectQuota(globalQuota)
    if (request.method === "POST" && pathname === "/api/incidentes/zk-report") {
      const quota = await checkRateLimit(`report:${ip}`, CONFIG.RATE_LIMIT.MAX_REPORTS, CONFIG.RATE_LIMIT.REPORT_WINDOW_MS)
      if (!quota.allowed) return rejectQuota(quota)
    }
    if (request.method === "POST" && pathname === "/api/incidentes/zk-verify") {
      const quota = await checkRateLimit(`zk-verify:${ip}`, CONFIG.RATE_LIMIT.MAX_ZK_VERIFICATIONS)
      if (!quota.allowed) return rejectQuota(quota)
    }
  } catch (error) {
    if (!(error instanceof RateLimitUnavailableError)) throw error
    return NextResponse.json({ error: "Protección de solicitudes temporalmente no disponible" }, { status: 503, headers: { "Retry-After": "5" } })
  }
  }
  if (isPublicPath(pathname, request.method)) return NextResponse.next()
  const supplied = request.headers.get("x-api-secret")
  const configured = process.env.API_SECRET
  if (isServicePath(pathname) && supplied && configured) {
    const a = Buffer.from(supplied), b = Buffer.from(configured)
    if (a.length === b.length && timingSafeEqual(a, b)) return NextResponse.next()
  }
  const response = NextResponse.next()
  try {
    const session = await getAuth().api.getSession({ headers: request.headers })
    if (!session) return isApi ? NextResponse.json({ error: "No autorizado" }, { status: 401 })
      : NextResponse.redirect(new URL("/login", request.url))
    const profile = await getStaffProfile(session.user.id)
    if (!profile || profile.status !== "activo" || !roleCanAccess(pathname, request.method, profile.rol)) return isApi
      ? NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
      : NextResponse.redirect(new URL("/login?error=forbidden", request.url))
    return response
  } catch {
    return isApi ? NextResponse.json({ error: "Autenticación temporalmente no disponible" }, { status: 503 })
      : NextResponse.redirect(new URL("/login?error=unavailable", request.url))
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp|css|js)$).*)"],
}
