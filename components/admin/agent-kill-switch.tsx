"use client"

import { useState } from "react"
import { useSWRConfig } from "swr"
import { ShieldAlert, Power, Loader2, Search } from "lucide-react"
import { toast } from "sonner"
import { updateAgentMode } from "@/app/admin/actions"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog"

export function AgentKillSwitch({ initialAutonomous }: { initialAutonomous: boolean }) {
  const [enabled, setEnabled] = useState(initialAutonomous)
  const [pending, setPending] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const { mutate } = useSWRConfig()
  async function change(value: boolean) {
    setPending(true)
    try {
      await updateAgentMode(value)
      setEnabled(value); setConfirm(false)
      await mutate("/api/agent")
      toast.success(value ? "Ingesta social habilitada" : "Ingesta social deshabilitada")
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo cambiar el estado del agente") }
    finally { setPending(false) }
  }
  async function scan() {
    setPending(true)
    try {
      const response = await fetch("/api/agent", { method: "POST" })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "No se pudo ejecutar el escaneo")
      if (result.error) toast.info(result.error)
      else toast.success("Escaneo completado", { description: result.postsCollected + " publicaciones recibidas" })
      await Promise.all([mutate("/api/agent"), mutate("/api/agent-logs"), mutate("/api/incidentes?estado=activo")])
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo ejecutar el escaneo") }
    finally { setPending(false) }
  }
  return <section className="overflow-hidden rounded-xl border border-[#30373e] bg-[#11161a]"><header className="flex flex-wrap items-center gap-3 border-b border-slate-700/50 p-4 sm:p-6"><ShieldAlert className="h-5 w-5 text-sky-300" /><h2 className="min-w-0 flex-1 text-sm font-semibold">Control del agente</h2><span className={enabled ? "text-xs text-emerald-300" : "text-xs text-amber-300"}>{enabled ? "Ingesta habilitada" : "Ingesta pausada"}</span></header><div className="space-y-5 p-4 sm:p-6"><p className="text-sm leading-6 text-slate-300">Controla la recepción de menciones sociales y los escaneos solicitados. Los reportes ciudadanos y las acciones manuales de los operadores siguen disponibles.</p><div className="flex flex-wrap gap-3"><button disabled={pending} onClick={() => enabled ? setConfirm(true) : void change(true)} className={"flex min-h-11 items-center gap-2 rounded-lg border px-4 text-sm font-semibold disabled:opacity-50 " + (enabled ? "border-red-400/40 text-red-300" : "border-sky-300/40 bg-sky-300/10 text-sky-200")}>{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}{enabled ? "Pausar ingesta social" : "Habilitar ingesta social"}</button><button disabled={!enabled || pending} onClick={() => void scan()} className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-600 px-4 text-sm disabled:opacity-50"><Search className="h-4 w-4" />Ejecutar escaneo</button></div><p className="text-xs leading-5 text-slate-400">Solo se consultan conectores configurados. Habilitar la ingesta no programa escaneos periódicos ni autoriza despachos o cierres automáticos.</p></div><AlertDialog open={confirm} onOpenChange={value => { if (!pending) setConfirm(value) }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Pausar la ingesta social?</AlertDialogTitle><AlertDialogDescription>No se procesarán nuevas menciones ni escaneos hasta volver a habilitarla. Los incidentes registrados permanecen disponibles.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel><AlertDialogAction disabled={pending} onClick={event => { event.preventDefault(); void change(false) }}>Pausar ingesta</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></section>
}
