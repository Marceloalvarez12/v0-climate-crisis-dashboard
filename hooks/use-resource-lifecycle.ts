import {
  RESOURCE_DISPATCHED_TO_BUSY_MS,
  RESOURCE_BUSY_TO_AVAILABLE_MS,
} from "@/lib/mock-data"
import { fetchRecursos, patchRecurso } from "@/lib/api"

interface ResourceTimers {
  busyTimer: ReturnType<typeof setTimeout>
  availableTimer: ReturnType<typeof setTimeout> | null
}

const activeTimers = new Map<string, ResourceTimers>()

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
      await patchRecurso(recursoId!, { estado: "available", incidente_id: null })
      activeTimers.delete(recursoId!)
    }, RESOURCE_BUSY_TO_AVAILABLE_MS)

    const existing = activeTimers.get(recursoId!)
    if (existing) {
      existing.availableTimer = availableTimer
    }
  }, RESOURCE_DISPATCHED_TO_BUSY_MS)

  activeTimers.set(recursoId!, { busyTimer, availableTimer: null })

  const cleanup = () => {
    const timers = activeTimers.get(recursoId!)
    if (timers) {
      clearTimeout(timers.busyTimer)
      if (timers.availableTimer) clearTimeout(timers.availableTimer)
      activeTimers.delete(recursoId!)
    }
  }

  return { recursoId, cleanup }
}

export function cleanupResourceLifecycle(recursoId: string) {
  const timers = activeTimers.get(recursoId)
  if (timers) {
    clearTimeout(timers.busyTimer)
    if (timers.availableTimer) clearTimeout(timers.availableTimer)
    activeTimers.delete(recursoId)
  }
}
