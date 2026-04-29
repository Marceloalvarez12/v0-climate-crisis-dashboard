"use client"

import { useState, useEffect } from "react"
import { AlertTriangle, Droplets, Flame, Wind, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

interface Incident {
  id: string
  type: "flood" | "fire" | "storm" | "general"
  severity: "critical" | "high" | "medium" | "low"
  location: string
  coordinates: { x: number; y: number }
  affectedPeople: number
  timestamp: Date
}

const incidents: Incident[] = [
  { id: "1", type: "flood", severity: "critical", location: "Tucuman Centro", coordinates: { x: 35, y: 30 }, affectedPeople: 1250, timestamp: new Date() },
  { id: "2", type: "fire", severity: "high", location: "Salta Norte", coordinates: { x: 45, y: 20 }, affectedPeople: 340, timestamp: new Date() },
  { id: "3", type: "storm", severity: "medium", location: "Jujuy", coordinates: { x: 40, y: 12 }, affectedPeople: 890, timestamp: new Date() },
  { id: "4", type: "flood", severity: "high", location: "Cordoba Sur", coordinates: { x: 50, y: 55 }, affectedPeople: 720, timestamp: new Date() },
  { id: "5", type: "general", severity: "low", location: "Mendoza", coordinates: { x: 25, y: 65 }, affectedPeople: 150, timestamp: new Date() },
  { id: "6", type: "fire", severity: "critical", location: "Catamarca", coordinates: { x: 32, y: 42 }, affectedPeople: 560, timestamp: new Date() },
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

const getPulseColor = (severity: Incident["severity"]) => {
  switch (severity) {
    case "critical":
      return "bg-primary"
    case "high":
      return "bg-accent"
    case "medium":
      return "bg-yellow-500"
    case "low":
      return "bg-success"
  }
}

export function CrisisMap() {
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [pulsePhase, setPulsePhase] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setPulsePhase(prev => (prev + 1) % 3)
    }, 500)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg border border-border bg-card">
      {/* Map Header */}
      <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between border-b border-border bg-card/90 px-4 py-2 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Mapa de Incidentes</h2>
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

      {/* Map Background - Argentina stylized */}
      <div className="absolute inset-0 bg-secondary/20">
        {/* Grid lines */}
        <svg className="h-full w-full opacity-20" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-border" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Argentina outline - simplified */}
        <svg 
          className="absolute inset-0 h-full w-full" 
          viewBox="0 0 100 100" 
          preserveAspectRatio="xMidYMid meet"
        >
          <path
            d="M 30 5 Q 50 8 55 15 L 60 25 Q 62 35 58 45 L 55 55 Q 52 65 48 75 L 42 85 Q 38 92 35 95 L 30 93 Q 25 85 28 75 L 30 65 Q 28 55 25 45 L 22 35 Q 20 25 25 15 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
            className="text-border"
          />
          {/* Province divisions */}
          <line x1="25" y1="35" x2="55" y2="40" stroke="currentColor" strokeWidth="0.3" className="text-border" strokeDasharray="2,2" />
          <line x1="28" y1="55" x2="52" y2="55" stroke="currentColor" strokeWidth="0.3" className="text-border" strokeDasharray="2,2" />
        </svg>
      </div>

      {/* Incident Markers */}
      {incidents.map((incident) => (
        <div
          key={incident.id}
          className="absolute cursor-pointer transition-transform hover:scale-125"
          style={{
            left: `${incident.coordinates.x}%`,
            top: `${incident.coordinates.y + 10}%`,
            transform: "translate(-50%, -50%)",
          }}
          onClick={() => setSelectedIncident(incident)}
        >
          {/* Pulse effect for critical/high */}
          {(incident.severity === "critical" || incident.severity === "high") && (
            <div
              className={cn(
                "absolute inset-0 rounded-full animate-pulse-ring",
                getPulseColor(incident.severity)
              )}
              style={{
                width: incident.severity === "critical" ? "24px" : "20px",
                height: incident.severity === "critical" ? "24px" : "20px",
                marginLeft: incident.severity === "critical" ? "-4px" : "-2px",
                marginTop: incident.severity === "critical" ? "-4px" : "-2px",
              }}
            />
          )}
          <div
            className={cn(
              "flex h-4 w-4 items-center justify-center rounded-full border-2",
              getSeverityColor(incident.severity)
            )}
          >
            {getIcon(incident.type)}
          </div>
        </div>
      ))}

      {/* Selected Incident Details */}
      {selectedIncident && (
        <div
          className="absolute z-20 min-w-[180px] rounded-lg border border-border bg-card p-3 shadow-lg"
          style={{
            left: `${Math.min(selectedIncident.coordinates.x, 65)}%`,
            top: `${Math.min(selectedIncident.coordinates.y + 15, 70)}%`,
          }}
        >
          <button
            className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:bg-secondary/80"
            onClick={() => setSelectedIncident(null)}
          >
            <span className="text-xs">x</span>
          </button>
          <div className="flex items-center gap-2">
            <div className={cn("rounded-full p-1.5", getSeverityColor(selectedIncident.severity))}>
              {getIcon(selectedIncident.type)}
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">{selectedIncident.location}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{selectedIncident.type}</p>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
            <div>
              <p className="text-muted-foreground">Severidad</p>
              <p className="font-medium capitalize text-foreground">{selectedIncident.severity}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Afectados</p>
              <p className="font-medium text-primary">{selectedIncident.affectedPeople.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-3 left-3 rounded-md border border-border bg-card/90 p-2 backdrop-blur-sm">
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
    </div>
  )
}
