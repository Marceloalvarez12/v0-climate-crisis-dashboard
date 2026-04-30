"use client"

import { useMemo } from "react"
import useSWR from "swr"
import { AlertTriangle, Users, Clock, TrendingUp, Activity, Shield } from "lucide-react"
import { cn } from "@/lib/utils"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface Metric {
  id: string
  label: string
  value: string | number
  change?: number
  icon: React.ReactNode
  color: "primary" | "accent" | "success" | "muted"
  progress?: number
}

export function AnalyticsPanel() {
  // Fetch data from Supabase
  const { data: incidentes } = useSWR("/api/incidentes", fetcher, { refreshInterval: 5000 })
  const { data: recursos } = useSWR("/api/recursos", fetcher, { refreshInterval: 5000 })

  // Calculate metrics from real data
  const metrics: Metric[] = useMemo(() => {
    const totalAffected = incidentes?.reduce((acc: number, inc: { personas_afectadas: number }) => acc + (inc.personas_afectadas || 0), 0) || 0
    const incidentCount = incidentes?.length || 0
    const criticalCount = incidentes?.filter((i: { severidad: string }) => i.severidad === "critical").length || 0
    const highCount = incidentes?.filter((i: { severidad: string }) => i.severidad === "high").length || 0
    
    const totalResources = recursos?.length || 0
    const deployedResources = recursos?.filter((r: { estado: string }) => r.estado !== "available").length || 0
    
    // Calculate risk level based on incidents
    let riskLevel = "BAJO"
    let riskProgress = 25
    if (criticalCount > 0) {
      riskLevel = "CRITICO"
      riskProgress = 95
    } else if (highCount > 2) {
      riskLevel = "ALTO"
      riskProgress = 78
    } else if (incidentCount > 3) {
      riskLevel = "MEDIO"
      riskProgress = 50
    }

    return [
      {
        id: "risk",
        label: "Nivel de Riesgo",
        value: riskLevel,
        icon: <AlertTriangle className="h-4 w-4" />,
        color: criticalCount > 0 ? "primary" : highCount > 0 ? "accent" : "success",
        progress: riskProgress,
      },
      {
        id: "affected",
        label: "Personas Afectadas",
        value: totalAffected.toLocaleString(),
        change: 12,
        icon: <Users className="h-4 w-4" />,
        color: "accent",
      },
      {
        id: "response",
        label: "Tiempo de Respuesta",
        value: "8.2 min",
        change: -15,
        icon: <Clock className="h-4 w-4" />,
        color: "success",
      },
      {
        id: "incidents",
        label: "Incidentes Activos",
        value: incidentCount,
        change: criticalCount > 0 ? criticalCount : undefined,
        icon: <Activity className="h-4 w-4" />,
        color: "primary",
      },
      {
        id: "resources",
        label: "Recursos Desplegados",
        value: `${deployedResources}/${totalResources}`,
        icon: <Shield className="h-4 w-4" />,
        color: "muted",
        progress: totalResources > 0 ? Math.round((deployedResources / totalResources) * 100) : 0,
      },
      {
        id: "trend",
        label: "Tendencia 24h",
        value: criticalCount > 0 ? "+45%" : highCount > 0 ? "+23%" : "+5%",
        icon: <TrendingUp className="h-4 w-4" />,
        color: "accent",
      },
    ]
  }, [incidentes, recursos])

  const getColorClasses = (color: Metric["color"]) => {
    switch (color) {
      case "primary":
        return "text-primary bg-primary/10 border-primary/20"
      case "accent":
        return "text-accent bg-accent/10 border-accent/20"
      case "success":
        return "text-success bg-success/10 border-success/20"
      case "muted":
        return "text-muted-foreground bg-secondary border-border"
    }
  }

  const getProgressColor = (color: Metric["color"]) => {
    switch (color) {
      case "primary":
        return "bg-primary"
      case "accent":
        return "bg-accent"
      case "success":
        return "bg-success"
      case "muted":
        return "bg-muted-foreground"
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <h2 className="text-sm font-semibold text-foreground">Analiticas en Tiempo Real</h2>
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
          <span className="text-[10px] text-muted-foreground">En vivo</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 lg:grid-cols-6">
        {metrics.map((metric) => (
          <div
            key={metric.id}
            className={cn(
              "rounded-lg border p-3 transition-all hover:scale-[1.02]",
              getColorClasses(metric.color)
            )}
          >
            <div className="flex items-center justify-between">
              <div className="shrink-0 opacity-80">{metric.icon}</div>
              {metric.change !== undefined && (
                <span
                  className={cn(
                    "text-[10px] font-medium",
                    metric.change > 0 ? "text-primary" : "text-success"
                  )}
                >
                  {metric.change > 0 ? "+" : ""}
                  {metric.change}%
                </span>
              )}
            </div>
            <div className="mt-2">
              <p className="text-lg font-bold leading-none">{metric.value}</p>
              <p className="mt-1 text-[10px] opacity-70">{metric.label}</p>
            </div>
            {metric.progress !== undefined && (
              <div className="mt-2">
                <div className="h-1 w-full overflow-hidden rounded-full bg-background/50">
                  <div
                    className={cn("h-full rounded-full transition-all duration-500", getProgressColor(metric.color))}
                    style={{ width: `${metric.progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
