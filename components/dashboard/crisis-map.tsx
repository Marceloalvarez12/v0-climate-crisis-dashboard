"use client"

import { useState, useEffect } from "react"
import { AlertTriangle, Droplets, Flame, Wind, MapPin, Layers, Twitter, Thermometer, Camera, X, ExternalLink, Clock, Users, MapPinned } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
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
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
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
    cameraId?: string
    cameraLocation?: string
  }
}

const incidents: Incident[] = [
  { 
    id: "1", 
    type: "flood", 
    severity: "critical", 
    location: "Centro Historico", 
    coordinates: { lat: -26.8241, lng: -65.2226 }, 
    affectedPeople: 1250, 
    timestamp: new Date(),
    source: "social",
    sourceDetails: {
      platform: "X (Twitter)",
      username: "@tucuman_alerta",
      content: "URGENTE: Inundacion severa en Plaza Independencia. El agua supera los 50cm. Vecinos atrapados en edificios. Se necesita ayuda inmediata. #InundacionTucuman",
      imageUrl: "https://images.unsplash.com/photo-1547683905-f686c993aae5?w=400"
    }
  },
  { 
    id: "2", 
    type: "fire", 
    severity: "high", 
    location: "Barrio Norte", 
    coordinates: { lat: -26.8050, lng: -65.2100 }, 
    affectedPeople: 340, 
    timestamp: new Date(),
    source: "camera",
    sourceDetails: {
      cameraId: "CAM-BN-047",
      cameraLocation: "Av. Mate de Luna y Laprida",
      imageUrl: "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=400"
    }
  },
  { 
    id: "3", 
    type: "storm", 
    severity: "medium", 
    location: "Yerba Buena", 
    coordinates: { lat: -26.8167, lng: -65.2833 }, 
    affectedPeople: 890, 
    timestamp: new Date(),
    source: "sensor",
    sourceDetails: {
      sensorId: "WS-YB-012",
      temperature: 18,
      humidity: 94
    }
  },
  { 
    id: "4", 
    type: "flood", 
    severity: "high", 
    location: "San Pablo", 
    coordinates: { lat: -26.8400, lng: -65.2500 }, 
    affectedPeople: 720, 
    timestamp: new Date(),
    source: "social",
    sourceDetails: {
      platform: "X (Twitter)",
      username: "@rescate_tucuman",
      content: "Canal San Pablo desbordado. Evacuacion en curso. Multiples familias afectadas. Bomberos en el lugar.",
      imageUrl: "https://images.unsplash.com/photo-1446824505046-e43605ffb17f?w=400"
    }
  },
  { 
    id: "5", 
    type: "general", 
    severity: "low", 
    location: "El Manantial", 
    coordinates: { lat: -26.8600, lng: -65.2700 }, 
    affectedPeople: 150, 
    timestamp: new Date(),
    source: "sensor",
    sourceDetails: {
      sensorId: "WS-EM-003",
      temperature: 22,
      humidity: 78
    }
  },
  { 
    id: "6", 
    type: "fire", 
    severity: "critical", 
    location: "Villa 9 de Julio", 
    coordinates: { lat: -26.7950, lng: -65.2350 }, 
    affectedPeople: 560, 
    timestamp: new Date(),
    source: "camera",
    sourceDetails: {
      cameraId: "CAM-V9J-023",
      cameraLocation: "Av. Roca y Catamarca",
      imageUrl: "https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=400"
    }
  },
  { 
    id: "7", 
    type: "storm", 
    severity: "high", 
    location: "Banda del Rio Sali", 
    coordinates: { lat: -26.8480, lng: -65.1650 }, 
    affectedPeople: 430, 
    timestamp: new Date(),
    source: "social",
    sourceDetails: {
      platform: "X (Twitter)",
      username: "@meteo_noa",
      content: "Alerta roja por tormenta electrica en Banda del Rio Sali. Vientos de hasta 80km/h. Arboles caidos. Precaucion extrema.",
    }
  },
  { 
    id: "8", 
    type: "flood", 
    severity: "medium", 
    location: "Las Talitas", 
    coordinates: { lat: -26.7700, lng: -65.2050 }, 
    affectedPeople: 280, 
    timestamp: new Date(),
    source: "sensor",
    sourceDetails: {
      sensorId: "FL-LT-008",
      temperature: 20,
      humidity: 88
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

export function CrisisMap() {
  const [isClient, setIsClient] = useState(false)
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [activeLayers, setActiveLayers] = useState<SourceType[]>(["social", "sensor", "camera"])

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
                    click: () => setSelectedIncident(incident)
                  }}
                >
                  <Popup>
                    <div className="min-w-[180px]">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={cn("rounded-full p-1.5 flex items-center justify-center", getSeverityColor(incident.severity))}>
                          {getIcon(incident.type)}
                        </div>
                        <div>
                          <p className="text-xs font-semibold">{incident.location}</p>
                          <p className="text-[10px] text-neutral-400 capitalize">
                            {incident.type === "flood" ? "Inundacion" : incident.type === "fire" ? "Incendio" : incident.type === "storm" ? "Tormenta" : "General"}
                          </p>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        className="w-full h-7 text-[10px] mt-2"
                        onClick={() => setSelectedIncident(incident)}
                      >
                        Ver Detalles y Fuente
                      </Button>
                    </div>
                  </Popup>
                </Marker>
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
      <div className="absolute bottom-3 left-3 z-[1000] rounded-md border border-border bg-card/95 p-2 backdrop-blur-sm">
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

      {/* Source Legend */}
      <div className="absolute bottom-3 right-3 z-[1000] rounded-md border border-border bg-card/95 p-2 backdrop-blur-sm">
        <p className="mb-1.5 text-[10px] font-medium text-muted-foreground">Fuente de Datos</p>
        <div className="flex flex-col gap-1">
          {[
            { label: "Redes Sociales", icon: <Twitter className="h-3 w-3 text-blue-400" /> },
            { label: "Sensores", icon: <Thermometer className="h-3 w-3 text-accent" /> },
            { label: "Camaras", icon: <Camera className="h-3 w-3 text-muted-foreground" /> },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              {item.icon}
              <span className="text-[10px] text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Incident Detail Modal */}
      <Dialog open={!!selectedIncident} onOpenChange={() => setSelectedIncident(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
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
                  <div className="space-y-2">
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
                            Imagen adjunta
                          </Badge>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {selectedIncident.source === "sensor" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-secondary/50 p-3">
                      <p className="text-[10px] text-muted-foreground mb-1">Temperatura</p>
                      <p className="text-xl font-bold text-foreground">{selectedIncident.sourceDetails.temperature}°C</p>
                    </div>
                    <div className="rounded-lg bg-secondary/50 p-3">
                      <p className="text-[10px] text-muted-foreground mb-1">Humedad</p>
                      <p className="text-xl font-bold text-foreground">{selectedIncident.sourceDetails.humidity}%</p>
                    </div>
                  </div>
                )}

                {selectedIncident.source === "camera" && (
                  <div className="space-y-2">
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
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button className="flex-1" variant="default">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Desplegar Recursos
                </Button>
                <Button className="flex-1" variant="outline">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ver en Mapa
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
