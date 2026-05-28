import {
  RESOURCE_DISPATCHED_TO_BUSY_MS,
  RESOURCE_BUSY_TO_AVAILABLE_MS,
} from "@/lib/mock-data"
import { fetchRecursos, patchRecurso } from "@/lib/api"

interface ResourceTimers {
  busyTimer: ReturnType<typeof setTimeout>
  availableTimer: ReturnType<typeof setTimeout> | null
  cantidadToRestore: number
}

interface PersistedResourceState {
  resourceId: string
  estado: "dispatched" | "busy"
  cantidadToRestore: number
  timestamp: number
  incidenteId: string | null
}

const PERSISTENCE_KEY = "crisis-dashboard-resource-timers"
const activeTimers = new Map<string, ResourceTimers>()

function loadPersistedStates(): PersistedResourceState[] {
  try {
    const raw = localStorage.getItem(PERSISTENCE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as PersistedResourceState[]
    const now = Date.now()
    return parsed.filter((s) => now - s.timestamp < RESOURCE_DISPATCHED_TO_BUSY_MS + RESOURCE_BUSY_TO_AVAILABLE_MS + 10000)
  } catch {
    return []
  }
}

function savePersistedStates(states: PersistedResourceState[]) {
  try {
    localStorage.setItem(PERSISTENCE_KEY, JSON.stringify(states))
  } catch {
    // ignore storage errors
  }
}

function addPersistedState(state: PersistedResourceState) {
  const existing = loadPersistedStates()
  const filtered = existing.filter((s) => s.resourceId !== state.resourceId)
  savePersistedStates([...filtered, state])
}

function removePersistedState(resourceId: string) {
  const existing = loadPersistedStates()
  savePersistedStates(existing.filter((s) => s.resourceId !== resourceId))
}

export async function dispatchResourceWithLifecycle(
  resourceIdOrIncidenteId: string,
  cantidadOrResourceId?: number | string,
  incidenteId?: string,
): Promise<{ cleanup: () => void; recursoId?: string }> {
  let resourceId: string
  let cantidadDispatched: number

  if (typeof cantidadOrResourceId === "number") {
    resourceId = resourceIdOrIncidenteId
    cantidadDispatched = cantidadOrResourceId
  } else {
    const recursos = await fetchRecursos()
    const disponible = recursos.find((r) => {
      const disp = r.cantidad_disponible ?? (r.cantidad || 1)
      return disp > 0
    })
    if (!disponible) return { cleanup: () => {} }
    resourceId = disponible.id
    cantidadDispatched = 1
    incidenteId = resourceIdOrIncidenteId
  }
  const existing = activeTimers.get(resourceId)

  if (existing) {
    existing.cantidadToRestore += cantidadDispatched
    addPersistedState({
      resourceId,
      estado: existing.busyTimer ? "dispatched" : "busy",
      cantidadToRestore: existing.cantidadToRestore,
      timestamp: Date.now(),
      incidenteId: incidenteId ?? null,
    })
    return { cleanup: () => cleanupResourceLifecycle(resourceId) }
  }

  addPersistedState({
    resourceId,
    estado: "dispatched",
    cantidadToRestore: cantidadDispatched,
    timestamp: Date.now(),
    incidenteId: incidenteId ?? null,
  })

  const busyTimer = setTimeout(async () => {
    await patchRecurso(resourceId, { estado: "busy" })

    addPersistedState({
      resourceId,
      estado: "busy",
      cantidadToRestore: cantidadDispatched,
      timestamp: Date.now(),
      incidenteId: incidenteId ?? null,
    })

    const availableTimer = setTimeout(async () => {
      const timers = activeTimers.get(resourceId)
      const toRestore = timers?.cantidadToRestore ?? cantidadDispatched

      const { data: current } = await fetch("/api/recursos").then((r) => r.json()).then((arr: any[]) => arr.find((x: any) => x.id === resourceId)).catch(() => null)

      if (current) {
        const currentDisponible = current.cantidad_disponible ?? (current.cantidad || 1)
        const newDisponible = Math.min(current.cantidad || 1, currentDisponible + toRestore)
        await patchRecurso(resourceId, {
          estado: "available",
          cantidad_disponible: newDisponible,
          incidente_id: null,
        })
      }

      activeTimers.delete(resourceId)
      removePersistedState(resourceId)
    }, RESOURCE_BUSY_TO_AVAILABLE_MS)

    const existingTimers = activeTimers.get(resourceId)
    if (existingTimers) {
      existingTimers.availableTimer = availableTimer
    }
  }, RESOURCE_DISPATCHED_TO_BUSY_MS)

  activeTimers.set(resourceId, { busyTimer, availableTimer: null, cantidadToRestore: cantidadDispatched })

  const cleanup = () => {
    cleanupResourceLifecycle(resourceId)
  }

  return { cleanup, recursoId: resourceId }
}

export async function restoreResourceTimersOnMount() {
  const persisted = loadPersistedStates()
  const now = Date.now()

  for (const state of persisted) {
    if (activeTimers.has(state.resourceId)) continue

    const elapsed = now - state.timestamp

    if (state.estado === "dispatched") {
      const remainingToBusy = RESOURCE_DISPATCHED_TO_BUSY_MS - elapsed

      if (remainingToBusy <= 0) {
        await patchRecurso(state.resourceId, { estado: "busy" })

        const remainingToAvailable = RESOURCE_BUSY_TO_AVAILABLE_MS - Math.max(0, elapsed - RESOURCE_DISPATCHED_TO_BUSY_MS)

        if (remainingToAvailable <= 0) {
          const { data: current } = await fetch("/api/recursos").then((r) => r.json()).then((arr: any[]) => arr.find((x: any) => x.id === state.resourceId)).catch(() => ({ cantidad: 1, cantidad_disponible: 1 }))

          if (current) {
            const currentDisponible = current.cantidad_disponible ?? (current.cantidad || 1)
            const newDisponible = Math.min(current.cantidad || 1, currentDisponible + state.cantidadToRestore)
            await patchRecurso(state.resourceId, {
              estado: "available",
              cantidad_disponible: newDisponible,
              incidente_id: null,
            })
          }
          removePersistedState(state.resourceId)
          continue
        }

        const availableTimer = setTimeout(async () => {
          const { data: current } = await fetch("/api/recursos").then((r) => r.json()).then((arr: any[]) => arr.find((x: any) => x.id === state.resourceId)).catch(() => ({ cantidad: 1, cantidad_disponible: 1 }))

          if (current) {
            const currentDisponible = current.cantidad_disponible ?? (current.cantidad || 1)
            const newDisponible = Math.min(current.cantidad || 1, currentDisponible + state.cantidadToRestore)
            await patchRecurso(state.resourceId, {
              estado: "available",
              cantidad_disponible: newDisponible,
              incidente_id: null,
            })
          }
          activeTimers.delete(state.resourceId)
          removePersistedState(state.resourceId)
        }, remainingToAvailable)

        activeTimers.set(state.resourceId, { busyTimer: setTimeout(() => {}, 0), availableTimer, cantidadToRestore: state.cantidadToRestore })
      } else {
        const busyTimer = setTimeout(async () => {
          await patchRecurso(state.resourceId, {
            estado: "busy",
          })

          const availableTimer = setTimeout(async () => {
            const { data: current } = await fetch("/api/recursos").then((r) => r.json()).then((arr: any[]) => arr.find((x: any) => x.id === state.resourceId)).catch(() => ({ cantidad: 1, cantidad_disponible: 1 }))

            if (current) {
              const currentDisponible = current.cantidad_disponible ?? (current.cantidad || 1)
              const newDisponible = Math.min(current.cantidad || 1, currentDisponible + state.cantidadToRestore)
              await patchRecurso(state.resourceId, {
                estado: "available",
                cantidad_disponible: newDisponible,
                incidente_id: null,
              })
            }
            activeTimers.delete(state.resourceId)
            removePersistedState(state.resourceId)
          }, RESOURCE_BUSY_TO_AVAILABLE_MS)

          const existing = activeTimers.get(state.resourceId)
          if (existing) {
            existing.availableTimer = availableTimer
          }
        }, remainingToBusy)

        activeTimers.set(state.resourceId, { busyTimer, availableTimer: null, cantidadToRestore: state.cantidadToRestore })
      }
    } else if (state.estado === "busy") {
      const remainingToAvailable = RESOURCE_BUSY_TO_AVAILABLE_MS - elapsed

      if (remainingToAvailable <= 0) {
        const { data: current } = await fetch("/api/recursos").then((r) => r.json()).then((arr: any[]) => arr.find((x: any) => x.id === state.resourceId)).catch(() => ({ cantidad: 1, cantidad_disponible: 1 }))

        if (current) {
          const currentDisponible = current.cantidad_disponible ?? (current.cantidad || 1)
          const newDisponible = Math.min(current.cantidad || 1, currentDisponible + state.cantidadToRestore)
          await patchRecurso(state.resourceId, {
            estado: "available",
            cantidad_disponible: newDisponible,
            incidente_id: null,
          })
        }
        removePersistedState(state.resourceId)
        continue
      }

      const availableTimer = setTimeout(async () => {
        const { data: current } = await fetch("/api/recursos").then((r) => r.json()).then((arr: any[]) => arr.find((x: any) => x.id === state.resourceId)).catch(() => ({ cantidad: 1, cantidad_disponible: 1 }))

        if (current) {
          const currentDisponible = current.cantidad_disponible ?? (current.cantidad || 1)
          const newDisponible = Math.min(current.cantidad || 1, currentDisponible + state.cantidadToRestore)
          await patchRecurso(state.resourceId, {
            estado: "available",
            cantidad_disponible: newDisponible,
            incidente_id: null,
          })
        }
        activeTimers.delete(state.resourceId)
        removePersistedState(state.resourceId)
      }, remainingToAvailable)

      activeTimers.set(state.resourceId, { busyTimer: setTimeout(() => {}, 0), availableTimer, cantidadToRestore: state.cantidadToRestore })
    }
  }
}

export function cleanupResourceLifecycle(resourceId: string) {
  const timers = activeTimers.get(resourceId)
  if (timers) {
    clearTimeout(timers.busyTimer)
    if (timers.availableTimer) clearTimeout(timers.availableTimer)
    activeTimers.delete(resourceId)
  }
  removePersistedState(resourceId)
}
