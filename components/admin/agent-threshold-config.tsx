"use client"

import { useState } from "react"
import { Sliders, Save, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { updateAgentThresholds } from "@/app/admin/actions"

export function AgentThresholdConfig({ initialConfidence }: { initialConfidence: number }) {
  const [confidence, setConfidence] = useState(initialConfidence)
  const [saving, setSaving] = useState(false)
  async function save() {
    setSaving(true)
    try { await updateAgentThresholds(confidence); toast.success("Umbral de análisis guardado") }
    catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo guardar el umbral") }
    finally { setSaving(false) }
  }
  return <section className="overflow-hidden rounded-xl border border-[#30373e] bg-[#11161a]"><header className="flex items-center gap-3 border-b border-slate-700/50 p-4 sm:p-6"><Sliders className="h-5 w-5 shrink-0 text-sky-300" /><div><h2 className="text-sm font-semibold">Umbral de análisis social</h2><p className="mt-1 text-xs text-slate-400">Confianza mínima para registrar un incidente detectado</p></div></header><div className="space-y-5 p-4 sm:p-6"><div className="flex items-center justify-between gap-3"><label htmlFor="confidence" className="text-sm text-slate-200">Confianza mínima</label><output htmlFor="confidence" className="font-mono text-lg text-sky-200">{confidence}%</output></div><input id="confidence" type="range" min={50} max={100} value={confidence} disabled={saving} onChange={event => setConfidence(Number(event.target.value))} className="w-full accent-sky-300" /><div className="flex justify-between text-xs text-slate-400"><span>50%</span><span>100%</span></div><p className="text-xs leading-5 text-slate-300">Se aplica al análisis de menciones sociales. El despacho y la finalización de la atención siempre requieren confirmación operativa.</p><div className="flex flex-wrap gap-2"><button onClick={() => setConfidence(80)} disabled={saving} className="min-h-10 rounded-lg border border-slate-600 px-3 text-sm disabled:opacity-50">Usar valor recomendado</button><button onClick={() => void save()} disabled={saving} className="flex min-h-10 items-center gap-2 rounded-lg bg-sky-300 px-4 text-sm font-semibold text-slate-950 disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Guardar umbral</button></div></div></section>
}
