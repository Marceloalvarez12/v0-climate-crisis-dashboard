import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { checkRateLimit } from "@/lib/rate-limit"

const PUBLIC_PATHS = ["/_next", "/favicon.ico", "/api/analytics", "/api/recursos", "/api/incidentes", "/login"]
const API_PATHS = ["/api/"]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Permitir acceso a rutas públicas estáticas
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Lógica de rate limiting y API_SECRET para rutas /api/*
  if (API_PATHS.some((p) => pathname.startsWith(p))) {
    const ip = request.headers.get("x-forwarded-for") ?? request.ip ?? "unknown"
    const rateLimit = checkRateLimit(ip)

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Demasiadas peticiones. Intentá de nuevo en unos segundos." },
        { status: 429 }
      )
    }

    const apiSecret = process.env.API_SECRET

    if (apiSecret) {
      const authHeader = request.headers.get("x-api-secret")
      const urlSecret = request.nextUrl.searchParams.get("secret")

      if (authHeader !== apiSecret && urlSecret !== apiSecret) {
        return NextResponse.json(
          { error: "No autorizado" },
          { status: 401 }
        )
      }
    }

    return NextResponse.next()
  }

  // Verificar autenticación para todas las demás rutas (dashboard protegido)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll() {
          // No necesitamos setear cookies en el middleware
        },
      },
    }
  )

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Sin sesión → redirigir al login
  if (!session) {
    const loginUrl = new URL("/login", request.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.*|apple-icon.*).*)",
  ],
}
