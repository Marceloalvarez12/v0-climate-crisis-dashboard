import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("recursos")
    .select("*")
    .order("tipo", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const body = await request.json()
  const { id, incidente_id, estado } = body

  // If a specific id is provided, update that resource directly
  if (id) {
    const { data, error } = await supabase
      .from("recursos")
      .update({ estado, incidente_id: incidente_id ?? null, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  // Otherwise find the first available resource and dispatch it
  const { data: available, error: findError } = await supabase
    .from("recursos")
    .select("id")
    .eq("estado", "available")
    .limit(1)
    .single()

  if (findError || !available) {
    return NextResponse.json({ error: "No hay recursos disponibles" }, { status: 404 })
  }

  const { data, error } = await supabase
    .from("recursos")
    .update({ estado: estado ?? "dispatched", incidente_id: incidente_id ?? null, updated_at: new Date().toISOString() })
    .eq("id", available.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
