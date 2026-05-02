"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useSWRConfig } from "swr"
import { buildRespawnIncident, SOCIAL_REPORTS, CAMERA_REPORTS, SENSOR_REPORTS } from "@/lib/mock-data"

// Plantillas base sin valores aleatorios — los aleatorios se calculan en spawnIncident()
// para que cada llamada genere valores distintos
const INCIDENT_TEMPLATES = [
  ...SOCIAL_REPORTS.map(r  => ({ tipo: r.tipo,  fuente: "social"  as const, ubicacion: r.zona.nombre, fuente_detalles: { platform: "X (Twitter)", username: r.fuente, content: r.texto, imageUrl: r.imageUrl } })),
  ...CAMERA_REPORTS.map(r => ({ tipo: r.tipo,  fuente: "camera"  as const, ubicacion: r.zona.nombre, fuente_detalles: { cameraId: r.cameraId, cameraLocation: r.zona.nombre, imageUrl: r.imageUrl } })),
  ...SENSOR_REPORTS.map(r  => ({ tipo: r.tipo,  fuente: "sensor"  as const, ubicacion: r.zona.nombre, fuente_detalles: { sensorId: r.sensorId, temperature: r.temperature, humidity: r.humidity, windSpeed: r.windSpeed, pressure: r.pressure } })),
]

export interface SimulationEvent {
  type: "incident_created" | "resource_dispatched" | "resource_arrived" | "incident_resolved" | "incident_respawned"
  message: string
  timestamp: Date
  incidentId?: string
  resourceId?: string
}

export interface ActiveDispatch {
  incidentId: string
  resourceId: string
  resourceName: string
  incidentLocation: string
  dispatchedAt: Date
  status: "en_camino" | "ocupado"
  etaSeconds: number
}

export function useSimulationLoop() {
  const { mutate } = useSWRConfig()
  const [isRunning, setIsRunning] = useState(false)
  const [events, setEvents] = useState<SimulationEvent[]>([])
  const [activeDispatches, setActiveDispatches] = useState<ActiveDispatch[]>([])
  const [incidentPool] = useState(INCIDENT_TEMPLATES)

  const spawnTimerRef = useRef<NodeJS.Timeout | null>(null)
  const dispatchTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  const addEvent = useCallback((event: Omit<SimulationEvent, "timestamp">) => {
    setEvents(prev => [{ ...event, timestamp: new Date() }, ...prev].slice(0, 20))
  }, [])

  // Crea un nuevo incidente en Supabase — combina coordenadas/zona aleatorias
  // de buildRespawnIncident con los detalles de la plantilla elegida
  const spawnIncident = useCallback(async () => {
    const template = incidentPool[Math.floor(Math.random() * incidentPool.length)]
    // buildRespawnIncident genera coordenadas, zona, severidad y personas_afectadas aleatorios
    const respawn = buildRespawnIncident({ tipo: template.tipo, fuente: template.fuente })

    try {
      const res = await fetch("/api/incidentes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // respawn first so template.fuente_detalles overrides the generic ones
        body: JSON.stringify({ ...respawn, fuente_detalles: template.fuente_detalles, estado: "activo" }),
      })
      const data = await res.json()
      mutate("/api/incidentes")
      addEvent({
        type: "incident_created",
        message: `Nuevo incidente en ${data.ubicacion}`,
        incidentId: data.id,
      })
      return data
    } catch {
      return null
    }
  }, [incidentPool, mutate, addEvent])

  // Despacha un recurso al incidente y arranca el timer de 10 seg
  const dispatchResource = useCallback(async (incidentId: string, incidentLocation: string) => {
    // Busca primer recurso disponible
    const res = await fetch("/api/recursos")
    const recursos = await res.json()
    const available = recursos.find((r: { id: string; estado: string }) => r.estado === "available")
    if (!available) {
      addEvent({ type: "resource_dispatched", message: "Sin recursos disponibles", incidentId })
      return
    }

    // Cambia estado del recurso a "en camino" (dispatched)
    await fetch("/api/recursos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: available.id, estado: "dispatched", incidente_id: incidentId }),
    })
    mutate("/api/recursos")

    const dispatch: ActiveDispatch = {
      incidentId,
      resourceId: available.id,
      resourceName: available.nombre,
      incidentLocation,
      dispatchedAt: new Date(),
      status: "en_camino",
      etaSeconds: 10,
    }
    setActiveDispatches(prev => [...prev, dispatch])
    addEvent({
      type: "resource_dispatched",
      message: `${available.nombre} en camino a ${incidentLocation}`,
      incidentId,
      resourceId: available.id,
    })

    // Despues de 10 segundos: recurso llega, incidente se resuelve, nuevo incidente aparece
    const timer = setTimeout(async () => {
      // 1. Recurso pasa a "ocupado"
      await fetch("/api/recursos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: available.id, estado: "busy" }),
      })
      mutate("/api/recursos")

      setActiveDispatches(prev =>
        prev.map(d => d.resourceId === available.id ? { ...d, status: "ocupado" } : d)
      )
      addEvent({
        type: "resource_arrived",
        message: `${available.nombre} llego a ${incidentLocation}`,
        incidentId,
        resourceId: available.id,
      })

      // 2. Incidente se marca como resuelto (desaparece del mapa)
      await fetch("/api/incidentes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: incidentId, estado: "atendido" }),
      })
      mutate("/api/incidentes")
      addEvent({
        type: "incident_resolved",
        message: `Incidente en ${incidentLocation} resuelto`,
        incidentId,
      })

      // 3. Nuevo incidente aparece en coordenadas aleatorias
      setTimeout(async () => {
        const newIncident = await spawnIncident()
        if (newIncident) {
          addEvent({
            type: "incident_respawned",
            message: `Nuevo incidente detectado en ${newIncident.ubicacion}`,
            incidentId: newIncident.id,
          })
        }
        // Limpia el despacho
        setActiveDispatches(prev => prev.filter(d => d.resourceId !== available.id))
      }, 1500)

      dispatchTimersRef.current.delete(available.id)
    }, 10000)

    dispatchTimersRef.current.set(available.id, timer)
  }, [mutate, addEvent, spawnIncident])

  // Inicia el loop: primer incidente inmediato, luego cada 15 seg
  const startSimulation = useCallback(async () => {
    setIsRunning(true)
    setEvents([])

    // Primer incidente inmediato
    await spawnIncident()

    spawnTimerRef.current = setInterval(async () => {
      await spawnIncident()
    }, 15000)
  }, [spawnIncident])

  // Detiene el loop y limpia timers
  const stopSimulation = useCallback(() => {
    setIsRunning(false)
    if (spawnTimerRef.current) clearInterval(spawnTimerRef.current)
    dispatchTimersRef.current.forEach(t => clearTimeout(t))
    dispatchTimersRef.current.clear()
    setActiveDispatches([])
    setEvents([])
  }, [])

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (spawnTimerRef.current) clearInterval(spawnTimerRef.current)
      dispatchTimersRef.current.forEach(t => clearTimeout(t))
    }
  }, [])

  return {
    isRunning,
    events,
    activeDispatches,
    startSimulation,
    stopSimulation,
    dispatchResource,
  }
}
