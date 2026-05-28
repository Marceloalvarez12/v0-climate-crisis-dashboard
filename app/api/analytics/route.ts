import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { STATIC_RESPONSE_TIME_MIN } from "@/lib/mock-data"

export async function GET() {
  const supabase = await createClient()

  const { data: activeIncidents } = await supabase
    .from("incidentes")
    .select("id, severidad, personas_afectadas, created_at, updated_at, tipo")
    .eq("estado", "activo")
    .not("latitud", "is", null)
    .not("longitud", "is", null)

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: incidents24h } = await supabase
    .from("incidentes")
    .select("id, severidad, personas_afectadas, estado, created_at")
    .gte("created_at", since24h)

  const since48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
  const { data: incidents48h } = await supabase
    .from("incidentes")
    .select("id, personas_afectadas, estado, created_at")
    .gte("created_at", since48h)
    .lt("created_at", since24h)

  const { data: recursos } = await supabase
    .from("recursos")
    .select("id, estado, cantidad, cantidad_disponible, updated_at")

  const { data: resolved } = await supabase
    .from("incidentes")
    .select("created_at, updated_at")
    .eq("estado", "atendido")
    .order("updated_at", { ascending: false })
    .limit(50)

  const validResolved = (resolved ?? []).filter((i: { created_at: string; updated_at: string }) => {
    const diffMin = (new Date(i.updated_at).getTime() - new Date(i.created_at).getTime()) / 60000
    return diffMin >= 1 && diffMin <= 120
  })
  const avgResponseMinDB: number | null = validResolved.length > 0
    ? parseFloat((
        validResolved.reduce((s: number, i: { created_at: string; updated_at: string }) =>
          s + (new Date(i.updated_at).getTime() - new Date(i.created_at).getTime()) / 60000, 0
        ) / validResolved.length
      ).toFixed(1))
    : null

  const active = activeIncidents ?? []
  const curr24 = incidents24h ?? []
  const prev24 = incidents48h ?? []
  const allResources = recursos ?? []

  const affectedNow = active.reduce((s: number, i: { personas_afectadas: number }) => s + (i.personas_afectadas || 0), 0)
  const prev24Active = prev24.filter((i: { estado: string }) => i.estado === "activo")
  const affectedPrev = prev24Active.reduce((s: number, i: { personas_afectadas: number }) => s + (i.personas_afectadas || 0), 0)
  const affectedChange = affectedPrev > 0
    ? Math.round(((affectedNow - affectedPrev) / affectedPrev) * 100)
    : 0

  const criticalCount = active.filter((i: { severidad: string }) => i.severidad === "critical").length
  const highCount    = active.filter((i: { severidad: string }) => i.severidad === "high").length
  const mediumCount  = active.filter((i: { severidad: string }) => i.severidad === "medium").length
  const lowCount     = active.filter((i: { severidad: string }) => i.severidad === "low").length
  let riskLevel = "LOW"
  let riskProgress = 20
  if (criticalCount >= 2) { riskLevel = "CRITICAL"; riskProgress = 95 }
  else if (criticalCount === 1) { riskLevel = "CRITICAL"; riskProgress = 85 }
  else if (highCount >= 2) { riskLevel = "HIGH"; riskProgress = 70 }
  else if (highCount === 1 || active.length >= 3) { riskLevel = "MEDIUM"; riskProgress = 50 }
  else if (active.length > 0) { riskLevel = "LOW-MEDIUM"; riskProgress = 35 }

  const avgResponseMin: number = avgResponseMinDB ?? STATIC_RESPONSE_TIME_MIN

  const incidentsTrend = curr24.length > 0 && prev24.length > 0
    ? Math.round(((curr24.length - prev24.length) / prev24.length) * 100)
    : null

  const totalResources = allResources.reduce((sum: number, r: { cantidad: number }) => sum + (r.cantidad || 1), 0)
  const deployedResources = allResources.reduce((sum: number, r: { cantidad: number; cantidad_disponible: number }) =>
    sum + ((r.cantidad || 1) - (r.cantidad_disponible ?? (r.cantidad || 1))), 0
  )
  const enCamino = allResources.filter((r: { estado: string }) => r.estado === "dispatched").length
  const ocupados = allResources.filter((r: { estado: string }) => r.estado === "busy").length

  return NextResponse.json({
    riskLevel,
    riskProgress,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    affectedNow,
    affectedChange,
    avgResponseMin,
    activeIncidentCount: active.length,
    incidentsTrend,
    totalResources,
    deployedResources,
    enCamino,
    ocupados,
    resourceProgress: totalResources > 0 ? Math.round((deployedResources / totalResources) * 100) : 0,
  })
}
