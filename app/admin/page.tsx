import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAgentMode, getAgentThresholds, getApiCredentials, getUsers } from './actions'
import { AgentKillSwitch } from '@/components/admin/agent-kill-switch'
import { AgentThresholdConfig } from '@/components/admin/agent-threshold-config'
import { ApiConnectionManager } from '@/components/admin/api-connection-manager'
import { UserRoleManager } from '@/components/admin/user-role-manager'
import { Shield, Sliders, Link as LinkIcon, Users, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface AdminPageProps {
  searchParams: Promise<{ section?: string }>
}

const SECTIONS = [
  {
    id: 'control',
    label: 'Control del Agente',
    icon: Shield,
    description: 'Interruptor de emergencia y modo autónomo',
  },
  {
    id: 'thresholds',
    label: 'Calibración de Umbrales',
    icon: Sliders,
    description: 'Sensibilidad y parámetros de la IA',
  },
  {
    id: 'connections',
    label: 'Conexiones API',
    icon: LinkIcon,
    description: 'Estado de servicios y credenciales',
  },
  {
    id: 'users',
    label: 'Usuarios y Roles',
    icon: Users,
    description: 'Gestión de personal y accesos',
  },
]

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const { section } = await searchParams
  const activeSection =
    section === 'thresholds'
      ? 'thresholds'
      : section === 'connections'
        ? 'connections'
        : section === 'users'
          ? 'users'
          : 'control'

  const supabase = await createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('perfiles')
    .select('rol, nombre')
    .eq('id', session.user.id)
    .single()

  if (profile?.rol !== 'admin') {
    redirect('/')
  }

  const [initialAutonomous, thresholds, apiKeys, adminUsers] = await Promise.all([
    activeSection === 'control' ? getAgentMode() : Promise.resolve(false),
    activeSection === 'thresholds' ? getAgentThresholds() : Promise.resolve({ autoResolve: 5, confidence: 80 }),
    activeSection === 'connections' ? getApiCredentials() : Promise.resolve({}),
    activeSection === 'users' ? getUsers() : Promise.resolve([]),
  ])

  return (
    <div className="min-h-screen bg-[#0B0F17]">
      {/* Header de Admin */}
      <header className="flex items-center gap-4 border-b border-zinc-800 bg-zinc-950/50 px-6 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-zinc-500 transition-colors hover:text-zinc-300"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-xs font-mono tracking-wider uppercase">
            Volver al Dashboard
          </span>
        </Link>
        <div className="flex-1" />
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800">
            <Shield className="h-4 w-4 text-zinc-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-200">
              {profile.nombre}
            </p>
            <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
              Administrador
            </p>
          </div>
        </div>
      </header>

      {/* Layout con Sidebar */}
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 shrink-0 border-r border-zinc-800 bg-zinc-950/30 min-h-[calc(100vh-57px)] p-4">
          <p className="text-[10px] font-mono tracking-widest uppercase text-zinc-600 mb-4 px-3">
            Configuración
          </p>
          <nav className="space-y-1">
            {SECTIONS.map((s) => {
              const isActive = activeSection === s.id
              const Icon = s.icon
              return (
                <Link
                  key={s.id}
                  href={`/admin?section=${s.id}`}
                  className={`flex items-start gap-3 rounded-lg px-3 py-3 text-sm transition-all ${
                    isActive
                      ? 'bg-zinc-800/80 text-zinc-100'
                      : 'text-zinc-500 hover:bg-zinc-800/40 hover:text-zinc-300'
                  }`}
                >
                  <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">{s.label}</p>
                    <p className="text-[10px] text-zinc-600 mt-0.5">
                      {s.description}
                    </p>
                  </div>
                </Link>
              )
            })}
          </nav>
        </aside>

        {/* Contenido Principal */}
        <main className="flex-1 px-8 py-10">
          {activeSection === 'control' && (
            <AgentKillSwitch initialAutonomous={initialAutonomous} />
          )}
          {activeSection === 'thresholds' && (
            <AgentThresholdConfig
              initialAutoResolve={thresholds.autoResolve}
              initialConfidence={thresholds.confidence}
            />
          )}
          {activeSection === 'connections' && (
            <ApiConnectionManager initialKeys={apiKeys} />
          )}
          {activeSection === 'users' && (
            <UserRoleManager initialUsers={adminUsers} />
          )}
        </main>
      </div>
    </div>
  )
}
