import { NextResponse } from "next/server"
import { IncidentCreateSchema, IncidentPatchSchema } from "@/lib/validation"
import { getIncidents, insertIncident, updateIncident } from "@/lib/mock-db"

export async function GET() {
  const data = getIncidents()
  return NextResponse.json(data)
}

const MAX_ACTIVE_INCIDENTS = 11

export async function POST(request: Request) {
  const body = await request.json()

  const parsed = IncidentCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const validatedBody = parsed.data

  const existing = getIncidents().find(i => i.ubicacion === validatedBody.ubicacion)

  if (existing) {
    if (existing.estado !== "activo") {
      const activeCount = getIncidents().length

      if (activeCount >= MAX_ACTIVE_INCIDENTS) {
        return NextResponse.json({ skipped: true, reason: "max_active_reached" }, { status: 200 })
      }

      const data = updateIncident(existing.id, {
        ...validatedBody,
        estado: "activo",
      })
      if (!data) return NextResponse.json({ error: "Incident not found" }, { status: 500 })
      return NextResponse.json(data)
    }
    return NextResponse.json(existing)
  }

  const activeCount = getIncidents().length

  if (activeCount >= MAX_ACTIVE_INCIDENTS) {
    return NextResponse.json({ skipped: true, reason: "max_active_reached" }, { status: 200 })
  }

  const data = insertIncident({
    ...validatedBody,
    fuente_detalles: validatedBody.fuente_detalles ?? {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })
  return NextResponse.json(data)
}

export async function PATCH(request: Request) {
  const body = await request.json()

  const parsed = IncidentPatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { id, ...updates } = parsed.data

  const data = updateIncident(id, updates)
  if (!data) {
    return NextResponse.json({ error: "Incident not found" }, { status: 500 })
  }

  return NextResponse.json(data)
}
