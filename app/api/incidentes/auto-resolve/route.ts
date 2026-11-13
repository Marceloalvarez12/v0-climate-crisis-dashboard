import { apiError } from "@/lib/services/api-response"

export async function POST() {
  return apiError("El cierre de incidentes requiere confirmación operativa", 410)
}
