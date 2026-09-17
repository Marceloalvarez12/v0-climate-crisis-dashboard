"use client"

import { useState, useEffect, useMemo } from "react"
import { Truck, Users, Plane, Ship, Building2, HeartPulse, ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useResources } from "./crisis-map/use-map-data"
import { getCurrentOperatorAssignments } from "@/app/admin/actions"
import { getTipoLabel, groupResourcesByTypeAndBase } from "@/lib/resource-helpers"

interface DbResource {
  id: string
  tipo: string
  nombre: string
  cantidad: number
  cantidad_disponible: number
  estado: string
  ubicacion: string
}

const getIcon = (type: string) => {
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

export function ResourcesPanel() {
  const { data: dbResources, error } = useResources()
  const [assignedResourceIds, setAssignedResourceIds] = useState<Set<string> | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [showingError, setShowingError] = useState(false)

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setShowingError(true), 8000)
      return () => clearTimeout(timer)
    }
    if (dbResources !== undefined) {
      setShowingError(false)
    }
  }, [error, dbResources])

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

  const filteredDbResources = useMemo(() => {
    if (!dbResources) return []
    const hasExplicitAssignments = assignedResourceIds !== null && assignedResourceIds.size > 0
    if (!hasExplicitAssignments) return dbResources
    return dbResources.filter((r: { id: string }) => assignedResourceIds.has(r.id))
  }, [dbResources, assignedResourceIds])

  const groupedResources = useMemo(() => {
    if (!filteredDbResources || filteredDbResources.length === 0) return []
    return groupResourcesByTypeAndBase(filteredDbResources as DbResource[])
  }, [filteredDbResources])

  const stats = useMemo(() => {
    if (!filteredDbResources) return { available: 0, dispatched: 0, busy: 0 }
    const available = filteredDbResources.reduce((sum: number, r: DbResource) => sum + (r.cantidad_disponible ?? (r.cantidad || 1)), 0)
    const dispatched = filteredDbResources.reduce((sum: number, r: DbResource) => {
      const total = r.cantidad || 1
      const disp = r.cantidad_disponible ?? total
      return sum + (total - disp)
    }, 0)
    const busy = filteredDbResources.filter((r: DbResource) => r.estado === "busy").reduce((sum: number, r: DbResource) => sum + (r.cantidad || 1), 0)
    return { available, dispatched, busy }
  }, [filteredDbResources])

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupKey)) {
        next.delete(groupKey)
      } else {
        next.add(groupKey)
      }
      return next
    })
  }

  if (!dbResources && !showingError) {
    return (
      <div className="flex h-full flex-col rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-xs text-muted-foreground">Loading resources...</p>
        </div>
      </div>
    )
  }

  if (showingError && !dbResources) {
    return (
      <div className="flex h-full flex-col rounded-lg border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">Error loading resources</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Available Resources</h2>
        <div className="mt-2 flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-success" />
            <span className="text-muted-foreground">{stats.available}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-accent" />
            <span className="text-muted-foreground">{stats.dispatched}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <span className="text-muted-foreground">{stats.busy}</span>
          </span>
        </div>
      </div>
      <ScrollArea className="flex-1 px-3 py-2">
        <div className="space-y-2">
          {groupedResources.length === 0 ? (
            <p className="text-xs text-muted-foreground p-2">
              {assignedResourceIds !== null && assignedResourceIds.size === 0
                ? "No resources assigned to you. Contact admin."
                : "Loading resources..."}
            </p>
          ) : (
            groupedResources.map((group) => {
              const groupKey = `${group.tipo}|${group.ubicacion}`
              const isExpanded = expandedGroups.has(groupKey)
              const disponible = group.totalDisponible
              const total = group.totalCantidad
              const percent = total > 0 ? (disponible / total) * 100 : 0

              return (
                <div key={groupKey} className="rounded-md border border-border bg-secondary/30 overflow-hidden">
                  <button
                    onClick={() => toggleGroup(groupKey)}
                    className="w-full flex items-center gap-2 p-2.5 hover:bg-secondary/50 transition-colors"
                  >
                    <div className={cn(
                      "shrink-0",
                      disponible === total ? "text-success" :
                      disponible > 0 ? "text-accent" : "text-primary"
                    )}>
                      {getIcon(group.tipo)}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-xs font-medium text-foreground">{getTipoLabel(group.tipo)}</p>
                      <p className="text-[10px] text-muted-foreground">{group.ubicacion}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn(
                        "text-xs font-mono font-semibold",
                        disponible === total ? "text-success" :
                        disponible > 0 ? "text-accent" : "text-primary"
                      )}>
                        {disponible}/{total}
                      </span>
                      <div className="w-12 h-1 bg-background/50 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            percent >= 80 ? "bg-success" :
                            percent >= 40 ? "bg-accent" : "bg-primary"
                          )}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-border px-2.5 py-2 bg-secondary/20">
                      {group.resources.map((resource) => {
                        const rDisponible = resource.cantidad_disponible ?? (resource.cantidad || 1)
                        const rTotal = resource.cantidad || 1
                        const rPercent = rTotal > 0 ? (rDisponible / rTotal) * 100 : 0

                        const units = []
                        for (let i = 1; i <= rTotal; i++) {
                          const unitNum = String(i).padStart(2, "0")
                          const unitName = `${resource.nombre} ${unitNum}`
                          const isAvailable = i <= rDisponible

                          units.push(
                            <div key={`${resource.id}-${i}`} className="flex items-center justify-between py-1.5 px-2">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-muted-foreground truncate max-w-[140px]">
                                  {unitName}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={cn(
                                  "border-[10px] px-1.5 py-0 text-[9px]",
                                  isAvailable ? "border-success/50 bg-success/10 text-success" : "border-primary/50 bg-primary/10 text-primary"
                                )}>
                                  {isAvailable ? "Available" : "Busy"}
                                </Badge>
                              </div>
                            </div>
                          )
                        }

                        return (
                          <div key={resource.id} className="space-y-0.5">
                            {units}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
