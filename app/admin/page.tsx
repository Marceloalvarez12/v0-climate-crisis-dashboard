import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAgentMode } from './actions'
import { AgentKillSwitch } from '@/components/admin/agent-kill-switch'
import { Shield, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function AdminPage() {
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

  const initialAutonomous = await getAgentMode()

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

      {/* Contenido Principal */}
      <main className="mx-auto max-w-3xl px-6 py-10">
        {/* Título de Sección */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-zinc-100">
            Panel de Administración
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Gestión y control del sistema ZNTINEL
          </p>
        </div>

        {/* Kill Switch */}
        <AgentKillSwitch initialAutonomous={initialAutonomous} />
      </main>
    </div>
  )
}
