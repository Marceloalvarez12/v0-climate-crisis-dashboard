import { TRIGGER_HASHTAG } from "@/lib/agents/hashtag"
import type { ActivityItem, ReasoningStep } from "./types"

// ---------------------------------------------------------------------------
// Initial activities shown when the component mounts
// ---------------------------------------------------------------------------

export const initialActivities: ActivityItem[] = [
  { id: "1", type: "monitoring", source: "Sistema",   message: "Agente de monitoreo iniciado · 7 fuentes conectadas", timestamp: new Date(Date.now() - 300_000) },
  { id: "2", type: "extraction", source: "Redes",     message: `Escuchando ${TRIGGER_HASHTAG} en Facebook, Instagram y X`, timestamp: new Date(Date.now() - 240_000) },
  {
    id: "3",
    type: "reasoning",
    source: "Modelo",
    message: "Análisis de menciones de anegamiento en San Miguel de Tucumán",
    timestamp: new Date(Date.now() - 180_000),
    confidence: 92,
    reasoning: [
      { step: 1, thought: "47 publicaciones con términos 'inundación', 'agua', 'evacuación' en el Gran Tucumán" },
      { step: 2, thought: "Geolocalizando publicaciones… 38 con coordenadas verificables" },
      { step: 3, thought: "Cruce con zonas históricas de anegamiento", action: "Consultando base municipal" },
      { step: 4, thought: "89% de los reportes concentrados en un radio de 2 km del microcentro", result: "Patrón validado" },
    ] satisfies ReasoningStep[],
  },
  { id: "4", type: "database", source: "Base de datos", message: "47 señales indexadas y deduplicadas", timestamp: new Date(Date.now() - 120_000) },
]

// ---------------------------------------------------------------------------
// Background messages — monitoring only, no alerts or confirmations.
// ---------------------------------------------------------------------------

export const backgroundMessages: Omit<ActivityItem, "id" | "timestamp">[] = [
  { type: "extraction", source: "Redes",    message: `Escaneando menciones de ${TRIGGER_HASHTAG} en Facebook, Instagram y X` },
  { type: "monitoring", source: "Medios",   message: "Analizando titulares de La Gaceta y Contexto Tucumán" },
  {
    type: "reasoning",
    source: "Modelo",
    message: "Evaluando rutas de evacuación óptimas",
    confidence: 78,
    reasoning: [
      { step: 1, thought: "Leyendo flujo vehicular en tiempo real sobre accesos principales" },
      { step: 2, thought: "Calculando rutas alternativas…", action: "3 rutas evaluadas" },
      { step: 3, thought: "Av. Mate de Luna con obstrucción reportada por árboles caídos" },
      { step: 4, thought: "Ruta sugerida: Av. Sarmiento → Ruta 9 Norte", result: "Tiempo estimado de evacuación: 45 min" },
    ] satisfies ReasoningStep[],
  },
  { type: "database",   source: "Recursos", message: "Sincronizando disponibilidad de unidades" },
  { type: "extraction", source: "SMN",      message: "Ingestando datos de estaciones meteorológicas" },
  { type: "monitoring", source: "Cámaras",  message: "Revisando cámaras urbanas del corredor Av. Mitre" },
  {
    type: "reasoning",
    source: "Modelo",
    message: "Proyectando expansión del área afectada",
    confidence: 85,
    reasoning: [
      { step: 1, thought: "Modelo hidrológico cargado: TucumanFlood v3.2" },
      { step: 2, thought: "Entradas: precipitación actual, topografía, nivel de canales", action: "Ejecutando simulación" },
      { step: 3, thought: "Proyección a 2 h: expansión probable hacia Barrio Sur (73%)" },
      { step: 4, thought: "Recomendación: alerta preventiva a 340 familias adicionales", result: "Alerta preventiva generada" },
    ] satisfies ReasoningStep[],
  },
  { type: "extraction", source: "SMN",      message: "Consultando pronóstico extendido del Servicio Meteorológico" },
  { type: "monitoring", source: "Sensores", message: "Leyendo sensores hidrométricos del Río Salí" },
  { type: "analysis",   source: "Modelo",   message: "Clasificando severidad de 12 menciones nuevas" },
  { type: "database",   source: "Defensa Civil", message: "Sincronizando con la base de Defensa Civil" },
  {
    type: "reasoning",
    source: "Modelo",
    message: "Correlacionando reportes sociales con sensores",
    confidence: 88,
    reasoning: [
      { step: 1, thought: "6 menciones de granizo en Yerba Buena en los últimos 15 min" },
      { step: 2, thought: "Radar meteorológico confirma celda convectiva al oeste", action: "Cruzando con imagen de radar" },
      { step: 3, thought: "Coincidencia espacial y temporal > 80%", result: "Evento corroborado por 2 fuentes" },
    ] satisfies ReasoningStep[],
  },
]

/** Tareas rotativas que muestra la barra de estado del agente */
export const agentTasks = [
  "Correlacionando señales sociales",
  "Geolocalizando menciones",
  "Clasificando severidad",
  "Leyendo sensores hidrométricos",
  "Proyectando áreas de riesgo",
  "Validando fuentes cruzadas",
]
