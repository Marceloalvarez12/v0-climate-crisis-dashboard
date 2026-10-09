"use client"

import { useEffect, useState } from "react"
import useSWR from "swr"
import { AlertTriangle, ShieldCheck, ExternalLink, Map, FileWarning } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { fetcher } from "@/lib/api"

const NAV_LINKS = [
  { href: "/reportar",  label: "Reporte ciudadano", icon: FileWarning },
  { href: "/mapa",      label: "Mapa público",      icon: Map },
  { href: "/auditoria", label: "Auditoría",         icon: ShieldCheck },
]

export function DashboardHeader() {
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const { data: analytics } = useSWR<{ criticalCount: number; highCount: number }>("/api/analytics", fetcher, { refreshInterval: 10_000 })

  useEffect(() => {
    setCurrentTime(new Date())
    const interval = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const criticalCount = (analytics?.criticalCount ?? 0) + (analytics?.highCount ?? 0)

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur-md">
      {/* Left: brand */}
      <div className="flex min-w-0 items-center gap-3">
        <Link href="/" aria-label="Zntinel, centro de control">
          <Image src="/zntinel-logo-trimmed.png" alt="Zntinel" width={382} height={141} className="h-11 w-auto object-contain" priority />
        </Link>
        <div className="hidden h-6 w-px bg-border sm:block" />
        <div className="hidden leading-tight sm:block">
          <p className="text-[12px] font-semibold tracking-tight text-foreground">Centro de control</p>
          <p className="text-[10px] text-muted-foreground">San Miguel de Tucumán</p>
        </div>
      </div>

      {/* Right: status + navigation */}
      <div className="flex items-center gap-2">
        {criticalCount > 0 && (
          <span className="hidden h-7 items-center gap-1.5 rounded-md border border-red-500/30 bg-red-500/10 px-2.5 font-mono text-[10px] font-semibold text-red-400 md:flex">
            <AlertTriangle className="h-3 w-3" />
            {criticalCount} PRIORITARIOS
          </span>
        )}

        <nav className="hidden items-center rounded-md border border-border bg-secondary/30 p-0.5 md:flex">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              target="_blank"
              className="group flex h-6 items-center gap-1.5 rounded px-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <Icon className="h-3 w-3" />
              {label}
              <ExternalLink className="h-2.5 w-2.5 opacity-0 transition-opacity group-hover:opacity-50" />
            </Link>
          ))}
        </nav>

        {currentTime && (
          <div className="hidden h-7 items-center gap-1.5 rounded-md border border-border bg-secondary/30 px-2.5 font-mono text-[10px] tabular-nums text-foreground/80 lg:flex">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400 animate-pulse" />
            {currentTime.toLocaleString("es-AR", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: false,
            })}
          </div>
        )}
      </div>
    </header>
  )
}
