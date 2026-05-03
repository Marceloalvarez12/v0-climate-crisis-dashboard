import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const MAX_ACTIVE_INCIDENTS = 6

/**
 * POST /api/incidentes/respawn
 *
 * Picks one resolved ("atendido") incident at random and reactivates it by
 * setting estado → "activo" and updated_at → now().
 *
 * Called automatically every 4 minutes by the AIActivityLog component to keep
 * the dashboard populated even when the Gemini API quota is exhausted.
 *
 * Returns:
 *   { respawned: true,  incident: { id, ubicacion, tipo, severidad } }  — success
 *   { respawned: false, reason: "max_active_reached" | "no_resolved" }  — skipped
 */
export async function POST() {
  const supabase = await createClient()

  // 1. Guard: don't respawn if we already have enough active incidents
  const { count: activeCount } = await supabase
    .from("incidentes")
    .select("*", { count: "exact", head: true })
    .eq("estado", "activo")

  if ((activeCount ?? 0) >= MAX_ACTIVE_INCIDENTS) {
    return NextResponse.json({ respawned: false, reason: "max_active_reached" })
  }

  // 2. Fetch all resolved incidents (candidates for reactivation)
  const { data: resolved } = await supabase
    .from("incidentes")
    .select("id, ubicacion, tipo, severidad")
    .eq("estado", "atendido")

  if (!resolved || resolved.length === 0) {
    return NextResponse.json({ respawned: false, reason: "no_resolved" })
  }

  // 3. Pick one at random
  const candidate = resolved[Math.floor(Math.random() * resolved.length)]

  // 4. Reactivate it — reset updated_at so the 60-min timer starts fresh
  const now = new Date().toISOString()
  const { data: updated, error } = await supabase
    .from("incidentes")
    .update({ estado: "activo", updated_at: now })
    .eq("id", candidate.id)
    .select("id, ubicacion, tipo, severidad")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ respawned: true, incident: updated })
}
