"use client"

import useSWR from "swr"
import { AlertTriangle, Users, Clock, TrendingUp, TrendingDown, Activity, Shield } from "lucide-react"
import { cn } from "@/lib/utils"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface AnalyticsData {
  riskLevel: string
  riskProgress: number
  criticalCount: number
  highCount: number
  affectedNow: number
  affectedChange: number
  avgResponseMin: number | null
  resolvedCount: number
  activeIncidentCount: number
  incidentsTrend: number
  totalResources: number
  deployedResources: number
  enCamino: number
  ocupados: number
  resourceProgress: number
}

export function AnalyticsPanel() {
  const { data } = useSWR<AnalyticsData>("/api/analytics", fetcher, { refreshInterval: 2000 })

  const d = data

  const riskColor = !d
    ? "muted"
    : d.criticalCount > 0 ? "primary"
    : d.highCount > 0 ? "accent"
    : "success"

  const responseValue = d?.avgResponseMin != null
    ? `${d.avgResponseMin} min`
    : "—"

  // Trend for response time: negative change is good (faster)
  const responseTrend = d?.resolvedCount
    ? Math.round(((d.avgResponseMin ?? 8) - 8) / 8 * 100)
    : null

  const trendValue = d
    ? (d.incidentsTrend >= 0 ? `+${d.incidentsTrend}%` : `${d.incidentsTrend}%`)
    : "—"

  const metrics = [
    {
      id: "risk",
      label: "Nivel de Riesgo",
      value: d?.riskLevel ?? "—",
      icon: <AlertTriangle className="h-4 w-4" />,
      color: riskColor as "primary" | "accent" | "success" | "muted",
      progress: d?.riskProgress,
    },
    {
      id: "affected",
      label: "Personas Afectadas",
      value: d ? d.affectedNow.toLocaleString("es-AR") : "—",
      change: d?.affectedChange,
      icon: <Users className="h-4 w-4" />,
      color: "accent" as const,
    },
    {
      id: "response",
      label: "Tiempo de Respuesta",
      value: responseValue,
      change: responseTrend ?? undefined,
      icon: <Clock className="h-4 w-4" />,
      color: "success" as const,
    },
    {
      id: "incidents",
      label: "Incidentes Activos",
      value: d?.activeIncidentCount ?? "—",
      change: d?.incidentsTrend,
      icon: <Activity className="h-4 w-4" />,
      color: "primary" as const,
    },
    {
      id: "resources",
      label: "Recursos Desplegados",
      value: d ? `${d.deployedResources}/${d.totalResources}` : "—",
      icon: <Shield className="h-4 w-4" />,
      color: "muted" as const,
      progress: d?.resourceProgress,
      sublabel: d && d.enCamino > 0 ? `${d.enCamino} en camino` : undefined,
    },
    {
      id: "trend",
      label: "Tendencia 24h",
      value: trendValue,
      icon: d?.incidentsTrend != null && d.incidentsTrend < 0
        ? <TrendingDown className="h-4 w-4" />
        : <TrendingUp className="h-4 w-4" />,
      color: (d?.incidentsTrend != null && d.incidentsTrend < 0 ? "success" : "accent") as "success" | "accent",
    },
  ]

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
          <div className={cn("h-1.5 w-1.5 rounded-full", d ? "bg-success animate-pulse" : "bg-muted-foreground")} />
          <span className="text-[10px] text-muted-foreground">{d ? "En vivo" : "Cargando..."}</span>
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
              <p className="text-lg font-bold leading-none tabular-nums">{metric.value}</p>
              <p className="mt-1 text-[10px] opacity-70">{metric.label}</p>
              {"sublabel" in metric && metric.sublabel && (
                <p className="mt-0.5 text-[9px] opacity-50">{metric.sublabel}</p>
              )}
            </div>
            {metric.progress !== undefined && (
              <div className="mt-2">
                <div className="h-1 w-full overflow-hidden rounded-full bg-background/50">
                  <div
                    className={cn("h-full rounded-full transition-all duration-700", getProgressColor(metric.color))}
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
