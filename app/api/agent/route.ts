import { SocialMediaAgent } from "@/lib/agents/social-media-agent"
import { LlmAnalyzer } from "@/lib/agents/llm-analyzer"
import { TRIGGER_HASHTAG } from "@/lib/agents/hashtag"
import { apiSuccess, apiError } from "@/lib/services/api-response"
import { getSystemConfig } from "@/lib/services/config-service"
import { recordAgentEvent } from "@/lib/services/agent-event-service"
import { getDb } from "@/lib/db"

export async function GET() {
  try {
    const agent = new SocialMediaAgent()
    const connectors = agent.getConnectorStatus()
    const activeCount = connectors.filter(c => c.isConfigured).length
    const usingOpenRouter = LlmAnalyzer.isConfigured()
    const [mode, lastEvent] = await Promise.all([
      getSystemConfig<{ autonomous?: boolean }>("agent_mode"),
      getDb().then(db => db.lastAgentScan()),
    ])

    return apiSuccess({
      status: mode === null ? "unavailable" : mode.autonomous !== true ? "disabled" : activeCount > 0 ? "ready" : "no_connectors",
      lastScan: lastEvent,
      model:           usingOpenRouter ? (process.env.OPENROUTER_MODEL || "openrouter") : "gemini-2.0-flash",
      provider:        usingOpenRouter ? "openrouter" : "google",
      connectors:      connectors.map(c => ({
        name:          c.platform.toUpperCase(),
        isConfigured:  c.isConfigured,
      })),
      activeConnectors: activeCount,
      triggerHashtag:  TRIGGER_HASHTAG,
      geminiConfigured: !!process.env.GOOGLE_AI_API_KEY,
      openrouterConfigured: usingOpenRouter,
      timestamp:       new Date().toISOString(),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return apiError(message)
  }
}

export async function POST() {
  try {
    // Kill switch del admin (config_sistema.agent_mode). Si la tabla no
    // existe o no hay config, se rechaza el escaneo (fail-closed).
    const mode = await getSystemConfig<{ autonomous?: boolean }>("agent_mode")
    if (mode?.autonomous !== true) {
      return apiError("Agente deshabilitado o configuración no disponible", 503)
    }

    const usingOpenRouter = LlmAnalyzer.isConfigured()
    console.log(`[API/agent] Starting live scan with ${usingOpenRouter ? "OpenRouter" : "Gemini 2.0 Flash"}...`)
    const agent = new SocialMediaAgent()
    await recordAgentEvent("monitoring", "Se inició un escaneo de los conectores configurados", "Escaneo social")
    const result = await agent.runScan()
    await recordAgentEvent("complete", `Escaneo finalizado: ${result.postsCollected} publicaciones recibidas, ${result.postsAnalyzed} analizadas y ${result.incidentsFound.length} incidentes detectados${result.error ? `. ${result.error}` : ""}`, "Escaneo social")

    console.log(
      `[API/agent] Live scan completed: ${result.postsCollected} posts, ` +
      `${result.postsMatched} with ${result.hashtag}, ${result.incidentsFound.length} incidents detected`
    )

    return apiSuccess(result)
  } catch (err) {
    console.error("[API/agent] Error in live scan:", err)
    const message = err instanceof Error ? err.message : String(err)
    return apiError(message)
  }
}
