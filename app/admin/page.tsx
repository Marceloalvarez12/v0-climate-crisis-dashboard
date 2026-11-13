import Link from "next/link"
import { requireStaff } from "@/lib/auth"
import { PageHeader } from "@/components/shared/page-header"
import { getAgentMode, getAgentThresholds, getApiCredentials, getUsers } from "./actions"
import { AgentKillSwitch } from "@/components/admin/agent-kill-switch"
import { AgentThresholdConfig } from "@/components/admin/agent-threshold-config"
import { ApiConnectionManager } from "@/components/admin/api-connection-manager"
import { UserRoleManager } from "@/components/admin/user-role-manager"
import { ResourceManager } from "@/components/admin/resource-manager"

export const dynamic = "force-dynamic"

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ section?: string }> }) {
  const { user } = await requireStaff("admin")
  const sections = { control: "Control del agente", thresholds: "Umbrales", connections: "Conexiones", users: "Usuarios y roles", resources: "Recursos" }
  const { section = "control" } = await searchParams
  const selected = Object.hasOwn(sections, section) ? section : "control"
  const [autonomous, thresholds, connections, users] = await Promise.all([
    selected === "control" ? getAgentMode() : false,
    selected === "thresholds" ? getAgentThresholds() : { confidence: 80 },
    selected === "connections" ? getApiCredentials() : {},
    selected === "users" ? getUsers() : [],
  ])
  return <div className="min-h-screen bg-[#0b0e11] text-slate-100"><PageHeader title="Administración" /><div className="mx-auto grid max-w-7xl gap-6 p-4 md:grid-cols-[220px_1fr] md:p-6"><nav aria-label="Administración" className="flex flex-wrap content-start gap-2 md:flex-col">{Object.entries(sections).map(([key, label]) => <Link key={key} href={`/admin?section=${key}`} aria-current={selected === key ? "page" : undefined} className={`rounded-lg border px-3 py-3 text-sm ${selected === key ? "border-sky-400/30 bg-sky-400/10 text-sky-200" : "border-slate-800 text-slate-300"}`}>{label}</Link>)}</nav><main className="min-w-0">{selected === "control" && <AgentKillSwitch initialAutonomous={autonomous} />}{selected === "thresholds" && <AgentThresholdConfig initialConfidence={thresholds.confidence} />}{selected === "connections" && <ApiConnectionManager initialKeys={connections} />}{selected === "users" && <UserRoleManager initialUsers={users} currentUserId={user.id} />}{selected === "resources" && <ResourceManager />}</main></div></div>
}
