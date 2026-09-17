import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { ResourcePatchSchema, ResourceCreateSchema } from "@/lib/validation"
import { calculateEstado } from "@/lib/resource-helpers"

export async function GET() {
  const supabase = await createClient()

  // Detección tolerante: si las columnas nuevas no existen en este
  // entorno (la migración no se corrió todavía), caemos al shape viejo
  // para no romper el dashboard.
  let data, error
  try {
    const result = await supabase
      .from("recursos")
      .select("id, tipo, nombre, cantidad, cantidad_disponible, estado, ubicacion")
      .neq("estado", "retired")
      .order("tipo", { ascending: true })
    data = result.data
    error = result.error
  } catch (e) {
    console.warn("[api/recursos/GET] columnas nuevas no disponibles, fallback:", e instanceof Error ? e.message : e)
    const fallback = await supabase
      .from("recursos")
      .select("id, tipo, nombre, estado, ubicacion")
      .order("tipo", { ascending: true })
    data = (fallback.data ?? []).map((r) => ({ ...r, cantidad: 1, cantidad_disponible: 1 }))
    error = fallback.error
  }

  // Si el fallback tampoco funciona (estado no es enum compatible), devolvemos []
  if (error) {
    console.warn("[api/recursos/GET] query error:", error.message)
    return NextResponse.json([])
  }

  const resources = (data || []).map((r) => ({
    ...r,
    cantidad: r.cantidad ?? 1,
    cantidad_disponible: r.cantidad_disponible ?? (r.cantidad ?? 1),
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
