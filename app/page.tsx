"use client"

import { useState, useEffect } from "react"
import { DashboardHeader } from "@/components/dashboard/header"
import { AIActivityLog } from "@/components/dashboard/ai-activity-log"
import { ResourcesPanel } from "@/components/dashboard/resources-panel"
import { CrisisMap } from "@/components/dashboard/crisis-map"
import { AnalyticsPanel } from "@/components/dashboard/analytics-panel"
import { BroadcastPanel } from "@/components/dashboard/broadcast-panel"
import { LiveAlert } from "@/components/dashboard/live-alert"
import { DevPanel } from "@/components/dashboard/dev-panel"
import { Button } from "@/components/ui/button"
import { Siren } from "lucide-react"
import { Suspense } from "react"

// Minimal incident shape needed to open the detail modal from outside CrisisMap
export interface AlertIncident {
  id: string
  type: "flood" | "fire" | "storm" | "general"
  severity: "critical" | "high" | "medium" | "low"
  location: string
  coordinates: { lat: number; lng: number }
  affectedPeople: number
  timestamp: Date
  source: "social" | "sensor" | "camera"
  sourceDetails: Record<string, unknown>
}

export default function CrisisDashboard() {
  const [showLiveAlert, setShowLiveAlert] = useState(false)
  // Lifted state: incident selected from LiveAlert to open in CrisisMap detail modal
  const [pendingIncident, setPendingIncident] = useState<AlertIncident | null>(null)

  // Auto-trigger alert after 25 seconds for demo
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLiveAlert(true)
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([200, 100, 200, 100, 200])
      }
    }, 25000)

    return () => clearTimeout(timer)
  }, [])

  const handleDeployEmergency = (incident: AlertIncident) => {
    setShowLiveAlert(false)
    setPendingIncident(incident)
  }

  const triggerManualAlert = () => {
    setShowLiveAlert(true)
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 200])
    }
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Dev Panel - Only visible with ?dev=true */}
      <Suspense fallback={null}>
        <DevPanel />
      </Suspense>

      {/* Live Alert Overlay */}
      {showLiveAlert && (
        <LiveAlert
          onDismiss={() => setShowLiveAlert(false)}
          onDeployEmergency={handleDeployEmergency}
        />
      )}

      {/* Header */}
      <DashboardHeader />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - AI Activity */}
        <aside className="hidden w-72 shrink-0 border-r border-border p-3 lg:block overflow-hidden">
          <AIActivityLog />
        </aside>

        {/* Center - Map */}
        <main className="flex flex-1 flex-col gap-3 overflow-hidden p-3">
          <div className="flex-1 min-h-0">
            <CrisisMap
              pendingIncident={pendingIncident}
              onPendingIncidentHandled={() => setPendingIncident(null)}
            />
          </div>
          
          {/* Bottom Analytics */}
          <div className="shrink-0">
            <AnalyticsPanel />
          </div>
        </main>

        {/* Right Sidebar - Resources & Broadcast */}
        <aside className="hidden w-80 shrink-0 border-l border-border p-3 xl:block overflow-y-auto">
          <div className="space-y-3">
            <ResourcesPanel />
            <BroadcastPanel />
            
            {/* Demo Alert Trigger Button */}
            <Button
              variant="destructive"
              className="w-full gap-2 bg-red-600 hover:bg-red-700"
              onClick={triggerManualAlert}
            >
              <Siren className="h-4 w-4" />
              Simular Alerta en Vivo
            </Button>
          </div>
        </aside>
      </div>

      {/* Mobile Bottom Navigation hint */}
      <div className="flex items-center justify-center gap-4 border-t border-border bg-card p-2 lg:hidden">
        <button className="flex flex-col items-center gap-0.5 text-muted-foreground hover:text-foreground">
          <span className="text-[10px]">Agente IA</span>
        </button>
        <button className="flex flex-col items-center gap-0.5 text-primary">
          <span className="text-[10px]">Mapa</span>
        </button>
        <button className="flex flex-col items-center gap-0.5 text-muted-foreground hover:text-foreground">
          <span className="text-[10px]">Recursos</span>
        </button>
      </div>
    </div>
  )
}
