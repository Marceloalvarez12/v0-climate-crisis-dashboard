import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAgentMode, getAgentThresholds, getApiCredentials, getUsers } from './actions'
import { logout } from '@/app/login/actions'
import { AgentKillSwitch } from '@/components/admin/agent-kill-switch'
import { AgentThresholdConfig } from '@/components/admin/agent-threshold-config'
import { ApiConnectionManager } from '@/components/admin/api-connection-manager'
import { UserRoleManager } from '@/components/admin/user-role-manager'
import { ResourceManager } from '@/components/admin/resource-manager'
import { Shield, Sliders, Link as LinkIcon, Users, LogOut, Monitor, User, Radio, Truck } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

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
  {
    id: 'resources',
    label: 'Gestión de Recursos',
    icon: Truck,
    description: 'Unidades, vehículos y equipos',
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
          : section === 'resources'
            ? 'resources'
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
      <header className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950/50 px-4 py-1">
        {/* Izquierda: Logo */}
        <div className="relative flex items-center min-w-0 ml-8 gap-2">
          <Image
            src="/zntinel-logo-optimized.png"
            alt="Zntinel"
            width={340}
            height={88}
            className="h-[88px] w-auto shrink-0 object-contain -my-3"
            priority
          />
          <span className="text-xs font-medium text-zinc-400 tracking-wider mt-3">
            - AI Climate Crisis Management
          </span>
        </div>

        {/* Derecha: acciones */}
        <div className="flex items-center gap-2">
          {/* Dashboard */}
          <Link
            href="/"
            className="hidden items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900/50 px-2.5 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 sm:flex transition-colors"
          >
            <Monitor className="h-3.5 w-3.5" />
            Dashboard
          </Link>

          {/* Reloj */}
          <div className="hidden rounded-md border border-zinc-800 bg-zinc-900/50 px-2.5 py-1.5 font-mono text-xs text-zinc-400 md:block">
            {new Date().toLocaleString("es-AR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </div>

          {/* Perfil */}
          <div className="hidden items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900/50 px-3 py-1.5 sm:flex">
            <User className="h-3.5 w-3.5 text-zinc-500" />
            <div className="flex flex-col">
              <span className="text-[11px] font-medium text-zinc-200 leading-tight">
                {profile.nombre}
              </span>
              <span className="text-[9px] text-zinc-500 leading-tight">
                Administrador
              </span>
            </div>
          </div>

          {/* Logout */}
          <form action={logout}>
            <button
              type="submit"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:text-red-400"
              title="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
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
          {activeSection === 'resources' && (
            <ResourceManager />
          )}
        </main>
      </div>
    </div>
  )
}
