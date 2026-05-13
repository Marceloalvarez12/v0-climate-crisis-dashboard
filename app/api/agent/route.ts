/**
 * app/api/agent/route.ts
 *
 * Endpoint para ejecutar el agente de monitoreo de redes sociales.
 *
 * GET  /api/agent  → Estado del agente y conectores disponibles
 * POST /api/agent  → Ejecuta un scan completo y retorna el resultado
 */

import { NextResponse } from "next/server"
import { SocialMediaAgent } from "@/lib/agents/social-media-agent"

// ---------------------------------------------------------------------------
// GET — estado del agente
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const agent  = new SocialMediaAgent()
    const status = agent.getConnectorStatus()

    return NextResponse.json({
      status:          "online",
      model:           "gemini-2.0-flash",
      connectors:      status,
      activeConnectors: status.filter((c) => c.isConfigured).length,
      geminiConfigured: !!process.env.GOOGLE_AI_API_KEY,
      timestamp:       new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json(
      { status: "error", error: String(err) },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// POST — ejecutar scan
// ---------------------------------------------------------------------------

export async function POST() {
  try {
    console.log("[API/agent] Iniciando scan...")
    const agent  = new SocialMediaAgent()
    const result = await agent.runScan()

    console.log(
      `[API/agent] Scan completado: ${result.postsCollected} posts, ` +
      `${result.incidentsFound.length} incidentes detectados`
    )

    return NextResponse.json(result)
  } catch (err) {
    console.error("[API/agent] Error en scan:", err)
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    )
  }
}
