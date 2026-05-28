import { NextResponse } from "next/server"
import { getIncidents, updateIncident } from "@/lib/mock-db"
import { buildRespawnIncident } from "@/lib/mock-data"

const MAX_ACTIVE_INCIDENTS = 6

/**
 * POST /api/incidentes/respawn
 *
 * Picks one resolved ("atendido") incident at random and reactivates it by
 * giving it a completely new random location, type, and source from the mock-data.
 * It ensures that the chosen location doesn't already have an active incident.
 */
export async function POST() {
  // 1. Guard: don't respawn if we already have enough active incidents.
  const activeIncidents = getIncidents()
  const activeCount = activeIncidents.length
  
  if (activeCount >= MAX_ACTIVE_INCIDENTS) {
    return NextResponse.json({ respawned: false, reason: "max_active_reached" })
  }

  // 2. Find resolved incidents (candidates for reactivation)
  // In mock-db we only track active incidents, so we simulate respawn by creating new ones
  const newIncidentData = buildRespawnIncident()
  
  // 3. Check if location is already active
  const activeLocations = new Set(activeIncidents.map(inc => inc.ubicacion))
  if (activeLocations.has(newIncidentData.ubicacion)) {
    return NextResponse.json({ respawned: false, reason: "no_locations_available" })
  }

  // 4. Create new incident
  const updated = updateIncident(activeIncidents[0]?.id || "new", {
    ...newIncidentData,
    estado: "activo",
  })

  return NextResponse.json({ respawned: true, incident: updated })
}
