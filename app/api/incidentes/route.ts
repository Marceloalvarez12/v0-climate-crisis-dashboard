import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("incidentes")
    .select("*")
    .eq("estado", "activo")
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

const MAX_ACTIVE_INCIDENTS = 11

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  // Check if an active incident with the same ubicacion already exists
  // to avoid duplicates when the agent "rediscovers" a seeded incident
  const { data: existing } = await supabase
    .from("incidentes")
    .select("id, estado")
    .eq("ubicacion", body.ubicacion)
    .limit(1)
    .single()

  if (existing) {
    // If it exists but was resolved/attended, reactivate it
    // but only if we haven't hit the active limit
    if (existing.estado !== "activo") {
      const { count } = await supabase
        .from("incidentes")
        .select("*", { count: "exact", head: true })
        .eq("estado", "activo")

      if ((count ?? 0) >= MAX_ACTIVE_INCIDENTS) {
        return NextResponse.json({ skipped: true, reason: "max_active_reached" }, { status: 200 })
      }

      const { data, error } = await supabase
        .from("incidentes")
        .update({ estado: "activo", updated_at: new Date().toISOString() })
        .eq("id", existing.id)
        .select()
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json(data)
    }
    // Already active — return existing without inserting a duplicate
    return NextResponse.json(existing)
  }

  // Check active incident cap before a fresh INSERT
  const { count } = await supabase
    .from("incidentes")
    .select("*", { count: "exact", head: true })
    .eq("estado", "activo")

  if ((count ?? 0) >= MAX_ACTIVE_INCIDENTS) {
    return NextResponse.json({ skipped: true, reason: "max_active_reached" }, { status: 200 })
  }

  // No existing record and under the cap — do a fresh INSERT
  const { data, error } = await supabase
    .from("incidentes")
    .insert(body)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const body = await request.json()
  const { id, ...updates } = body

  const { data, error } = await supabase
    .from("incidentes")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
