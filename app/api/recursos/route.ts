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
  const { id, estado, incidente_id } = body

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (estado !== undefined) updatePayload.estado = estado
  if (incidente_id !== undefined) updatePayload.incidente_id = incidente_id

  const { data, error } = await supabase
    .from("recursos")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
