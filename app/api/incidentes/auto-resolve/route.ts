import { NextResponse } from "next/server"
import { getIncidents, updateIncident } from "@/lib/mock-db"

// Auto-resolve any active incident older than 5 minutes.
// Called periodically from the client (ai-activity-log useEffect) every 60 seconds.
export async function POST() {
  const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString()

  // Find active incidents whose updated_at is older than 5 minutes.
  const stale = getIncidents().filter(i => i.updated_at < cutoff)

  if (stale.length === 0) {
    return NextResponse.json({ resolved: 0 })
  }

  const resolved = stale.map(i => {
    updateIncident(i.id, { estado: "atendido" })
    return i
  })

  return NextResponse.json({
    resolved: resolved.length,
    locations: resolved.map(i => i.ubicacion),
  })
}
