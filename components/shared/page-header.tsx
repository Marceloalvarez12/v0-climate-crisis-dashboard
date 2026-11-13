import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, Map, LayoutDashboard } from "lucide-react"

interface PageHeaderProps {
  title: string
  backHref?: string
  backLabel?: string
}

export function PageHeader({ title, backHref = "/", backLabel = "Centro de control" }: PageHeaderProps) {
  return (
    <header className="relative z-10 border-b border-[#252b30] bg-[#0b0e11] px-4 sm:px-6">
      <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-2 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/" aria-label="Zntinel, centro de control" className="shrink-0">
            <Image src="/zntinel-logo-trimmed.png" alt="Zntinel" width={382} height={141} className="h-10 w-auto object-contain" priority />
          </Link>
          <div className="hidden h-7 w-px bg-zinc-800 sm:block" />
          <div className="min-w-0"><p className="truncate text-sm font-semibold text-zinc-100">{title}</p><p className="text-[11px] text-zinc-500">Centro de crisis · Tucumán</p></div>
        </div>
        <nav aria-label="Navegación" className="flex items-center gap-2">
          {backHref !== "/mapa" && <Link href="/mapa" className="hidden h-9 items-center gap-1.5 rounded-md border border-zinc-800 px-3 text-xs text-zinc-300 transition-colors hover:bg-zinc-800 sm:inline-flex"><Map className="h-3.5 w-3.5" />Mapa público</Link>}
          <Link href={backHref} aria-label={backLabel} title={backLabel} className="inline-flex h-9 w-9 items-center justify-center gap-1.5 rounded-md border border-zinc-700 text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 sm:w-auto sm:px-2.5">
            {backHref === "/" ? <LayoutDashboard className="h-3.5 w-3.5" /> : <ArrowLeft className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{backLabel}</span>
          </Link>
        </nav>
      </div>
    </header>
  )
}
