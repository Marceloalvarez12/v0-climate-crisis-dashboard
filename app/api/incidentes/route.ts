import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { IncidentCreateSchema, IncidentPatchSchema } from "@/lib/validation"

export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("incidentes")
    .select("id, tipo, severidad, ubicacion, latitud, longitud, personas_afectadas, fuente, fuente_detalles, estado, created_at, updated_at")
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

  const parsed = IncidentCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const validatedBody = parsed.data

  const { data: existing } = await supabase
    .from("incidentes")
    .select("id, estado")
    .eq("ubicacion", validatedBody.ubicacion)
    .limit(1)
    .single()

  if (existing) {
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
        .update({
          ...validatedBody,
          estado: "activo",
          updated_at: new Date().toISOString()
        })
        .eq("id", existing.id)
        .select("id, tipo, severidad, ubicacion, latitud, longitud, personas_afectadas, fuente, fuente_detalles, estado, created_at, updated_at")
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json(data)
    }
    return NextResponse.json(existing)
  }

  const { count } = await supabase
    .from("incidentes")
    .select("*", { count: "exact", head: true })
    .eq("estado", "activo")

  if ((count ?? 0) >= MAX_ACTIVE_INCIDENTS) {
    return NextResponse.json({ skipped: true, reason: "max_active_reached" }, { status: 200 })
  }

  const { data, error } = await supabase
    .from("incidentes")
    .insert(validatedBody)
    .select("id, tipo, severidad, ubicacion, latitud, longitud, personas_afectadas, fuente, fuente_detalles, estado, created_at, updated_at")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  const parsed = IncidentPatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { id, ...updates } = parsed.data

  const { data, error } = await supabase
    .from("incidentes")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, tipo, severidad, ubicacion, latitud, longitud, personas_afectadas, fuente, fuente_detalles, estado, created_at, updated_at")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
