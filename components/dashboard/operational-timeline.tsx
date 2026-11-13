"use client"

import useSWR from "swr"
import { Activity } from "lucide-react"
import { fetcher } from "@/lib/api"

export interface OperationalEvent {
  id: string
  at: string
  message: string
  source: string
  responsible?: string
}

export function OperationalTimeline() {
  const { data, error, mutate } = useSWR<{ events: OperationalEvent[] }>("/api/operaciones", fetcher, { refreshInterval: 10000 })
  return <section className="rounded-lg border border-[#30373e] bg-[#11161a] p-3 text-slate-100"><h2 className="flex items-center gap-2 text-sm font-semibold"><Activity className="h-4 w-4 text-sky-300" />Bitácora operativa</h2><p className="mt-1 text-[11px] text-slate-400">Últimos cambios guardados en incidentes y recursos</p>{error ? <div className="mt-3 text-xs text-red-300">No se pudo consultar la actividad.<button className="ml-2 underline" onClick={() => void mutate()}>Reintentar</button></div> : !data ? <p className="mt-3 text-xs text-slate-400">Consultando registros…</p> : data.events.length === 0 ? <p className="mt-3 text-xs text-slate-400">No hay registros operativos.</p> : <ol className="mt-3 max-h-72 space-y-3 overflow-y-auto">{data.events.map(event => <li key={event.id} className="border-l-2 border-sky-300/30 pl-2.5 text-xs"><p className="break-words leading-5">{event.message}</p><p className="mt-1 text-[10px] text-slate-400">{new Date(event.at).toLocaleString("es-AR")} · {event.source}{event.responsible ? ` · ${event.responsible}` : ""}</p></li>)}</ol>}</section>
}
