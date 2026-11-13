import { getDb } from "@/lib/db"

export async function recordAgentEvent(type: "monitoring" | "analysis" | "alert" | "complete", message: string, source: string) {
  try {
    await (await getDb()).recordAgentEvent(type, message, source)
  } catch (error) {
    // Telemetry cannot invalidate an already persisted report or scan.
    console.error("[Agent event] Could not persist event:", error)
  }
}
