"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Sparkles,
  Send,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  X,
  Megaphone,
  Smartphone,
  Mail,
  Radio,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"

export type ChannelType = "sms" | "whatsapp" | "email" | "radio"

interface BroadcastAgentModalProps {
  isOpen: boolean
  onClose: () => void
  channelType: ChannelType
  recipients: number
}

type Phase = "generating" | "draft" | "success"

const LOADING_MESSAGES = [
  "Analizando incidentes críticos...",
  "Extrayendo zonas afectadas...",
  "Redactando alerta poblacional...",
  "Validando canales de difusión...",
]

const MOCK_MESSAGES: Record<ChannelType, string> = {
  sms: "⚠️ ZNTINEL ALERTA: Inundación severa en Canal Norte. Se solicita evacuación inmediata hacia zonas altas. Equipos de rescate en camino. Evite Av. Ejército del Norte.",
  whatsapp: "🚨 *ZNTINEL - ALERTA EMERGENCIA*\n\n⚠️ *Inundación severa detectada*\n📍 Zona afectada: Canal Norte, San Pablo\n\n🔴 Se solicita *evacuación inmediata* hacia zonas altas.\n\n🚑 Equipos de rescate en camino.\n🚫 Evite Av. Ejército del Norte y alrededores.\n\n📍 Puntos de encuentro:\n• Estadio Monumental (Yerba Buena)\n• Plaza Urquiza (Centro)\n\n📞 Línea de emergencia: 103\nℹ️ Más info: @DefensaCivilTuc",
  email: "ASUNTO: ALERTA CRÍTICA - Inundación severa en zona Canal Norte\n\nEstimados,\n\nSe ha detectado una inundación de severidad CRÍTICA en la zona de Canal Norte, San Miguel de Tucumán.\n\nACCIONES REQUERIDAS:\n- Activar protocolos de evacuación\n- Habilitar puntos de encuentro\n- Coordinar con equipos de rescate\n\nZONAS AFECTADAS:\n- Canal Norte\n- San Pablo\n- Barrio Sur\n\nPUNTOS DE ENCUENTRO:\n- Estadio Monumental (Yerba Buena)\n- Plaza Urquiza (Centro)\n\nLínea de emergencia: 103\n\n--\nSistema ZNTINEL // Gestión de Crisis Automatizada",
  radio: "ATENCIÓN - ATENCIÓN\n\nSe transmite alerta oficial de Defensa Civil Tucumán.\n\nInundación severa en zona Canal Norte.\nSe solicita a la población evacuar inmediatamente hacia zonas altas.\n\nEquipos de rescate ya se encuentran en la zona.\nEvite circular por Avenida Ejército del Norte.\n\nPuntos de encuentro habilitados:\nEstadio Monumental en Yerba Buena.\nPlaza Urquiza en el centro.\n\nLínea de emergencias: 103.\n\nEsta es una transmisión oficial de ZNTINEL.",
}

const CHANNEL_CONFIG: Record<ChannelType, { title: string; icon: React.ReactNode; maxChars: number | null; urgencyLabel: string }> = {
  sms: {
    title: "Difusión por SMS Masivo",
    icon: <Smartphone className="h-5 w-5" />,
    maxChars: 160,
    urgencyLabel: "CRÍTICO",
  },
  whatsapp: {
    title: "Alerta de WhatsApp",
    icon: <MessageSquare className="h-5 w-5" />,
    maxChars: null,
    urgencyLabel: "CRÍTICO",
  },
  email: {
    title: "Email a Autoridades",
    icon: <Mail className="h-5 w-5" />,
    maxChars: null,
    urgencyLabel: "ALTO",
  },
  radio: {
    title: "Transmisión Radial",
    icon: <Radio className="h-5 w-5" />,
    maxChars: null,
    urgencyLabel: "CRÍTICO",
  },
}

export function BroadcastAgentModal({ isOpen, onClose, channelType, recipients }: BroadcastAgentModalProps) {
  const [phase, setPhase] = useState<Phase>("generating")
  const [loadingIndex, setLoadingIndex] = useState(0)
  const [message, setMessage] = useState("")
  const [isTransmitting, setIsTransmitting] = useState(false)

  const resetState = useCallback(() => {
    setPhase("generating")
    setLoadingIndex(0)
    setMessage("")
    setIsTransmitting(false)
  }, [])

  useEffect(() => {
    if (isOpen) {
      resetState()
      setMessage(MOCK_MESSAGES[channelType])
    }
  }, [isOpen, channelType, resetState])

  useEffect(() => {
    if (phase !== "generating") return

    const interval = setInterval(() => {
      setLoadingIndex((prev) => (prev + 1) % LOADING_MESSAGES.length)
    }, 1000)

    return () => clearInterval(interval)
  }, [phase])

  useEffect(() => {
    if (phase !== "generating") return

    const timer = setTimeout(() => {
      setPhase("draft")
    }, 3000)

    return () => clearTimeout(timer)
  }, [phase])

  const handleRewrite = () => {
    setPhase("generating")
    setLoadingIndex(0)
  }

  const handleTransmit = async () => {
    setIsTransmitting(true)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setIsTransmitting(false)
    setPhase("success")

    setTimeout(() => {
      onClose()
    }, 2000)
  }

  const handleClose = () => {
    if (isTransmitting) return
    resetState()
    onClose()
  }

  if (!isOpen) return null

  const config = CHANNEL_CONFIG[channelType]
  const charCount = message.length
  const charLimit = config.maxChars
  const charColor = charLimit && charCount > charLimit ? "text-red-400" : charLimit && charCount > charLimit * 0.9 ? "text-yellow-400" : "text-zinc-500"

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative z-10 w-full max-w-2xl mx-4 rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/50 overflow-hidden">
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800/50 text-zinc-300">
              {config.icon}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">{config.title}</h2>
              <p className="text-[10px] text-zinc-500 font-mono tracking-wider">
                {recipients > 0 ? `${recipients.toLocaleString()} DESTINATARIOS` : "TRANSMISIÓN EN VIVO"}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isTransmitting}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors disabled:opacity-30"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5">
          {phase === "generating" && (
            <div className="flex flex-col items-center justify-center py-16 gap-5">
              <div className="relative">
                <div className="absolute inset-0 animate-ping rounded-full bg-violet-500/20" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-violet-500/10 border border-violet-500/20">
                  <Sparkles className="h-7 w-7 text-violet-400 animate-pulse" />
                </div>
              </div>
              <div className="text-center space-y-2">
                <p className="text-sm font-medium text-zinc-300 animate-pulse">
                  {LOADING_MESSAGES[loadingIndex]}
                </p>
                <p className="text-[10px] text-zinc-600 font-mono tracking-wider">
                  AGENTE IA // PROCESANDO
                </p>
              </div>
              <div className="flex gap-1.5 mt-2">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-1 w-8 rounded-full transition-all duration-500",
                      i <= loadingIndex % 3 ? "bg-violet-500/60" : "bg-zinc-800"
                    )}
                  />
                ))}
              </div>
            </div>
          )}

          {phase === "draft" && (
            <div className="space-y-4">
              <div className="relative">
                <div className="absolute left-3 top-3 flex items-center gap-1.5 text-zinc-600">
                  <Edit3 className="h-3 w-3" />
                  <span className="text-[9px] font-mono tracking-wider uppercase">Mensaje generado por IA</span>
                </div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full min-h-[200px] mt-8 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/30 focus:ring-1 focus:ring-violet-500/10 resize-none transition-all"
                  spellCheck={false}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 px-4 py-3">
                  <p className="text-[9px] font-mono tracking-wider text-zinc-600 uppercase mb-1">Audiencia</p>
                  <p className="text-sm font-semibold text-zinc-200">
                    {recipients > 0 ? recipients.toLocaleString() : "—"}
                  </p>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 px-4 py-3">
                  <p className="text-[9px] font-mono tracking-wider text-zinc-600 uppercase mb-1">Urgencia</p>
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                    <p className="text-sm font-semibold text-red-400">{config.urgencyLabel}</p>
                  </div>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 px-4 py-3">
                  <p className="text-[9px] font-mono tracking-wider text-zinc-600 uppercase mb-1">Caracteres</p>
                  <p className={cn("text-sm font-semibold font-mono", charColor)}>
                    {charCount}{charLimit ? ` / ${charLimit}` : ""}
                  </p>
                </div>
              </div>
            </div>
          )}

          {phase === "success" && (
            <div className="flex flex-col items-center justify-center py-16 gap-5">
              <div className="relative">
                <div className="absolute inset-0 animate-ping rounded-full bg-emerald-500/20" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                </div>
              </div>
              <div className="text-center space-y-2">
                <p className="text-base font-semibold text-emerald-400">Transmisión Completada</p>
                <p className="text-[11px] text-zinc-500 font-mono">
                  Registrada en Auditoría // {new Date().toLocaleTimeString("es-AR")}
                </p>
              </div>
            </div>
          )}
        </div>

        {phase === "draft" && (
          <div className="flex items-center justify-between border-t border-zinc-800 px-6 py-4 bg-zinc-900/30">
            <button
              onClick={handleRewrite}
              disabled={isTransmitting}
              className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-2.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700/50 hover:text-zinc-100 transition-all disabled:opacity-30"
            >
              <Sparkles className="h-3.5 w-3.5 text-violet-400" />
              Reescribir con IA
            </button>

            <button
              onClick={handleTransmit}
              disabled={isTransmitting}
              className={cn(
                "flex items-center gap-2 rounded-lg px-6 py-2.5 text-xs font-bold tracking-wider text-white transition-all shadow-lg disabled:opacity-50",
                isTransmitting
                  ? "bg-zinc-600 cursor-wait"
                  : "bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 shadow-red-500/20 hover:shadow-red-500/30 active:scale-[0.98]"
              )}
            >
              {isTransmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Transmitiendo...
                </>
              ) : (
                <>
                  <Megaphone className="h-4 w-4" />
                  Confirmar y Transmitir
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
