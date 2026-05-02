import type { ActivityItem, ReasoningStep } from "./types"

// ---------------------------------------------------------------------------
// Actividades iniciales mostradas al montar el componente
// ---------------------------------------------------------------------------

export const initialActivities: ActivityItem[] = [
  { id: "1", type: "monitoring", message: "Sistema de monitoreo iniciado",         timestamp: new Date(Date.now() - 300_000) },
  { id: "2", type: "extraction", message: "Extrayendo datos de X (Twitter)...",    timestamp: new Date(Date.now() - 240_000) },
  {
    id: "3",
    type: "reasoning",
    message: "Analizando menciones de inundaciones en Tucumán",
    timestamp: new Date(Date.now() - 180_000),
    confidence: 92,
    reasoning: [
      { step: 1, thought: "Detectados 47 tweets con palabras clave: 'inundacion', 'agua', 'evacuacion' en San Miguel de Tucumán" },
      { step: 2, thought: "Geolocalizando tweets... 38 tienen coordenadas verificables" },
      { step: 3, thought: "Cruzando con datos históricos de zonas inundables...", action: "Consultando base de datos municipal" },
      { step: 4, thought: "Patrón detectado: 89% de reportes concentrados en radio de 2km del Centro Histórico", result: "ALERTA VALIDADA" },
    ] satisfies ReasoningStep[],
  },
  { id: "4", type: "database", message: "Guardando 47 reportes en base de datos", timestamp: new Date(Date.now() - 120_000) },
]

// ---------------------------------------------------------------------------
// Mensajes de fondo — sólo monitoreo, sin alertas ni confirmaciones.
// Las alertas reales ahora las genera Gemini vía /api/agent cada 2 minutos.
// ---------------------------------------------------------------------------

export const backgroundMessages: Omit<ActivityItem, "id" | "timestamp">[] = [
  { type: "extraction", message: "Extrayendo datos de redes sociales..." },
  { type: "monitoring", message: "Escaneando noticias locales de La Gaceta..." },
  {
    type: "reasoning",
    message: "IA analizando patrones de evacuación...",
    confidence: 78,
    reasoning: [
      { step: 1, thought: "Analizando flujo de tráfico en tiempo real via Google Maps API" },
      { step: 2, thought: "Identificando rutas de evacuación óptimas...", action: "Calculando 3 rutas alternativas" },
      { step: 3, thought: "Ruta por Av. Mate de Luna BLOQUEADA - árboles caídos reportados" },
      { step: 4, thought: "Ruta recomendada: Av. Sarmiento → Ruta 9 Norte", result: "Tiempo estimado evacuación: 45 min" },
    ] satisfies ReasoningStep[],
  },
  { type: "database",   message: "Actualizando base de datos de recursos" },
  { type: "extraction", message: "Recopilando datos de sensores meteorológicos..." },
  { type: "monitoring", message: "Verificando cámaras de vigilancia urbana..." },
  {
    type: "reasoning",
    message: "Prediciendo expansión de zona afectada...",
    confidence: 85,
    reasoning: [
      { step: 1, thought: "Modelo hidrológico cargado: TucumanFlood_v3.2" },
      { step: 2, thought: "Inputs: precipitación actual, topografía, nivel de canales", action: "Ejecutando simulación" },
      { step: 3, thought: "Proyección a 2 horas: expansión hacia Barrio Sur probable (73%)" },
      { step: 4, thought: "Recomendación: alertar preventivamente a 340 familias adicionales", result: "Alerta preventiva generada" },
    ] satisfies ReasoningStep[],
  },
  { type: "extraction", message: "Consultando API meteorológica nacional..." },
  { type: "monitoring", message: "Analizando sensores hidrológicos del río Salí..." },
  { type: "database",   message: "Sincronizando con base de datos de Defensa Civil..." },
]
