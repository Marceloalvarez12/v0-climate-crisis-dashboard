import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { getRecommendedResourceType, getResourceLabel } from "@/lib/resource-matching"

// Auto-resolve any active incident older than 10 minutes AND auto-dispatch the best matching resource.
// Called periodically from the client (ai-activity-log useEffect) every 60 seconds.
export async function POST() {
  const supabase = await createClient()

  const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString()

  // Find active incidents whose updated_at is older than 10 minutes.
  const { data: stale, error: fetchError } = await supabase
    .from("incidentes")
    .select("id, ubicacion, tipo, fuente")
    .eq("estado", "activo")
    .lt("updated_at", cutoff)

  if (fetchError) {
    console.error("[auto-resolve] Error fetching stale incidents:", fetchError.message)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }

  if (!stale || stale.length === 0) {
    return NextResponse.json({ resolved: 0 })
  }

  const ids = stale.map((i: { id: string }) => i.id)

  // Mark incidents as attended
  const { error: updateError } = await supabase
    .from("incidentes")
    .update({ estado: "atendido", updated_at: new Date().toISOString() })
    .in("id", ids)

  if (updateError) {
    console.error("[auto-resolve] Error updating incidents:", updateError.message)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }

  // ─ Auto-dispatch: find and assign the best resource for each resolved incident ──
  const autoDispatched: Array<{
    recursoId: string
    recursoNombre: string
    recursoTipo: string
    incidenteUbicacion: string
    incidenteTipo: string
  }> = []

  for (const incident of stale) {
    const recommendedTypes = getRecommendedResourceType(incident.tipo)

    let assignedResource: { id: string; nombre: string; tipo: string } | null = null

    // Try each recommended type in priority order
    for (const tipo of recommendedTypes) {
      const { data: available } = await supabase
        .from("recursos")
        .select("id, nombre, tipo")
        .eq("estado", "available")
        .eq("tipo", tipo)
        .limit(1)
        .single()

      if (available) {
        assignedResource = available
        break
      }
    }

    // If we found a resource, assign it to the incident
    if (assignedResource) {
      await supabase
        .from("recursos")
        .update({
          estado: "dispatched",
          incidente_id: incident.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", assignedResource.id)

      autoDispatched.push({
        recursoId: assignedResource.id,
        recursoNombre: assignedResource.nombre,
        recursoTipo: assignedResource.tipo,
        incidenteUbicacion: incident.ubicacion,
        incidenteTipo: incident.tipo,
      })
    }
  }

  // ─ Audit logging ─────────────────────────────────────────────────────────────
  // Log auto-resolve and auto-dispatch actions for security audit trail
  try {
    const auditDetails = {
      action: "auto_resolve_with_dispatch",
      incidents_resolved: stale.map((i: { id: string; ubicacion: string }) => ({ id: i.id, ubicacion: i.ubicacion })),
      resources_dispatched: autoDispatched.map((r) => ({
        recurso: r.recursoNombre,
        tipo: r.recursoTipo,
        destino: r.incidenteUbicacion,
      })),
      timestamp: new Date().toISOString(),
    }

    await supabase.rpc("registrar_auditoria", {
      p_accion: "auto_resolve_incidentes",
      p_detalle: JSON.stringify(auditDetails),
    })
  } catch (auditError) {
    // Non-critical: don't fail the main operation if audit logging fails
    console.error("[auto-resolve] Error logging audit:", auditError)
  }

  return NextResponse.json({
    resolved: ids.length,
    locations: stale.map((i: { ubicacion: string }) => i.ubicacion),
    autoDispatched,
  })
}
