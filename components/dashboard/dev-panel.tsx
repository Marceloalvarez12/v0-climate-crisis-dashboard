"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { Bot, Zap, CheckCircle2, AlertTriangle, X, Terminal, Cpu, Database } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface AgentResult {
  success: boolean
  message: string
  incidente?: {
    id: string
    tipo: string
    severidad: string
    ubicacion: string
    personas_afectadas: number
    confianza: number
  }
  reporte_original?: string
  error?: string
}

export function DevPanel() {
  const searchParams = useSearchParams()
  const isDev = searchParams.get("dev") === "true"
  
  const [isOpen, setIsOpen] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<AgentResult | null>(null)
  const [executionCount, setExecutionCount] = useState(0)

  if (!isDev) return null

  const executeAgentCycle = async () => {
    setIsLoading(true)
    setResult(null)
    
    try {
      const response = await fetch("/api/cron/agente-autonomo", {
        method: "POST"
      })
      
      const data = await response.json()
      setResult(data)
      
      if (data.success) {
        setExecutionCount(prev => prev + 1)
      }
    } catch (error) {
      setResult({
        success: false,
        message: "Error de conexión",
        error: error instanceof Error ? error.message : "Error desconocido"
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 z-[9000] flex h-12 w-12 items-center justify-center rounded-full border border-cyan-500/50 bg-black/90 text-cyan-400 shadow-lg shadow-cyan-500/20 backdrop-blur-sm transition-all hover:border-cyan-400 hover:shadow-cyan-500/40"
      >
        <Terminal className="h-5 w-5" />
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 left-4 z-[9000] w-80 rounded-lg border border-cyan-500/30 bg-black/95 shadow-xl shadow-cyan-500/10 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-cyan-500/20 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Cpu className="h-4 w-4 text-cyan-400" />
            <div className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
          </div>
          <span className="text-sm font-mono font-semibold text-cyan-400">DEV_PANEL</span>
          <Badge variant="outline" className="h-5 border-cyan-500/30 bg-cyan-500/10 px-1.5 text-[9px] font-mono text-cyan-400">
            v1.0
          </Badge>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between rounded-md border border-cyan-500/20 bg-cyan-500/5 px-3 py-2">
          <div className="flex items-center gap-2">
            <Database className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-xs font-mono text-cyan-300">Supabase</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] font-mono text-green-400">CONNECTED</span>
          </div>
        </div>

        {/* Execute Button */}
        <Button
          onClick={executeAgentCycle}
          disabled={isLoading}
          className={cn(
            "w-full font-mono transition-all",
            isLoading 
              ? "border-yellow-500/50 bg-yellow-500/10 text-yellow-400"
              : "border-cyan-500/50 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-400"
          )}
          variant="outline"
        >
          {isLoading ? (
            <>
              <Bot className="mr-2 h-4 w-4 animate-pulse" />
              <span className="animate-pulse">Agente procesando...</span>
            </>
          ) : (
            <>
              <Zap className="mr-2 h-4 w-4" />
              Ejecutar Ciclo de Agente
            </>
          )}
        </Button>

        {/* Loading Animation */}
        {isLoading && (
          <div className="space-y-2 rounded-md border border-yellow-500/20 bg-yellow-500/5 p-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-yellow-400 animate-ping" />
              <span className="text-xs font-mono text-yellow-400">Extrayendo datos de X...</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-yellow-400 animate-ping" style={{ animationDelay: "0.2s" }} />
              <span className="text-xs font-mono text-yellow-400/70">Analizando con NLP...</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-yellow-400 animate-ping" style={{ animationDelay: "0.4s" }} />
              <span className="text-xs font-mono text-yellow-400/50">Geolocalizando incidente...</span>
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className={cn(
            "space-y-2 rounded-md border p-3",
            result.success 
              ? "border-green-500/30 bg-green-500/5" 
              : "border-red-500/30 bg-red-500/5"
          )}>
            <div className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle2 className="h-4 w-4 text-green-400" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-400" />
              )}
              <span className={cn(
                "text-xs font-mono font-semibold",
                result.success ? "text-green-400" : "text-red-400"
              )}>
                {result.success ? "CICLO COMPLETADO" : "ERROR"}
              </span>
            </div>
            
            {result.success && result.incidente && (
              <div className="space-y-1.5 pt-1">
                <div className="text-[10px] font-mono text-muted-foreground">
                  <span className="text-foreground">Tipo:</span> {result.incidente.tipo}
                </div>
                <div className="text-[10px] font-mono text-muted-foreground">
                  <span className="text-foreground">Severidad:</span>{" "}
                  <span className={cn(
                    result.incidente.severidad === "critical" ? "text-red-400" :
                    result.incidente.severidad === "high" ? "text-orange-400" :
                    "text-yellow-400"
                  )}>
                    {result.incidente.severidad.toUpperCase()}
                  </span>
                </div>
                <div className="text-[10px] font-mono text-muted-foreground">
                  <span className="text-foreground">Ubicación:</span> {result.incidente.ubicacion}
                </div>
                <div className="text-[10px] font-mono text-muted-foreground">
                  <span className="text-foreground">Afectados:</span> {result.incidente.personas_afectadas}
                </div>
                <div className="text-[10px] font-mono text-muted-foreground">
                  <span className="text-foreground">Confianza:</span> {result.incidente.confianza}%
                </div>
              </div>
            )}
            
            {result.error && (
              <p className="text-[10px] font-mono text-red-400">{result.error}</p>
            )}
          </div>
        )}

        {/* Execution Counter */}
        <div className="flex items-center justify-between border-t border-cyan-500/10 pt-3">
          <span className="text-[10px] font-mono text-muted-foreground">
            Ciclos ejecutados: <span className="text-cyan-400">{executionCount}</span>
          </span>
          <span className="text-[10px] font-mono text-muted-foreground">
            ?dev=true
          </span>
        </div>
      </div>
    </div>
  )
}
