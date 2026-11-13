"use client"

import { Truck, Users, Plane, Ship, Building2, HeartPulse } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useResources } from "./crisis-map/use-map-data"

interface Resource {
  id: string
  name: string
  type: "ambulance" | "firefighter" | "helicopter" | "boat" | "shelter" | "medical" | "police"
  status: "available" | "dispatched" | "busy"
  location: string
}

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
    case "police":
      return <Users className="h-4 w-4" />
    default:
      return <Users className="h-4 w-4" />
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
    case "dispatched":
      return (
        <Badge variant="outline" className="border-accent/50 bg-accent/10 text-accent text-[10px] px-1.5 py-0">
          En camino
        </Badge>
      )
    case "busy":
      return (
        <Badge variant="outline" className="border-primary/50 bg-primary/10 text-primary text-[10px] px-1.5 py-0">
          En servicio
        </Badge>
      )
  }
}

export function ResourcesPanel() {
  // Fetch resources from shared hook (unified SWR cache)
  const { data: dbResources, error } = useResources()

  const resources: Resource[] = dbResources ? dbResources.map((r: { id: string; tipo: string; nombre: string; estado: string; ubicacion: string }) => ({
    id: r.id,
    name: r.nombre,
    type: r.tipo as Resource["type"],
    status: r.estado as Resource["status"],
    location: r.ubicacion || "Central Base"
  })) : []

  const availableCount = resources.filter(r => r.status === "available").length
  const enRouteCount = resources.filter(r => r.status === "dispatched").length
  const busyCount = resources.filter(r => r.status === "busy").length

  if (error) {
    return (
      <div className="flex h-full flex-col rounded-lg border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">No se pudieron cargar los recursos</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col rounded-lg border border-[#30373c] bg-[#0f1417] shadow-[0_8px_24px_rgba(0,0,0,.12)]">
      <div className="border-b border-[#30373c] px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Recursos de respuesta</h2>
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
          {resources.length === 0 ? (
            <p className="text-xs text-muted-foreground p-2">No hay recursos disponibles para mostrar.</p>
          ) : (
            resources.map((resource) => (
              <div
                key={resource.id}
                className={cn(
                  "rounded-md border border-[#2b343a] bg-[#151b1f] p-2.5 transition-colors",
                  resource.status === "dispatched" && "border-amber-400/40 bg-amber-400/5",
                  resource.status === "busy" && "border-red-400/40 bg-red-400/5"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/5",
                      resource.status === "available" && "text-success",
                      resource.status === "dispatched" && "text-accent",
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
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
