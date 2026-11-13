"use client"

import { useEffect, useState, useRef, useMemo } from "react"
import { Bot, CheckCircle2, Hash } from "lucide-react"
import useSWR from "swr"
import { cn } from "@/lib/utils"
import { fetcher } from "@/lib/api"
import { TRIGGER_HASHTAG } from "@/lib/agents/hashtag"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useStaffAccess } from "@/hooks/use-staff-access"

import type { ActivityItem } from "./ai-activity-log/types"
import type { DbIncident } from "@/lib/types"
import { ActivityNode, activityTypeStyle, SeverityBadge } from "./ai-activity-log/activity-helpers"
import { ReasoningPanel, ConfidenceBadge } from "./ai-activity-log/reasoning-panel"
import { AlertActions } from "./ai-activity-log/alert-actions"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function incidentToActivity(incident: DbIncident): ActivityItem {
  const details = incident.fuente_detalles ?? {}
  const analysis = details.ai_analysis as Record<string, unknown> | undefined
  const social = incident.fuente === "social"
  return {
    id: incident.id,
    timestamp: new Date(incident.created_at),
    type: "alert",
    source: social ? "Redes" : incident.fuente === "citizen" ? "Ciudadano" : "Fuente externa",
    message: social
      ? `${incident.ubicacion}: ${String(analysis?.summary || details.content || "Reporte de redes sociales recibido")}`
      : `${incident.ubicacion}: ${incident.fuente === "citizen" ? "reporte ciudadano recibido" : "evento recibido desde una fuente conectada"}`,
    actionable: true,
    location: incident.ubicacion,
    severity: incident.severidad as ActivityItem["severity"],
    incidentId: incident.id,
    confidence: typeof analysis?.confidence === "number" ? analysis.confidence : undefined,
    reasoning: typeof analysis?.reasoning === "string" ? [{ step: 1, thought: analysis.reasoning }] : undefined,
    sourcePost: social ? {
      platform: String(details.platform || "Red social"),
      author: String(details.username || "Usuario"),
      hashtag: String(details.hashtag || TRIGGER_HASHTAG),
    } : undefined,
  }
}

const formatTime = (date: Date) =>
  date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export function AIActivityLog() {
  const { canOperate } = useStaffAccess()
  const { data: activeIncidents, error: incidentError } = useSWR<DbIncident[]>("/api/incidentes?estado=activo", fetcher, { refreshInterval: 5000 })
  const { data: agent, error: agentError } = useSWR<{ status: string; activeConnectors: number; lastScan?: string }>("/api/agent", fetcher, { refreshInterval: 10000 })
  const { data: logs, error: logError } = useSWR<Array<{ id: string; created_at: string; type: ActivityItem["type"]; message: string; source: string }>>("/api/agent-logs", fetcher, { refreshInterval: 10000 })
  const isRunning = agent?.status === "ready" && !agentError
  const activities = useMemo((): ActivityItem[] => [
    ...(activeIncidents ?? []).map(incidentToActivity),
    ...(logs ?? []).map((log): ActivityItem => ({ ...log, timestamp: new Date(log.created_at) })),
  ].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()).slice(-40), [activeIncidents, logs])
  const [processedAlerts,     setProcessedAlerts]     = useState<Set<string>>(new Set())
  const [expandedReasoning,   setExpandedReasoning]   = useState<Set<string>>(new Set())

  const scrollRef          = useRef<HTMLDivElement>(null)

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    const viewport = scrollRef.current?.querySelector("[data-radix-scroll-area-viewport]")
    if (viewport) viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" })
  }, [activities])

  const avgConfidence = useMemo(() => {
    const values = activities.map(a => a.confidence).filter((v): v is number => typeof v === "number")
    return values.length ? Math.round(values.reduce((s, v) => s + v, 0) / values.length) : 0
  }, [activities])

  const pendingAlerts = activities.filter(a => a.type === "alert" && a.actionable && !processedAlerts.has(a.id) && activeIncidents?.some(i => i.id === a.incidentId)).length

  // ── Handlers de interacción ───────────────────────────────────────────────

  const toggleReasoning = (id: string) => {
    setExpandedReasoning((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const lastId = activities[activities.length - 1]?.id

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-[#30313d] bg-[#0e1115] shadow-[0_8px_24px_rgba(0,0,0,.14)]">
      {/* Header */}
      <div className="shrink-0 border-b border-[#30313d] bg-[#15141c] px-3.5 pt-3 pb-2.5">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-violet-500/30 bg-violet-500/10">
            <Bot className="h-4 w-4 text-violet-300" />
            <span className="absolute -right-0.5 -bottom-0.5 flex h-2.5 w-2.5">
              {isRunning && <span className="absolute inset-0 rounded-full bg-emerald-400 animate-pulse-ring" />}
              <span className={cn("relative h-2.5 w-2.5 rounded-full border-2 border-card", isRunning ? "bg-emerald-400" : "bg-slate-500")} />
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-[13px] font-semibold leading-tight tracking-tight text-foreground">Agente IA</h2>
            <p className="text-[10px] leading-tight text-slate-300">{agentError || incidentError || logError ? "Conexión o registros no disponibles" : isRunning ? "Habilitado · esperando eventos reales" : "Deshabilitado o sin conectores"}</p>
          </div>
          <span className="inline-flex h-5 shrink-0 items-center gap-0.5 rounded-md border border-sky-500/30 bg-sky-500/10 px-1.5 font-mono text-[9px] text-sky-300" title="Hashtag monitoreado">
            <Hash className="h-2.5 w-2.5" />
            {TRIGGER_HASHTAG.replace(/^#/, "")}
          </span>
        </div>

        {/* Telemetría */}
        <div className="mt-3 grid grid-cols-3 divide-x divide-border rounded-md border border-border bg-background/40">
          <Metric label="Reportes" value={activeIncidents ? activeIncidents.length.toLocaleString("es-AR") : "—"} />
          <Metric label="Conectores" value={agent ? String(agent.activeConnectors) : "—"} />
          <Metric label="Confianza" value={avgConfidence ? `${avgConfidence}%` : "—"} />
        </div>
        <p className="mt-1.5 text-[10px] text-muted-foreground">Registros reales. Confianza media de los análisis disponibles.</p>

        {/* Tarea actual */}
        <div className="mt-2.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="break-words text-foreground/80">
              {agent?.lastScan ? `Último escaneo: ${new Date(agent.lastScan).toLocaleString("es-AR")}` : "Sin escaneos confirmados"}
            </span>
            {pendingAlerts > 0 && (
              <span className="ml-2 shrink-0 font-mono text-red-400">{pendingAlerts} pendiente{pendingAlerts === 1 ? "" : "s"}</span>
            )}
          </div>
          <div className="relative mt-1.5 h-[3px] overflow-hidden rounded-full bg-violet-500/10">
            {isRunning && <div className="absolute inset-y-0 w-1/3 rounded-full bg-gradient-to-r from-transparent via-violet-400 to-transparent animate-agent-scan" />}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="min-h-0 flex-1 overflow-hidden">
        <ScrollArea className="agent-scroll h-full custom-scrollbar" ref={scrollRef}>
          <div className="relative px-3 py-3">
            <div className="absolute top-3 bottom-3 left-[23px] w-px bg-gradient-to-b from-transparent via-border to-border" />
            <ul className="space-y-1">
              {activities.length === 0 && <li className="p-3 text-xs text-slate-400">Sin actividad registrada.</li>}
              {activities.map((activity) => {
                const isProcessed     = processedAlerts.has(activity.id)
                const showActions     = canOperate && activity.actionable && activity.type === "alert" && !isProcessed && activeIncidents?.some(i => i.id === activity.incidentId)
                const isReasoningOpen = expandedReasoning.has(activity.id)
                const style           = activityTypeStyle(activity.type)

                return (
                  <li
                    key={activity.id}
                    className={cn("relative flex gap-2.5", activity.isNew && "animate-in fade-in slide-in-from-bottom-2 duration-500")}
                  >
                    <ActivityNode type={activity.type} live={activity.id === lastId} />

                    <div
                      className={cn(
                        "min-w-0 flex-1 rounded-md px-2.5 py-2 transition-colors",
                        showActions ? "border border-red-500/25 bg-red-500/[0.06]" : "hover:bg-secondary/40",
                      )}
                    >
                      <div className="flex items-center gap-1.5 text-[9px]">
                        <span className={cn("font-semibold uppercase tracking-wider", style.text)}>{style.label}</span>
                        {activity.source && <span className="truncate text-muted-foreground">· {activity.source}</span>}
                        <span className="ml-auto shrink-0 font-mono tabular-nums text-muted-foreground/70" suppressHydrationWarning>
                          {formatTime(activity.timestamp)}
                        </span>
                      </div>

                      <p className="mt-0.5 break-words text-[11.5px] leading-relaxed text-slate-100">{activity.message}</p>

                      {(activity.severity || activity.confidence) && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <SeverityBadge severity={activity.severity} />
                          {activity.confidence && <ConfidenceBadge value={activity.confidence} />}
                        </div>
                      )}

                      {activity.sourcePost && (
                        <p className="mt-1 break-words text-[10px] text-muted-foreground">
                          <span className="font-mono text-sky-400">{activity.sourcePost.hashtag}</span>
                          {" · "}{activity.sourcePost.author} en {activity.sourcePost.platform}
                        </p>
                      )}

                      <ReasoningPanel
                        activity={activity}
                        isExpanded={isReasoningOpen}
                        onToggle={() => toggleReasoning(activity.id)}
                      />

                      {showActions && (
                        <AlertActions
                          activity={activity}
                          onDeploy={(a) => { if (a.incidentId) window.location.assign(`/?incidente=${encodeURIComponent(a.incidentId)}`) }}
                          onDismiss={(id) => setProcessedAlerts((prev) => new Set(prev).add(id))}
                        />
                      )}

                      {isProcessed && activity.actionable && (
                        <div className="mt-1.5 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                          <span className="text-[10px] text-emerald-400">Revisada en esta vista</span>
                        </div>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        </ScrollArea>
      </div>

      {/* Footer: estado del modelo */}
      <div className="flex shrink-0 items-center gap-2 border-t border-border px-3.5 py-2 text-[10px] text-muted-foreground">
        <span className="flex gap-0.5">
          {[0, 150, 300].map((delay) => (
            <span key={delay} className={cn("h-1 w-1 rounded-full bg-violet-400", isRunning && "animate-bounce")} style={{ animationDelay: `${delay}ms` }} />
          ))}
        </span>
        {agentError || logError ? "Registros no disponibles" : "Actividad operativa"}
        <span className="ml-auto font-mono text-muted-foreground/60">zntinel-reasoner</span>
      </div>


    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-2 py-1.5 text-center">
      <p className="font-mono text-[13px] font-semibold tabular-nums leading-tight text-foreground">{value}</p>
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  )
}
