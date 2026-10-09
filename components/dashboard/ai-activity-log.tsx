"use client"

import { useEffect, useState, useRef, useCallback, useMemo } from "react"
import { useSWRConfig } from "swr"
import { Bot, CheckCircle2, Hash } from "lucide-react"
import useSWR from "swr"
import { cn } from "@/lib/utils"
import { dispatchResourceWithLifecycle } from "@/hooks/use-resource-lifecycle"
import { useAutoResolve } from "@/hooks/use-auto-resolve"
import { patchIncidente, fetcher } from "@/lib/api"
import { TRIGGER_HASHTAG } from "@/lib/agents/hashtag"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"

import type { ActivityItem } from "./ai-activity-log/types"
import type { DbIncident } from "@/lib/types"
import { initialActivities, backgroundMessages, agentTasks } from "./ai-activity-log/data"
import { ActivityNode, activityTypeStyle, SeverityBadge } from "./ai-activity-log/activity-helpers"
import { ReasoningPanel, ConfidenceBadge } from "./ai-activity-log/reasoning-panel"
import { AlertActions, ConfirmActionDialog } from "./ai-activity-log/alert-actions"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Crea una ActivityItem con id y timestamp auto-generados */
function makeActivity(
  template: Omit<ActivityItem, "id" | "timestamp">,
  extra?: Partial<ActivityItem>,
): ActivityItem {
  return { ...template, id: `${Date.now()}-${Math.random()}`, timestamp: new Date(), isNew: true, ...extra }
}

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
  const [activities,          setActivities]         = useState<ActivityItem[]>(initialActivities)
  const { data: activeIncidents } = useSWR<DbIncident[]>("/api/incidentes?estado=activo", fetcher, { refreshInterval: 5000 })
  const [confirmDialog,       setConfirmDialog]       = useState<{ open: boolean; type: "deploy" | "notify"; activity: ActivityItem | null }>({ open: false, type: "deploy", activity: null })
  const [processedAlerts,     setProcessedAlerts]     = useState<Set<string>>(new Set())
  const [expandedReasoning,   setExpandedReasoning]   = useState<Set<string>>(new Set())
  const [signalCount,         setSignalCount]         = useState(1284)
  const [taskIndex,           setTaskIndex]           = useState(0)
  const validatingSatellite: string | null = null

  const scrollRef          = useRef<HTMLDivElement>(null)
  const seenIncidentsRef   = useRef<Set<string>>(new Set())
  const messageIndexRef    = useRef(0)

  const addActivity = useCallback((template: Omit<ActivityItem, "id" | "timestamp">) => {
    setActivities((prev) => [...prev.slice(-20), makeActivity(template)])
  }, [])

  // ── Auto-resolve incidentes viejos + auto-reset recursos atascados ───────
  useAutoResolve({
    onResolved: (locations) => {
      locations.forEach((loc) => {
        addActivity({ type: "complete", source: "Sistema", message: `Incidente en ${loc} cerrado automáticamente (5 min sin atención)` })
      })
    },
  })

  const { mutate } = useSWRConfig()

  // ── Actividad de reportes reales ──────────────────────────────────────────
  useEffect(() => {
    if (!activeIncidents) return
    const incoming = activeIncidents.filter(incident => !seenIncidentsRef.current.has(incident.id))
    for (const incident of incoming) seenIncidentsRef.current.add(incident.id)
    if (incoming.length) setActivities(prev => [...prev, ...incoming.map(incidentToActivity)].slice(-20))
  }, [activeIncidents])

  // ── Loop de mensajes de fondo (monitoring, extraction, etc.) ─────────────
  useEffect(() => {
    const interval = setInterval(() => {
      const template = backgroundMessages[messageIndexRef.current % backgroundMessages.length]
      addActivity(template)
      messageIndexRef.current += 1
    }, 8000)
    return () => clearInterval(interval)
  }, [addActivity])

  // ── Telemetría del agente (contador de señales + tarea actual) ───────────
  useEffect(() => {
    const interval = setInterval(() => {
      setSignalCount((n) => n + Math.floor(Math.random() * 6) + 1)
      setTaskIndex((i) => (i + 1) % agentTasks.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    const viewport = scrollRef.current?.querySelector("[data-radix-scroll-area-viewport]")
    if (viewport) viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" })
  }, [activities])

  const avgConfidence = useMemo(() => {
    const values = activities.map(a => a.confidence).filter((v): v is number => typeof v === "number")
    return values.length ? Math.round(values.reduce((s, v) => s + v, 0) / values.length) : 0
  }, [activities])

  const pendingAlerts = activities.filter(a => a.type === "alert" && a.actionable && !processedAlerts.has(a.id)).length

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

  const handleValidateSatellite = () => {
    toast.info("No hay un proveedor de verificación satelital conectado. Consultá las cámaras y fuentes del incidente.")
  }

  const confirmAction = async () => {
    if (!confirmDialog.activity) return
    const { id: activityId, location = "", incidentId } = confirmDialog.activity
    setConfirmDialog(prev => ({ ...prev, open: false, activity: null }))
    if (confirmDialog.type !== "deploy") {
      toast.info("La notificación automática no está configurada. Usá el canal operativo de comunicación.")
      return
    }
    try {
      if (!incidentId) throw new Error("La alerta no tiene un incidente asociado")
      const incidentes: DbIncident[] = await fetcher("/api/incidentes?estado=activo")
      const incidente = incidentes.find(inc => inc.id === incidentId)
      if (!incidente) throw new Error("El incidente ya no está activo. Actualizá la vista.")
      await dispatchResourceWithLifecycle(incidente.id)
      await patchIncidente(incidente.id, { estado: "atendido" })
      setProcessedAlerts(prev => new Set(prev).add(activityId))
      toast.success("Recursos despachados", { description: location })
      addActivity({ type: "complete", source: "Despacho", message: "Despacho confirmado para " + location })
      const response = await fetch("/api/incidentes/arkiv-dispatch", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: incidente.id }),
      })
      const data = await response.json()
      if (!response.ok || data.onChain !== true) toast.info("Despacho registrado; auditoría en cadena no confirmada")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo confirmar el despacho")
    } finally {
      await Promise.allSettled([mutate("/api/recursos"), mutate("/api/incidentes?estado=activo"), mutate("/api/incidentes?estado=atendido"), mutate("/api/analytics")])
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const lastId = activities[activities.length - 1]?.id

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-gradient-to-b from-violet-500/[0.07] to-transparent px-3.5 pt-3 pb-2.5">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-violet-500/30 bg-violet-500/10">
            <Bot className="h-4 w-4 text-violet-300" />
            <span className="absolute -right-0.5 -bottom-0.5 flex h-2.5 w-2.5">
              <span className="absolute inset-0 rounded-full bg-emerald-400 animate-pulse-ring" />
              <span className="relative h-2.5 w-2.5 rounded-full border-2 border-card bg-emerald-400" />
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-[13px] font-semibold leading-tight tracking-tight text-foreground">Agente IA</h2>
            <p className="truncate text-[10px] text-muted-foreground">Monitoreo autónomo · Gran Tucumán</p>
          </div>
          <span className="inline-flex h-5 shrink-0 items-center gap-0.5 rounded-md border border-sky-500/30 bg-sky-500/10 px-1.5 font-mono text-[9px] text-sky-300" title="Hashtag monitoreado">
            <Hash className="h-2.5 w-2.5" />
            {TRIGGER_HASHTAG.replace(/^#/, "")}
          </span>
        </div>

        {/* Telemetría */}
        <div className="mt-3 grid grid-cols-3 divide-x divide-border rounded-md border border-border bg-background/40">
          <Metric label="Señales" value={signalCount.toLocaleString("es-AR")} />
          <Metric label="Fuentes" value="7" />
          <Metric label="Confianza" value={avgConfidence ? `${avgConfidence}%` : "—"} />
        </div>

        {/* Tarea actual */}
        <div className="mt-2.5">
          <div className="flex items-center justify-between text-[10px]">
            <span key={taskIndex} className="truncate text-foreground/80 animate-in fade-in duration-500">
              {agentTasks[taskIndex]}…
            </span>
            {pendingAlerts > 0 && (
              <span className="ml-2 shrink-0 font-mono text-red-400">{pendingAlerts} pendiente{pendingAlerts === 1 ? "" : "s"}</span>
            )}
          </div>
          <div className="relative mt-1.5 h-[3px] overflow-hidden rounded-full bg-violet-500/10">
            <div className="absolute inset-y-0 w-1/3 rounded-full bg-gradient-to-r from-transparent via-violet-400 to-transparent animate-agent-scan" />
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="min-h-0 flex-1 overflow-hidden">
        <ScrollArea className="h-full custom-scrollbar" ref={scrollRef}>
          <div className="relative px-3 py-3">
            <div className="absolute top-3 bottom-3 left-[23px] w-px bg-gradient-to-b from-transparent via-border to-border" />
            <ul className="space-y-1">
              {activities.map((activity) => {
                const isProcessed     = processedAlerts.has(activity.id)
                const showActions     = activity.actionable && activity.type === "alert" && !isProcessed
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

                      <p className="mt-0.5 text-[11.5px] leading-snug text-foreground/90">{activity.message}</p>

                      {(activity.severity || activity.confidence) && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <SeverityBadge severity={activity.severity} />
                          {activity.confidence && <ConfidenceBadge value={activity.confidence} />}
                        </div>
                      )}

                      {activity.sourcePost && (
                        <p className="mt-1 truncate text-[10px] text-muted-foreground">
                          <span className="font-mono text-sky-400">{activity.sourcePost.hashtag}</span>
                          {" · "}{activity.sourcePost.author} en {activity.sourcePost.platform}
                        </p>
                      )}

                      <ReasoningPanel
                        activity={activity}
                        isExpanded={isReasoningOpen}
                        validatingSatellite={validatingSatellite}
                        onToggle={() => toggleReasoning(activity.id)}
                        onValidateSatellite={handleValidateSatellite}
                      />

                      {showActions && (
                        <AlertActions
                          activity={activity}
                          onDeploy={(a) => setConfirmDialog({ open: true, type: "deploy", activity: a })}
                          onNotify={(a) => setConfirmDialog({ open: true, type: "notify", activity: a })}
                          onDismiss={(id) => setProcessedAlerts((prev) => new Set(prev).add(id))}
                        />
                      )}

                      {isProcessed && activity.actionable && (
                        <div className="mt-1.5 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                          <span className="text-[10px] text-emerald-400">Acción tomada</span>
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
            <span key={delay} className="h-1 w-1 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: `${delay}ms` }} />
          ))}
        </span>
        Analizando en tiempo real
        <span className="ml-auto font-mono text-muted-foreground/60">zntinel-reasoner</span>
      </div>

      <ConfirmActionDialog
        state={confirmDialog}
        onChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
        onConfirm={confirmAction}
      />
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
