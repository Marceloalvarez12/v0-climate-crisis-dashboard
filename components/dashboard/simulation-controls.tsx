"use client"

import { useState } from "react"
import useSWR, { mutate } from "swr"
import { Activity, Plus, RotateCcw, Sparkles } from "lucide-react"
import { fetcher } from "@/lib/api"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

type DemoStatus = {
  storage: "memory" | "supabase"
  running: boolean
  error: string | null
  assignments: Array<{ incidentId: string; resourceId: string; resourceName: string; location: string; phase: "en_camino" | "trabajando" | "regresando"; remaining: number }>
  waiting: Array<{ id: string; location: string; resourceType: string }>
  events: Array<{ id: number; at: string; message: string; kind: string }>
}

function useDemo() {
  return useSWR<DemoStatus>("/api/simulacion", fetcher, { refreshInterval: 2000 })
}

export function SimulationControls() {
  const { data, error, mutate: refresh } = useDemo()
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState("")
  async function act(action: "reset" | "spawn") {
    setPending(true); setMessage("")
    try {
      const response = await fetch("/api/simulacion", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) })
      const result = await response.json()
      if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "No se pudo actualizar la simulación")
      await refresh(result, false)
      await Promise.all([mutate("/api/incidentes?estado=activo"), mutate("/api/incidentes?estado=atendido"), mutate("/api/recursos"), mutate("/api/analytics")])
    } catch (err) { setMessage(err instanceof Error ? err.message : "No se pudo actualizar la simulación") }
    finally { setPending(false) }
  }
  return (
    <section aria-label="Controles de simulación" className="shrink-0 border-b border-[#30363d] bg-[#12171b] px-3 py-2.5 text-slate-100 sm:px-4">
      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
        <div className="flex w-full min-w-0 items-center gap-2.5 md:w-auto md:flex-1">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-sky-300/25 bg-sky-300/10 text-sky-200"><Activity size={20} /></span>
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold">Monitoreo de emergencias</span><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${data?.running ? "bg-emerald-400/15 text-emerald-300" : "bg-slate-400/15 text-slate-300"}`}>{data?.running ? "Activo" : error || data?.error ? "Reconectando" : "Conectando"}</span></div><p className="text-[11px] text-slate-300">{data?.storage === "supabase" ? "Datos guardados en la base del proyecto" : data ? "Datos en memoria temporal" : "Conectando con el sistema"}</p></div>
        </div>
        <div className="flex flex-wrap items-center gap-2" aria-label="Acciones de simulación">
          <button type="button" disabled={pending || !data} onClick={() => act("spawn")} title="Agrega un incidente de ejemplo al mapa" className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-[#8cdcff] px-3.5 text-xs font-semibold text-slate-950 transition-colors hover:bg-sky-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 disabled:opacity-50"><Plus size={15} /> Generar incidente</button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button type="button" disabled={pending || !data} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md border border-slate-400/25 px-3 text-xs text-slate-200 transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 disabled:opacity-50"><RotateCcw size={14} /> Reiniciar</button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Reiniciar los datos de prueba?</AlertDialogTitle>
                <AlertDialogDescription>Se liberarán los recursos asignados y se eliminarán las alertas generadas automáticamente. Los reportes ciudadanos se conservarán y el monitoreo seguirá activo.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => act("reset")}>Reiniciar datos</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      <p className="mt-1.5 text-[11px] text-sky-100/75">Las alertas aparecen automáticamente y se asignan recursos disponibles. Los reportes ciudadanos también ingresan al circuito.</p>
      {(message || data?.error || error) && <p role="alert" className="mt-1 text-xs text-red-300">{message || data?.error || "No se pudo conectar con el simulador."}</p>}
    </section>
  )
}

export function SimulationTimeline() {
  const { data } = useDemo()
  const phases = { en_camino: "En camino", trabajando: "Trabajando", regresando: "Regresando" }
  const resourceNames: Record<string, string> = { ambulance: "ambulancia", firefighter: "bomberos", boat: "lancha", police: "policía", helicopter: "helicóptero" }
  return (
    <section className="overflow-hidden rounded-lg border border-[#30373e] bg-[#11161a] p-3 text-slate-100 shadow-[0_8px_24px_rgba(0,0,0,.12)]">
      <div className="flex items-center justify-between gap-2"><div><h2 className="text-sm font-semibold">Así responde Zntinel</h2><p className="mt-0.5 text-[11px] text-slate-300/70">Actividad de la simulación</p></div><span className="flex h-8 w-8 items-center justify-center rounded-md border border-sky-300/20 bg-sky-300/10"><Sparkles className="h-4 w-4 text-sky-300" /></span></div>
      <div className="mt-3 space-y-2">
        {data?.assignments.map(a => <div key={a.resourceId} className="rounded-md border border-sky-300/20 border-l-[3px] border-l-sky-300 bg-[#151f26] px-2.5 py-2"><div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-sky-100">{a.resourceName}</span><span className="shrink-0 text-[10px] text-sky-200">{phases[a.phase]} · {Math.max(0, Math.ceil(a.remaining))} s</span></div><p className="mt-1 text-[11px] text-slate-200">{a.location}</p></div>)}
        {data?.waiting?.map(w => <div key={w.id} className="rounded-md border border-amber-400/20 bg-amber-400/5 px-2.5 py-2 text-xs text-amber-100"><p>En espera de {resourceNames[w.resourceType] ?? "un recurso"}</p><p className="mt-1 text-[11px] text-slate-300">{w.location}</p></div>)}
        {!data?.assignments.length && !data?.waiting?.length && <p className="rounded-md bg-white/5 px-2.5 py-2 text-xs leading-5 text-slate-300">{data?.running ? "Esperando la próxima alerta." : "Conectando con el monitoreo."}</p>}
      </div>
      <ol className="mt-3 max-h-48 space-y-2 overflow-y-auto border-t border-white/10 pt-3">
        {data?.events.slice(0, 8).map(e => <li key={e.id} className="flex gap-2 text-[11px] leading-4 text-slate-200"><span className="shrink-0 tabular-nums text-sky-200/60">{new Date(e.at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span><span className="min-w-0">{e.message}</span></li>)}
      </ol>
    </section>
  )
}
