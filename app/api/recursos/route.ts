import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { ResourcePatchSchema } from "@/lib/validation"

export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("recursos")
    .select("id, tipo, nombre, estado, ubicacion")
    .order("tipo", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  const parsed = ResourcePatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { id, estado, incidente_id } = parsed.data

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (estado !== undefined) updatePayload.estado = estado
  if (incidente_id !== undefined) updatePayload.incidente_id = incidente_id

  const { data, error } = await supabase
    .from("recursos")
    .update(updatePayload)
    .eq("id", id)
    .select("id, tipo, nombre, estado, ubicacion, updated_at, incidente_id")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
