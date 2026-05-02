import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// Auto-resolve any active incident older than 60 minutes.
// Called periodically from the client (ai-activity-log useEffect) every 60 seconds.
export async function POST() {
  const supabase = await createClient()

  const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  // Find active incidents created more than 60 minutes ago
  const { data: stale, error: fetchError } = await supabase
    .from("incidentes")
    .select("id, ubicacion")
    .eq("estado", "activo")
    .lt("created_at", cutoff)

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  if (!stale || stale.length === 0) {
    return NextResponse.json({ resolved: 0 })
  }

  const ids = stale.map((i: { id: string }) => i.id)

  const { error: updateError } = await supabase
    .from("incidentes")
    .update({ estado: "atendido", updated_at: new Date().toISOString() })
    .in("id", ids)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({
    resolved: ids.length,
    locations: stale.map((i: { ubicacion: string }) => i.ubicacion),
  })
}
