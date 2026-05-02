"use client"

import {
  RESOURCE_DISPATCHED_TO_BUSY_MS,
  RESOURCE_BUSY_TO_AVAILABLE_MS,
} from "@/lib/mock-data"
import { fetchRecursos, patchRecurso } from "@/lib/api"

/**
 * Despacha un recurso específico (o el primero disponible si no se pasa resourceId)
 * y encadena las transiciones de estado automáticamente:
 *   available → dispatched (inmediato)
 *   dispatched → busy      (50 segundos)
 *   busy → available       (60 segundos adicionales)
 */
export async function dispatchResourceWithLifecycle(
  incidenteId?: string,
  resourceId?: string,
): Promise<string | null> {
  let recursoId = resourceId

  // Si no se pasó un id específico, buscar el primer recurso disponible
  if (!recursoId) {
    const recursos = await fetchRecursos()
    const disponible = recursos.find((r) => r.estado === "available")
    if (!disponible) return null
    recursoId = disponible.id
  }

  // dispatched (en camino) — inmediato
  await patchRecurso(recursoId, {
    estado: "dispatched",
    incidente_id: incidenteId ?? null,
  })

  // busy (ocupado) — 50 segundos después
  setTimeout(async () => {
    await patchRecurso(recursoId!, { estado: "busy" })

    // available (disponible) — 60 segundos adicionales
    setTimeout(async () => {
      await patchRecurso(recursoId!, { estado: "available" })
    }, RESOURCE_BUSY_TO_AVAILABLE_MS)
  }, RESOURCE_DISPATCHED_TO_BUSY_MS)

  return recursoId
}
