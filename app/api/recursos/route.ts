import { NextResponse } from "next/server"
import { ResourcePatchSchema } from "@/lib/validation"
import { getResources, updateResource } from "@/lib/mock-db"

export async function GET() {
  const data = getResources()
  return NextResponse.json(data)
}

export async function PATCH(request: Request) {
  const body = await request.json()

  const parsed = ResourcePatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { id, estado, incidente_id } = parsed.data

  const updatePayload: Record<string, unknown> = {}
  if (estado !== undefined) updatePayload.estado = estado
  if (incidente_id !== undefined) updatePayload.incidente_id = incidente_id

  const data = updateResource(id, updatePayload)
  if (!data) {
    return NextResponse.json({ error: "Resource not found" }, { status: 500 })
  }

  return NextResponse.json(data)
}
