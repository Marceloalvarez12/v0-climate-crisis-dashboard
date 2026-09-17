import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const STALE_THRESHOLD_MINUTES = 45 / 60

export async function POST() {
  try {
    const supabase = await createClient()

    const staleThreshold = new Date(Date.now() - STALE_THRESHOLD_MINUTES * 60 * 1000).toISOString()

    const { data: staleResources, error: fetchError } = await supabase
      .from("recursos")
      .select("id, nombre, estado, updated_at, cantidad")
      .in("estado", ["dispatched", "busy"])
      .lt("updated_at", staleThreshold)

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!staleResources || staleResources.length === 0) {
      return NextResponse.json({ reset: 0, recursos: [] })
    }

    const staleIds = staleResources.map((r) => r.id)

    const updates = staleResources.map((r) => ({
      id: r.id,
      estado: "available",
      cantidad_disponible: r.cantidad || 1,
      incidente_id: null,
      updated_at: new Date().toISOString(),
    }))

    const { data: updated, error: updateError } = await supabase
      .from("recursos")
      .upsert(updates)
      .select("id, nombre, estado, cantidad, cantidad_disponible")

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    console.log(`[auto-reset/recursos] ${updated?.length ?? 0} recursos liberados:`, staleIds)

    return NextResponse.json({
      reset: updated?.length ?? 0,
      recursos: updated ?? [],
    })
  } catch (err) {
    console.error("[auto-reset/recursos] Error:", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
