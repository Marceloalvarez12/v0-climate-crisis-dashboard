"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, Users, Clock, TrendingUp, Activity, Shield } from "lucide-react"
import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"

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
  const [metrics, setMetrics] = useState<Metric[]>([
    {
      id: "risk",
      label: "Nivel de Riesgo",
      value: "ALTO",
      icon: <AlertTriangle className="h-4 w-4" />,
      color: "primary",
      progress: 78,
    },
    {
      id: "affected",
      label: "Personas Afectadas",
      value: "3,910",
      change: 12,
      icon: <Users className="h-4 w-4" />,
      color: "accent",
    },
    {
      id: "response",
      label: "Tiempo de Respuesta",
      value: "8.3 min",
      change: -15,
      icon: <Clock className="h-4 w-4" />,
      color: "success",
    },
    {
      id: "incidents",
      label: "Incidentes Activos",
      value: 6,
      change: 2,
      icon: <Activity className="h-4 w-4" />,
      color: "primary",
    },
    {
      id: "resources",
      label: "Recursos Desplegados",
      value: "24/32",
      icon: <Shield className="h-4 w-4" />,
      color: "muted",
      progress: 75,
    },
    {
      id: "trend",
      label: "Tendencia 24h",
      value: "+23%",
      icon: <TrendingUp className="h-4 w-4" />,
      color: "accent",
    },
  ])

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev =>
        prev.map(metric => {
          if (metric.id === "affected") {
            const newValue = parseInt(metric.value.toString().replace(",", "")) + Math.floor(Math.random() * 50) - 20
            return { ...metric, value: Math.max(0, newValue).toLocaleString() }
          }
          if (metric.id === "response") {
            const newValue = (parseFloat(metric.value.toString()) + (Math.random() - 0.5)).toFixed(1)
            return { ...metric, value: `${Math.max(1, parseFloat(newValue))} min` }
          }
          if (metric.id === "risk" && Math.random() > 0.9) {
            const newProgress = Math.min(100, Math.max(50, (metric.progress || 78) + Math.floor(Math.random() * 10) - 5))
            return { ...metric, progress: newProgress }
          }
          return metric
        })
      )
    }, 4000)

    return () => clearInterval(interval)
  }, [])

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
