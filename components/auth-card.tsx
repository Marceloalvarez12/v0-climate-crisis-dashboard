import Image from "next/image"
import Link from "next/link"

export function AuthCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <main className="flex min-h-screen items-center justify-center bg-[#0b0e11] px-4 text-slate-100"><section className="w-full max-w-md space-y-5 rounded-2xl border border-slate-700/50 bg-[#11161a] p-7 shadow-xl"><Image src="/zntinel-logo-trimmed.png" alt="Zntinel" width={382} height={141} className="mx-auto h-20 w-auto" priority /><h1 className="text-xl font-semibold">{title}</h1>{children}<div className="flex flex-wrap justify-between gap-3 text-xs text-sky-300"><Link href="/mapa">Mapa ciudadano</Link><Link href="/reportar">Reportar emergencia</Link></div></section></main>
}

export const authInput = "h-11 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 text-sm text-white focus:outline-2 focus:outline-sky-400"
export const authButton = "h-11 w-full rounded-lg bg-sky-300 text-sm font-semibold text-slate-950 hover:bg-sky-200"
