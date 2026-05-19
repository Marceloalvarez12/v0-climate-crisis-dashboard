'use client'

import { useState, useCallback } from 'react'
import {
  Cpu,
  Globe,
  Database,
  Link,
  Eye,
  EyeOff,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { saveApiCredentials } from '@/app/admin/actions'

interface ServiceConfig {
  id: string
  name: string
  description: string
  envKey: string
  icon: React.ComponentType<{ className?: string }>
  status: 'operational' | 'error'
  statusMessage: string
}

const SERVICES: ServiceConfig[] = [
  {
    id: 'gemini',
    name: 'Gemini 2.0',
    description: 'Motor de IA — Razonamiento y análisis de crisis',
    envKey: 'GOOGLE_AI_API_KEY',
    icon: Cpu,
    status: 'operational',
    statusMessage: 'Conexión estable',
  },
  {
    id: 'twitter',
    name: 'X/Twitter Scraper',
    description: 'Extracción de datos en tiempo real de redes sociales',
    envKey: 'TWITTER_API_KEY',
    icon: Globe,
    status: 'error',
    statusMessage: 'Error 401 — Revisar Token',
  },
  {
    id: 'supabase',
    name: 'Supabase',
    description: 'Base de datos / Tiempo real / Autenticación',
    envKey: 'SUPABASE_SECRET_KEY',
    icon: Database,
    status: 'operational',
    statusMessage: 'Conexión estable',
  },
  {
    id: 'leaflet',
    name: 'Leaflet/Carto',
    description: 'Servicio de mapas y visualización geoespacial',
    envKey: 'LEAFLET_API_KEY',
    icon: Link,
    status: 'operational',
    statusMessage: 'Conexión estable',
  },
]

interface ApiConnectionManagerProps {
  initialKeys: Record<string, string>
}

export function ApiConnectionManager({ initialKeys }: ApiConnectionManagerProps) {
  const [credentials, setCredentials] = useState<Record<string, string>>(initialKeys)
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({})
  const [isRestarting, setIsRestarting] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleCredentialChange = useCallback((serviceId: string, value: string) => {
    setCredentials((prev) => ({ ...prev, [serviceId]: value }))
    setSaved(false)
  }, [])

  const toggleVisibility = useCallback((serviceId: string) => {
    setVisiblePasswords((prev) => ({ ...prev, [serviceId]: !prev[serviceId] }))
  }, [])

  const handleSaveAndRestart = useCallback(async () => {
    setIsRestarting(true)
    setSaved(false)
    try {
      await saveApiCredentials(credentials)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      console.error('Error guardando credenciales:', error)
    } finally {
      setTimeout(() => setIsRestarting(false), 2000)
    }
  }, [credentials])

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-zinc-800 px-6 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10">
          <Link className="h-5 w-5 text-cyan-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">
            Estado de Enlaces y Credenciales (API)
          </h2>
          <p className="text-[11px] text-zinc-500">
            Monitoreo de servicios externos y actualización de tokens en caliente
          </p>
        </div>
      </div>

      {/* Lista de Servicios */}
      <div className="divide-y divide-zinc-800/50">
        {SERVICES.map((service) => {
          const isVisible = visiblePasswords[service.id]
          const Icon = service.icon
          const isOperational = service.status === 'operational'

          return (
            <div key={service.id} className="px-6 py-5">
              {/* Header del Servicio */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-lg',
                      isOperational ? 'bg-emerald-500/10' : 'bg-red-500/10'
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-4 w-4',
                        isOperational ? 'text-emerald-400' : 'text-red-400'
                      )}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-200">
                      {service.name}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      {service.description}
                    </p>
                  </div>
                </div>

                {/* Badge de Estado */}
                <div
                  className={cn(
                    'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-mono tracking-wider uppercase whitespace-nowrap',
                    isOperational
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  )}
                >
                  {isOperational ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <AlertCircle className="h-3 w-3" />
                  )}
                  {isOperational ? 'Operativo' : 'Error 401'}
                </div>
              </div>

              {/* Input de Credencial */}
              <div className="flex items-center gap-2 mt-3">
                <div className="relative flex-1">
                  <input
                    type={isVisible ? 'text' : 'password'}
                    value={credentials[service.id] || ''}
                    onChange={(e) =>
                      handleCredentialChange(service.id, e.target.value)
                    }
                    placeholder={`Ingrese ${service.envKey}`}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => toggleVisibility(service.id)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {isVisible ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Mensaje de estado */}
              <p
                className={cn(
                  'mt-1.5 text-[10px] font-mono',
                  isOperational ? 'text-emerald-500/50' : 'text-red-400/70'
                )}
              >
                {service.statusMessage}
              </p>
            </div>
          )
        })}
      </div>

      {/* Footer con Acciones */}
      <div className="border-t border-zinc-800 px-6 py-4">
        <button
          onClick={handleSaveAndRestart}
          disabled={isRestarting}
          className={cn(
            'w-full flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition-all',
            saved
              ? 'bg-emerald-600 text-white'
              : 'bg-cyan-600 text-white hover:bg-cyan-500 active:scale-[0.99] disabled:opacity-70'
          )}
        >
          {isRestarting ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Reiniciando servicios y purgando caché...
            </>
          ) : saved ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Credenciales Guardadas — Agente Reiniciado
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              Guardar Credenciales y Reiniciar Agente
            </>
          )}
        </button>
      </div>
    </div>
  )
}
