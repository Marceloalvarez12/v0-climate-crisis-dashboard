"use client"

import { Sparkles, Zap, CheckCircle2, Loader2, Satellite, ChevronDown, Target } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ActivityItem } from "./types"

// ---------------------------------------------------------------------------
// Expandable AI reasoning panel
// ---------------------------------------------------------------------------

interface ReasoningPanelProps {
  activity:           ActivityItem
  isExpanded:         boolean
  validatingSatellite: string | null
  onToggle:           () => void
  onValidateSatellite: (id: string) => void
}

export function ReasoningPanel({
  activity,
  isExpanded,
  validatingSatellite,
  onToggle,
  onValidateSatellite,
}: ReasoningPanelProps) {
  if (!activity.reasoning?.length) return null

  return (
    <>
      <button
        type="button"
        className="mt-1.5 inline-flex items-center gap-1 rounded text-[10px] font-medium text-violet-400 transition-colors hover:text-violet-300"
        onClick={onToggle}
      >
        <Sparkles className="h-3 w-3" />
        {isExpanded ? "Ocultar" : "Ver"} razonamiento
        <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", isExpanded && "rotate-180")} />
      </button>

      {isExpanded && (
        <div className="mt-2 rounded-md border border-violet-500/20 bg-violet-500/[0.04] p-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
          <ol className="relative space-y-2.5 before:absolute before:left-[7px] before:top-1 before:bottom-1 before:w-px before:bg-violet-500/20">
            {activity.reasoning.map((step, idx) => (
              <li key={idx} className="relative flex gap-2 text-[10px]">
                <span className="relative z-10 flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full border border-violet-500/40 bg-card font-mono text-[8px] font-bold text-violet-400">
                  {step.step}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="leading-relaxed text-foreground/75">{step.thought}</p>
                  {step.action && (
                    <p className="mt-0.5 flex items-center gap-1 font-mono text-sky-400">
                      <Zap className="h-2.5 w-2.5" />
                      {step.action}
                    </p>
                  )}
                  {step.result && (
                    <p className="mt-1 inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 font-medium text-emerald-400">
                      <CheckCircle2 className="h-2.5 w-2.5" />
                      {step.result}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>

          {activity.confidence && activity.confidence < 98 && (
            <button
              type="button"
              className="mt-2.5 flex h-7 w-full items-center justify-center gap-1.5 rounded-md border border-sky-500/25 bg-sky-500/5 text-[10px] font-medium text-sky-400 transition-colors hover:bg-sky-500/10 disabled:opacity-60"
              onClick={() => onValidateSatellite(activity.id)}
              disabled={validatingSatellite === activity.id}
            >
              {validatingSatellite === activity.id
                ? <><Loader2 className="h-3 w-3 animate-spin" /> Consultando Sentinel-2…</>
                : <><Satellite className="h-3 w-3" /> Validar con imagen satelital</>}
            </button>
          )}
        </div>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// AI confidence badge
// ---------------------------------------------------------------------------

export function ConfidenceBadge({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-1 font-mono text-[9px] text-violet-400" title="Confianza del modelo">
      <Target className="h-2.5 w-2.5" />
      {value}%
      <span className="h-1 w-8 overflow-hidden rounded-full bg-violet-500/15">
        <span className="block h-full rounded-full bg-violet-400" style={{ width: `${value}%` }} />
      </span>
    </span>
  )
}
