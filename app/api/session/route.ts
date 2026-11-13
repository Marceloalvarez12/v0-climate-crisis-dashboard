import { requireStaff } from "@/lib/auth"
import { apiError, apiSuccess } from "@/lib/services/api-response"

export async function GET() {
  try {
    const { user, profile } = await requireStaff()
    return apiSuccess({ id: user.id, name: profile.nombre, role: profile.rol })
  } catch { return apiError("No autorizado", 401) }
}
