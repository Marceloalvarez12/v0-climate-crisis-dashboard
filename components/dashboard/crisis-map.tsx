"use client"

import { useState, useEffect, useMemo } from "react"
import dynamic from "next/dynamic"
import { MapPin, Layers } from "lucide-react"
import { cn } from "@/lib/utils"
import { dispatchResourceWithLifecycle, restoreResourceTimersOnMount } from "@/hooks/use-resource-lifecycle"
import { buildRespawnIncident } from "@/lib/mock-data"
import { patchIncidente, createIncidente, patchRecursoBatch } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { toast } from "sonner"
import type { Incident, IncidentSource, DbIncident, DbResource } from "@/lib/types"
import { useIncidents, useResources } from "./crisis-map/use-map-data"
import { IncidentIcon, SourceIcon, severityColorClass, sourceLabel, incidentTypeLabel } from "./crisis-map/incident-helpers"
import { createLeafletIcon, LEAFLET_DARK_STYLES } from "./crisis-map/leaflet-icon"
import { IncidentDetailModal, DeployModal } from "./crisis-map/map-modals"
import { getCurrentOperatorAssignments } from "@/app/admin/actions"
import { groupResourcesByTypeAndBase } from "@/lib/resource-helpers"

const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false })
const TileLayer    = dynamic(() => import("react-leaflet").then((m) => m.TileLayer),    { ssr: false })
const Marker       = dynamic(() => import("react-leaflet").then((m) => m.Marker),       { ssr: false })

const MAP_CENTER: [number, number] = [-26.8241, -65.2226]
const SOURCE_TYPES: IncidentSource[] = ["social", "sensor", "camera"]

const SEVERITY_LEGENDS = [
  { label: "Critical", color: "bg-primary" },
  { label: "High",     color: "bg-accent" },
  { label: "Medium",   color: "bg-yellow-500" },
  { label: "Low",      color: "bg-success" },
]

export function CrisisMap() {
  const [isClient, setIsClient] = useState(false)
  const [leafletCssLoaded, setLeafletCssLoaded] = useState(false)
  const [selectedIncident,   setSelectedIncident]   = useState<Incident | null>(null)
  const [showDeployModal,    setShowDeployModal]     = useState(false)
  const [activeLayers,       setActiveLayers]       = useState<IncidentSource[]>(SOURCE_TYPES)
  const [deployingResources, setDeployingResources] = useState(false)
  const [deploySuccess,      setDeploySuccess]      = useState(false)
  const [selectedCounts,     setSelectedCounts]     = useState<Record<string, number>>({})
  const [assignedResourceIds, setAssignedResourceIds] = useState<Set<string> | null>(null)
  const [stableIncidents, setStableIncidents] = useState<Incident[]>([])

  const { incidents: dbIncidents, mutate: mutateIncidents } = useIncidents()
  const { data: dbRecursos, mutate: mutateRecursos }        = useResources()

  useEffect(() => {
    if (dbIncidents !== undefined && dbIncidents.length > 0) {
      setStableIncidents(dbIncidents)
    }
  }, [dbIncidents])

  useEffect(() => {
    let cancelled = false
    const timeout = setTimeout(() => {
      if (!cancelled) setAssignedResourceIds(null)
    }, 5000)

    getCurrentOperatorAssignments()
      .then((ids) => {
        if (!cancelled) setAssignedResourceIds(new Set(ids))
      })
      .catch(() => {
        if (!cancelled) setAssignedResourceIds(null)
      })
      .finally(() => clearTimeout(timeout))

    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [])

  const incidents: Incident[] = stableIncidents

  const resourceGroups = useMemo(() => {
    if (!dbRecursos) return []
    const filtered = assignedResourceIds !== null && assignedResourceIds.size > 0
      ? dbRecursos.filter((r: DbResource) => assignedResourceIds.has(r.id))
      : dbRecursos

    const grouped = groupResourcesByTypeAndBase(filtered as DbResource[])
    return grouped.filter((g) => g.totalDisponible > 0)
  }, [dbRecursos, assignedResourceIds])

  useEffect(() => {
    setIsClient(true)
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
    document.head.appendChild(link)
    setLeafletCssLoaded(true)

    restoreResourceTimersOnMount().catch((err) => console.error("[CrisisMap] Error restoring resource timers:", err))

    return () => {
      document.head.removeChild(link)
    }
  }, [])

  const toggleLayer = (layer: IncidentSource) => {
    setActiveLayers((prev) =>
      prev.includes(layer) ? prev.filter((l) => l !== layer) : [...prev, layer]
    )
  }

  const filteredIncidents = incidents.filter((i) => activeLayers.includes(i.source))

  const handleOpenDeploy = () => {
    setDeploySuccess(false)
    setSelectedCounts({})
    mutateRecursos()
    setShowDeployModal(true)
  }

  const handleCloseDeploy = () => {
    setShowDeployModal(false)
    setDeploySuccess(false)
    setSelectedCounts({})
    mutateRecursos()
  }

  const adjustCount = (key: string, delta: number, max: number) => {
    setSelectedCounts((prev) => {
      const next = Math.min(max, Math.max(0, (prev[key] ?? 0) + delta))
      return { ...prev, [key]: next }
    })
  }

  const handleDeployResources = async () => {
    const totalSelected = Object.values(selectedCounts).reduce((a, b) => a + b, 0)
    if (totalSelected === 0) { toast.error("Select at least one resource to deploy"); return }

    const incidenteId = selectedIncident?.id

    const deployments: Array<{ resourceId: string; cantidad: number }> = []

    for (const [groupKey, count] of Object.entries(selectedCounts)) {
      if (count === 0) continue
      const [tipo, ubicacion] = groupKey.split("|")

      const matchingResources = resourceGroups.filter(
        (g) => g.tipo === tipo && g.ubicacion === ubicacion && g.totalDisponible > 0
      )

      let remaining = count
      for (const group of matchingResources) {
        if (remaining <= 0) break
        for (const resource of group.resources) {
          if (remaining <= 0) break
          const rDisponible = resource.cantidad_disponible ?? (resource.cantidad || 1)
          if (rDisponible <= 0) continue

          const toDispatch = Math.min(remaining, rDisponible)
          deployments.push({ resourceId: resource.id, cantidad: toDispatch })
          remaining -= toDispatch
        }
      }
    }

    setDeployingResources(true)

    if (dbRecursos) {
      const deployedIds = deployments.map((d) => d.resourceId)
      mutateRecursos(
        dbRecursos.map((r: DbResource) => {
          if (!deployedIds.includes(r.id)) return r
          const deployment = deployments.find((d) => d.resourceId === r.id)
          if (!deployment) return r
          const newDisponible = (r.cantidad_disponible ?? (r.cantidad || 1)) - deployment.cantidad
          return { ...r, cantidad_disponible: newDisponible }
        }),
        false,
      )
    }

    if (incidenteId) {
      await patchIncidente(incidenteId, { estado: "atendido" }).catch((err) => console.error("[CrisisMap] Error updating incident:", err))
      mutateIncidents()

      const batchUpdates = deployments.map((d) => ({
        id: d.resourceId,
        cantidad_disponible: undefined as number | undefined,
      }))

      for (const deployment of deployments) {
        const resource = dbRecursos?.find((r: DbResource) => r.id === deployment.resourceId)
        if (!resource) continue
        const currentDisponible = resource.cantidad_disponible ?? (resource.cantidad || 1)
        const newDisponible = Math.max(0, currentDisponible - deployment.cantidad)

        await fetch("/api/recursos", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: deployment.resourceId,
            cantidad_disponible: newDisponible,
            incidente_id: incidenteId,
          }),
        }).catch((err) => console.error("[CrisisMap] Error updating resource:", err))

        await dispatchResourceWithLifecycle(deployment.resourceId, deployment.cantidad, incidenteId).catch((err) => console.error("[CrisisMap] Error starting lifecycle:", err))
      }

      await mutateRecursos()
    }

    setDeployingResources(false)
    setDeploySuccess(true)

    if (incidenteId) {
      const incidenteTipo = selectedIncident?.type
      const incidenteFuente = selectedIncident?.source
      setTimeout(async () => {
        const respawn = buildRespawnIncident({ tipo: incidenteTipo, fuente: incidenteFuente })
        await createIncidente(respawn).catch((err) => console.error("[CrisisMap] Error creating respawn incident:", err))
      }, 90_000)
    }

    toast.success(`Resources deployed to ${selectedIncident?.location}`, {
      description: `${totalSelected} unit(s) on their way`,
    })

    setTimeout(() => {
      setShowDeployModal(false)
      setDeploySuccess(false)
      setSelectedCounts({})
      mutateRecursos()
    }, 2000)
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-lg border border-border bg-card md:relative">
      <div className="absolute left-0 right-0 top-0 z-[1000] flex flex-wrap items-center gap-x-2 gap-y-1.5 border-b border-border bg-card/95 px-3 py-2 backdrop-blur-sm">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
          <h2 className="truncate text-xs font-semibold text-foreground sm:text-sm">
            San Miguel de Tucumán — Incident Map
          </h2>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-6 gap-1 border-border px-2 text-[10px]">
                <Layers className="h-3 w-3" />
                Layers ({activeLayers.length})
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3" align="end">
              <div className="space-y-3">
                <p className="text-xs font-medium text-foreground">Filter by Source</p>
                <div className="space-y-2">
                  {SOURCE_TYPES.map((layer) => (
                    <label key={layer} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={activeLayers.includes(layer)}
                        onCheckedChange={() => toggleLayer(layer)}
                      />
                      <div className="flex items-center gap-1.5">
                        <SourceIcon source={layer} />
                        <span className="text-xs">{sourceLabel(layer)}</span>
                      </div>
                      <Badge variant="outline" className="ml-auto text-[10px] h-5">
                        {incidents.filter((i) => i.source === layer).length}
                      </Badge>
                    </label>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {(["critical", "high", "medium", "low"] as const).map((sev) => {
            const colorMap = {
              critical: "border-primary/50 bg-primary/10 text-primary",
              high:     "border-accent/50 bg-accent/10 text-accent",
              medium:   "border-yellow-500/50 bg-yellow-500/10 text-yellow-400",
              low:      "border-success/50 bg-success/10 text-success",
            }
            const labelMap = { critical: "Critical", high: "High", medium: "Medium", low: "Low" }
            return (
              <Badge
                key={sev}
                variant="outline"
                className={cn("hidden text-[10px] sm:inline-flex", colorMap[sev])}
              >
                {filteredIncidents.filter((i) => i.severity === sev).length} {labelMap[sev]}
              </Badge>
            )
          })}
        </div>
      </div>

      <div className="relative z-10 mt-0 w-full rounded-none border-b border-border bg-card/95 backdrop-blur-sm shadow-none md:absolute md:right-3 md:top-14 md:z-[1000] md:w-72 md:max-h-[420px] md:rounded-lg md:border md:shadow-xl">
        <div className="flex items-center justify-between border-b border-border bg-card px-3 py-2 rounded-t-lg">
          <p className="text-xs font-semibold text-foreground">Active Incidents ({filteredIncidents.length})</p>
          <Badge variant="outline" className="text-[9px] border-primary/50 text-primary animate-pulse">Live</Badge>
        </div>
        <div className="overflow-y-auto max-h-48 p-2 space-y-1.5 custom-scrollbar md:max-h-[370px]">
          {filteredIncidents.map((incident) => (
            <button
              key={incident.id}
              onClick={() => setSelectedIncident(incident)}
              className={cn(
                "w-full text-left rounded-lg border p-2 transition-all hover:bg-secondary/50 hover:scale-[1.01]",
                incident.severity === "critical" ? "border-primary/50 bg-primary/5" :
                incident.severity === "high"     ? "border-accent/50 bg-accent/5"   : "border-border",
              )}
            >
              <div className="flex items-start gap-2">
                <div className={cn("rounded-full p-1.5 flex items-center justify-center shrink-0", severityColorClass(incident.severity))}>
                  <IncidentIcon type={incident.type} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{incident.location}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[9px] h-4 px-1">
                      {incidentTypeLabel(incident.type)}
                    </Badge>
                    <span className="text-[9px] text-muted-foreground">{incident.affectedPeople} affected</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {isClient && leafletCssLoaded ? (
        <div className="h-[400px] w-full shrink-0 pt-10 md:h-full md:flex-1">
          <style>{LEAFLET_DARK_STYLES}</style>
          <MapContainer center={MAP_CENTER} zoom={13} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            {filteredIncidents.map((incident) => {
              const icon = createLeafletIcon(incident.severity, incident.type, incident.source)
              if (!icon) return null
              return (
                <Marker
                  key={incident.id}
                  position={[incident.coordinates.lat, incident.coordinates.lng]}
                  icon={icon}
                  eventHandlers={{ click: () => setSelectedIncident(incident) }}
                />
              )
            })}
          </MapContainer>
        </div>
      ) : (
        <div className="flex h-[400px] w-full items-center justify-center bg-secondary/30 md:h-full md:flex-1">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-xs">Loading map...</p>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-[1000] flex flex-wrap gap-1.5 rounded-lg border border-border bg-card/95 px-2.5 py-1.5 backdrop-blur-sm">
        {SEVERITY_LEGENDS.map((legend) => (
          <div key={legend.label} className="flex items-center gap-1">
            <div className={cn("h-2 w-2 rounded-full", legend.color)} />
            <span className="text-[9px] text-muted-foreground">{legend.label}</span>
          </div>
        ))}
      </div>

      {/* Incident Detail Modal */}
      <IncidentDetailModal
        incident={selectedIncident}
        showDeployModal={showDeployModal}
        onClose={() => setSelectedIncident(null)}
        onOpenDeploy={handleOpenDeploy}
      />

      {/* Deploy Modal */}
      <DeployModal
        open={showDeployModal}
        incident={selectedIncident}
        dbRecursos={dbRecursos as DbResource[] | undefined}
        resourceGroups={resourceGroups}
        selectedCounts={selectedCounts}
        deployingResources={deployingResources}
        deploySuccess={deploySuccess}
        onClose={handleCloseDeploy}
        onDeploy={handleDeployResources}
        onAdjustCount={adjustCount}
      />
    </div>
  )
}
