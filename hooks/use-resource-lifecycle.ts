"use client"

// Tiempos de transicion de estado del recurso
const DISPATCHED_TO_BUSY_MS = 50_000  // 50s: "en camino" → "ocupado"
const BUSY_TO_AVAILABLE_MS  = 60_000  // 60s: "ocupado"   → "disponible"

async function patchRecurso(id: string, estado: string) {
  await fetch("/api/recursos", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, estado }),
  })
}

/**
 * Despacha un recurso y encadena las transiciones de estado automaticamente:
 *   available → dispatched (inmediato)
 *   dispatched → busy      (15 segundos)
 *   busy → available       (20 segundos adicionales)
 *
 * Retorna el id del recurso despachado, o null si no habia ninguno disponible.
 */
export async function dispatchResourceWithLifecycle(
  incidenteId?: string
): Promise<string | null> {
  // 1. Buscar primer recurso disponible
  const res = await fetch("/api/recursos")
  const recursos: Array<{ id: string; estado: string }> = await res.json()
  const disponible = recursos.find((r) => r.estado === "available")
  if (!disponible) return null

  const recursoId = disponible.id

  // 2. dispatched (en camino) — inmediato
  await patchRecurso(recursoId, "dispatched")
  if (incidenteId) {
    await fetch("/api/recursos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: recursoId, estado: "dispatched", incidente_id: incidenteId }),
    })
  }

  // 3. busy (ocupado) — 15 segundos despues
  setTimeout(async () => {
    await patchRecurso(recursoId, "busy")

    // 4. available (disponible) — 20 segundos adicionales
    setTimeout(async () => {
      await patchRecurso(recursoId, "available")
    }, BUSY_TO_AVAILABLE_MS)
  }, DISPATCHED_TO_BUSY_MS)

  return recursoId
}
