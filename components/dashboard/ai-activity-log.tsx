"use client"

import { useEffect, useState } from "react"
import { Bot, Search, MapPin, AlertTriangle, Database, Radio, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ActivityItem {
  id: string
  type: "extraction" | "analysis" | "alert" | "database" | "monitoring" | "complete"
  message: string
  timestamp: Date
  isNew?: boolean
}

const initialActivities: ActivityItem[] = [
  { id: "1", type: "monitoring", message: "Sistema de monitoreo iniciado", timestamp: new Date(Date.now() - 300000) },
  { id: "2", type: "extraction", message: "Extrayendo datos de X (Twitter)...", timestamp: new Date(Date.now() - 240000) },
  { id: "3", type: "analysis", message: "Analizando menciones de inundaciones en Salta", timestamp: new Date(Date.now() - 180000) },
  { id: "4", type: "database", message: "Guardando 47 reportes en base de datos", timestamp: new Date(Date.now() - 120000) },
  { id: "5", type: "alert", message: "Identificando zona de riesgo en Tucuman", timestamp: new Date(Date.now() - 60000) },
  { id: "6", type: "complete", message: "Coordenadas enviadas a equipos de rescate", timestamp: new Date(Date.now() - 30000) },
]

const newMessages = [
  { type: "extraction" as const, message: "Extrayendo datos de redes sociales..." },
  { type: "analysis" as const, message: "Procesando imagenes satelitales..." },
  { type: "alert" as const, message: "Nuevo incidente detectado en Cordoba" },
  { type: "database" as const, message: "Actualizando base de datos de recursos" },
  { type: "monitoring" as const, message: "Escaneando noticias locales..." },
  { type: "complete" as const, message: "Alerta enviada a autoridades locales" },
]

const getIcon = (type: ActivityItem["type"]) => {
  switch (type) {
    case "extraction":
      return <Search className="h-3.5 w-3.5" />
    case "analysis":
      return <Bot className="h-3.5 w-3.5" />
    case "alert":
      return <AlertTriangle className="h-3.5 w-3.5" />
    case "database":
      return <Database className="h-3.5 w-3.5" />
    case "monitoring":
      return <Radio className="h-3.5 w-3.5" />
    case "complete":
      return <CheckCircle2 className="h-3.5 w-3.5" />
  }
}

const getIconColor = (type: ActivityItem["type"]) => {
  switch (type) {
    case "extraction":
      return "text-blue-400"
    case "analysis":
      return "text-accent"
    case "alert":
      return "text-primary"
    case "database":
      return "text-muted-foreground"
    case "monitoring":
      return "text-accent"
    case "complete":
      return "text-success"
  }
}

export function AIActivityLog() {
  const [activities, setActivities] = useState<ActivityItem[]>(initialActivities)

  useEffect(() => {
    const interval = setInterval(() => {
      const randomMessage = newMessages[Math.floor(Math.random() * newMessages.length)]
      const newActivity: ActivityItem = {
        id: Date.now().toString(),
        type: randomMessage.type,
        message: randomMessage.message,
        timestamp: new Date(),
        isNew: true,
      }
      setActivities(prev => [...prev.slice(-15), newActivity])
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  }

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <div className="relative">
          <div className="h-2 w-2 rounded-full bg-success" />
          <div className="absolute inset-0 h-2 w-2 rounded-full bg-success animate-pulse-ring" />
        </div>
        <h2 className="text-sm font-semibold text-foreground">Agente de IA en Vivo</h2>
      </div>
      <ScrollArea className="flex-1 px-3 py-2">
        <div className="space-y-2">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className={cn(
                "flex items-start gap-2 rounded-md p-2 transition-colors",
                activity.isNew ? "bg-secondary/50 animate-in fade-in slide-in-from-top-2 duration-300" : "bg-transparent"
              )}
            >
              <div className={cn("mt-0.5 shrink-0", getIconColor(activity.type))}>
                {getIcon(activity.type)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-foreground leading-relaxed">{activity.message}</p>
                <p className="mt-0.5 text-[10px] font-mono text-muted-foreground">
                  {formatTime(activity.timestamp)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
