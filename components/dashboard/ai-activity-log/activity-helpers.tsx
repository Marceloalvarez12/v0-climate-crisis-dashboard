import {
  Bot, Search, AlertTriangle, Database, Radio, CheckCircle2, Brain,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { ActivityItem } from "./types"

// ---------------------------------------------------------------------------
// Icono por tipo de actividad
// ---------------------------------------------------------------------------

export function ActivityIcon({ type }: { type: ActivityItem["type"] }) {
  switch (type) {
    case "extraction": return <Search      className="h-3 w-3" />
    case "analysis":   return <Bot         className="h-3 w-3" />
    case "alert":      return <AlertTriangle className="h-3 w-3" />
    case "database":   return <Database    className="h-3 w-3" />
    case "monitoring": return <Radio       className="h-3 w-3" />
    case "complete":   return <CheckCircle2 className="h-3 w-3" />
    case "reasoning":  return <Brain       className="h-3 w-3" />
  }
}

// ---------------------------------------------------------------------------
// Estilo del nodo de timeline por tipo
// ---------------------------------------------------------------------------

const TYPE_STYLES: Record<ActivityItem["type"], { node: string; label: string; text: string }> = {
  extraction: { node: "border-sky-500/40 bg-sky-500/10 text-sky-400",             label: "Extracción", text: "text-sky-400" },
  analysis:   { node: "border-cyan-500/40 bg-cyan-500/10 text-cyan-400",          label: "Análisis",   text: "text-cyan-400" },
  alert:      { node: "border-red-500/50 bg-red-500/15 text-red-400",             label: "Alerta",     text: "text-red-400" },
  database:   { node: "border-zinc-500/40 bg-zinc-500/10 text-zinc-400",          label: "Datos",      text: "text-zinc-400" },
  monitoring: { node: "border-amber-500/40 bg-amber-500/10 text-amber-400",       label: "Monitoreo",  text: "text-amber-400" },
  complete:   { node: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400", label: "Resuelto",   text: "text-emerald-400" },
  reasoning:  { node: "border-violet-500/40 bg-violet-500/10 text-violet-400",    label: "Razonamiento", text: "text-violet-400" },
}

export function activityTypeStyle(type: ActivityItem["type"]) {
  return TYPE_STYLES[type]
}

export function ActivityNode({ type, live }: { type: ActivityItem["type"]; live?: boolean }) {
  return (
    <div className={cn("relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border", TYPE_STYLES[type].node)}>
      <ActivityIcon type={type} />
      {live && <span className={cn("absolute inset-0 rounded-full border animate-pulse-ring", TYPE_STYLES[type].node)} />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Badge de severidad
// ---------------------------------------------------------------------------

const SEVERITY_STYLES: Record<NonNullable<ActivityItem["severity"]>, { label: string; className: string }> = {
  critical: { label: "Crítico", className: "border-red-500/40 bg-red-500/15 text-red-400" },
  high:     { label: "Alto",    className: "border-orange-500/40 bg-orange-500/15 text-orange-400" },
  medium:   { label: "Medio",   className: "border-yellow-500/40 bg-yellow-500/15 text-yellow-400" },
  low:      { label: "Bajo",    className: "border-emerald-500/40 bg-emerald-500/15 text-emerald-400" },
}

export function SeverityBadge({ severity }: { severity?: ActivityItem["severity"] }) {
  if (!severity) return null
  const { label, className } = SEVERITY_STYLES[severity]
  return (
    <span className={cn("inline-flex h-4 items-center rounded border px-1.5 text-[9px] font-semibold uppercase tracking-wide", className)}>
      {label}
    </span>
  )
}
