/**
 * app/api/recursos/auto-reset/route.ts
 *
 * Libera recursos atascados en estado "dispatched" o "busy".
 *
 * Un recurso se considera atascado si lleva más de STALE_THRESHOLD_MINUTES
 * en un estado no-disponible sin haber sido actualizado (updated_at viejo).
 * Esto ocurre cuando el servidor se reinicia o el navegador se refresca y
 * los setTimeout del ciclo de vida se pierden sin limpiar la base de datos.
 *
 * POST /api/recursos/auto-reset → restablece recursos atascados → returns { reset: number, recursos: [] }
 */

import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

/** Minutos máximos tolerados en un estado no-disponible antes de forzar el reset */
const STALE_THRESHOLD_MINUTES = 3

export async function POST() {
  try {
    const supabase = await createClient()

    // Calcular el timestamp de corte
    const staleThreshold = new Date(Date.now() - STALE_THRESHOLD_MINUTES * 60 * 1000).toISOString()

    // Buscar recursos atascados
    const { data: staleResources, error: fetchError } = await supabase
      .from("recursos")
      .select("id, nombre, estado, updated_at")
      .in("estado", ["dispatched", "busy"])
      .lt("updated_at", staleThreshold)

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!staleResources || staleResources.length === 0) {
      return NextResponse.json({ reset: 0, recursos: [] })
    }

    // Resetear todos a "available"
    const staleIds = staleResources.map((r) => r.id)

    const { data: updated, error: updateError } = await supabase
      .from("recursos")
      .update({
        estado:      "available",
        incidente_id: null,
        updated_at:  new Date().toISOString(),
      })
      .in("id", staleIds)
      .select("id, nombre, estado")

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    console.log(`[auto-reset/recursos] ${updated?.length ?? 0} recursos liberados:`, staleIds)

    return NextResponse.json({
      reset:    updated?.length ?? 0,
      recursos: updated ?? [],
    })
  } catch (err) {
    console.error("[auto-reset/recursos] Error:", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
