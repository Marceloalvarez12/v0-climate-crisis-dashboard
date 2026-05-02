import { Droplets, Flame, Wind, AlertTriangle, Twitter, Thermometer, Camera } from "lucide-react"
import type { IncidentType, IncidentSource } from "@/lib/types"

// ---------------------------------------------------------------------------
// Icono según tipo de incidente
// ---------------------------------------------------------------------------

export function IncidentIcon({ type }: { type: IncidentType }) {
  switch (type) {
    case "flood":   return <Droplets      className="h-3 w-3" />
    case "fire":    return <Flame         className="h-3 w-3" />
    case "storm":   return <Wind          className="h-3 w-3" />
    case "general": return <AlertTriangle className="h-3 w-3" />
  }
}

// ---------------------------------------------------------------------------
// Clase CSS de color según severidad
// ---------------------------------------------------------------------------

export function severityColorClass(severity: string): string {
  switch (severity) {
    case "critical": return "bg-primary border-primary text-primary-foreground"
    case "high":     return "bg-accent border-accent text-accent-foreground"
    case "medium":   return "bg-yellow-500 border-yellow-500 text-black"
    default:         return "bg-success border-success text-success-foreground"
  }
}

// ---------------------------------------------------------------------------
// Color hexadecimal según severidad (para el marcador Leaflet)
// ---------------------------------------------------------------------------

export function severityHex(severity: string): string {
  switch (severity) {
    case "critical": return "#dc2626"
    case "high":     return "#f97316"
    case "medium":   return "#eab308"
    default:         return "#22c55e"
  }
}

// ---------------------------------------------------------------------------
// Icono / etiqueta de fuente
// ---------------------------------------------------------------------------

export function SourceIcon({ source }: { source: IncidentSource }) {
  switch (source) {
    case "social":  return <Twitter     className="h-3 w-3" />
    case "sensor":  return <Thermometer className="h-3 w-3" />
    case "camera":  return <Camera      className="h-3 w-3" />
  }
}

export function sourceLabel(source: IncidentSource): string {
  switch (source) {
    case "social":  return "Redes Sociales"
    case "sensor":  return "Sensores"
    case "camera":  return "Cámaras"
  }
}

// ---------------------------------------------------------------------------
// Tipo → etiqueta en español
// ---------------------------------------------------------------------------

export function incidentTypeLabel(type: IncidentType): string {
  switch (type) {
    case "flood":   return "Inundación"
    case "fire":    return "Incendio"
    case "storm":   return "Tormenta"
    case "general": return "General"
  }
}

export function incidentSeverityLabel(severity: string): string {
  switch (severity) {
    case "critical": return "Crítica"
    case "high":     return "Alta"
    case "medium":   return "Media"
    default:         return "Baja"
  }
}
