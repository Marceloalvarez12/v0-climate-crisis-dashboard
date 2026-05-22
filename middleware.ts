import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { checkRateLimit } from "@/lib/rate-limit"

const PUBLIC_PATHS = ["/_next", "/favicon.ico", "/login"]
const API_PATHS = ["/api/"]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Permitir acceso a rutas públicas estáticas
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Rate limiting para TODOS los métodos (incluyendo GET)
  if (API_PATHS.some((p) => pathname.startsWith(p))) {
    const ip = request.headers.get("x-forwarded-for") ?? "unknown"
    const rateLimit = checkRateLimit(ip)

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Demasiadas peticiones. Intentá de nuevo en unos segundos." },
        { status: 429 }
      )
    }

    // Auth check: session OR API_SECRET
    const method = request.method
    const requiresAuth = method !== "GET"

    if (requiresAuth) {
      // Primero intentar autenticar por sesión de Supabase
      const response = NextResponse.next({
        request: { headers: request.headers },
      })

      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll()
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value }) =>
                response.cookies.set(name, value)
              )
            },
          },
        }
      )

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session) {
        // Usuario autenticado por sesión - permitir request
        return response
      }

      // Fallback: verificar API_SECRET para requests server-to-server
      if (process.env.API_SECRET) {
        const authHeader = request.headers.get("x-api-secret")
        if (authHeader === process.env.API_SECRET) {
          return NextResponse.next()
        }
      }

      // Sin autenticación válida
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    return NextResponse.next()
  }

  // Create response that will carry the cookies
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            response.cookies.set(name, value)
          )
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

  // Verificar rol y estado del usuario
  const { data: profile } = await supabase
    .from("perfiles")
    .select("rol, status")
    .eq("id", session.user.id)
    .single()

  // Usuario suspendido → cerrar sesión y redirigir al login
  if (profile?.status === "suspendido") {
    const loginUrl = new URL("/login?error=suspended", request.url)
    return NextResponse.redirect(loginUrl)
  }

  const userRole = profile?.rol

  // No-admin intenta acceder a /admin → redirigir a /
  if (userRole !== "admin" && pathname === "/admin") {
    return NextResponse.redirect(new URL("/", request.url))
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.*|apple-icon.*|.*\\.png|.*\\.jpg|.*\\.svg|.*\\.ico).*)",
  ],
}
