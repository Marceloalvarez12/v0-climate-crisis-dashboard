/**
 * lib/api.ts
 *
 * Helpers para llamadas a la API interna.
 * Centralizar aquí evita repetir `fetch + headers + JSON.stringify` en cada componente.
 *
 * Security: Authentication is handled by Supabase session cookies via middleware.
 * No API secrets are exposed to the client.
 */

import type { DbIncident, DbResource } from "@/lib/types"

const authHeaders = (): Record<string, string> => ({
  "Content-Type": "application/json",
})

// SWR fetcher genérico
export const fetcher = (url: string) =>
  fetch(url, {
    headers: { "Content-Type": "application/json" },
  }).then((res) => {
    if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`)
    return res.json()
  })

// ---------------------------------------------------------------------------
// Incidentes
// ---------------------------------------------------------------------------

export async function patchIncidente(id: string, updates: Record<string, unknown>) {
  const res = await fetch("/api/incidentes", {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ id, ...updates }),
  })
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`)
  return res.json() as Promise<DbIncident>
}

export async function createIncidente(body: Record<string, unknown>) {
  const res = await fetch("/api/incidentes", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`)
  return res.json() as Promise<DbIncident & { skipped?: boolean }>
}

// ---------------------------------------------------------------------------
// Recursos
// ---------------------------------------------------------------------------

export async function fetchRecursos(): Promise<DbResource[]> {
  const res = await fetch("/api/recursos", {
    headers: { "Content-Type": "application/json" },
  })
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`)
  return res.json()
}

export async function patchRecurso(
  id: string,
  updates: { estado?: string; incidente_id?: string | null },
) {
  const res = await fetch("/api/recursos", {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ id, ...updates }),
  })
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`)
  return res.json() as Promise<DbResource>
}
