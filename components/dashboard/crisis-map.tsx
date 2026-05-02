"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import useSWR from "swr"
import { AlertTriangle, Droplets, Flame, Wind, MapPin, Layers, Twitter, Thermometer, Camera, Users, Clock, MapPinned, Ambulance, Shield, Truck, Phone, Send, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { dispatchResourceWithLifecycle } from "@/hooks/use-resource-lifecycle"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

// SMT bounding box for random respawn coordinates
const SMT_BOUNDS = { latMin: -26.84, latMax: -26.80, lngMin: -65.23, lngMax: -65.18 }
const RESPAWN_ZONES = [
  "Barrio Sur - Av. Mitre", "Las Talitas - Barrio Mutual", "Tafi Viejo - Zona Residencial",
  "Banda del Rio Sali - Acceso Norte", "Barrio Norte - Mercado Central",
  "Yerba Buena - Av. Aconquija", "El Manantial - Ruta Provincial 301",
  "San Pablo - Sector Industrial", "Alberdi - Barrio Obrero", "Reduccion - Zona Sur",
]

function buildRespawnIncident(base?: { tipo?: string; fuente?: string }) {
  const lat = SMT_BOUNDS.latMin + Math.random() * (SMT_BOUNDS.latMax - SMT_BOUNDS.latMin)
  const lng = SMT_BOUNDS.lngMin + Math.random() * (SMT_BOUNDS.lngMax - SMT_BOUNDS.lngMin)
  const zona = RESPAWN_ZONES[Math.floor(Math.random() * RESPAWN_ZONES.length)]
  const tipos = ["flood", "fire", "storm", "general"] as const
  const severidades = ["critical", "high", "medium"] as const
  const fuentes = ["social", "sensor", "camera"] as const
  const tipo = (base?.tipo as typeof tipos[number]) ?? tipos[Math.floor(Math.random() * tipos.length)]
  const fuente = (base?.fuente as typeof fuentes[number]) ?? fuentes[Math.floor(Math.random() * fuentes.length)]
  const fuente_detalles: Record<string, unknown> =
    fuente === "social"
      ? { platform: "X (Twitter)", username: "@alerta_tucuman", content: `Nuevo incidente detectado en ${zona}. #EmergenciaTucuman`, imageUrl: "https://images.unsplash.com/photo-1547683905-f686c993aae5?w=600" }
      : fuente === "sensor"
      ? { sensorId: `WS-${Math.floor(Math.random() * 999)}`, temperature: 20 + Math.floor(Math.random() * 10), humidity: 75 + Math.floor(Math.random() * 20), windSpeed: 20 + Math.floor(Math.random() * 60), pressure: 1005 + Math.floor(Math.random() * 15) }
      : { cameraId: `CAM-${Math.floor(Math.random() * 999)}`, cameraLocation: zona, imageUrl: "https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=600" }
  return {
    tipo, severidad: severidades[Math.floor(Math.random() * severidades.length)],
    ubicacion: zona,
    latitud: parseFloat(lat.toFixed(6)),
    longitud: parseFloat(lng.toFixed(6)),
    personas_afectadas: 50 + Math.floor(Math.random() * 800),
    fuente, fuente_detalles, estado: "activo",
  }
}
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { toast } from "sonner"
import dynamic from "next/dynamic"

const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
)
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
)
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
)

type SourceType = "social" | "sensor" | "camera"

interface Incident {
  id: string
  type: "flood" | "fire" | "storm" | "general"
  severity: "critical" | "high" | "medium" | "low"
  location: string
  coordinates: { lat: number; lng: number }
  affectedPeople: number
  timestamp: Date
  source: SourceType
  sourceDetails: {
    platform?: string
    username?: string
    content?: string
    imageUrl?: string
    sensorId?: string
    temperature?: number
    humidity?: number
    windSpeed?: number
    pressure?: number
    cameraId?: string
    cameraLocation?: string
  }
}

// Incidents are now fetched from Supabase via SWR

const getIcon = (type: Incident["type"]) => {
  switch (type) {
    case "flood":
      return <Droplets className="h-3 w-3" />
    case "fire":
      return <Flame className="h-3 w-3" />
    case "storm":
      return <Wind className="h-3 w-3" />
    case "general":
      return <AlertTriangle className="h-3 w-3" />
  }
}

const getSeverityColor = (severity: Incident["severity"]) => {
  switch (severity) {
    case "critical":
      return "bg-primary border-primary text-primary-foreground"
    case "high":
      return "bg-accent border-accent text-accent-foreground"
    case "medium":
      return "bg-yellow-500 border-yellow-500 text-black"
    case "low":
      return "bg-success border-success text-success-foreground"
  }
}

const getSeverityHex = (severity: Incident["severity"]) => {
  switch (severity) {
    case "critical":
      return "#dc2626"
    case "high":
      return "#f97316"
    case "medium":
      return "#eab308"
    case "low":
      return "#22c55e"
  }
}

const getSourceIcon = (source: SourceType) => {
  switch (source) {
    case "social":
      return <Twitter className="h-3 w-3" />
    case "sensor":
      return <Thermometer className="h-3 w-3" />
    case "camera":
      return <Camera className="h-3 w-3" />
  }
}

const getSourceLabel = (source: SourceType) => {
  switch (source) {
    case "social":
      return "Redes Sociales"
    case "sensor":
      return "Sensores"
    case "camera":
      return "Camaras"
  }
}

const createCustomIcon = (severity: Incident["severity"], type: Incident["type"], source: SourceType) => {
  if (typeof window === "undefined") return null
  
  const L = require("leaflet")
  const color = getSeverityHex(severity)
  const iconMap = {
    flood: "💧",
    fire: "🔥",
    storm: "🌪️",
    general: "⚠️"
  }
  const sourceIndicator = source === "social" ? "🐦" : source === "sensor" ? "📡" : "📹"
  
  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        position: relative;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          position: absolute;
          width: 40px;
          height: 40px;
          background: ${color};
          border-radius: 50%;
          opacity: 0.3;
          animation: pulse 2s infinite;
        "></div>
        <div style="
          width: 28px;
          height: 28px;
          background: ${color};
          border: 2px solid white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          z-index: 1;
          cursor: pointer;
        ">${iconMap[type]}</div>
        <div style="
          position: absolute;
          top: -4px;
          right: -4px;
          width: 16px;
          height: 16px;
          background: #171717;
          border: 1px solid ${color};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 8px;
          z-index: 2;
        ">${sourceIndicator}</div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
  })
}

interface ResourceOption {
  id: string
  name: string
  tipo: string
  estado: string // "available" | "dispatched" | "busy"
  ubicacion: string
  selected: boolean
}

interface CrisisMapProps {
  pendingIncident?: import("@/app/page").AlertIncident | null
  onPendingIncidentHandled?: () => void
}

export function CrisisMap({ pendingIncident, onPendingIncidentHandled }: CrisisMapProps = {}) {
  const [isClient, setIsClient] = useState(false)
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [showDeployModal, setShowDeployModal] = useState(false)
  const [activeLayers, setActiveLayers] = useState<SourceType[]>(["social", "sensor", "camera"])
  const [deployingResources, setDeployingResources] = useState(false)
  const [deploySuccess, setDeploySuccess] = useState(false)
  // How many units of each tipo the user wants to dispatch
  const [selectedCounts, setSelectedCounts] = useState<Record<string, number>>({})

  // Load resources from Supabase, refresh every 3s to reflect state changes
  const { data: dbRecursos, mutate: mutateRecursos } = useSWR<Array<{
    id: string; nombre: string; tipo: string; estado: string; ubicacion: string
  }>>("/api/recursos", fetcher, { refreshInterval: 3000 })

  // Group resources by tipo for the deploy modal
  const resourceGroups = useMemo(() => {
    if (!dbRecursos) return []
    const groups: Record<string, { tipo: string; ids: string[]; availableIds: string[] }> = {}
    for (const r of dbRecursos) {
      if (!groups[r.tipo]) groups[r.tipo] = { tipo: r.tipo, ids: [], availableIds: [] }
      groups[r.tipo].ids.push(r.id)
      if (r.estado === "available") groups[r.tipo].availableIds.push(r.id)
    }
    return Object.values(groups)
  }, [dbRecursos])

  // Fetch incidents from Supabase
  const { data: dbIncidents, error, mutate } = useSWR("/api/incidentes", fetcher, {
    refreshInterval: 2000, // Poll every 2s so map updates within seconds of agent discovery
  })

  // Transform database incidents to local format
  const incidents: Incident[] = useMemo(() => {
    if (!dbIncidents || error) return []
    return dbIncidents.map((inc: { id: string; tipo: string; severidad: string; ubicacion: string; latitud: number; longitud: number; personas_afectadas: number; fuente: string; fuente_detalles: Record<string, unknown>; created_at: string }) => ({
      id: inc.id,
      type: inc.tipo as Incident["type"],
      severity: inc.severidad as Incident["severity"],
      location: inc.ubicacion,
      coordinates: { lat: inc.latitud, lng: inc.longitud },
      affectedPeople: inc.personas_afectadas,
      timestamp: new Date(inc.created_at),
      source: inc.fuente as SourceType,
      sourceDetails: inc.fuente_detalles || {}
    }))
  }, [dbIncidents, error])
  
  useEffect(() => {
    setIsClient(true)
  }, [])

  // When LiveAlert fires "DESPLEGAR EMERGENCIA", open the detail modal with that incident
  useEffect(() => {
    if (!pendingIncident) return
    // Cast the AlertIncident shape to the local Incident shape (same structure)
    setSelectedIncident(pendingIncident as unknown as Incident)
    onPendingIncidentHandled?.()
  }, [pendingIncident, onPendingIncidentHandled])

  const toggleLayer = (layer: SourceType) => {
    setActiveLayers(prev => 
      prev.includes(layer) 
        ? prev.filter(l => l !== layer)
        : [...prev, layer]
    )
  }

  const getRecursoIcon = (tipo: string) => {
    switch (tipo) {
      case "ambulance":   return <Ambulance className="h-5 w-5" />
      case "firefighter": return <Truck className="h-5 w-5" />
      case "police":      return <Shield className="h-5 w-5" />
      case "boat":        return <AlertTriangle className="h-5 w-5" />
      case "helicopter":  return <Wind className="h-5 w-5" />
      default:            return <Shield className="h-5 w-5" />
    }
  }

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case "ambulance":   return "Ambulancias SAME"
      case "firefighter": return "Bomberos Voluntarios"
      case "police":      return "Policia Provincial"
      case "boat":        return "Lanchas de Rescate"
      case "helicopter":  return "Helicopteros"
      default:            return tipo
    }
  }

  const adjustCount = (tipo: string, delta: number, max: number) => {
    setSelectedCounts(prev => {
      const current = prev[tipo] ?? 0
      const next = Math.min(max, Math.max(0, current + delta))
      return { ...prev, [tipo]: next }
    })
  }

  const handleOpenDetails = useCallback((incident: Incident) => {
    setSelectedIncident(incident)
  }, [])

  const handleCloseDetails = () => {
    setSelectedIncident(null)
  }

  const handleOpenDeploy = () => {
    // Always reset to a clean state before opening for a new incident
    setDeploySuccess(false)
    setSelectedCounts({})
    mutateRecursos()
    setShowDeployModal(true)
  }

  const handleCloseDeploy = () => {
    setShowDeployModal(false)
    setDeploySuccess(false)
    setSelectedCounts({})
    // Force revalidation so next open shows fresh server state
    mutateRecursos()
  }

  const handleDeployResources = async () => {
    const totalSelected = Object.values(selectedCounts).reduce((a, b) => a + b, 0)
    if (totalSelected === 0) {
      toast.error("Selecciona al menos un recurso para desplegar")
      return
    }

    const incidenteId = selectedIncident?.id
    const incidenteTipo = selectedIncident?.type
    const incidenteFuente = selectedIncident?.source

    // Collect the actual IDs to dispatch based on counts BEFORE any async work
    const idsToDispatch: string[] = []
    for (const group of resourceGroups) {
      const count = selectedCounts[group.tipo] ?? 0
      idsToDispatch.push(...group.availableIds.slice(0, count))
    }

    setDeployingResources(true)

    // Optimistically update the SWR cache so the modal counters drop immediately
    // while the real PATCHs happen in the background
    if (dbRecursos) {
      const optimistic = dbRecursos.map(r =>
        idsToDispatch.includes(r.id) ? { ...r, estado: "dispatched" } : r
      )
      mutateRecursos(optimistic, false)
    }

    await new Promise(resolve => setTimeout(resolve, 2000))
    setDeployingResources(false)
    setDeploySuccess(true)

    // Mark incident as atendido in Supabase (disappears from map via SWR)
    if (incidenteId) {
      await fetch("/api/incidentes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: incidenteId, estado: "atendido" }),
      }).catch(() => {})

      // Despachar cada recurso con su ciclo de vida:
      // dispatched → busy (50s) → available (60s)
      const dispatchPromises = idsToDispatch.map(resourceId =>
        dispatchResourceWithLifecycle(incidenteId, resourceId).catch(() => {})
      )
      await Promise.all(dispatchPromises)
      // Force revalidation to get real server state (clears optimistic update)
      await mutateRecursos()

      // Respawn: nuevo incidente en coordenadas aleatorias, 2 minutos despues de ser atendido
      setTimeout(async () => {
        const respawn = buildRespawnIncident({ tipo: incidenteTipo, fuente: incidenteFuente })
        await fetch("/api/incidentes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(respawn),
        }).catch(() => {})
      }, 2 * 60 * 1000)
    }

    toast.success(
      `Recursos desplegados a ${selectedIncident?.location}`,
      { description: `${idsToDispatch.length} unidad(es) en camino` }
    )

    // Wait briefly so user sees the success screen, then close and reset
    setTimeout(() => {
      setShowDeployModal(false)
      setDeploySuccess(false)
      setSelectedCounts({})
      mutateRecursos()
    }, 2000)
  }

  const filteredIncidents = incidents.filter(i => activeLayers.includes(i.source))
  const center: [number, number] = [-26.8241, -65.2226]

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-lg border border-border bg-card md:relative">
      {/* Map Header */}
      <div className="absolute left-0 right-0 top-0 z-[1000] flex flex-wrap items-center gap-x-2 gap-y-1.5 border-b border-border bg-card/95 px-3 py-2 backdrop-blur-sm">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
          <h2 className="truncate text-xs font-semibold text-foreground sm:text-sm">
            San Miguel de Tucuman - Mapa de Incidentes
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {/* Layer Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-6 gap-1 border-border px-2 text-[10px]">
                <Layers className="h-3 w-3" />
                Capas ({activeLayers.length})
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3" align="end">
              <div className="space-y-3">
                <p className="text-xs font-medium text-foreground">Filtrar por Fuente</p>
                <div className="space-y-2">
                  {(["social", "sensor", "camera"] as SourceType[]).map((layer) => (
                    <label key={layer} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={activeLayers.includes(layer)}
                        onCheckedChange={() => toggleLayer(layer)}
                      />
                      <div className="flex items-center gap-1.5">
                        {getSourceIcon(layer)}
                        <span className="text-xs">{getSourceLabel(layer)}</span>
                      </div>
                      <Badge variant="outline" className="ml-auto text-[10px] h-5">
                        {incidents.filter(i => i.source === layer).length}
                      </Badge>
                    </label>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Badge variant="outline" className="hidden border-primary/50 bg-primary/10 text-primary text-[10px] sm:inline-flex">
            {filteredIncidents.filter(i => i.severity === "critical").length} Criticos
          </Badge>
          <Badge variant="outline" className="hidden border-accent/50 bg-accent/10 text-accent text-[10px] sm:inline-flex">
            {filteredIncidents.filter(i => i.severity === "high").length} Altos
          </Badge>
        </div>
      </div>

      {/* Incident List Panel — static on mobile, floating on md+ */}
      <div className="relative z-10 mt-0 w-full rounded-none border-b border-border bg-card/95 backdrop-blur-sm shadow-none md:absolute md:right-3 md:top-14 md:z-[1000] md:w-72 md:max-h-[420px] md:rounded-lg md:border md:shadow-xl">
        <div className="flex items-center justify-between border-b border-border bg-card px-3 py-2 rounded-t-lg">
          <p className="text-xs font-semibold text-foreground">Incidentes Activos ({filteredIncidents.length})</p>
          <Badge variant="outline" className="text-[9px] border-primary/50 text-primary animate-pulse">En vivo</Badge>
        </div>
        <div className="overflow-y-auto max-h-48 p-2 space-y-1.5 custom-scrollbar md:max-h-[370px]">
          {filteredIncidents.map((incident) => (
            <button
              key={incident.id}
              onClick={() => handleOpenDetails(incident)}
              className={cn(
                "w-full text-left rounded-lg border p-2 transition-all hover:bg-secondary/50 hover:scale-[1.01]",
                incident.severity === "critical" ? "border-primary/50 bg-primary/5" :
                incident.severity === "high" ? "border-accent/50 bg-accent/5" :
                "border-border"
              )}
            >
              <div className="flex items-start gap-2">
                <div className={cn("rounded-full p-1.5 flex items-center justify-center shrink-0", getSeverityColor(incident.severity))}>
                  {getIcon(incident.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{incident.location}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[9px] h-4 px-1">
                      {incident.type === "flood" ? "Inundacion" : incident.type === "fire" ? "Incendio" : incident.type === "storm" ? "Tormenta" : "General"}
                    </Badge>
                    <span className="text-[9px] text-muted-foreground">{incident.affectedPeople} afectados</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Leaflet Map */}
      {isClient ? (
        <div className="h-[400px] w-full shrink-0 pt-10 md:h-full md:flex-1">
          <link
            rel="stylesheet"
            href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
            integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
            crossOrigin=""
          />
          <style>{`
            .leaflet-container {
              height: 100%;
              width: 100%;
              background: #1a1a1a;
            }
            .leaflet-popup-content-wrapper {
              background: #171717;
              border: 1px solid #2a2a2a;
              border-radius: 8px;
            }
            .leaflet-popup-content {
              color: #fafafa;
              margin: 12px;
            }
            .leaflet-popup-tip {
              background: #171717;
              border: 1px solid #2a2a2a;
            }
            .leaflet-control-zoom a {
              background: #171717 !important;
              color: #fafafa !important;
              border-color: #2a2a2a !important;
            }
            .leaflet-control-zoom a:hover {
              background: #2a2a2a !important;
            }
            .leaflet-control-attribution {
              background: rgba(23, 23, 23, 0.8) !important;
              color: #737373 !important;
            }
            .leaflet-control-attribution a {
              color: #a3a3a3 !important;
            }
            @keyframes pulse {
              0% { transform: scale(1); opacity: 0.3; }
              50% { transform: scale(1.5); opacity: 0.1; }
              100% { transform: scale(1); opacity: 0.3; }
            }
          `}</style>
          <MapContainer
            center={center}
            zoom={13}
            scrollWheelZoom={true}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            {filteredIncidents.map((incident) => {
              const icon = createCustomIcon(incident.severity, incident.type, incident.source)
              if (!icon) return null
              return (
                <Marker
                  key={incident.id}
                  position={[incident.coordinates.lat, incident.coordinates.lng]}
                  icon={icon}
                  eventHandlers={{
                    click: () => handleOpenDetails(incident)
                  }}
                />
              )
            })}
          </MapContainer>
        </div>
      ) : (
        <div className="flex h-[400px] w-full shrink-0 items-center justify-center bg-secondary/20 md:h-full md:flex-1">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Cargando mapa...</p>
          </div>
        </div>
      )}

      {/* Legend - hidden on mobile, visible bottom-left on md+ */}
      <div className="absolute bottom-3 left-3 z-[1000] hidden rounded-md border border-border bg-card/95 p-2 backdrop-blur-sm md:block">
        <p className="mb-1.5 text-[10px] font-medium text-muted-foreground">Severidad</p>
        <div className="flex flex-col gap-1">
          {[
            { label: "Critico", color: "bg-primary" },
            { label: "Alto", color: "bg-accent" },
            { label: "Medio", color: "bg-yellow-500" },
            { label: "Bajo", color: "bg-success" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className={cn("h-2 w-2 rounded-full", item.color)} />
              <span className="text-[10px] text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Incident Detail Modal */}
      <Dialog open={!!selectedIncident && !showDeployModal} onOpenChange={handleCloseDetails}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto z-[9999]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className={cn("rounded-full p-2", getSeverityColor(selectedIncident?.severity || "low"))}>
                {selectedIncident && getIcon(selectedIncident.type)}
              </div>
              <div>
                <span className="text-base">{selectedIncident?.location}</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">
                  {selectedIncident?.type === "flood" ? "Inundacion" : selectedIncident?.type === "fire" ? "Incendio" : selectedIncident?.type === "storm" ? "Tormenta" : "General"} - Severidad {selectedIncident?.severity === "critical" ? "Critica" : selectedIncident?.severity === "high" ? "Alta" : selectedIncident?.severity === "medium" ? "Media" : "Baja"}
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          {selectedIncident && (
            <div className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-secondary/50 p-3 text-center">
                  <Users className="h-4 w-4 mx-auto mb-1 text-primary" />
                  <p className="text-lg font-bold text-foreground">{selectedIncident.affectedPeople.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">Afectados</p>
                </div>
                <div className="rounded-lg bg-secondary/50 p-3 text-center">
                  <Clock className="h-4 w-4 mx-auto mb-1 text-accent" />
                  <p className="text-lg font-bold text-foreground">
                    {selectedIncident.timestamp.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Reportado</p>
                </div>
                <div className="rounded-lg bg-secondary/50 p-3 text-center">
                  <MapPinned className="h-4 w-4 mx-auto mb-1 text-blue-400" />
                  <p className="text-[10px] font-bold text-foreground">
                    {selectedIncident.coordinates.lat.toFixed(4)}, {selectedIncident.coordinates.lng.toFixed(4)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Coordenadas</p>
                </div>
              </div>

              {/* Source Info */}
              <div className="rounded-lg border border-border bg-secondary/30 p-4">
                <div className="flex items-center gap-2 mb-3">
                  {getSourceIcon(selectedIncident.source)}
                  <span className="text-sm font-medium">Fuente: {getSourceLabel(selectedIncident.source)}</span>
                  <Badge variant="outline" className="ml-auto text-[10px]">
                    {selectedIncident.source === "social" ? selectedIncident.sourceDetails.platform : 
                     selectedIncident.source === "sensor" ? selectedIncident.sourceDetails.sensorId :
                     selectedIncident.sourceDetails.cameraId}
                  </Badge>
                </div>

                {selectedIncident.source === "social" && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <Twitter className="h-4 w-4 text-blue-400" />
                      </div>
                      <span className="text-sm font-medium text-blue-400">{selectedIncident.sourceDetails.username}</span>
                    </div>
                    <p className="text-sm text-foreground bg-secondary/50 rounded-lg p-3 italic">
                      &quot;{selectedIncident.sourceDetails.content}&quot;
                    </p>
                    {selectedIncident.sourceDetails.imageUrl && (
                      <div className="relative aspect-video rounded-lg overflow-hidden">
                        <img 
                          src={selectedIncident.sourceDetails.imageUrl} 
                          alt="Imagen del incidente"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-2 right-2">
                          <Badge className="bg-black/70 text-white text-[10px]">
                            Imagen adjunta al tweet
                          </Badge>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {selectedIncident.source === "sensor" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-secondary/50 p-3">
                        <p className="text-[10px] text-muted-foreground mb-1">Temperatura</p>
                        <p className="text-xl font-bold text-foreground">{selectedIncident.sourceDetails.temperature}°C</p>
                      </div>
                      <div className="rounded-lg bg-secondary/50 p-3">
                        <p className="text-[10px] text-muted-foreground mb-1">Humedad</p>
                        <p className="text-xl font-bold text-foreground">{selectedIncident.sourceDetails.humidity}%</p>
                      </div>
                      <div className="rounded-lg bg-secondary/50 p-3">
                        <p className="text-[10px] text-muted-foreground mb-1">Viento</p>
                        <p className="text-xl font-bold text-foreground">{selectedIncident.sourceDetails.windSpeed} km/h</p>
                      </div>
                      <div className="rounded-lg bg-secondary/50 p-3">
                        <p className="text-[10px] text-muted-foreground mb-1">Presion</p>
                        <p className="text-xl font-bold text-foreground">{selectedIncident.sourceDetails.pressure} hPa</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      Datos en tiempo real del sensor {selectedIncident.sourceDetails.sensorId}
                    </p>
                  </div>
                )}

                {selectedIncident.source === "camera" && (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Ubicacion: {selectedIncident.sourceDetails.cameraLocation}
                    </p>
                    {selectedIncident.sourceDetails.imageUrl && (
                      <div className="relative aspect-video rounded-lg overflow-hidden">
                        <img 
                          src={selectedIncident.sourceDetails.imageUrl} 
                          alt="Captura de camara"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 left-2">
                          <Badge className="bg-red-500/90 text-white text-[10px] animate-pulse">
                            EN VIVO
                          </Badge>
                        </div>
                        <div className="absolute bottom-2 right-2">
                          <Badge className="bg-black/70 text-white text-[10px]">
                            {selectedIncident.sourceDetails.cameraId}
                          </Badge>
                        </div>
                        <div className="absolute bottom-2 left-2">
                          <Badge className="bg-black/70 text-white text-[10px]">
                            {new Date().toLocaleTimeString("es-AR")}
                          </Badge>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button className="flex-1" variant="default" onClick={handleOpenDeploy}>
                  <Send className="h-4 w-4 mr-2" />
                  Desplegar Recursos
                </Button>
                <Button className="flex-1" variant="outline">
                  <Phone className="h-4 w-4 mr-2" />
                  Contactar Autoridades
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Deploy Resources Modal */}
      <Dialog open={showDeployModal} onOpenChange={handleCloseDeploy}>
        <DialogContent className="max-w-md z-[9999]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Desplegar Recursos de Emergencia
            </DialogTitle>
            <DialogDescription>
              Selecciona los recursos a enviar a <span className="font-medium text-foreground">{selectedIncident?.location}</span>
            </DialogDescription>
          </DialogHeader>

          {deploySuccess ? (
            <div className="py-8 flex flex-col items-center gap-3">
              <div className="h-16 w-16 rounded-full bg-success/20 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-success" />
              </div>
              <p className="text-lg font-semibold text-foreground">Recursos Desplegados</p>
              <p className="text-sm text-muted-foreground text-center">
                Las unidades han sido notificadas y estan en camino
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2 py-2">
                {!dbRecursos ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Cargando recursos...</p>
                ) : resourceGroups.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No hay recursos registrados</p>
                ) : (
                  resourceGroups.map((group) => {
                    const available = group.availableIds.length
                    const total = group.ids.length
                    const busy = total - available
                    const count = selectedCounts[group.tipo] ?? 0
                    const noStock = available === 0

                    return (
                      <div
                        key={group.tipo}
                        className={cn(
                          "flex items-center gap-3 rounded-lg border p-3 transition-all",
                          noStock
                            ? "border-border bg-secondary/20 opacity-60"
                            : count > 0
                            ? "border-primary bg-primary/10"
                            : "border-border hover:bg-secondary/30"
                        )}
                      >
                        {/* Icon */}
                        <div className={cn(
                          "h-10 w-10 shrink-0 rounded-full flex items-center justify-center",
                          noStock ? "bg-secondary/50 text-muted-foreground"
                          : count > 0 ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-foreground"
                        )}>
                          {getRecursoIcon(group.tipo)}
                        </div>

                        {/* Label + availability */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{getTipoLabel(group.tipo)}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={cn(
                              "text-xs font-semibold",
                              available > 0 ? "text-success" : "text-muted-foreground"
                            )}>
                              {available} disponible{available !== 1 ? "s" : ""}
                            </span>
                            {busy > 0 && (
                              <span className="text-[10px] text-muted-foreground">
                                · {busy} ocupado{busy !== 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Counter +/- */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => adjustCount(group.tipo, -1, available)}
                            disabled={count === 0}
                            className="h-7 w-7 rounded-md border border-border flex items-center justify-center text-sm hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            −
                          </button>
                          <span className="w-5 text-center text-sm font-bold tabular-nums text-foreground">
                            {count}
                          </span>
                          <button
                            onClick={() => adjustCount(group.tipo, +1, available)}
                            disabled={count >= available}
                            className="h-7 w-7 rounded-md border border-border flex items-center justify-center text-sm hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Summary */}
              <div className="rounded-lg bg-secondary/50 p-3">
                <p className="text-xs text-muted-foreground mb-1">Resumen del despliegue</p>
                <p className="text-sm font-medium text-foreground">
                  {Object.values(selectedCounts).reduce((a, b) => a + b, 0) > 0
                    ? Object.entries(selectedCounts)
                        .filter(([, v]) => v > 0)
                        .map(([tipo, v]) => `${v} ${getTipoLabel(tipo)}`)
                        .join(", ")
                    : "Ningun recurso seleccionado"
                  }
                </p>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={handleCloseDeploy}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleDeployResources}
                  disabled={deployingResources || Object.values(selectedCounts).reduce((a, b) => a + b, 0) === 0}
                >
                  {deployingResources ? (
                    <>
                      <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Desplegando...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Confirmar Despliegue
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
