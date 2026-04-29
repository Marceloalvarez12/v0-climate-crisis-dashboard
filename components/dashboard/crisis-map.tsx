"use client"

import { useState, useEffect, useCallback } from "react"
import { AlertTriangle, Droplets, Flame, Wind, MapPin, Layers, Twitter, Thermometer, Camera, Users, Clock, MapPinned, Ambulance, Shield, Truck, Phone, Send, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
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

const incidents: Incident[] = [
  { 
    id: "1", 
    type: "flood", 
    severity: "critical", 
    location: "Centro Historico - Plaza Independencia", 
    coordinates: { lat: -26.8241, lng: -65.2226 }, 
    affectedPeople: 1250, 
    timestamp: new Date(Date.now() - 15 * 60000),
    source: "social",
    sourceDetails: {
      platform: "X (Twitter)",
      username: "@tucuman_alerta",
      content: "URGENTE: Inundacion severa en Plaza Independencia. El agua supera los 50cm en calles San Martin y 24 de Septiembre. Vecinos atrapados en edificios del microcentro. Se necesita ayuda inmediata. Bomberos desbordados. #InundacionTucuman #EmergenciaSMT",
      imageUrl: "https://images.unsplash.com/photo-1547683905-f686c993aae5?w=600&h=400&fit=crop"
    }
  },
  { 
    id: "2", 
    type: "fire", 
    severity: "high", 
    location: "Barrio Norte - Deposito Industrial", 
    coordinates: { lat: -26.8050, lng: -65.2100 }, 
    affectedPeople: 340, 
    timestamp: new Date(Date.now() - 8 * 60000),
    source: "camera",
    sourceDetails: {
      cameraId: "CAM-BN-047",
      cameraLocation: "Av. Mate de Luna esquina Laprida - Camara Municipal #47",
      imageUrl: "https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=600&h=400&fit=crop"
    }
  },
  { 
    id: "3", 
    type: "storm", 
    severity: "medium", 
    location: "Yerba Buena - Country Jockey Club", 
    coordinates: { lat: -26.8167, lng: -65.2833 }, 
    affectedPeople: 890, 
    timestamp: new Date(Date.now() - 25 * 60000),
    source: "sensor",
    sourceDetails: {
      sensorId: "WS-YB-012",
      temperature: 18,
      humidity: 94,
      windSpeed: 65,
      pressure: 1008
    }
  },
  { 
    id: "4", 
    type: "flood", 
    severity: "high", 
    location: "Barrio San Pablo - Canal Norte", 
    coordinates: { lat: -26.8400, lng: -65.2500 }, 
    affectedPeople: 720, 
    timestamp: new Date(Date.now() - 12 * 60000),
    source: "social",
    sourceDetails: {
      platform: "X (Twitter)",
      username: "@rescate_tucuman",
      content: "ACTUALIZACION: Canal San Pablo completamente desbordado en altura de calle Honduras. Evacuacion de 180 familias en curso. Bomberos Voluntarios y Defensa Civil trabajando. Corte total de Av. Ejercito del Norte. Eviten la zona. #AlertaTucuman",
      imageUrl: "https://images.unsplash.com/photo-1446824505046-e43605ffb17f?w=600&h=400&fit=crop"
    }
  },
  { 
    id: "5", 
    type: "general", 
    severity: "low", 
    location: "El Manantial - Ruta 301", 
    coordinates: { lat: -26.8600, lng: -65.2700 }, 
    affectedPeople: 150, 
    timestamp: new Date(Date.now() - 45 * 60000),
    source: "sensor",
    sourceDetails: {
      sensorId: "WS-EM-003",
      temperature: 22,
      humidity: 78,
      windSpeed: 25,
      pressure: 1015
    }
  },
  { 
    id: "6", 
    type: "fire", 
    severity: "critical", 
    location: "Villa 9 de Julio - Fabrica Textil", 
    coordinates: { lat: -26.7950, lng: -65.2350 }, 
    affectedPeople: 560, 
    timestamp: new Date(Date.now() - 5 * 60000),
    source: "camera",
    sourceDetails: {
      cameraId: "CAM-V9J-023",
      cameraLocation: "Av. Roca y Catamarca - Sistema de Videovigilancia Municipal",
      imageUrl: "https://images.unsplash.com/photo-1486551937199-baf066858de7?w=600&h=400&fit=crop"
    }
  },
  { 
    id: "7", 
    type: "storm", 
    severity: "high", 
    location: "Banda del Rio Sali - Zona Industrial", 
    coordinates: { lat: -26.8480, lng: -65.1650 }, 
    affectedPeople: 430, 
    timestamp: new Date(Date.now() - 18 * 60000),
    source: "social",
    sourceDetails: {
      platform: "X (Twitter)",
      username: "@meteo_noa",
      content: "ALERTA METEOROLOGICA ROJA para Banda del Rio Sali y alrededores. Registramos rafagas de viento de 85km/h. Multiples arboles caidos en Av. Mitre. Corte de energia en 12 manzanas. SMN confirma continuara las proximas 2hs. #TormentaTucuman #AlertaRoja",
      imageUrl: "https://images.unsplash.com/photo-1527482937786-6f4c6c3fd49c?w=600&h=400&fit=crop"
    }
  },
  { 
    id: "8", 
    type: "flood", 
    severity: "medium", 
    location: "Las Talitas - Barrio Mutual", 
    coordinates: { lat: -26.7700, lng: -65.2050 }, 
    affectedPeople: 280, 
    timestamp: new Date(Date.now() - 35 * 60000),
    source: "sensor",
    sourceDetails: {
      sensorId: "FL-LT-008",
      temperature: 20,
      humidity: 88,
      windSpeed: 40,
      pressure: 1010
    }
  },
  { 
    id: "9", 
    type: "flood", 
    severity: "critical", 
    location: "Barrio Sur - Av. Roca", 
    coordinates: { lat: -26.8350, lng: -65.2180 }, 
    affectedPeople: 980, 
    timestamp: new Date(Date.now() - 3 * 60000),
    source: "social",
    sourceDetails: {
      platform: "X (Twitter)",
      username: "@emergencias_tuc",
      content: "EMERGENCIA MAXIMA en Barrio Sur. Av. Roca intransitable desde Corrientes hasta Chacabuco. Agua ingresando a viviendas. Hospital Centro de Salud Sur solicita evacuacion de pacientes. Ambulancias no pueden acceder. Necesitamos lanchas URGENTE. #SOSTucuman",
      imageUrl: "https://images.unsplash.com/photo-1583245177184-4ab53e5e391a?w=600&h=400&fit=crop"
    }
  },
  { 
    id: "10", 
    type: "fire", 
    severity: "medium", 
    location: "Tafi Viejo - Talleres Ferroviarios", 
    coordinates: { lat: -26.7320, lng: -65.2570 }, 
    affectedPeople: 85, 
    timestamp: new Date(Date.now() - 22 * 60000),
    source: "camera",
    sourceDetails: {
      cameraId: "CAM-TV-011",
      cameraLocation: "Entrada Talleres Ferroviarios - Camara de Seguridad Industrial",
      imageUrl: "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=600&h=400&fit=crop"
    }
  },
]

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
  icon: React.ReactNode
  units: number
  eta: string
  selected: boolean
}

export function CrisisMap() {
  const [isClient, setIsClient] = useState(false)
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [showDeployModal, setShowDeployModal] = useState(false)
  const [activeLayers, setActiveLayers] = useState<SourceType[]>(["social", "sensor", "camera"])
  const [deployingResources, setDeployingResources] = useState(false)
  const [deploySuccess, setDeploySuccess] = useState(false)
  const [resources, setResources] = useState<ResourceOption[]>([
    { id: "ambulance", name: "Ambulancias SAME", icon: <Ambulance className="h-5 w-5" />, units: 3, eta: "8 min", selected: false },
    { id: "firefighters", name: "Bomberos Voluntarios", icon: <Truck className="h-5 w-5" />, units: 2, eta: "12 min", selected: false },
    { id: "police", name: "Policia Provincial", icon: <Shield className="h-5 w-5" />, units: 4, eta: "5 min", selected: false },
    { id: "civildefense", name: "Defensa Civil", icon: <AlertTriangle className="h-5 w-5" />, units: 1, eta: "15 min", selected: false },
  ])

  useEffect(() => {
    setIsClient(true)
  }, [])

  const toggleLayer = (layer: SourceType) => {
    setActiveLayers(prev => 
      prev.includes(layer) 
        ? prev.filter(l => l !== layer)
        : [...prev, layer]
    )
  }

  const toggleResource = (id: string) => {
    setResources(prev => prev.map(r => 
      r.id === id ? { ...r, selected: !r.selected } : r
    ))
  }

  const handleOpenDetails = useCallback((incident: Incident) => {
    setSelectedIncident(incident)
  }, [])

  const handleCloseDetails = () => {
    setSelectedIncident(null)
  }

  const handleOpenDeploy = () => {
    setShowDeployModal(true)
  }

  const handleCloseDeploy = () => {
    setShowDeployModal(false)
    setDeploySuccess(false)
    setResources(prev => prev.map(r => ({ ...r, selected: false })))
  }

  const handleDeployResources = async () => {
    const selected = resources.filter(r => r.selected)
    if (selected.length === 0) {
      toast.error("Selecciona al menos un recurso para desplegar")
      return
    }

    setDeployingResources(true)
    
    // Simulate deployment
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    setDeployingResources(false)
    setDeploySuccess(true)
    
    toast.success(
      `Recursos desplegados a ${selectedIncident?.location}`,
      { description: `${selected.map(s => s.name).join(", ")}` }
    )
    
    setTimeout(() => {
      handleCloseDeploy()
    }, 1500)
  }

  const filteredIncidents = incidents.filter(i => activeLayers.includes(i.source))
  const center: [number, number] = [-26.8241, -65.2226]

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg border border-border bg-card">
      {/* Map Header */}
      <div className="absolute left-0 right-0 top-0 z-[1000] flex items-center justify-between border-b border-border bg-card/95 px-4 py-2 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">San Miguel de Tucuman - Mapa de Incidentes</h2>
        </div>
        <div className="flex items-center gap-2">
          {/* Layer Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs border-border">
                <Layers className="h-3.5 w-3.5" />
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
          <Badge variant="outline" className="border-primary/50 bg-primary/10 text-primary text-[10px]">
            {filteredIncidents.filter(i => i.severity === "critical").length} Criticos
          </Badge>
          <Badge variant="outline" className="border-accent/50 bg-accent/10 text-accent text-[10px]">
            {filteredIncidents.filter(i => i.severity === "high").length} Altos
          </Badge>
        </div>
      </div>

      {/* Incident List Sidebar - for clicking */}
      <div className="absolute left-3 top-14 bottom-14 z-[1000] w-64 overflow-y-auto rounded-lg border border-border bg-card/95 backdrop-blur-sm">
        <div className="sticky top-0 border-b border-border bg-card px-3 py-2">
          <p className="text-xs font-semibold text-foreground">Incidentes Activos ({filteredIncidents.length})</p>
        </div>
        <div className="p-2 space-y-2">
          {filteredIncidents.map((incident) => (
            <button
              key={incident.id}
              onClick={() => handleOpenDetails(incident)}
              className={cn(
                "w-full text-left rounded-lg border p-2 transition-all hover:bg-secondary/50",
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
        <div className="h-full w-full pt-10">
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
        <div className="flex h-full w-full items-center justify-center bg-secondary/20">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Cargando mapa...</p>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-3 right-3 z-[1000] rounded-md border border-border bg-card/95 p-2 backdrop-blur-sm">
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
        <DialogContent className="max-w-md">
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
              <div className="space-y-3 py-2">
                {resources.map((resource) => (
                  <button
                    key={resource.id}
                    onClick={() => toggleResource(resource.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg border transition-all",
                      resource.selected 
                        ? "border-primary bg-primary/10" 
                        : "border-border hover:bg-secondary/50"
                    )}
                  >
                    <div className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                      resource.selected ? "bg-primary text-primary-foreground" : "bg-secondary"
                    )}>
                      {resource.icon}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium text-foreground">{resource.name}</p>
                      <p className="text-xs text-muted-foreground">{resource.units} unidades disponibles</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={resource.selected ? "default" : "outline"} className="text-[10px]">
                        ETA: {resource.eta}
                      </Badge>
                    </div>
                    <Checkbox checked={resource.selected} className="pointer-events-none" />
                  </button>
                ))}
              </div>

              <div className="rounded-lg bg-secondary/50 p-3">
                <p className="text-xs text-muted-foreground mb-1">Resumen del Despliegue</p>
                <p className="text-sm font-medium text-foreground">
                  {resources.filter(r => r.selected).length > 0 
                    ? `${resources.filter(r => r.selected).map(r => r.name).join(", ")}`
                    : "Ningún recurso seleccionado"
                  }
                </p>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={handleCloseDeploy}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleDeployResources} 
                  disabled={deployingResources || resources.filter(r => r.selected).length === 0}
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
