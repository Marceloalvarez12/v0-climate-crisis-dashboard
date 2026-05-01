"use client"

import { useEffect, useState, useRef } from "react"
import { 
  Bot, Search, MapPin, AlertTriangle, Database, Radio, CheckCircle2, 
  Rocket, Bell, X, Brain, Sparkles, Target, Satellite, Loader2,
  ChevronDown, ChevronUp, Zap
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"

interface SatelliteValidation {
  activity: ActivityItem
  imageUrl: string
  analysisData: {
    waterDetected: boolean
    affectedAreaKm2: number
    vegetationDamage: string
    thermalAnomaly: boolean
    cloudCoverage: number
    captureTime: string
    satellite: string
    resolution: string
  }
}

interface ReasoningStep {
  step: number
  thought: string
  action?: string
  result?: string
}

interface ActivityItem {
  id: string
  type: "extraction" | "analysis" | "alert" | "database" | "monitoring" | "complete" | "reasoning"
  message: string
  timestamp: Date
  isNew?: boolean
  actionable?: boolean
  location?: string
  severity?: "critical" | "high" | "medium" | "low"
  confidence?: number
  reasoning?: ReasoningStep[]
}

// SMT bounding box for random respawn coordinates
const SMT_BOUNDS = { latMin: -26.84, latMax: -26.80, lngMin: -65.23, lngMax: -65.18 }

const RESPAWN_ZONES = [
  "Barrio Sur - Av. Mitre", "Las Talitas - Barrio Mutual", "Tafi Viejo - Zona Residencial",
  "Banda del Rio Sali - Acceso Norte", "Barrio Norte - Mercado Central",
  "Yerba Buena - Av. Aconquija", "El Manantial - Ruta Provincial 301",
  "San Pablo - Sector Industrial", "Alberdi - Barrio Obrero", "Reduccion - Zona Sur",
]
const TIPOS = ["flood", "fire", "storm", "general"] as const
const SEVERIDADES = ["critical", "high", "medium"] as const
const FUENTES = ["social", "sensor", "camera"] as const

function buildRespawnIncident(base?: { tipo?: string; fuente?: string; fuente_detalles?: Record<string, unknown> }) {
  const lat = SMT_BOUNDS.latMin + Math.random() * (SMT_BOUNDS.latMax - SMT_BOUNDS.latMin)
  const lng = SMT_BOUNDS.lngMin + Math.random() * (SMT_BOUNDS.lngMax - SMT_BOUNDS.lngMin)
  const zona = RESPAWN_ZONES[Math.floor(Math.random() * RESPAWN_ZONES.length)]
  const tipo = (base?.tipo as typeof TIPOS[number]) ?? TIPOS[Math.floor(Math.random() * TIPOS.length)]
  const severidad = SEVERIDADES[Math.floor(Math.random() * SEVERIDADES.length)]
  const fuente = (base?.fuente as typeof FUENTES[number]) ?? FUENTES[Math.floor(Math.random() * FUENTES.length)]

  const fuente_detalles: Record<string, unknown> =
    fuente === "social"
      ? { platform: "X (Twitter)", username: "@alerta_tucuman", content: `Nuevo incidente detectado en ${zona}. Ciudadanos reportando la situacion. #EmergenciaTucuman`, imageUrl: "https://images.unsplash.com/photo-1547683905-f686c993aae5?w=600" }
      : fuente === "sensor"
      ? { sensorId: `WS-${Math.floor(Math.random() * 999)}`, temperature: 20 + Math.floor(Math.random() * 10), humidity: 70 + Math.floor(Math.random() * 25), windSpeed: 20 + Math.floor(Math.random() * 60), pressure: 1005 + Math.floor(Math.random() * 15) }
      : { cameraId: `CAM-${Math.floor(Math.random() * 999)}`, cameraLocation: zona, imageUrl: "https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=600" }

  return {
    tipo, severidad,
    ubicacion: zona,
    latitud: parseFloat(lat.toFixed(6)),
    longitud: parseFloat(lng.toFixed(6)),
    personas_afectadas: 50 + Math.floor(Math.random() * 800),
    fuente, fuente_detalles,
    estado: "activo",
  }
}

// Map of alert locations to their full incident data for Supabase INSERT
// When the agent "discovers" an alert, we insert it into the DB so the map shows it live
const ALERT_INCIDENT_DATA: Record<string, {
  tipo: string; severidad: string; ubicacion: string; latitud: number; longitud: number;
  personas_afectadas: number; fuente: string; fuente_detalles: Record<string, unknown>
}> = {
  "Centro Historico, Tucuman": {
    tipo: "flood", severidad: "critical",
    ubicacion: "Centro Historico - Plaza Independencia",
    latitud: -26.8241, longitud: -65.2226,
    personas_afectadas: 1250, fuente: "social",
    fuente_detalles: {
      platform: "X (Twitter)", username: "@tucuman_alerta",
      content: "URGENTE: Inundacion severa en Plaza Independencia. El agua supera los 50cm. Vecinos atrapados en edificios. #InundacionTucuman",
      imageUrl: "https://images.unsplash.com/photo-1547683905-f686c993aae5?w=600"
    }
  },
  "Barrio San Pablo, Tucuman": {
    tipo: "flood", severidad: "critical",
    ubicacion: "Barrio San Pablo - Canal Norte",
    latitud: -26.8400, longitud: -65.2500,
    personas_afectadas: 720, fuente: "social",
    fuente_detalles: {
      platform: "X (Twitter)", username: "@rescate_tucuman",
      content: "Canal San Pablo completamente desbordado. Evacuacion de 180 familias en curso. Corte total de Av. Ejercito del Norte. #AlertaTucuman",
      imageUrl: "https://images.unsplash.com/photo-1446824505046-e43605ffb17f?w=600"
    }
  },
  "Villa 9 de Julio, Tucuman": {
    tipo: "fire", severidad: "critical",
    ubicacion: "Villa 9 de Julio - Fabrica Textil",
    latitud: -26.7950, longitud: -65.2350,
    personas_afectadas: 560, fuente: "camera",
    fuente_detalles: {
      cameraId: "CAM-V9J-023", cameraLocation: "Av. Roca y Catamarca",
      imageUrl: "https://images.unsplash.com/photo-1486551937199-baf066858de7?w=600"
    }
  },
}

const initialActivities: ActivityItem[] = [
  { id: "1", type: "monitoring", message: "Sistema de monitoreo iniciado", timestamp: new Date(Date.now() - 300000) },
  { id: "2", type: "extraction", message: "Extrayendo datos de X (Twitter)...", timestamp: new Date(Date.now() - 240000) },
  { 
    id: "3", 
    type: "reasoning", 
    message: "Analizando menciones de inundaciones en Tucuman", 
    timestamp: new Date(Date.now() - 180000),
    confidence: 92,
    reasoning: [
      { step: 1, thought: "Detectados 47 tweets con palabras clave: 'inundacion', 'agua', 'evacuacion' en San Miguel de Tucuman" },
      { step: 2, thought: "Geolocalizando tweets... 38 tienen coordenadas verificables" },
      { step: 3, thought: "Cruzando con datos historicos de zonas inundables...", action: "Consultando base de datos municipal" },
      { step: 4, thought: "Patron detectado: 89% de reportes concentrados en radio de 2km del Centro Historico", result: "ALERTA VALIDADA" },
    ]
  },
  { id: "4", type: "database", message: "Guardando 47 reportes en base de datos", timestamp: new Date(Date.now() - 120000) },
]

const newMessages: Omit<ActivityItem, "id" | "timestamp">[] = [
  { 
    type: "alert", 
    message: "Identificando zona de riesgo en Centro Historico", 
    actionable: true, 
    location: "Centro Historico, Tucuman", 
    severity: "critical",
    confidence: 94,
    reasoning: [
      { step: 1, thought: "Tweet de @tucuman_alerta reporta inundacion severa" },
      { step: 2, thought: "Verificando fuente... Usuario verificado con historial confiable (Score: 8.7/10)" },
      { step: 3, thought: "Imagen adjunta analizada con Vision AI: agua visible en calles, nivel estimado 40-60cm", action: "Procesando imagen con modelo de deteccion" },
      { step: 4, thought: "Correlacionando con sensores de lluvia cercanos: 85mm en ultima hora", result: "CONFIRMADO - Nivel de confianza 94%" },
    ]
  },
  { type: "complete", message: "Coordenadas enviadas a equipos de rescate" },
  { type: "extraction", message: "Extrayendo datos de redes sociales..." },
  { 
    type: "reasoning", 
    message: "IA analizando patrones de evacuacion...", 
    confidence: 78,
    reasoning: [
      { step: 1, thought: "Analizando flujo de trafico en tiempo real via Google Maps API" },
      { step: 2, thought: "Identificando rutas de evacuacion optimas...", action: "Calculando 3 rutas alternativas" },
      { step: 3, thought: "Ruta por Av. Mate de Luna BLOQUEADA - arboles caidos reportados" },
      { step: 4, thought: "Ruta recomendada: Av. Sarmiento -> Ruta 9 Norte", result: "Tiempo estimado evacuacion: 45 min" },
    ]
  },
  { type: "database", message: "Actualizando base de datos de recursos" },
  { type: "monitoring", message: "Escaneando noticias locales de La Gaceta..." },
  { 
    type: "alert", 
    message: "ALERTA CRITICA: Desborde detectado en Canal Norte", 
    actionable: true, 
    location: "Barrio San Pablo, Tucuman", 
    severity: "critical",
    confidence: 97,
    reasoning: [
      { step: 1, thought: "Sensor FL-CN-001 reporta nivel de agua critico: 4.2m (umbral: 3.5m)" },
      { step: 2, thought: "Confirmando con camara de seguridad CAM-SP-012...", action: "Analizando feed en vivo" },
      { step: 3, thought: "Vision AI detecta desbordamiento activo - agua ingresando a zona residencial" },
      { step: 4, thought: "Poblacion en riesgo estimada: 720 personas en radio de 500m", result: "EVACUACION INMEDIATA REQUERIDA" },
    ]
  },
  { type: "complete", message: "Alerta enviada a Defensa Civil" },
  { 
    type: "reasoning", 
    message: "Prediciendo expansion de zona afectada...", 
    confidence: 85,
    reasoning: [
      { step: 1, thought: "Modelo hidrologico cargado: TucumanFlood_v3.2" },
      { step: 2, thought: "Inputs: precipitacion actual, topografia, nivel de canales", action: "Ejecutando simulacion" },
      { step: 3, thought: "Proyeccion a 2 horas: expansion hacia Barrio Sur probable (73%)" },
      { step: 4, thought: "Recomendacion: alertar preventivamente a 340 familias adicionales", result: "Alerta preventiva generada" },
    ]
  },
  { type: "extraction", message: "Recopilando datos de sensores meteorologicos..." },
  { 
    type: "alert", 
    message: "Incendio reportado en Villa 9 de Julio", 
    actionable: true, 
    location: "Villa 9 de Julio, Tucuman", 
    severity: "critical",
    confidence: 91,
    reasoning: [
      { step: 1, thought: "Camara CAM-V9J-023 detecta humo y llamas en sector industrial" },
      { step: 2, thought: "Cruzando con reportes de redes sociales: 12 menciones en ultimos 5 minutos" },
      { step: 3, thought: "Servicio meteorologico indica vientos de 25km/h direccion NE", action: "Calculando propagacion" },
      { step: 4, thought: "Riesgo de propagacion a zona residencial en 45 minutos si no se interviene", result: "ACCION INMEDIATA REQUERIDA" },
    ]
  },
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
    case "reasoning":
      return <Brain className="h-3.5 w-3.5" />
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
    case "reasoning":
      return "text-purple-400"
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
  const [expandedReasoning, setExpandedReasoning] = useState<Set<string>>(new Set())
  const [validatingSatellite, setValidatingSatellite] = useState<string | null>(null)
  const [satelliteModal, setSatelliteModal] = useState<SatelliteValidation | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const messageIndexRef = useRef(0)

  useEffect(() => {
    const interval = setInterval(() => {
      const template = newMessages[messageIndexRef.current % newMessages.length]
      const newActivity: ActivityItem = {
        ...template,
        id: Date.now().toString(),
        timestamp: new Date(),
        isNew: true,
      }
      setActivities(prev => [...prev.slice(-20), newActivity])
      messageIndexRef.current += 1

      // When the agent "discovers" an actionable alert, INSERT the incident into Supabase
      // so it appears on the map at the exact same moment
      if (template.type === "alert" && template.actionable && template.location) {
        const incidentData = ALERT_INCIDENT_DATA[template.location]
        if (incidentData) {
          fetch("/api/incidentes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(incidentData),
          }).catch(() => {
            // non-blocking: map already has existing data as fallback
          })
        }
      }
    }, 4000)

    return () => clearInterval(interval)
  }, [])

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight
      }
    }
  }, [activities])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  }

  const handleDeployResources = (activity: ActivityItem) => {
    setConfirmDialog({ open: true, type: "deploy", activity })
  }

  const handleNotifyAuthorities = (activity: ActivityItem) => {
    setConfirmDialog({ open: true, type: "notify", activity })
  }

  const toggleReasoning = (activityId: string) => {
    setExpandedReasoning(prev => {
      const newSet = new Set(prev)
      if (newSet.has(activityId)) {
        newSet.delete(activityId)
      } else {
        newSet.add(activityId)
      }
      return newSet
    })
  }

  const handleValidateSatellite = async (activityId: string) => {
    setValidatingSatellite(activityId)
    
    // Simular llamada a API satelital
    await new Promise(resolve => setTimeout(resolve, 2500))
    
    const activity = activities.find(a => a.id === activityId)
    if (!activity) {
      setValidatingSatellite(null)
      return
    }

    // Determinar tipo de imagen basado en el tipo de incidente
    const isFlood = activity.message.toLowerCase().includes("inundacion") || 
                    activity.message.toLowerCase().includes("desborde") ||
                    activity.message.toLowerCase().includes("agua")
    const isFire = activity.message.toLowerCase().includes("incendio") || 
                   activity.message.toLowerCase().includes("fuego")

    // Generar datos de validacion
    const validationData: SatelliteValidation = {
      activity,
      imageUrl: isFlood 
        ? "https://images.unsplash.com/photo-1446824505046-e43605ffb17f?w=800&h=500&fit=crop"
        : isFire 
          ? "https://images.unsplash.com/photo-1486551937199-baf066858de7?w=800&h=500&fit=crop"
          : "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=500&fit=crop",
      analysisData: {
        waterDetected: isFlood,
        affectedAreaKm2: isFlood ? 2.4 : isFire ? 0.8 : 1.2,
        vegetationDamage: isFire ? "Severo (78%)" : isFlood ? "Moderado (34%)" : "Bajo (12%)",
        thermalAnomaly: isFire,
        cloudCoverage: 15,
        captureTime: new Date().toISOString(),
        satellite: "Sentinel-2A",
        resolution: "10m/pixel"
      }
    }

    setSatelliteModal(validationData)
    
    setActivities(prev => prev.map(act => 
      act.id === activityId 
        ? { ...act, confidence: 98 }
        : act
    ))
    
    setValidatingSatellite(null)
  }

  const confirmAction = async () => {
    if (!confirmDialog.activity) return

    const activityId = confirmDialog.activity.id
    const location = confirmDialog.activity.location ?? ""
    setProcessedAlerts(prev => new Set(prev).add(activityId))
    setConfirmDialog({ open: false, type: "deploy", activity: null })

    if (confirmDialog.type === "deploy") {
      // 1. Buscar incidente activo que coincida con la ubicacion
      try {
        const res = await fetch("/api/incidentes")
        const incidentes: Array<{ id: string; ubicacion: string }> = await res.json()

        // Match flexible: busca si la ubicacion del activity esta contenida en la del incidente o viceversa
        const incidente = incidentes.find((inc) => {
          const incLoc = inc.ubicacion.toLowerCase()
          const actLoc = location.toLowerCase()
          return incLoc.includes(actLoc.split(",")[0].trim()) || actLoc.includes(incLoc.split("-")[0].trim())
        })

        // 2. Marcar incidente como atendido (desaparece del mapa via SWR)
        if (incidente) {
          await fetch("/api/incidentes", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: incidente.id, estado: "atendido" }),
          })

          // 3. Respawn: insertar nuevo incidente en coordenadas aleatorias de SMT
          setTimeout(async () => {
            const respawn = buildRespawnIncident(incidente as { tipo: string; fuente: string; fuente_detalles: Record<string, unknown> })
            await fetch("/api/incidentes", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(respawn),
            })
          }, 8000) // aparece 8 segundos despues de ser atendido
        }

        // 4. Actualizar primer recurso disponible a "dispatched" (en camino)
        const recursosRes = await fetch("/api/recursos")
        const recursos: Array<{ id: string; estado: string }> = await recursosRes.json()
        const disponible = recursos.find((r) => r.estado === "available")
        if (disponible) {
          await fetch("/api/recursos", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: disponible.id,
              estado: "dispatched",
              incidente_id: incidente?.id ?? null,
            }),
          })
        }
      } catch {
        // non-blocking
      }

      toast.success("Recursos desplegados", {
        description: `Unidades en camino a ${location}. Incidente removido de activos.`,
      })

      setActivities(prev => [...prev, {
        id: Date.now().toString(),
        type: "complete",
        message: `Recursos desplegados a ${location}`,
        timestamp: new Date(),
        isNew: true,
      }])
    } else {
      toast.success("Autoridades notificadas", {
        description: `Defensa Civil y Bomberos alertados sobre ${location}`,
      })

      setActivities(prev => [...prev, {
        id: Date.now().toString(),
        type: "complete",
        message: `Autoridades notificadas sobre incidente en ${location}`,
        timestamp: new Date(),
        isNew: true,
      }])
    }
  }

  const dismissAlert = (activityId: string) => {
    setProcessedAlerts(prev => new Set(prev).add(activityId))
  }

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3 shrink-0">
        <div className="relative">
          <div className="h-2 w-2 rounded-full bg-success" />
          <div className="absolute inset-0 h-2 w-2 rounded-full bg-success animate-pulse-ring" />
        </div>
        <h2 className="text-sm font-semibold text-foreground">Agente de IA en Vivo</h2>
        <Badge variant="outline" className="ml-auto text-[10px] border-success/50 text-success">
          Activo
        </Badge>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full px-2 py-2 custom-scrollbar" ref={scrollRef}>
          <div className="space-y-2">
          {activities.map((activity) => {
            const isProcessed = processedAlerts.has(activity.id)
            const showActions = activity.actionable && activity.type === "alert" && !isProcessed
            const hasReasoning = activity.reasoning && activity.reasoning.length > 0
            const isReasoningExpanded = expandedReasoning.has(activity.id)

            return (
              <div
                key={activity.id}
                className={cn(
                  "rounded-md p-2.5 transition-all duration-300",
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
                    
                    {/* Confidence Badge */}
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-[10px] font-mono text-muted-foreground">
                        {formatTime(activity.timestamp)}
                      </p>
                      {activity.confidence && (
                        <Badge 
                          variant="outline" 
                          className="text-[9px] h-4 px-1.5 bg-purple-500/10 text-purple-400 border-purple-500/30"
                        >
                          <Target className="h-2.5 w-2.5 mr-0.5" />
                          {activity.confidence}%
                        </Badge>
                      )}
                    </div>

                    {/* Reasoning Toggle */}
                    {hasReasoning && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 mt-1.5 text-[10px] text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 px-2 gap-1"
                        onClick={() => toggleReasoning(activity.id)}
                      >
                        <Brain className="h-3 w-3" />
                        {isReasoningExpanded ? "Ocultar" : "Ver"} Razonamiento
                        {isReasoningExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </Button>
                    )}

                    {/* Expanded Reasoning Panel */}
                    {hasReasoning && isReasoningExpanded && (
                      <div className="mt-2 p-2.5 rounded-md bg-purple-500/5 border border-purple-500/20 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Sparkles className="h-3 w-3 text-purple-400" />
                          <span className="text-[10px] font-medium text-purple-400">Cadena de Razonamiento</span>
                        </div>
                        <div className="space-y-2">
                          {activity.reasoning?.map((step, idx) => (
                            <div key={idx} className="flex gap-2 text-[10px]">
                              <div className="flex-shrink-0 w-4 h-4 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 text-[9px] font-bold">
                                {step.step}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-muted-foreground leading-relaxed">{step.thought}</p>
                                {step.action && (
                                  <p className="text-blue-400 mt-0.5 flex items-center gap-1">
                                    <Zap className="h-2.5 w-2.5" />
                                    {step.action}
                                  </p>
                                )}
                                {step.result && (
                                  <p className="text-green-400 mt-0.5 font-medium flex items-center gap-1">
                                    <CheckCircle2 className="h-2.5 w-2.5" />
                                    {step.result}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Validate with Satellite Button */}
                        {activity.confidence && activity.confidence < 98 && (
                          <div className="mt-2.5 pt-2 border-t border-purple-500/20">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full h-7 text-[10px] bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20"
                              onClick={() => handleValidateSatellite(activity.id)}
                              disabled={validatingSatellite === activity.id}
                            >
                              {validatingSatellite === activity.id ? (
                                <>
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  Consultando Sentinel-2...
                                </>
                              ) : (
                                <>
                                  <Satellite className="h-3 w-3 mr-1" />
                                  Validar con Imagen Satelital
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                    
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
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <AlertDialogContent className="z-[9999]">
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
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                {confirmDialog.type === "deploy" ? (
                  <>
                    <p>Esta a punto de desplegar unidades de emergencia a:</p>
                    <p className="font-semibold text-foreground">{confirmDialog.activity?.location}</p>
                  </>
                ) : (
                  <>
                    <p>Notificar a las siguientes autoridades:</p>
                    <ul className="text-sm space-y-1">
                      <li>- Defensa Civil de Tucuman</li>
                      <li>- Cuerpo de Bomberos</li>
                      <li>- Policia de Tucuman</li>
                    </ul>
                    <p className="font-semibold text-foreground">Ubicacion: {confirmDialog.activity?.location}</p>
                  </>
                )}

                {/* Confidence indicator */}
                {confirmDialog.activity?.confidence && (
                  <div className="p-3 rounded-lg bg-muted/50 border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Brain className="h-3 w-3" />
                        Nivel de Confianza IA
                      </span>
                      <span className="text-sm font-bold text-purple-400">{confirmDialog.activity.confidence}%</span>
                    </div>
                    <Progress value={confirmDialog.activity.confidence} className="h-2" />
                  </div>
                )}
              </div>
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

      {/* Satellite Validation Modal */}
      <Dialog open={!!satelliteModal} onOpenChange={() => setSatelliteModal(null)}>
        <DialogContent className="max-w-2xl z-[9999]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Satellite className="h-5 w-5 text-blue-400" />
              Validacion Satelital - Sentinel-2
            </DialogTitle>
          </DialogHeader>
          
          {satelliteModal && (
            <div className="space-y-4">
              {/* Satellite Image */}
              <div className="relative rounded-lg overflow-hidden border border-border">
                <img 
                  src={satelliteModal.imageUrl} 
                  alt="Imagen satelital de la zona afectada"
                  className="w-full h-48 object-cover"
                />
                <div className="absolute top-2 left-2 flex gap-1.5">
                  <Badge className="bg-green-500/90 text-white text-[10px]">EN VIVO</Badge>
                  <Badge variant="outline" className="bg-background/80 text-[10px]">
                    {satelliteModal.analysisData.satellite}
                  </Badge>
                </div>
                <div className="absolute bottom-2 right-2">
                  <Badge variant="outline" className="bg-background/80 text-[10px]">
                    Res: {satelliteModal.analysisData.resolution}
                  </Badge>
                </div>
                {/* Overlay grid effect */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                <div 
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    backgroundImage: `
                      linear-gradient(to right, rgba(59, 130, 246, 0.1) 1px, transparent 1px),
                      linear-gradient(to bottom, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
                    `,
                    backgroundSize: '20px 20px'
                  }}
                />
              </div>

              {/* Analysis Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/30 border border-border">
                  <p className="text-[10px] text-muted-foreground mb-1">Deteccion de Agua</p>
                  <p className={cn(
                    "text-sm font-semibold",
                    satelliteModal.analysisData.waterDetected ? "text-blue-400" : "text-muted-foreground"
                  )}>
                    {satelliteModal.analysisData.waterDetected ? "CONFIRMADO" : "No detectado"}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border border-border">
                  <p className="text-[10px] text-muted-foreground mb-1">Anomalia Termica</p>
                  <p className={cn(
                    "text-sm font-semibold",
                    satelliteModal.analysisData.thermalAnomaly ? "text-primary" : "text-muted-foreground"
                  )}>
                    {satelliteModal.analysisData.thermalAnomaly ? "DETECTADA" : "Normal"}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border border-border">
                  <p className="text-[10px] text-muted-foreground mb-1">Area Afectada</p>
                  <p className="text-sm font-semibold text-accent">
                    {satelliteModal.analysisData.affectedAreaKm2} km²
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border border-border">
                  <p className="text-[10px] text-muted-foreground mb-1">Dano Vegetacion</p>
                  <p className="text-sm font-semibold text-yellow-400">
                    {satelliteModal.analysisData.vegetationDamage}
                  </p>
                </div>
              </div>

              {/* Confidence Update */}
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                    <div>
                      <p className="text-sm font-semibold text-green-400">Validacion Exitosa</p>
                      <p className="text-[10px] text-muted-foreground">
                        Imagen satelital confirma la anomalia reportada
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground">Confianza actualizada</p>
                    <p className="text-xl font-bold text-green-400">98%</p>
                  </div>
                </div>
              </div>

              {/* Metadata */}
              <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2 border-t border-border">
                <span>Cobertura de nubes: {satelliteModal.analysisData.cloudCoverage}%</span>
                <span>Captura: {new Date(satelliteModal.analysisData.captureTime).toLocaleString("es-AR")}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
