"use client"

import { useEffect, useState, useCallback } from "react"
import { Bell, Settings, Radio, Bot, BotOff, LogOut, User } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { logout } from "@/app/login/actions"
import { useUserRole } from "@/hooks/use-user-role"

export function DashboardHeader() {
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [alertCount, setAlertCount] = useState(3)
  const [isAutonomous, setIsAutonomous] = useState(true)
  const { profile, isAdmin } = useUserRole()

  const fetchAgentMode = useCallback(async () => {
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
      // Fallback to true if fetch fails
    }
  }, [])

  useEffect(() => {
    fetchAgentMode()
    const interval = setInterval(fetchAgentMode, 10000)
    return () => clearInterval(interval)
  }, [fetchAgentMode])

  useEffect(() => {
    setCurrentTime(new Date())
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        setAlertCount(prev => Math.min(prev + 1, 9))
      }
    }, 10000)

    return () => clearInterval(interval)
  }, [])

  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-4 py-1 overflow-hidden">
      <div className="relative flex items-center min-w-0 ml-14">
        <Image
          src="/zntinel-logo.png"
          alt="Zntinel"
          width={340}
          height={88}
          className="h-[88px] w-auto shrink-0 object-contain -my-3"
          priority
        />
        <p className="hidden sm:block absolute bottom-0 left-0 text-[9px] tracking-widest uppercase text-muted-foreground whitespace-nowrap translate-y-5">
          Consola de Despacho
        </p>
      </div>

      <div className="flex items-center gap-2">
        {/* Indicador de modo IA */}
        <div
          className={`hidden items-center gap-1.5 rounded-md border px-2.5 py-1.5 sm:flex transition-colors ${
            isAutonomous
              ? 'border-emerald-500/20 bg-emerald-500/5'
              : 'border-red-500/20 bg-red-500/5'
          }`}
        >
          {isAutonomous ? (
            <Bot className="h-3 w-3 text-emerald-400" />
          ) : (
            <BotOff className="h-3 w-3 text-red-400" />
          )}
          <span
            className={`text-xs font-medium transition-colors ${
              isAutonomous ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {isAutonomous ? 'IA Autónoma Activa' : 'Modo Manual Activo'}
          </span>
        </div>

        <div className="hidden items-center gap-1.5 rounded-md border border-border bg-secondary/50 px-2.5 py-1.5 sm:flex">
          <Radio className="h-3 w-3 text-success animate-pulse" />
          <span className="text-xs text-muted-foreground">Sistema Activo</span>
        </div>

        {currentTime && (
          <div className="hidden rounded-md border border-border bg-secondary/50 px-2.5 py-1.5 font-mono text-xs text-foreground md:block">
            {currentTime.toLocaleString("es-AR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </div>
        )}

        {/* Perfil del usuario */}
        {profile && (
          <div className="hidden items-center gap-2 rounded-md border border-border bg-secondary/50 px-3 py-1.5 sm:flex">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="text-[11px] font-medium text-foreground leading-tight">
                {profile.nombre}
              </span>
              <span className="text-[9px] text-muted-foreground leading-tight">
                {isAdmin ? 'Administrador' : 'Operador de Turno'}
              </span>
            </div>
          </div>
        )}

        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="h-4 w-4" />
          {alertCount > 0 && (
            <Badge className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center bg-primary p-0 text-[10px]">
              {alertCount}
            </Badge>
          )}
        </Button>

        {/* Settings solo para admin */}
        {isAdmin && (
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Settings className="h-4 w-4" />
          </Button>
        )}

        {/* Botón Cerrar Sesión */}
        <form action={logout}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-red-400"
            title="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </header>
  )
}
