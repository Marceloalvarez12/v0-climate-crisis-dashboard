import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()

  // 1. Active incidents
  const { data: activeIncidents } = await supabase
    .from("incidentes")
    .select("id, severidad, personas_afectadas, created_at, updated_at, tipo")
    .eq("estado", "activo")

  // 2. All incidents in the last 24h (active + resolved) for trend calculation
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: incidents24h } = await supabase
    .from("incidentes")
    .select("id, severidad, personas_afectadas, estado, created_at")
    .gte("created_at", since24h)

  // 3. Incidents in the previous 24h window (for delta %)
  const since48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
  const { data: incidents48h } = await supabase
    .from("incidentes")
    .select("id, personas_afectadas, estado, created_at")
    .gte("created_at", since48h)
    .lt("created_at", since24h)

  // 4. Resources
  const { data: recursos } = await supabase
    .from("recursos")
    .select("id, estado, updated_at")

  // 5. Resolved incidents with timestamps (for avg response time)
  const { data: resolved } = await supabase
    .from("incidentes")
    .select("created_at, updated_at")
    .eq("estado", "atendido")
    .gte("updated_at", since24h)
    .limit(50)

  // --- Calculations ---

  const active = activeIncidents ?? []
  const curr24 = incidents24h ?? []
  const prev24 = incidents48h ?? []
  const allResources = recursos ?? []
  const resolvedList = resolved ?? []

  // Affected people — current vs previous window
  const affectedNow = active.reduce((s: number, i: { personas_afectadas: number }) => s + (i.personas_afectadas || 0), 0)
  const affectedPrev = prev24.reduce((s: number, i: { personas_afectadas: number }) => s + (i.personas_afectadas || 0), 0)
  const affectedChange = affectedPrev > 0
    ? Math.round(((affectedNow - affectedPrev) / affectedPrev) * 100)
    : 0

  // Risk level
  const criticalCount = active.filter((i: { severidad: string }) => i.severidad === "critical").length
  const highCount = active.filter((i: { severidad: string }) => i.severidad === "high").length
  let riskLevel = "BAJO"
  let riskProgress = 20
  if (criticalCount >= 2) { riskLevel = "CRITICO"; riskProgress = 95 }
  else if (criticalCount === 1) { riskLevel = "CRITICO"; riskProgress = 85 }
  else if (highCount >= 2) { riskLevel = "ALTO"; riskProgress = 70 }
  else if (highCount === 1 || active.length >= 3) { riskLevel = "MEDIO"; riskProgress = 50 }
  else if (active.length > 0) { riskLevel = "BAJO-MEDIO"; riskProgress = 35 }

  // Avg response time in minutes (time from created_at to updated_at for resolved incidents)
  let avgResponseMin = 0
  if (resolvedList.length > 0) {
    const totalMs = resolvedList.reduce((s: number, i: { created_at: string; updated_at: string }) => {
      const diff = new Date(i.updated_at).getTime() - new Date(i.created_at).getTime()
      return s + Math.max(0, diff)
    }, 0)
    avgResponseMin = totalMs / resolvedList.length / 60000
  }

  // Incident trend: current 24h vs previous 24h
  const incidentsTrend = prev24.length > 0
    ? Math.round(((curr24.length - prev24.length) / prev24.length) * 100)
    : curr24.length > 0 ? 100 : 0

  // Resources
  const totalResources = allResources.length
  const deployedResources = allResources.filter((r: { estado: string }) => r.estado !== "available").length
  const enCamino = allResources.filter((r: { estado: string }) => r.estado === "dispatched").length
  const ocupados = allResources.filter((r: { estado: string }) => r.estado === "busy").length

  return NextResponse.json({
    riskLevel,
    riskProgress,
    criticalCount,
    highCount,
    affectedNow,
    affectedChange,
    avgResponseMin: avgResponseMin > 0 ? parseFloat(avgResponseMin.toFixed(1)) : null,
    resolvedCount: resolvedList.length,
    activeIncidentCount: active.length,
    incidentsTrend,
    totalResources,
    deployedResources,
    enCamino,
    ocupados,
    resourceProgress: totalResources > 0 ? Math.round((deployedResources / totalResources) * 100) : 0,
  })
}
