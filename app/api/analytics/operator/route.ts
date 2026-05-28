import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()

  const { data: user } = await supabase.auth.getUser()
  if (!user.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { data: assignments } = await supabase
    .from("asignaciones_recursos")
    .select("recurso_id")
    .eq("operador_id", user.user.id)

  const assignedResourceIds = assignments?.map((a) => a.recurso_id) || []

  if (assignedResourceIds.length === 0) {
    return NextResponse.json({
      assignedTotal: 0,
      assignedDeployed: 0,
      assignedAvailable: 0,
      enCamino: 0,
      ocupados: 0,
    })
  }

  const { data: recursos } = await supabase
    .from("recursos")
    .select("id, estado, cantidad, cantidad_disponible")
    .in("id", assignedResourceIds)
    .neq("estado", "retired")

  const assignedResources = recursos ?? []

  const assignedTotal = assignedResources.reduce((sum: number, r: { cantidad: number }) => sum + (r.cantidad || 1), 0)
  const assignedDeployed = assignedResources.reduce((sum: number, r: { cantidad: number; cantidad_disponible: number }) =>
    sum + ((r.cantidad || 1) - (r.cantidad_disponible ?? (r.cantidad || 1))), 0
  )
  const assignedAvailable = assignedTotal - assignedDeployed
  const enCamino = assignedResources.filter((r: { estado: string }) => r.estado === "dispatched").length
  const ocupados = assignedResources.filter((r: { estado: string }) => r.estado === "busy").length

  return NextResponse.json({
    assignedTotal,
    assignedDeployed,
    assignedAvailable,
    enCamino,
    ocupados,
  })
}
