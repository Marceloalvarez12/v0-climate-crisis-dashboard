"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Mic, MicOff, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useVoiceControlEnabled } from "@/hooks/use-voice-control-enabled"

interface VoiceFabProps {
  onCommand?: (command: string) => void
}

/**
 * FAB de control por voz. Sólo monta la UI si el admin activó el flag en /admin.
 * El WebSocket con OpenAI Realtime se inicializa sólo cuando el operador presiona.
 * Mientras el flag está off, este componente retorna null → cero costo runtime.
 */
export function VoiceFab({ onCommand }: VoiceFabProps) {
  const { enabled } = useVoiceControlEnabled()
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<unknown>(null)

  useEffect(() => {
    if (!enabled || !isListening) return
    if (typeof window === "undefined") return
    const SR = (
      window as unknown as {
        SpeechRecognition?: new () => SpeechRecognitionLike
        webkitSpeechRecognition?: new () => SpeechRecognitionLike
      }
    ).SpeechRecognition ??
      (
        window as unknown as {
          webkitSpeechRecognition?: new () => SpeechRecognitionLike
        }
      ).webkitSpeechRecognition

    if (!SR) {
      setError("Reconocimiento de voz no soportado en este navegador")
      setIsListening(false)
      return
    }

    const recognition = new SR()
    recognition.lang = "es-AR"
    recognition.continuous = false
    recognition.interimResults = true

    recognition.onresult = (event: { results: ArrayLike<{ 0: { transcript: string }; isFinal?: boolean }> }) => {
      const last = event.results[event.results.length - 1]
      if (last) setTranscript(last[0].transcript)
    }
    recognition.onerror = (e: { error?: string }) => {
      setError(e.error ?? "Error de reconocimiento")
      setIsListening(false)
    }
    recognition.onend = () => {
      setIsListening(false)
      if (transcript && onCommand) onCommand(transcript)
      setTranscript("")
    }

    recognitionRef.current = recognition
    recognition.start()

    return () => {
      try {
        recognition.stop()
      } catch {
        // ignore
      }
    }
  }, [enabled, isListening, transcript, onCommand])

  const handleToggle = useCallback(() => {
    if (isListening) {
      const rec = recognitionRef.current as { stop?: () => void } | null
      try {
        rec?.stop?.()
      } catch {
        // ignore
      }
      setIsListening(false)
      return
    }
    setError(null)
    setTranscript("")
    setIsListening(true)
  }, [isListening])

  if (!enabled) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {isListening && (
        <div className="flex max-w-xs items-start gap-2 rounded-lg border border-cyan-500/30 bg-zinc-950/95 px-3 py-2 backdrop-blur-sm">
          <Mic className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-pulse text-cyan-400" />
          <div className="flex-1 text-xs">
            <p className="text-cyan-300">
              {transcript || "Escuchando..."}
            </p>
            {error && (
              <p className="mt-1 text-[10px] text-red-400">{error}</p>
            )}
          </div>
          <button
            onClick={() => setIsListening(false)}
            className="text-zinc-500 hover:text-foreground"
            aria-label="Cerrar"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
      <button
        onClick={handleToggle}
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-full border-2 shadow-lg transition-all",
          isListening
            ? "border-cyan-400 bg-cyan-500/20 text-cyan-300 animate-pulse"
            : "border-cyan-500/30 bg-zinc-900/90 text-cyan-400 hover:scale-105 hover:border-cyan-400/60",
        )}
        title="Comando por voz (experimental)"
        aria-label={isListening ? "Detener escucha" : "Iniciar escucha"}
      >
        {isListening ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
      </button>
    </div>
  )
}

interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: { results: ArrayLike<{ 0: { transcript: string }; isFinal?: boolean }> }) => void) | null
  onerror: ((e: { error?: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}
