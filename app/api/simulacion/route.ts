import { apiError } from "@/lib/services/api-response"

export const dynamic = "force-dynamic"
export async function GET() {
  return apiError("La simulación no está disponible en el sistema operativo", 410)
}
export async function POST() {
  return GET()
}
