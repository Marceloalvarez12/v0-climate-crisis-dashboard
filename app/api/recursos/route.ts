import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { ResourcePatchSchema, ResourceCreateSchema } from "@/lib/validation"
import { calculateEstado } from "@/lib/resource-helpers"

export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("recursos")
    .select("id, tipo, nombre, cantidad, cantidad_disponible, estado, ubicacion")
    .neq("estado", "retired")
    .order("tipo", { ascending: true })

  if (error) {
    console.error("[api/recursos/GET] Error:", error.message)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }

  const resources = (data || []).map((r) => ({
    ...r,
    cantidad: r.cantidad || 1,
    cantidad_disponible: r.cantidad_disponible ?? (r.cantidad || 1),
  }))

  return NextResponse.json(resources)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  const parsed = ResourceCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos" },
      { status: 400 }
    )
  }

  const { nombre, tipo, cantidad, ubicacion } = parsed.data

  const cantidadDisp = cantidad

  const { data, error } = await supabase
    .from("recursos")
    .insert({
      nombre,
      tipo,
      cantidad,
      cantidad_disponible: cantidadDisp,
      ubicacion,
      estado: "available",
    })
    .select("id, tipo, nombre, cantidad, cantidad_disponible, estado, ubicacion")
    .single()

  if (error) {
    console.error("[api/recursos/POST] Error:", error.message)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }

  return NextResponse.json({
    ...data,
    cantidad: data.cantidad || 1,
    cantidad_disponible: data.cantidad_disponible ?? (data.cantidad || 1),
  })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  const parsed = ResourcePatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos" },
      { status: 400 }
    )
  }

  const { id, estado, incidente_id, cantidad_disponible } = parsed.data

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (cantidad_disponible !== undefined) {
    const { data: current } = await supabase
      .from("recursos")
      .select("cantidad")
      .eq("id", id)
      .single()

    const cantidad = current?.cantidad || 1
    const newDisp = Math.max(0, Math.min(cantidad, cantidad_disponible))
    updatePayload.cantidad_disponible = newDisp
    updatePayload.estado = calculateEstado(cantidad, newDisp)
  } else if (estado !== undefined) {
    updatePayload.estado = estado
  }

  if (incidente_id !== undefined) updatePayload.incidente_id = incidente_id

  const { data, error } = await supabase
    .from("recursos")
    .update(updatePayload)
    .eq("id", id)
    .select("id, tipo, nombre, cantidad, cantidad_disponible, estado, ubicacion, updated_at, incidente_id")
    .single()

  if (error) {
    console.error("[api/recursos/PATCH] Error:", error.message)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }

  return NextResponse.json({
    ...data,
    cantidad: data.cantidad || 1,
    cantidad_disponible: data.cantidad_disponible ?? (data.cantidad || 1),
  })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")

  if (!id) {
    return NextResponse.json({ error: "ID de recurso requerido" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("recursos")
    .update({ estado: "retired", updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, tipo, nombre, cantidad, cantidad_disponible, estado, ubicacion")
    .single()

  if (error) {
    console.error("[api/recursos/DELETE] Error:", error.message)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }

  return NextResponse.json({
    ...data,
    cantidad: data.cantidad || 1,
    cantidad_disponible: data.cantidad_disponible ?? (data.cantidad || 1),
  })
}
