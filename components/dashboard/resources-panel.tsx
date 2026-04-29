"use client"

import { useState, useEffect } from "react"
import { Truck, Users, Plane, Ship, Building2, HeartPulse } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Resource {
  id: string
  name: string
  type: "ambulance" | "firefighter" | "helicopter" | "boat" | "shelter" | "medical"
  status: "available" | "en-route" | "busy"
  location: string
  eta?: string
}

const initialResources: Resource[] = [
  { id: "1", name: "Ambulancia 07", type: "ambulance", status: "available", location: "Base Central" },
  { id: "2", name: "Bomberos Unidad 3", type: "firefighter", status: "en-route", location: "Ruta 9 Norte", eta: "12 min" },
  { id: "3", name: "Helicoptero SAR-1", type: "helicopter", status: "busy", location: "Zona Inundada" },
  { id: "4", name: "Lancha Rescate 2", type: "boat", status: "available", location: "Puerto Fluvial" },
  { id: "5", name: "Refugio Municipal", type: "shelter", status: "available", location: "Centro Civico" },
  { id: "6", name: "Equipo Medico A", type: "medical", status: "en-route", location: "Hospital Regional", eta: "8 min" },
  { id: "7", name: "Ambulancia 12", type: "ambulance", status: "busy", location: "Barrio Norte" },
  { id: "8", name: "Bomberos Unidad 5", type: "firefighter", status: "available", location: "Cuartel Sur" },
]

const getIcon = (type: Resource["type"]) => {
  switch (type) {
    case "ambulance":
      return <Truck className="h-4 w-4" />
    case "firefighter":
      return <Users className="h-4 w-4" />
    case "helicopter":
      return <Plane className="h-4 w-4" />
    case "boat":
      return <Ship className="h-4 w-4" />
    case "shelter":
      return <Building2 className="h-4 w-4" />
    case "medical":
      return <HeartPulse className="h-4 w-4" />
  }
}

const getStatusBadge = (status: Resource["status"]) => {
  switch (status) {
    case "available":
      return (
        <Badge variant="outline" className="border-success/50 bg-success/10 text-success text-[10px] px-1.5 py-0">
          Disponible
        </Badge>
      )
    case "en-route":
      return (
        <Badge variant="outline" className="border-accent/50 bg-accent/10 text-accent text-[10px] px-1.5 py-0">
          En camino
        </Badge>
      )
    case "busy":
      return (
        <Badge variant="outline" className="border-primary/50 bg-primary/10 text-primary text-[10px] px-1.5 py-0">
          Ocupado
        </Badge>
      )
  }
}

export function ResourcesPanel() {
  const [resources, setResources] = useState<Resource[]>(initialResources)

  useEffect(() => {
    const interval = setInterval(() => {
      setResources(prev => 
        prev.map(resource => {
          if (Math.random() > 0.85) {
            const statuses: Resource["status"][] = ["available", "en-route", "busy"]
            const newStatus = statuses[Math.floor(Math.random() * statuses.length)]
            return {
              ...resource,
              status: newStatus,
              eta: newStatus === "en-route" ? `${Math.floor(Math.random() * 20) + 5} min` : undefined
            }
          }
          return resource
        })
      )
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const availableCount = resources.filter(r => r.status === "available").length
  const enRouteCount = resources.filter(r => r.status === "en-route").length
  const busyCount = resources.filter(r => r.status === "busy").length

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Recursos Disponibles</h2>
        <div className="mt-2 flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-success" />
            <span className="text-muted-foreground">{availableCount}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-accent" />
            <span className="text-muted-foreground">{enRouteCount}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <span className="text-muted-foreground">{busyCount}</span>
          </span>
        </div>
      </div>
      <ScrollArea className="flex-1 px-3 py-2">
        <div className="space-y-2">
          {resources.map((resource) => (
            <div
              key={resource.id}
              className={cn(
                "rounded-md border border-border bg-secondary/30 p-2.5 transition-all",
                resource.status === "en-route" && "border-accent/30",
                resource.status === "busy" && "border-primary/30"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "shrink-0",
                    resource.status === "available" && "text-success",
                    resource.status === "en-route" && "text-accent",
                    resource.status === "busy" && "text-primary"
                  )}>
                    {getIcon(resource.type)}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground">{resource.name}</p>
                    <p className="text-[10px] text-muted-foreground">{resource.location}</p>
                  </div>
                </div>
                {getStatusBadge(resource.status)}
              </div>
              {resource.eta && (
                <p className="mt-1.5 text-[10px] font-mono text-accent">
                  ETA: {resource.eta}
                </p>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
