"use client"

import { useMemo } from "react"
import useSWR from "swr"
import { fetcher } from "@/lib/api"
import type { Incident, DbIncident } from "@/lib/types"

/** Transforma una fila de Supabase al tipo local `Incident` */
export function dbToIncident(inc: DbIncident): Incident {
  return {
    id:             inc.id,
    type:           inc.tipo as Incident["type"],
    severity:       inc.severidad as Incident["severity"],
    location:       inc.ubicacion,
    coordinates:    { lat: inc.latitud, lng: inc.longitud },
    affectedPeople: inc.personas_afectadas,
    timestamp:      new Date(inc.created_at),
    source:         inc.fuente as Incident["source"],
    sourceDetails:  inc.fuente_detalles || {},
  }
}

/** Hook de incidentes activos con polling cada 5 s */
export function useIncidents() {
  const { data, error, mutate } = useSWR<DbIncident[]>("/api/incidentes", fetcher, {
    refreshInterval: 5000,
    revalidateOnFocus: false,
    dedupingInterval: 3000,
    keepPreviousData: true,
  })

  const incidents: Incident[] = useMemo(() => {
    if (!data || error) return []
    return data.map(dbToIncident)
  }, [data, error])

  return { incidents, mutate }
}

/** Hook de recursos con polling cada 3 s */
export function useResources() {
  return useSWR("/api/recursos", fetcher, { refreshInterval: 3000 })
}
