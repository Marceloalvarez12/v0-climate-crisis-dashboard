"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useSWRConfig } from "swr"

// Pool de incidentes simulados basados en datos reales de la app
const INCIDENT_POOL = [
  {
    tipo: "flood",
    severidad: "critical",
    ubicacion: "Centro Historico - Plaza Independencia",
    personas_afectadas: 1250,
    fuente: "social",
    fuente_detalles: {
      platform: "X (Twitter)",
      username: "@tucuman_alerta",
      content: "URGENTE: Inundacion severa en Plaza Independencia. El agua supera los 50cm. Vecinos atrapados en edificios. #InundacionTucuman",
      imageUrl: "https://images.unsplash.com/photo-1547683905-f686c993aae5?w=600",
    },
  },
  {
    tipo: "fire",
    severidad: "high",
    ubicacion: "Barrio Norte - Deposito Industrial",
    personas_afectadas: 340,
    fuente: "camera",
    fuente_detalles: {
      cameraId: "CAM-BN-047",
      cameraLocation: "Av. Mate de Luna esquina Laprida",
      imageUrl: "https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=600",
    },
  },
  {
    tipo: "storm",
    severidad: "high",
    ubicacion: "Banda del Rio Sali - Zona Industrial",
    personas_afectadas: 430,
    fuente: "social",
    fuente_detalles: {
      platform: "X (Twitter)",
      username: "@meteo_noa",
      content: "Alerta roja por tormenta electrica. Vientos de 85km/h. Arboles caidos en Av. Mitre. #TormentaTucuman",
      imageUrl: "https://images.unsplash.com/photo-1527482937786-6f4c6c3fd49c?w=600",
    },
  },
  {
    tipo: "flood",
    severidad: "high",
    ubicacion: "Barrio San Pablo - Canal Norte",
    personas_afectadas: 720,
    fuente: "social",
    fuente_detalles: {
      platform: "X (Twitter)",
      username: "@rescate_tucuman",
      content: "Canal San Pablo desbordado. Evacuacion de 180 familias en curso. Corte total de Av. Ejercito del Norte.",
      imageUrl: "https://images.unsplash.com/photo-1446824505046-e43605ffb17f?w=600",
    },
  },
  {
    tipo: "fire",
    severidad: "critical",
    ubicacion: "Villa 9 de Julio - Fabrica Textil",
    personas_afectadas: 560,
    fuente: "camera",
    fuente_detalles: {
      cameraId: "CAM-V9J-023",
      cameraLocation: "Av. Roca y Catamarca - Videovigilancia Municipal",
      imageUrl: "https://images.unsplash.com/photo-1486551937199-baf066858de7?w=600",
    },
  },
  {
    tipo: "flood",
    severidad: "critical",
    ubicacion: "Barrio Sur - Av. Roca",
    personas_afectadas: 980,
    fuente: "social",
    fuente_detalles: {
      platform: "X (Twitter)",
      username: "@emergencias_tuc",
      content: "EMERGENCIA MAXIMA en Barrio Sur. Hospital solicita evacuacion. Ambulancias no pueden acceder. #SOSTucuman",
      imageUrl: "https://images.unsplash.com/photo-1583245177184-4ab53e5e391a?w=600",
    },
  },
  {
    tipo: "storm",
    severidad: "medium",
    ubicacion: "Yerba Buena - Country Jockey Club",
    personas_afectadas: 890,
    fuente: "sensor",
    fuente_detalles: {
      sensorId: "WS-YB-012",
      temperature: 18,
      humidity: 94,
      windSpeed: 65,
      pressure: 1008,
    },
  },
  {
    tipo: "general",
    severidad: "low",
    ubicacion: "El Manantial - Ruta 301",
    personas_afectadas: 150,
    fuente: "sensor",
    fuente_detalles: {
      sensorId: "WS-EM-003",
      temperature: 22,
      humidity: 78,
      windSpeed: 25,
      pressure: 1015,
    },
  },
]

// Coordenadas aleatorias dentro de San Miguel de Tucuman
function randomCoords() {
  const lat = +((-26.80) - Math.random() * 0.04).toFixed(6) // entre -26.80 y -26.84
  const lng = +((-65.18) - Math.random() * 0.05).toFixed(6) // entre -65.18 y -65.23
  return { lat, lng }
}

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
  const [incidentPool] = useState(INCIDENT_POOL)

  const spawnTimerRef = useRef<NodeJS.Timeout | null>(null)
  const dispatchTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  const addEvent = useCallback((event: Omit<SimulationEvent, "timestamp">) => {
    setEvents(prev => [{ ...event, timestamp: new Date() }, ...prev].slice(0, 20))
  }, [])

  // Crea un nuevo incidente en Supabase con coordenadas dadas
  const spawnIncident = useCallback(async (coords?: { lat: number; lng: number }) => {
    const template = incidentPool[Math.floor(Math.random() * incidentPool.length)]
    const { lat, lng } = coords || randomCoords()

    try {
      const res = await fetch("/api/incidentes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...template,
          latitud: lat,
          longitud: lng,
          estado: "activo",
        }),
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
        body: JSON.stringify({ id: incidentId, estado: "resuelto" }),
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
