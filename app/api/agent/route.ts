/**
 * app/api/agent/route.ts
 *
 * Endpoint for executing the social media monitoring agent.
 *
 * GET  /api/agent  → Agent status and available connectors
 * POST /api/agent  → Runs a complete scan and returns the result
 */

import { NextResponse } from "next/server"
import { getAgentStatus } from "@/lib/mock-db"

// ---------------------------------------------------------------------------
// GET — agent status
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const status = getAgentStatus()

    return NextResponse.json({
      status:          "online",
      model:           "gemini-2.0-flash",
      connectors:      [
        { name: "Mock", isConfigured: true, lastScan: new Date().toISOString() }
      ],
      activeConnectors: 1,
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
// POST — execute scan
// ---------------------------------------------------------------------------

export async function POST() {
  try {
    console.log("[API/agent] Starting scan...")

    // Mock scan result
    const result = {
      postsCollected: Math.floor(Math.random() * 10) + 1,
      incidentsFound: [],
      timestamp: new Date().toISOString(),
    }

    console.log(
      `[API/agent] Scan completed: ${result.postsCollected} posts, ` +
      `${result.incidentsFound.length} incidents detected`
    )

    return NextResponse.json(result)
  } catch (err) {
    console.error("[API/agent] Error in scan:", err)
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    )
  }
}
