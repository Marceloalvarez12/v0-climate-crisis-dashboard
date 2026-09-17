'use client'

import { Bot, BotOff, Eye, Ban, CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAgentMode } from '@/hooks/use-agent-mode'

export function AgentStatusPanel() {
  const isAutonomous = useAgentMode()

  const capabilities = [
    {
      label: 'Social media scanning',
      alwaysActive: true,
      icon: Eye,
    },
    {
      label: 'Severity analysis',
      alwaysActive: true,
      icon: Eye,
    },
    {
      label: 'Auto-close incidents',
      alwaysActive: false,
      icon: Ban,
    },
    {
      label: 'Auto-dispatch resources',
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
          {isAutonomous ? 'Active Autonomous AI' : 'Manual Mode'}
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
