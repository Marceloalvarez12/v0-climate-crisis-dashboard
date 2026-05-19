'use client'

import { useEffect, useState, useCallback } from 'react'
import { Bot, BotOff, Eye, Ban, CheckCircle2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export function AgentStatusPanel() {
  const [isAutonomous, setIsAutonomous] = useState(true)

  const fetchMode = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('config_sistema')
        .select('valor')
        .eq('clave', 'agent_mode')
        .single()

      if (!error && data) {
        setIsAutonomous((data.valor as { autonomous: boolean }).autonomous)
      }
    } catch {
      // Fallback
    }
  }, [])

  useEffect(() => {
    fetchMode()
    const interval = setInterval(fetchMode, 10000)
    return () => clearInterval(interval)
  }, [fetchMode])

  const capabilities = [
    {
      label: 'Escaneo de redes sociales',
      alwaysActive: true,
      icon: Eye,
    },
    {
      label: 'Análisis de severidad',
      alwaysActive: true,
      icon: Eye,
    },
    {
      label: 'Auto-cierre de incidentes',
      alwaysActive: false,
      icon: Ban,
    },
    {
      label: 'Auto-despacho de recursos',
      alwaysActive: false,
      icon: Ban,
    },
  ]

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
      <div className="flex items-center gap-2 mb-3">
        {isAutonomous ? (
          <Bot className="h-4 w-4 text-emerald-400" />
        ) : (
          <BotOff className="h-4 w-4 text-red-400" />
        )}
        <span
          className={cn(
            'text-xs font-semibold',
            isAutonomous ? 'text-emerald-400' : 'text-red-400'
          )}
        >
          {isAutonomous ? 'IA Autónoma Activa' : 'Modo Manual'}
        </span>
      </div>

      <div className="space-y-2">
        {capabilities.map((cap) => {
          const isActive = cap.alwaysActive || isAutonomous
          const Icon = cap.icon

          return (
            <div key={cap.label} className="flex items-center gap-2">
              {isActive ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5 text-red-400/60 shrink-0" />
              )}
              <span
                className={cn(
                  'text-[11px]',
                  isActive ? 'text-zinc-300' : 'text-zinc-600 line-through'
                )}
              >
                {cap.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
