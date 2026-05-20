"use client"

import { useEffect, useState } from "react"
import { Bell, Bot, BotOff, LogOut, User, LayoutDashboard } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { logout } from "@/app/login/actions"
import { useUserRole } from "@/hooks/use-user-role"
import { useAgentMode } from "@/hooks/use-agent-mode"

export function DashboardHeader() {
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const { profile, isAdmin } = useUserRole()
  const isAutonomous = useAgentMode()

  useEffect(() => {
    setCurrentTime(new Date())
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-4 py-1 overflow-hidden">
      <div className="relative flex items-center min-w-0 ml-14 gap-2">
        <Image
          src="/zntinel-logo.png"
          alt="Zntinel"
          width={340}
          height={88}
          className="h-[88px] w-auto shrink-0 object-contain -my-3"
          priority
        />
        <span className="text-xs font-medium text-zinc-400 tracking-wider -mt-6">
          - AI Climate Crisis Management
        </span>
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

        {/* Botón Volver al Admin (solo admin) */}
        {isAdmin && (
          <Link
            href="/admin"
            className="hidden items-center gap-1.5 rounded-md border border-border bg-secondary/50 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground sm:flex transition-colors"
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            Panel de Admin
          </Link>
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
