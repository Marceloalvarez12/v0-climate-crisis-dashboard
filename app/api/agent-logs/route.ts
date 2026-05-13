import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { AgentLogSchema } from "@/lib/validation"

export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("agent_logs")
    .select("id, scan_id, platform, posts_collected, incidents_found, status, created_at")
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  const parsed = AgentLogSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from("agent_logs")
    .insert(parsed.data)
    .select("id, scan_id, platform, posts_collected, incidents_found, status, created_at")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
