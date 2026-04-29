import { DashboardHeader } from "@/components/dashboard/header"
import { AIActivityLog } from "@/components/dashboard/ai-activity-log"
import { ResourcesPanel } from "@/components/dashboard/resources-panel"
import { CrisisMap } from "@/components/dashboard/crisis-map"
import { AnalyticsPanel } from "@/components/dashboard/analytics-panel"

export default function CrisisDashboard() {
  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <DashboardHeader />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - AI Activity */}
        <aside className="hidden w-72 shrink-0 border-r border-border p-3 lg:block">
          <AIActivityLog />
        </aside>

        {/* Center - Map */}
        <main className="flex flex-1 flex-col gap-3 overflow-hidden p-3">
          <div className="flex-1 min-h-0">
            <CrisisMap />
          </div>
          
          {/* Bottom Analytics */}
          <div className="shrink-0">
            <AnalyticsPanel />
          </div>
        </main>

        {/* Right Sidebar - Resources */}
        <aside className="hidden w-72 shrink-0 border-l border-border p-3 xl:block">
          <ResourcesPanel />
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
