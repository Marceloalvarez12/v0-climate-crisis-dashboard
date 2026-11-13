"use client"

import { useState } from "react"
import useSWR from "swr"
import { FileText, Megaphone, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { fetcher } from "@/lib/api"
import { generateGeneralReport } from "@/lib/pdf-generator"
import { Button } from "@/components/ui/button"

export function BroadcastPanel() {
  const { data: incidents, error: incidentError } = useSWR("/api/incidentes?estado=activo", fetcher)
  const { data: history, error: historyError } = useSWR("/api/incidentes?estado=atendido", fetcher)
  const { data: analytics, error: analyticsError } = useSWR("/api/analytics", fetcher)
  const { data: resources, error: resourceError } = useSWR("/api/recursos", fetcher)
  const [generating, setGenerating] = useState(false)
  const unavailable = incidentError || historyError || analyticsError || resourceError || !incidents || !history || !analytics || !resources
  async function download() {
    if (unavailable) return
    setGenerating(true)
    try {
      generateGeneralReport(incidents, history, resources, analytics)
      toast.success("Informe operativo generado")
    } catch { toast.error("No se pudo generar el informe") }
    finally { setGenerating(false) }
  }
  return <section className="space-y-3 rounded-lg border border-[#30373e] bg-[#11161a] p-3"><h2 className="flex items-center gap-2 text-sm font-semibold"><Megaphone className="h-4 w-4 text-sky-300" />Comunicaciones e informes</h2><p className="text-xs leading-5 text-slate-400">La difusión masiva requiere un proveedor conectado. Consultá los canales operativos de tu organización.</p><Button className="w-full" variant="outline" onClick={() => void download()} disabled={generating || !!unavailable}>{generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}Descargar informe operativo</Button>{(incidentError || historyError || analyticsError || resourceError) && <p role="alert" className="text-xs text-red-300">No se pudieron consultar los datos del informe.</p>}</section>
}
