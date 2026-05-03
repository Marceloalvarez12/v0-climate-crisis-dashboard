"use client"

import {
  RESOURCE_DISPATCHED_TO_BUSY_MS,
  RESOURCE_BUSY_TO_AVAILABLE_MS,
} from "@/lib/mock-data"
import { fetchRecursos, patchRecurso } from "@/lib/api"

const activeTimers = new Map<string, ReturnType<typeof setTimeout>>()

export async function dispatchResourceWithLifecycle(
  incidenteId?: string,
  resourceId?: string,
): Promise<{ recursoId: string | null; cleanup: () => void }> {
  let recursoId = resourceId

  if (!recursoId) {
    const recursos = await fetchRecursos()
    const disponible = recursos.find((r) => r.estado === "available")
    if (!disponible) return { recursoId: null, cleanup: () => {} }
    recursoId = disponible.id
  }

  await patchRecurso(recursoId, {
    estado: "dispatched",
    incidente_id: incidenteId ?? null,
  })

  const busyTimer = setTimeout(async () => {
    await patchRecurso(recursoId!, { estado: "busy" })
    const availableTimer = setTimeout(async () => {
      await patchRecurso(recursoId!, { estado: "available" })
      activeTimers.delete(recursoId!)
    }, RESOURCE_BUSY_TO_AVAILABLE_MS)
    activeTimers.set(recursoId!, availableTimer)
  }, RESOURCE_DISPATCHED_TO_BUSY_MS)

  activeTimers.set(recursoId!, busyTimer)

  const cleanup = () => {
    const timer = activeTimers.get(recursoId!)
    if (timer) {
      clearTimeout(timer)
      activeTimers.delete(recursoId!)
    }
  }

  return { recursoId, cleanup }
}

export function cleanupResourceLifecycle(recursoId: string) {
  const timer = activeTimers.get(recursoId)
  if (timer) {
    clearTimeout(timer)
    activeTimers.delete(recursoId)
  }
}