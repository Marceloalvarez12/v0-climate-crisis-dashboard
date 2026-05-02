import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { STATIC_RESPONSE_TIME_MIN } from "@/lib/mock-data"

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

  // 5. Avg response time comes from mock-data.ts (static reference value).
  //    To connect a real source, update STATIC_RESPONSE_TIME_MIN in lib/mock-data.ts.

  // --- Calculations ---

  const active = activeIncidents ?? []
  const curr24 = incidents24h ?? []
  const prev24 = incidents48h ?? []
  const allResources = recursos ?? []

  // Affected people — only count currently active incidents
  const affectedNow = active.reduce((s: number, i: { personas_afectadas: number }) => s + (i.personas_afectadas || 0), 0)
  // Delta only meaningful if there were real incidents in the previous window
  // (prev24 incidents must have been created in that window, not just seeded)
  const prev24Active = prev24.filter((i: { estado: string }) => i.estado === "activo")
  const affectedPrev = prev24Active.reduce((s: number, i: { personas_afectadas: number }) => s + (i.personas_afectadas || 0), 0)
  const affectedChange = affectedPrev > 0
    ? Math.round(((affectedNow - affectedPrev) / affectedPrev) * 100)
    : 0

  // Risk level
  const criticalCount = active.filter((i: { severidad: string }) => i.severidad === "critical").length
  const highCount    = active.filter((i: { severidad: string }) => i.severidad === "high").length
  const mediumCount  = active.filter((i: { severidad: string }) => i.severidad === "medium").length
  const lowCount     = active.filter((i: { severidad: string }) => i.severidad === "low").length
  let riskLevel = "BAJO"
  let riskProgress = 20
  if (criticalCount >= 2) { riskLevel = "CRITICO"; riskProgress = 95 }
  else if (criticalCount === 1) { riskLevel = "CRITICO"; riskProgress = 85 }
  else if (highCount >= 2) { riskLevel = "ALTO"; riskProgress = 70 }
  else if (highCount === 1 || active.length >= 3) { riskLevel = "MEDIO"; riskProgress = 50 }
  else if (active.length > 0) { riskLevel = "BAJO-MEDIO"; riskProgress = 35 }

  // Avg response time — static reference value from mock-data.ts
  const avgResponseMin: number = STATIC_RESPONSE_TIME_MIN

  // Incident trend: compare last 24h vs prev 24h
  // If prev window has 0 incidents (app just started), return null so UI hides the badge
  const incidentsTrend = prev24.length > 0
    ? Math.round(((curr24.length - prev24.length) / prev24.length) * 100)
    : null

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
