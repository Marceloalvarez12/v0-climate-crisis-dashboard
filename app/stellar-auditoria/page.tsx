"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { PageHeader } from "@/components/shared/page-header"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import {
  Search,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  ExternalLink,
  Cpu,
  FileJson,
  Check,
  Copy,
} from "lucide-react"

interface Groth16ProofInput {
  a: string
  b: string
  c: string
}

interface VerifyResult {
  valid: boolean
  network: string
  contractId: string
  simulationSuccess: boolean
  error?: string
  rawResult?: string
  isSimulated: boolean
  txHash?: string
  explorerUrl?: string
}

function AuditoriaContent() {
  const searchParams = useSearchParams()
  const urlProofA = searchParams.get("a") || ""
  const urlProofB = searchParams.get("b") || ""
  const urlProofC = searchParams.get("c") || ""
  const urlPubSignals = searchParams.get("pubSignals") || ""
  const [proofA, setProofA] = useState(searchParams.get("a") || "")
  const [proofB, setProofB] = useState(searchParams.get("b") || "")
  const [proofC, setProofC] = useState(searchParams.get("c") || "")
  const [pubSignals, setPubSignals] = useState(searchParams.get("pubSignals") || "")
  const [loading, setLoading] = useState(false)
  const [exampleLoading, setExampleLoading] = useState(false)
  const [result, setResult] = useState<VerifyResult | null>(null)
  const [copied, setCopied] = useState(false)

  const fillExample = async () => {
    setExampleLoading(true)
    setResult(null)
    try {
      const response = await fetch("/api/incidentes/zk-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: -26.83, lng: -65.2 }),
      })
      const data = await response.json()
      if (!response.ok || !data.valid || !data.contractArgs?.proof || !Array.isArray(data.contractArgs.pubSignals)) throw new Error(data.error || "No se pudo generar la prueba")
      setProofA(data.contractArgs.proof.a)
      setProofB(data.contractArgs.proof.b)
      setProofC(data.contractArgs.proof.c)
      setPubSignals(data.contractArgs.pubSignals.join(","))
      toast.success("Ejemplo generado con la clave actual")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo generar el ejemplo")
    } finally {
      setExampleLoading(false)
    }
  }

  const parsePubSignals = (): string[] | null => {
    if (!pubSignals.trim()) return []
    const parts = pubSignals.split(",").map(s => s.trim()).filter(Boolean)
    return parts.length > 0 ? parts : null
  }

  const verifyProof = useCallback(async (proof: Groth16ProofInput, signals: string[]) => {
    setLoading(true)
    setResult(null)

    try {
      const res = await fetch("/api/stellar/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proof, pubSignals: signals }),
      })
      const json = await res.json()

      if (res.ok) {
        setResult(json)
        if (json.valid) toast.success("Prueba verificada")
        else toast.error("La prueba no es válida")
      } else {
        toast.error(json.error || "No se pudo verificar la prueba")
      }
    } catch {
      toast.error("No se pudo conectar con el servicio de verificación")
    } finally {
      setLoading(false)
    }
  }, [])

  const handleVerify = (e?: React.FormEvent) => {
    e?.preventDefault()
    const signals = parsePubSignals()
    const clean = (value: string) => value.trim().replace(/^0x/i, "")
    const proof = { a: clean(proofA), b: clean(proofB), c: clean(proofC) }
    if (!/^[0-9a-f]{128}$/i.test(proof.a) || !/^[0-9a-f]{256}$/i.test(proof.b) || !/^[0-9a-f]{128}$/i.test(proof.c)) {
      toast.error("Revisá la longitud y el formato hexadecimal de las pruebas A, B y C.")
      return
    }
    if (!signals?.length || signals.some(signal => !/^\d+$/.test(signal))) {
      toast.error("Ingresá las señales públicas como números separados por comas.")
      return
    }
    return verifyProof(proof, signals)
  }

  useEffect(() => {
    if (urlProofA && urlProofB && urlProofC) {
      const signals = urlPubSignals.split(",").map(s => s.trim()).filter(Boolean)
      void verifyProof({ a: urlProofA, b: urlProofB, c: urlProofC }, signals)
    }
  }, [urlProofA, urlProofB, urlProofC, urlPubSignals, verifyProof])

  const copyContractId = () => {
    navigator.clipboard.writeText(result?.contractId || "")
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success("Identificador de contrato copiado")
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-neutral-950 to-black text-foreground antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      <PageHeader title="Auditoría de ubicación" />

      <main className="relative mx-auto max-w-4xl px-4 py-12 md:px-6">
        <div className="text-center space-y-3 mb-10">
          <Badge className="max-w-full whitespace-normal text-center bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/15 border-indigo-500/20 text-xs px-3 py-1 font-mono uppercase tracking-wider">
            Pruebas de ubicación · Circom y Groth16
          </Badge>
          <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-zinc-100 via-white to-zinc-400 sm:text-4xl">
            Verificar una prueba de ubicación
          </h1>
          <p className="max-w-xl mx-auto text-sm text-zinc-400 leading-relaxed">
            Consultá una prueba Groth16. La verificación puede realizarse localmente o en Stellar, según la configuración disponible.
          </p>
          <Link href="/auditoria" className="inline-flex text-xs font-medium text-sky-300 hover:text-sky-200 hover:underline">Buscar un registro de despacho en Arkiv</Link>
        </div>

        <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur-sm shadow-xl shadow-black/40">
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-1">
              <div className="space-y-1.5">
                <Label htmlFor="proofA" className="text-xs font-semibold text-zinc-300 flex items-center gap-2">
                  <Cpu className="h-3.5 w-3.5 text-indigo-400" />
                  Prueba A (64 bytes hexadecimales)
                </Label>
                <Input
                  id="proofA"
                  value={proofA}
                  onChange={(e) => setProofA(e.target.value)}
                  placeholder="0x..."
                  className="font-mono text-xs bg-zinc-950/80 border-zinc-700 text-zinc-200"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="proofB" className="text-xs font-semibold text-zinc-300 flex items-center gap-2">
                  <Cpu className="h-3.5 w-3.5 text-purple-400" />
                  Prueba B (128 bytes hexadecimales)
                </Label>
                <Input
                  id="proofB"
                  value={proofB}
                  onChange={(e) => setProofB(e.target.value)}
                  placeholder="0x..."
                  className="font-mono text-xs bg-zinc-950/80 border-zinc-700 text-zinc-200"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="proofC" className="text-xs font-semibold text-zinc-300 flex items-center gap-2">
                  <Cpu className="h-3.5 w-3.5 text-emerald-400" />
                  Prueba C (64 bytes hexadecimales)
                </Label>
                <Input
                  id="proofC"
                  value={proofC}
                  onChange={(e) => setProofC(e.target.value)}
                  placeholder="0x..."
                  className="font-mono text-xs bg-zinc-950/80 border-zinc-700 text-zinc-200"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pubSignals" className="text-xs font-semibold text-zinc-300 flex items-center gap-2">
                  <FileJson className="h-3.5 w-3.5 text-amber-400" />
                  Señales públicas (números separados por comas)
                </Label>
                <Input
                  id="pubSignals"
                  value={pubSignals}
                  onChange={(e) => setPubSignals(e.target.value)}
                  placeholder="12345,63000000,..."
                  className="font-mono text-xs bg-zinc-950/80 border-zinc-700 text-zinc-200"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                type="submit"
                disabled={loading || exampleLoading || !proofA || !proofB || !proofC}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Verificar prueba
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" onClick={fillExample} disabled={loading || exampleLoading} className="border-zinc-700 text-zinc-300 hover:text-white">
                {exampleLoading ? "Generando ejemplo..." : "Generar ejemplo"}
              </Button>
            </div>
          </form>
        </div>

        {result && (
          <div className={`rounded-xl border p-6 relative overflow-hidden shadow-2xl ${result.valid ? "border-emerald-500/30 bg-emerald-950/15" : "border-red-500/20 bg-red-950/20"}`}>
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex items-start gap-3">
                <div className={`rounded-full p-2.5 shrink-0 ${result.valid ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                  {result.valid ? <ShieldCheck className="h-7 w-7" /> : <ShieldAlert className="h-7 w-7" />}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white leading-tight">
                      {result.valid ? "Prueba válida" : "Prueba rechazada"}
                    </h2>
                    <Badge className={`text-[9px] font-bold py-0.5 px-2 ${result.valid ? "bg-emerald-500 text-black" : "bg-red-500 text-white"}`}>
                      {result.valid ? "VÁLIDA" : "INVÁLIDA"}
                    </Badge>
                  </div>
                  <p className="text-xs text-zinc-300">
                    {result.isSimulated
                      ? "La prueba se verificó localmente. No se registró una transacción en Stellar."
                      : `La verificación se realizó mediante el contrato configurado en ${result.network}.`}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copyContractId} className="h-8 text-xs border-zinc-700 bg-zinc-950 text-zinc-300 hover:text-white">
                  {copied ? <Check className="h-3 w-3 mr-1.5 text-emerald-400" /> : <Copy className="h-3 w-3 mr-1.5" />}
                  Copiar ID del contrato
                </Button>
                <Button variant="outline" size="sm" asChild className="h-8 text-xs border-indigo-500/20 bg-indigo-950/20 text-indigo-400 hover:bg-indigo-950/40">
                  <a
                    href={`https://stellar.expert/explorer/testnet/contract/${result.contractId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Stellar Explorer
                    <ExternalLink className="h-3 w-3 ml-1.5" />
                  </a>
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-zinc-800/40 text-xs">
              <div className="space-y-1">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">ID del contrato</p>
                <p className="font-mono text-zinc-300 truncate select-all" title={result.contractId}>
                  {result.contractId}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Red</p>
                <p className="font-mono text-zinc-300">{result.network}</p>
              </div>
              {result.error && (
                <div className="col-span-1 md:col-span-2 space-y-1">
                  <p className="text-[10px] text-red-400 uppercase tracking-wider">Detalle del error</p>
                  <p className="font-mono text-zinc-400 bg-black/30 p-2 rounded">{result.error}</p>
                </div>
              )}
              {result.rawResult && (
                <div className="col-span-1 md:col-span-2 space-y-1">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Resultado original</p>
                  <p className="font-mono text-zinc-400 bg-black/30 p-2 rounded break-all">{result.rawResult}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default function StellarAuditoriaPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-zinc-400">
        <Loader2 className="h-8 w-8 animate-spin mr-3" />
        Cargando auditoría...
      </div>
    }>
      <AuditoriaContent />
    </Suspense>
  )
}
