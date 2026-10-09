import { NextRequest, NextResponse } from "next/server"
import { checkRateLimit, RateLimitUnavailableError, type RateLimitResult } from "@/lib/rate-limit"
import { CONFIG } from "@/lib/config"

/**
 * Proxy (Next.js 16): build sin login. Todo es público — el gatekeeper sólo
 * aplica límite de tamaño de body y rate limiting a las APIs.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (!pathname.startsWith("/api/")) return NextResponse.next()

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
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp|css|js)$).*)"],
}
