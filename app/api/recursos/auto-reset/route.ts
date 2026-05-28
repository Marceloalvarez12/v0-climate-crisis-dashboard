/**
 * app/api/recursos/auto-reset/route.ts
 *
 * Releases resources stuck in "dispatched" or "busy" state.
 *
 * A resource is considered stuck if it has been in a non-available state for more
 * than STALE_THRESHOLD_MINUTES without being updated (old updated_at).
 * This happens when the server restarts or the browser refreshes and
 * the lifecycle setTimeouts are lost without cleaning up the database.
 *
 * POST /api/recursos/auto-reset → resets stuck resources → returns { reset: number, recursos: [] }
 */

import { NextResponse } from "next/server"
import { getResources, updateResource } from "@/lib/mock-db"

/** Maximum minutes tolerated in a non-available state before forcing reset.
 * The complete dispatch→busy→available cycle takes 40s (20s+20s), so 60s gives
 * enough margin without leaving stuck resources visible for too long. */
const STALE_THRESHOLD_MINUTES = 60 / 60

export async function POST() {
  try {
    // Calculate cutoff timestamp
    const staleThreshold = new Date(Date.now() - STALE_THRESHOLD_MINUTES * 60 * 1000).toISOString()

    // Find stuck resources
    const allResources = getResources()
    const staleResources = allResources.filter(
      r => (r.estado === "dispatched" || r.estado === "busy") && r.updated_at < staleThreshold
    )

    if (staleResources.length === 0) {
      return NextResponse.json({ reset: 0, recursos: [] })
    }

    // Reset all to "available"
    const updated = staleResources.map(r => {
      return updateResource(r.id, {
        estado: "available",
        incidente_id: null,
      })
    }).filter(Boolean)

    console.log(`[auto-reset/recursos] ${updated.length} resources released:`, staleResources.map(r => r.id))

    return NextResponse.json({
      reset: updated.length,
      recursos: updated,
    })
  } catch (err) {
    console.error("[auto-reset/recursos] Error:", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
