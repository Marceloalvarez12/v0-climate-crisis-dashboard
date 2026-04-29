"use client"

import { useEffect, useState } from "react"
import { Bot, Search, MapPin, AlertTriangle, Database, Radio, CheckCircle2, Rocket, Bell, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"

interface ActivityItem {
  id: string
  type: "extraction" | "analysis" | "alert" | "database" | "monitoring" | "complete"
  message: string
  timestamp: Date
  isNew?: boolean
  actionable?: boolean
  location?: string
  severity?: "critical" | "high" | "medium" | "low"
}

const initialActivities: ActivityItem[] = [
  { id: "1", type: "monitoring", message: "Sistema de monitoreo iniciado", timestamp: new Date(Date.now() - 300000) },
  { id: "2", type: "extraction", message: "Extrayendo datos de X (Twitter)...", timestamp: new Date(Date.now() - 240000) },
  { id: "3", type: "analysis", message: "Analizando menciones de inundaciones en Salta", timestamp: new Date(Date.now() - 180000) },
  { id: "4", type: "database", message: "Guardando 47 reportes en base de datos", timestamp: new Date(Date.now() - 120000) },
  { id: "5", type: "alert", message: "Identificando zona de riesgo en Centro Historico", timestamp: new Date(Date.now() - 60000), actionable: true, location: "Centro Historico, Tucuman", severity: "critical" },
  { id: "6", type: "complete", message: "Coordenadas enviadas a equipos de rescate", timestamp: new Date(Date.now() - 30000) },
]

const newMessages = [
  { type: "extraction" as const, message: "Extrayendo datos de redes sociales..." },
  { type: "analysis" as const, message: "Procesando imagenes satelitales de zona sur..." },
  { type: "alert" as const, message: "Nuevo incidente detectado en Yerba Buena", actionable: true, location: "Yerba Buena, Tucuman", severity: "high" as const },
  { type: "database" as const, message: "Actualizando base de datos de recursos" },
  { type: "monitoring" as const, message: "Escaneando noticias locales de La Gaceta..." },
  { type: "complete" as const, message: "Alerta enviada a Defensa Civil" },
  { type: "alert" as const, message: "Alerta critica: Inundacion en San Pablo", actionable: true, location: "San Pablo, Tucuman", severity: "critical" as const },
  { type: "analysis" as const, message: "IA analizando patrones de evacuacion..." },
  { type: "extraction" as const, message: "Recopilando datos de sensores meteorologicos..." },
  { type: "alert" as const, message: "Incendio reportado en Villa 9 de Julio", actionable: true, location: "Villa 9 de Julio, Tucuman", severity: "critical" as const },
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

const getSeverityBadge = (severity?: ActivityItem["severity"]) => {
  switch (severity) {
    case "critical":
      return <Badge variant="destructive" className="text-[9px] h-4 px-1">CRITICO</Badge>
    case "high":
      return <Badge className="bg-accent text-accent-foreground text-[9px] h-4 px-1">ALTO</Badge>
    case "medium":
      return <Badge className="bg-yellow-500 text-black text-[9px] h-4 px-1">MEDIO</Badge>
    case "low":
      return <Badge variant="secondary" className="text-[9px] h-4 px-1">BAJO</Badge>
    default:
      return null
  }
}

export function AIActivityLog() {
  const [activities, setActivities] = useState<ActivityItem[]>(initialActivities)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    type: "deploy" | "notify"
    activity: ActivityItem | null
  }>({ open: false, type: "deploy", activity: null })
  const [processedAlerts, setProcessedAlerts] = useState<Set<string>>(new Set())

  useEffect(() => {
    const interval = setInterval(() => {
      const randomMessage = newMessages[Math.floor(Math.random() * newMessages.length)]
      const newActivity: ActivityItem = {
        id: Date.now().toString(),
        type: randomMessage.type,
        message: randomMessage.message,
        timestamp: new Date(),
        isNew: true,
        actionable: randomMessage.actionable,
        location: randomMessage.location,
        severity: randomMessage.severity,
      }
      setActivities(prev => [...prev.slice(-15), newActivity])
    }, 4000)

    return () => clearInterval(interval)
  }, [])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  }

  const handleDeployResources = (activity: ActivityItem) => {
    setConfirmDialog({ open: true, type: "deploy", activity })
  }

  const handleNotifyAuthorities = (activity: ActivityItem) => {
    setConfirmDialog({ open: true, type: "notify", activity })
  }

  const confirmAction = () => {
    if (!confirmDialog.activity) return

    const activityId = confirmDialog.activity.id
    setProcessedAlerts(prev => new Set(prev).add(activityId))

    if (confirmDialog.type === "deploy") {
      toast.success("Recursos desplegados", {
        description: `Unidades de emergencia enviadas a ${confirmDialog.activity.location}`,
      })
      
      // Add completion activity
      const completeActivity: ActivityItem = {
        id: Date.now().toString(),
        type: "complete",
        message: `Recursos desplegados a ${confirmDialog.activity.location}`,
        timestamp: new Date(),
        isNew: true,
      }
      setActivities(prev => [...prev, completeActivity])
    } else {
      toast.success("Autoridades notificadas", {
        description: `Defensa Civil y Bomberos alertados sobre ${confirmDialog.activity.location}`,
      })
      
      // Add completion activity
      const completeActivity: ActivityItem = {
        id: Date.now().toString(),
        type: "complete",
        message: `Autoridades notificadas sobre incidente en ${confirmDialog.activity.location}`,
        timestamp: new Date(),
        isNew: true,
      }
      setActivities(prev => [...prev, completeActivity])
    }

    setConfirmDialog({ open: false, type: "deploy", activity: null })
  }

  const dismissAlert = (activityId: string) => {
    setProcessedAlerts(prev => new Set(prev).add(activityId))
  }

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <div className="relative">
          <div className="h-2 w-2 rounded-full bg-success" />
          <div className="absolute inset-0 h-2 w-2 rounded-full bg-success animate-pulse-ring" />
        </div>
        <h2 className="text-sm font-semibold text-foreground">Agente de IA en Vivo</h2>
        <Badge variant="outline" className="ml-auto text-[10px] border-success/50 text-success">
          Activo
        </Badge>
      </div>
      <ScrollArea className="flex-1 px-2 py-2">
        <div className="space-y-2">
          {activities.map((activity) => {
            const isProcessed = processedAlerts.has(activity.id)
            const showActions = activity.actionable && activity.type === "alert" && !isProcessed

            return (
              <div
                key={activity.id}
                className={cn(
                  "rounded-md p-2.5 transition-colors",
                  activity.isNew ? "bg-secondary/50 animate-in fade-in slide-in-from-top-2 duration-300" : "bg-transparent",
                  showActions && "border border-primary/30 bg-primary/5"
                )}
              >
                <div className="flex items-start gap-2">
                  <div className={cn("mt-0.5 shrink-0", getIconColor(activity.type))}>
                    {getIcon(activity.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-xs text-foreground leading-relaxed">{activity.message}</p>
                      {activity.severity && getSeverityBadge(activity.severity)}
                    </div>
                    <p className="mt-0.5 text-[10px] font-mono text-muted-foreground">
                      {formatTime(activity.timestamp)}
                    </p>
                    
                    {/* Action Buttons for Alerts */}
                    {showActions && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <Button
                          size="sm"
                          variant="default"
                          className="h-6 text-[10px] px-2 gap-1"
                          onClick={() => handleDeployResources(activity)}
                        >
                          <Rocket className="h-3 w-3" />
                          Desplegar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[10px] px-2 gap-1"
                          onClick={() => handleNotifyAuthorities(activity)}
                        >
                          <Bell className="h-3 w-3" />
                          Notificar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 ml-auto"
                          onClick={() => dismissAlert(activity.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    
                    {isProcessed && activity.actionable && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <CheckCircle2 className="h-3 w-3 text-success" />
                        <span className="text-[10px] text-success">Accion tomada</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </ScrollArea>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {confirmDialog.type === "deploy" ? (
                <>
                  <Rocket className="h-5 w-5 text-primary" />
                  Confirmar Despliegue de Recursos
                </>
              ) : (
                <>
                  <Bell className="h-5 w-5 text-accent" />
                  Confirmar Notificacion a Autoridades
                </>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              {confirmDialog.type === "deploy" ? (
                <>
                  <p>Esta a punto de desplegar unidades de emergencia a:</p>
                  <p className="font-semibold text-foreground">{confirmDialog.activity?.location}</p>
                  <p className="text-xs">Se notificara a las unidades mas cercanas disponibles (ambulancias, bomberos, rescate).</p>
                </>
              ) : (
                <>
                  <p>Esta a punto de notificar a las siguientes autoridades:</p>
                  <ul className="text-sm space-y-1 mt-2">
                    <li>- Defensa Civil de Tucuman</li>
                    <li>- Cuerpo de Bomberos</li>
                    <li>- Policia de Tucuman</li>
                    <li>- Sistema de Emergencias 911</li>
                  </ul>
                  <p className="font-semibold text-foreground mt-2">Ubicacion: {confirmDialog.activity?.location}</p>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAction}>
              {confirmDialog.type === "deploy" ? "Confirmar Despliegue" : "Confirmar Notificacion"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
