"use client"

import { RESOURCE_DISPATCHED_TO_BUSY_MS, RESOURCE_BUSY_TO_AVAILABLE_MS } from "@/lib/mock-data"

// Aliases locales para legibilidad
const DISPATCHED_TO_BUSY_MS = RESOURCE_DISPATCHED_TO_BUSY_MS
const BUSY_TO_AVAILABLE_MS  = RESOURCE_BUSY_TO_AVAILABLE_MS

async function patchRecurso(id: string, estado: string) {
  await fetch("/api/recursos", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, estado }),
  })
}

/**
 * Despacha un recurso especifico (o el primero disponible si no se pasa resourceId)
 * y encadena las transiciones de estado automaticamente:
 *   available → dispatched (inmediato)
 *   dispatched → busy      (50 segundos)
 *   busy → available       (60 segundos adicionales)
 */
export async function dispatchResourceWithLifecycle(
  incidenteId?: string,
  resourceId?: string,
): Promise<string | null> {
  let recursoId = resourceId

  // Si no se paso un id especifico, buscar el primer recurso disponible
  if (!recursoId) {
    const res = await fetch("/api/recursos")
    const recursos: Array<{ id: string; estado: string }> = await res.json()
    const disponible = recursos.find((r) => r.estado === "available")
    if (!disponible) return null
    recursoId = disponible.id
  }

  // dispatched (en camino) — inmediato
  await fetch("/api/recursos", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: recursoId, estado: "dispatched", incidente_id: incidenteId ?? null }),
  })

  // busy (ocupado) — 50 segundos despues
  setTimeout(async () => {
    await patchRecurso(recursoId!, "busy")

    // available (disponible) — 60 segundos adicionales
    setTimeout(async () => {
      await patchRecurso(recursoId!, "available")
    }, BUSY_TO_AVAILABLE_MS)
  }, DISPATCHED_TO_BUSY_MS)

  return recursoId
}
