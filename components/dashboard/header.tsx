"use client"

import { useEffect, useState } from "react"
import { Bell, Settings, Radio } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export function DashboardHeader() {
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [alertCount, setAlertCount] = useState(3)

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
          Sistema de Monitoreo de Agente IA
        </p>
      </div>

      <div className="flex items-center gap-2">
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

        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="h-4 w-4" />
          {alertCount > 0 && (
            <Badge className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center bg-primary p-0 text-[10px]">
              {alertCount}
            </Badge>
          )}
        </Button>

        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}
