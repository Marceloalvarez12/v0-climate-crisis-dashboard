import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { buildRespawnIncident, RESPAWN_ZONES } from "@/lib/mock-data"

const MAX_ACTIVE_INCIDENTS = 15

/**
 * POST /api/incidentes/respawn
 *
 * Picks one resolved ("atendido") incident at random and reactivates it by
 * giving it a completely new random location, type, and source from the mock-data.
 * It ensures that the chosen location doesn't already have an active incident.
 */
export async function POST() {
  const supabase = await createClient()

  // 1. Guard: don't respawn if we already have enough active incidents.
  // Also get the active locations to avoid spawning there again.
  const { data: activeIncidents } = await supabase
    .from("incidentes")
    .select("ubicacion")
    .eq("estado", "activo")

  const activeCount = activeIncidents?.length ?? 0
  if (activeCount >= MAX_ACTIVE_INCIDENTS) {
    return NextResponse.json({ respawned: false, reason: "max_active_reached" })
  }

  // 2. Fetch all resolved incidents (candidates for reactivation)
  const { data: resolved } = await supabase
    .from("incidentes")
    .select("id, ubicacion")
    .eq("estado", "atendido")

  if (!resolved || resolved.length === 0) {
    return NextResponse.json({ respawned: false, reason: "no_resolved" })
  }

  // 3. Find a candidate whose location is NOT currently active
  const activeLocations = new Set((activeIncidents ?? []).map(inc => inc.ubicacion))
  const availableCandidates = resolved.filter(inc => !activeLocations.has(inc.ubicacion))

  if (availableCandidates.length === 0) {
    return NextResponse.json({ respawned: false, reason: "no_locations_available" })
  }

  // Pick a random available candidate (this keeps its original location)
  const candidate = availableCandidates[Math.floor(Math.random() * availableCandidates.length)]

  // Generate completely new mock data, but we will IGNORE the location part
  const newIncidentData = buildRespawnIncident()
  
  // Extraemos solo lo que queremos actualizar (tipo, severidad, fuente, detalles, coordenadas)
  const updatePayload = {
    estado: "activo",
    tipo: newIncidentData.tipo,
    severidad: newIncidentData.severidad,
    fuente: newIncidentData.fuente,
    fuente_detalles: newIncidentData.fuente_detalles,
    latitud: newIncidentData.latitud,
    longitud: newIncidentData.longitud,
    updated_at: new Date().toISOString()
  }

  // 4. Reactivate it — update fields and reset updated_at
  const { data: updated, error } = await supabase
    .from("incidentes")
    .update(updatePayload)
    .eq("id", candidate.id)
    .select("id, ubicacion, tipo, severidad")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ respawned: true, incident: updated })
}
