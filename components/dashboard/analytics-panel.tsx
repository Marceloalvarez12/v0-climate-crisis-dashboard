"use client"

import useSWR from "swr"
import { AlertTriangle, Users, Clock, TrendingUp, TrendingDown, Activity, Shield, RadioTower } from "lucide-react"
import { cn } from "@/lib/utils"
import { fetcher } from "@/lib/api"

interface AnalyticsData {
  riskLevel: string
  riskProgress: number
  criticalCount: number
  highCount: number
  mediumCount: number
  lowCount: number
  citizenCount: number
  affectedNow: number
  affectedChange: number
  avgResponseMin: number | null
  activeIncidentCount: number
  incidentsTrend: number | null
  totalResources: number
  deployedResources: number
  enCamino: number
  ocupados: number
  resourceProgress: number
}

interface Metric {
  id: string
  label: string
  value: string | number
  change?: number
  icon: React.ReactNode
  color: "primary" | "accent" | "success" | "muted"
  progress?: number
  sublabel?: string
}

export function AnalyticsPanel() {
  const { data } = useSWR<AnalyticsData>("/api/analytics", fetcher, {
    refreshInterval: 5000,
    revalidateOnFocus: false,
    dedupingInterval: 3000,
    keepPreviousData: true,
  })

  const d = data

  // Risk color: muted when no data, red when critical, amber when high, green when safe
  const riskColor: Metric["color"] = !d || d.activeIncidentCount === 0
    ? "muted"
    : d.criticalCount > 0 ? "primary"
    : d.highCount > 0 ? "accent"
    : "success"

  // Response time: show in hours if >= 60 min, minutes otherwise
  const responseValue = d?.avgResponseMin != null
    ? d.avgResponseMin >= 60
      ? `${(d.avgResponseMin / 60).toFixed(1)}h`
      : `${d.avgResponseMin} min`
    : "—"

  // Trend: null means no reliable comparison window — show "Stable"
  const trendValue = !d
    ? "—"
    : d.incidentsTrend === null
      ? "Sin datos"
      : d.incidentsTrend > 0
        ? `+${d.incidentsTrend}%`
        : d.incidentsTrend < 0
          ? `${d.incidentsTrend}%`
          : "Estable"

  const metrics: Metric[] = [
    {
      id: "risk",
      label: "Nivel de riesgo",
      // Show LOW when active but no critical/high, show — when no data yet
      value: !d || d.activeIncidentCount === 0 ? "SIN INCIDENTES" : ({ LOW: "BAJO", "LOW-MEDIUM": "BAJO–MEDIO", MEDIUM: "MEDIO", HIGH: "ALTO", CRITICAL: "CRÍTICO" } as Record<string, string>)[d.riskLevel] ?? d.riskLevel,
      icon: <AlertTriangle className="h-4 w-4" />,
      color: riskColor,
      progress: d?.activeIncidentCount === 0 ? 0 : d?.riskProgress,
    },
    {
      id: "affected",
      label: "Personas afectadas",
      value: d ? d.affectedNow.toLocaleString("en-US") : "—",
      // Only show change badge if it's non-zero (real comparison exists)
      change: d?.affectedChange !== 0 ? d?.affectedChange : undefined,
      icon: <Users className="h-4 w-4" />,
      color: "accent",
    },
    {
      id: "response",
      label: "Tiempo de respuesta",
      value: responseValue,
      icon: <Clock className="h-4 w-4" />,
      color: d?.avgResponseMin != null ? "success" : "muted",
      sublabel: "promedio últimos 50 incidentes",
    },
    {
      id: "incidents",
      label: "Incidentes activos",
      value: d?.activeIncidentCount ?? "—",
      change: d?.incidentsTrend != null && d.incidentsTrend !== 0 ? d.incidentsTrend : undefined,
      icon: <Activity className="h-4 w-4" />,
      color: d && d.activeIncidentCount > 0 ? "primary" : "muted",
      // severity breakdown shown as sublabel
      sublabel: d && d.activeIncidentCount > 0
        ? [
            d.criticalCount > 0  ? `${d.criticalCount} crit` : null,
            d.highCount > 0      ? `${d.highCount} alta` : null,
            d.mediumCount > 0    ? `${d.mediumCount} med` : null,
            d.lowCount > 0       ? `${d.lowCount} baja` : null,
            d.citizenCount > 0   ? `${d.citizenCount} ciudadano` : null,
          ].filter(Boolean).join(" · ") || undefined
        : undefined,
    },
    {
      id: "citizen",
      label: "Reportes ciudadanos",
      value: d?.citizenCount ?? "—",
      icon: <RadioTower className="h-4 w-4" />,
      color: d && d.citizenCount > 0 ? "accent" : "muted",
    },
    {
      id: "resources",
      label: "Recursos desplegados",
      value: d ? `${d.deployedResources}/${d.totalResources}` : "—",
      icon: <Shield className="h-4 w-4" />,
      color: d && d.deployedResources > 0 ? "accent" : "muted",
      progress: d?.resourceProgress,
      sublabel: d && d.enCamino > 0 ? `${d.enCamino} en camino` : undefined,
    },
    {
      id: "trend",
      label: "Tendencia 24 h",
      value: trendValue,
      icon: d?.incidentsTrend != null && d.incidentsTrend < 0
        ? <TrendingDown className="h-4 w-4" />
        : <TrendingUp className="h-4 w-4" />,
      color: !d || d.incidentsTrend === null
        ? "muted"
        : d.incidentsTrend < 0 ? "success" : d.incidentsTrend > 0 ? "primary" : "muted",
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
    <div className="rounded-lg border border-[#30373c] bg-[#0f1417] shadow-[0_8px_24px_rgba(0,0,0,.12)]">
      <div className="flex items-center justify-between border-b border-[#30373c] px-4 py-2">
        <h2 className="text-sm font-semibold text-foreground">Indicadores de la simulación</h2>
        <div className="flex items-center gap-1.5">
          <div className={cn("h-1.5 w-1.5 rounded-full", d ? "bg-success animate-pulse" : "bg-muted-foreground")} />
          <span className="text-[10px] text-muted-foreground">{d ? "Actualizado" : "Cargando..."}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {metrics.map((metric) => (
          <div
            key={metric.id}
            className={cn(
              "min-w-0 rounded-md border p-2.5 transition-colors hover:brightness-125",
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
              <p className="break-words text-base font-bold leading-tight tabular-nums">{metric.value}</p>
              <p className="mt-1 text-[10px] leading-tight opacity-80">{metric.label}</p>
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
