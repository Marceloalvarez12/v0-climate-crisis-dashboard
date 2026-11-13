const matches = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`)
const PUBLIC_PAGES = ["/login", "/recuperar", "/restablecer", "/auth/callback", "/mapa", "/reportar", "/seguimiento", "/auditoria", "/stellar-auditoria"]
const PUBLIC_APIS = ["/api/auth", "/api/incidentes/arkiv-verify", "/api/incidentes/zk-report", "/api/incidentes/zk-verify", "/api/stellar/verify", "/api/stellar/selector", "/api/stellar/audit", "/api/public"]

export function isPublicPath(path: string, method: string): boolean {
  if (!path.startsWith("/api/")) return PUBLIC_PAGES.some(prefix => matches(path, prefix))
  return PUBLIC_APIS.some(prefix => matches(path, prefix)) ||
    (method === "GET" && /^\/api\/incidentes\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(path))
}

export const isServicePath = (path: string) => ["/api/agent", "/api/social/mention"].includes(path)

export function roleCanAccess(path: string, method: string, role: string): boolean {
  if (matches(path, "/admin") || (path === "/api/agent" && method !== "GET")) return role === "admin"
  return !path.startsWith("/api/") || method === "GET" || ["admin", "operador"].includes(role)
}
