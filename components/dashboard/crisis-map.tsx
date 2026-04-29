"use client"

import { useState, useEffect } from "react"
import { AlertTriangle, Droplets, Flame, Wind, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import dynamic from "next/dynamic"

// Dynamic import to avoid SSR issues with Leaflet
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

interface Incident {
  id: string
  type: "flood" | "fire" | "storm" | "general"
  severity: "critical" | "high" | "medium" | "low"
  location: string
  coordinates: { lat: number; lng: number }
  affectedPeople: number
  timestamp: Date
}

// Incidentes en San Miguel de Tucuman y alrededores
const incidents: Incident[] = [
  { 
    id: "1", 
    type: "flood", 
    severity: "critical", 
    location: "Centro Historico", 
    coordinates: { lat: -26.8241, lng: -65.2226 }, 
    affectedPeople: 1250, 
    timestamp: new Date() 
  },
  { 
    id: "2", 
    type: "fire", 
    severity: "high", 
    location: "Barrio Norte", 
    coordinates: { lat: -26.8050, lng: -65.2100 }, 
    affectedPeople: 340, 
    timestamp: new Date() 
  },
  { 
    id: "3", 
    type: "storm", 
    severity: "medium", 
    location: "Yerba Buena", 
    coordinates: { lat: -26.8167, lng: -65.2833 }, 
    affectedPeople: 890, 
    timestamp: new Date() 
  },
  { 
    id: "4", 
    type: "flood", 
    severity: "high", 
    location: "San Pablo", 
    coordinates: { lat: -26.8400, lng: -65.2500 }, 
    affectedPeople: 720, 
    timestamp: new Date() 
  },
  { 
    id: "5", 
    type: "general", 
    severity: "low", 
    location: "El Manantial", 
    coordinates: { lat: -26.8600, lng: -65.2700 }, 
    affectedPeople: 150, 
    timestamp: new Date() 
  },
  { 
    id: "6", 
    type: "fire", 
    severity: "critical", 
    location: "Villa 9 de Julio", 
    coordinates: { lat: -26.7950, lng: -65.2350 }, 
    affectedPeople: 560, 
    timestamp: new Date() 
  },
  { 
    id: "7", 
    type: "storm", 
    severity: "high", 
    location: "Banda del Rio Sali", 
    coordinates: { lat: -26.8480, lng: -65.1650 }, 
    affectedPeople: 430, 
    timestamp: new Date() 
  },
  { 
    id: "8", 
    type: "flood", 
    severity: "medium", 
    location: "Las Talitas", 
    coordinates: { lat: -26.7700, lng: -65.2050 }, 
    affectedPeople: 280, 
    timestamp: new Date() 
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

// Custom marker icon creator
const createCustomIcon = (severity: Incident["severity"], type: Incident["type"]) => {
  if (typeof window === "undefined") return null
  
  const L = require("leaflet")
  const color = getSeverityHex(severity)
  const iconMap = {
    flood: "💧",
    fire: "🔥",
    storm: "🌪️",
    general: "⚠️"
  }
  
  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        position: relative;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          position: absolute;
          width: 32px;
          height: 32px;
          background: ${color};
          border-radius: 50%;
          opacity: 0.3;
          animation: pulse 2s infinite;
        "></div>
        <div style="
          width: 24px;
          height: 24px;
          background: ${color};
          border: 2px solid white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          z-index: 1;
        ">${iconMap[type]}</div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  })
}

export function CrisisMap() {
  const [isClient, setIsClient] = useState(false)
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Centro de San Miguel de Tucuman
  const center: [number, number] = [-26.8241, -65.2226]

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg border border-border bg-card">
      {/* Map Header */}
      <div className="absolute left-0 right-0 top-0 z-[1000] flex items-center justify-between border-b border-border bg-card/90 px-4 py-2 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">San Miguel de Tucuman - Mapa de Incidentes</h2>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-primary/50 bg-primary/10 text-primary text-[10px]">
            {incidents.filter(i => i.severity === "critical").length} Criticos
          </Badge>
          <Badge variant="outline" className="border-accent/50 bg-accent/10 text-accent text-[10px]">
            {incidents.filter(i => i.severity === "high").length} Altos
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
            {incidents.map((incident) => {
              const icon = createCustomIcon(incident.severity, incident.type)
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
                    <div className="min-w-[160px]">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={cn("rounded-full p-1.5 flex items-center justify-center", getSeverityColor(incident.severity))}>
                          {getIcon(incident.type)}
                        </div>
                        <div>
                          <p className="text-xs font-semibold">{incident.location}</p>
                          <p className="text-[10px] text-neutral-400 capitalize">{incident.type === "flood" ? "Inundacion" : incident.type === "fire" ? "Incendio" : incident.type === "storm" ? "Tormenta" : "General"}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                          <p className="text-neutral-400">Severidad</p>
                          <p className="font-medium capitalize">{incident.severity === "critical" ? "Critico" : incident.severity === "high" ? "Alto" : incident.severity === "medium" ? "Medio" : "Bajo"}</p>
                        </div>
                        <div>
                          <p className="text-neutral-400">Afectados</p>
                          <p className="font-medium text-red-500">{incident.affectedPeople.toLocaleString()}</p>
                        </div>
                      </div>
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
      <div className="absolute bottom-3 left-3 z-[1000] rounded-md border border-border bg-card/90 p-2 backdrop-blur-sm">
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

      {/* Incident Types Legend */}
      <div className="absolute bottom-3 right-3 z-[1000] rounded-md border border-border bg-card/90 p-2 backdrop-blur-sm">
        <p className="mb-1.5 text-[10px] font-medium text-muted-foreground">Tipo de Incidente</p>
        <div className="flex flex-col gap-1">
          {[
            { label: "Inundacion", icon: "💧" },
            { label: "Incendio", icon: "🔥" },
            { label: "Tormenta", icon: "🌪️" },
            { label: "General", icon: "⚠️" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <span className="text-xs">{item.icon}</span>
              <span className="text-[10px] text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
