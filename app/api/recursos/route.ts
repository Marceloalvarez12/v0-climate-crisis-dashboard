import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { ResourcePatchSchema, ResourceCreateSchema } from "@/lib/validation"

export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("recursos")
    .select("id, tipo, nombre, numero, estado, ubicacion")
    .neq("estado", "retired")
    .order("tipo", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  const parsed = ResourceCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { nombre, tipo, numero, ubicacion } = parsed.data

  const { data, error } = await supabase
    .from("recursos")
    .insert({ nombre, tipo, numero, ubicacion, estado: "available" })
    .select("id, tipo, nombre, numero, estado, ubicacion")
    .single()

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
    .select("id, tipo, nombre, numero, estado, ubicacion, updated_at, incidente_id")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")

  if (!id) {
    return NextResponse.json({ error: "ID de recurso requerido" }, { status: 400 })
  }

  // Soft delete: cambiar estado a retired
  const { data, error } = await supabase
    .from("recursos")
    .update({ estado: "retired", updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, tipo, nombre, numero, estado, ubicacion")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
