"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { 
  MessageCircle, 
  FileText, 
  Radio, 
  Send, 
  Loader2, 
  CheckCircle2,
  Smartphone,
  Mail,
  Megaphone,
  RefreshCw
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface BroadcastChannel {
  id: string
  name: string
  icon: React.ReactNode
  status: "ready" | "sending" | "sent"
  recipients: number
  description: string
}

const defaultMessage = `ALERTA DE EMERGENCIA - Defensa Civil Tucuman

Se informa a la poblacion de las zonas Centro Historico, San Pablo y Barrio Sur:

- Inundaciones activas en la zona
- Evacuacion preventiva recomendada
- Evitar transitar por Av. Roca y calles aledanas

Puntos de encuentro:
- Estadio Monumental (Yerba Buena)
- Plaza Urquiza (Centro)

Linea de emergencias: 103
Mas info: @DefensaCivilTuc`

export function BroadcastPanel() {
  const [channels, setChannels] = useState<BroadcastChannel[]>([
    { 
      id: "whatsapp", 
      name: "WhatsApp Broadcast", 
      icon: <MessageCircle className="h-4 w-4" />, 
      status: "ready", 
      recipients: 12500,
      description: "Grupos de vecinos y canales oficiales"
    },
    { 
      id: "sms", 
      name: "SMS Masivo", 
      icon: <Smartphone className="h-4 w-4" />, 
      status: "ready", 
      recipients: 45000,
      description: "Base de datos de emergencias provincial"
    },
    { 
      id: "email", 
      name: "Email Autoridades", 
      icon: <Mail className="h-4 w-4" />, 
      status: "ready", 
      recipients: 340,
      description: "Funcionarios, hospitales, escuelas"
    },
    { 
      id: "radio", 
      name: "Radio Provincial", 
      icon: <Radio className="h-4 w-4" />, 
      status: "ready", 
      recipients: 0,
      description: "Transmision en vivo LV12 y FM Tucuman"
    },
  ])

  const [showPdfDialog, setShowPdfDialog] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [message, setMessage] = useState(defaultMessage)
  const [showMessageDialog, setShowMessageDialog] = useState(false)
  const [selectedChannel, setSelectedChannel] = useState<BroadcastChannel | null>(null)

  const handleSendToChannel = (channel: BroadcastChannel) => {
    setSelectedChannel(channel)
    setShowMessageDialog(true)
  }

  const confirmSend = async () => {
    if (!selectedChannel) return

    setChannels(prev => prev.map(ch => 
      ch.id === selectedChannel.id ? { ...ch, status: "sending" as const } : ch
    ))
    setShowMessageDialog(false)

    // Simular envio
    await new Promise(resolve => setTimeout(resolve, 2000))

    setChannels(prev => prev.map(ch => 
      ch.id === selectedChannel.id ? { ...ch, status: "sent" as const } : ch
    ))

    toast.success(`Mensaje enviado via ${selectedChannel.name}`, {
      description: selectedChannel.recipients > 0 
        ? `${selectedChannel.recipients.toLocaleString()} destinatarios alcanzados`
        : "Transmision en vivo iniciada",
    })

    // Reset after 5 seconds
    setTimeout(() => {
      setChannels(prev => prev.map(ch => 
        ch.id === selectedChannel.id ? { ...ch, status: "ready" as const } : ch
      ))
    }, 5000)

    setSelectedChannel(null)
  }

  const handleGeneratePdf = async () => {
    setGeneratingPdf(true)
    setShowPdfDialog(true)

    // Simular generacion de PDF
    await new Promise(resolve => setTimeout(resolve, 2500))
    
    setGeneratingPdf(false)
  }

  const handleDownloadPdf = () => {
    toast.success("Reporte PDF descargado", {
      description: "Reporte_Emergencia_Tucuman_2026.pdf",
    })
    setShowPdfDialog(false)
  }

  const handleRefreshMap = () => {
    toast.success("Mapa de calor actualizado", {
      description: "Nuevos datos de sensores integrados",
    })
  }

  return (
    <>
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-accent" />
            Canales de Difusion
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Broadcast Channels */}
          {channels.map((channel) => (
            <div
              key={channel.id}
              className={cn(
                "flex items-center gap-3 p-2.5 rounded-lg border transition-all",
                channel.status === "sent" 
                  ? "border-green-500/30 bg-green-500/5" 
                  : "border-border/50 bg-background/50"
              )}
            >
              <div className={cn(
                "p-2 rounded-full",
                channel.status === "sent" ? "bg-green-500/20 text-green-400" :
                channel.status === "sending" ? "bg-accent/20 text-accent" :
                "bg-muted text-muted-foreground"
              )}>
                {channel.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium truncate">{channel.name}</span>
                  {channel.recipients > 0 && (
                    <Badge variant="outline" className="text-[9px] h-4 px-1">
                      {channel.recipients.toLocaleString()}
                    </Badge>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground truncate">{channel.description}</p>
              </div>
              <Button
                size="sm"
                variant={channel.status === "sent" ? "outline" : "default"}
                className="h-7 text-[10px] px-2"
                onClick={() => handleSendToChannel(channel)}
                disabled={channel.status === "sending"}
              >
                {channel.status === "sending" ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : channel.status === "sent" ? (
                  <>
                    <CheckCircle2 className="h-3 w-3 mr-1 text-green-400" />
                    Enviado
                  </>
                ) : (
                  <>
                    <Send className="h-3 w-3 mr-1" />
                    Enviar
                  </>
                )}
              </Button>
            </div>
          ))}

          {/* Quick Actions */}
          <div className="pt-2 border-t border-border/50 space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs justify-start gap-2"
              onClick={handleGeneratePdf}
            >
              <FileText className="h-3.5 w-3.5 text-red-400" />
              Generar Reporte PDF para Autoridades
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs justify-start gap-2"
              onClick={handleRefreshMap}
            >
              <RefreshCw className="h-3.5 w-3.5 text-blue-400" />
              Actualizar Mapa de Calor
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Message Dialog */}
      <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
        <DialogContent className="max-w-md z-[9999]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedChannel?.icon}
              Enviar via {selectedChannel?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedChannel?.recipients && selectedChannel.recipients > 0 
                ? `Este mensaje llegara a ${selectedChannel.recipients.toLocaleString()} destinatarios.`
                : "Este mensaje se transmitira en vivo."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[200px] text-xs font-mono"
              placeholder="Escribe el mensaje de alerta..."
            />
            <p className="text-[10px] text-muted-foreground">
              Mensaje generado automaticamente por el Agente IA. Puedes editarlo antes de enviar.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMessageDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmSend} className="gap-1">
              <Send className="h-4 w-4" />
              Confirmar Envio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PDF Dialog */}
      <Dialog open={showPdfDialog} onOpenChange={setShowPdfDialog}>
        <DialogContent className="max-w-sm z-[9999]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-red-400" />
              Reporte de Emergencia
            </DialogTitle>
          </DialogHeader>
          
          {generatingPdf ? (
            <div className="py-8 flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Generando reporte PDF...</p>
              <p className="text-xs text-muted-foreground">Compilando datos de 10 incidentes activos</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs font-medium">Reporte_Emergencia_Tucuman_2026.pdf</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Incluye: Mapa de incidentes, recursos desplegados, timeline de eventos, estadisticas y recomendaciones del Agente IA.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowPdfDialog(false)}>
                  Cancelar
                </Button>
                <Button className="flex-1 gap-1" onClick={handleDownloadPdf}>
                  <FileText className="h-4 w-4" />
                  Descargar PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
