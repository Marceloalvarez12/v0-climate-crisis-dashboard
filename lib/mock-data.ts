/**
 * lib/mock-data.ts
 *
 * Datos de prueba centralizados para el sistema de monitoreo de crisis.
 *
 * Cuando se integren APIs reales (X/Twitter, sensores, camaras), este archivo
 * es el unico que debe modificarse. El resto de la app consume estas estructuras
 * sin conocer el origen de los datos.
 *
 * Para conectar una fuente real:
 *   1. Reemplazar el array correspondiente (SOCIAL_REPORTS, SENSOR_REPORTS, CAMERA_REPORTS)
 *      con una funcion async que llame a la API externa.
 *   2. El shape de cada objeto debe mantenerse identico para no romper los consumidores.
 */

// ---------------------------------------------------------------------------
// Tipos base compartidos
// ---------------------------------------------------------------------------

export type IncidentTipo = "flood" | "fire" | "storm" | "looting" | "violence" | "accident" | "general"
export type IncidentSeveridad = "critical" | "high" | "medium" | "low"
export type IncidentFuente = "social" | "sensor" | "camera"

export interface SocialReport {
  texto: string
  fuente: string         // handle de la cuenta, e.g. "@tucuman_alerta"
  tipo: IncidentTipo
  zona: { lat: number; lng: number; nombre: string }
  imageUrl?: string
}

export interface SensorReport {
  sensorId: string
  tipo: IncidentTipo
  zona: { lat: number; lng: number; nombre: string }
  temperature: number   // °C
  humidity: number      // %
  windSpeed: number     // km/h
  pressure: number      // hPa
}

export interface CameraReport {
  cameraId: string
  tipo: IncidentTipo
  zona: { lat: number; lng: number; nombre: string }
  imageUrl: string
}

// ---------------------------------------------------------------------------
// Reportes crudos simulados — reemplazar con llamadas a APIs reales
// ---------------------------------------------------------------------------

export const SOCIAL_REPORTS: SocialReport[] = [
  {
    texto: "URGENTE: Inundacion severa en Plaza Independencia. El agua supera los 50cm. Vecinos atrapados. #InundacionTucuman",
    fuente: "@tucuman_alerta",
    tipo: "flood",
    zona: { lat: -26.8305, lng: -65.2038, nombre: "Plaza Independencia - Centro Histórico" },
    imageUrl: "https://images.unsplash.com/photo-1547683905-f686c993aae5?w=600",
  },
  {
    texto: "Barrio Norte bajo el agua. Evacuación en Plaza Urquiza. #AlertaTucuman",
    fuente: "@rescate_tucuman",
    tipo: "flood",
    zona: { lat: -26.8214, lng: -65.2028, nombre: "Plaza Urquiza - Barrio Norte" },
    imageUrl: "https://images.unsplash.com/photo-1446824505046-e43605ffb17f?w=600",
  },
  {
    texto: "EMERGENCIA MAXIMA en Barrio Sur. Hospital solicita evacuacion por humo. Ambulancias bloqueadas. #SOSTucuman",
    fuente: "@emergencias_tuc",
    tipo: "fire",
    zona: { lat: -26.8398, lng: -65.2088, nombre: "Plaza San Martín - Barrio Sur" },
    imageUrl: "https://images.unsplash.com/photo-1583245177184-4ab53e5e391a?w=600",
  },
  {
    texto: "Vientos destructivos en el parque. Arboles inmensos aplastaron autos en Av. Soldati.",
    fuente: "@rescate_tucuman",
    tipo: "storm",
    zona: { lat: -26.8288, lng: -65.1912, nombre: "Parque 9 de Julio - Av. Soldati" },
  },
  {
    texto: "Caos vehicular en Plazoleta Mitre por accidente múltiple causado por neblina.",
    fuente: "@vecino_mitre",
    tipo: "accident",
    zona: { lat: -26.8159, lng: -65.2153, nombre: "Plazoleta Mitre - Av. Belgrano y Mitre" },
  },
  {
    texto: "Tensión en Ejercito del Norte. Grupo de personas intentó saquear un supermercado local.",
    fuente: "@emergencias_tuc",
    tipo: "looting",
    zona: { lat: -26.8188, lng: -65.2346, nombre: "Av. Ejército del Norte y Mendoza" },
  },
  {
    texto: "Alerta roja por tormenta electrica. Vientos de 85km/h. Arboles caidos en Parque Avellaneda. #TormentaTucuman",
    fuente: "@meteo_noa",
    tipo: "storm",
    zona: { lat: -26.8261, lng: -65.2239, nombre: "Parque Avellaneda - Av. Mate de Luna" },
    imageUrl: "https://images.unsplash.com/photo-1527482937786-6f4c6c3fd49c?w=600",
  },
  {
    texto: "Incendio en las afueras de la Terminal. Humo negro dificulta la respiración.",
    fuente: "@pasajero_tuc",
    tipo: "fire",
    zona: { lat: -26.8366, lng: -65.1954, nombre: "Terminal de Ómnibus - Av. Brígido Terán" },
  },
  {
    texto: "Peleas callejeras y disturbios generalizados en Fco. de Aguirre. Eviten la zona.",
    fuente: "@seguridad_norte",
    tipo: "violence",
    zona: { lat: -26.8001, lng: -65.2014, nombre: "Av. Fco. de Aguirre y Juan B. Justo" },
  },
  {
    texto: "URGENTE: Canal desbordado en Zona Sur. El agua arrastra motos estacionadas.",
    fuente: "@bomberos_tuc",
    tipo: "flood",
    zona: { lat: -26.8453, lng: -65.2198, nombre: "Av. Roca y Lincoln - Zona Sur" },
  },
]

export const SENSOR_REPORTS: SensorReport[] = [
  {
    sensorId: "WS-PI-012",
    tipo: "storm",
    zona: { lat: -26.8305, lng: -65.2038, nombre: "Plaza Independencia - Centro Histórico" },
    temperature: 18, humidity: 94, windSpeed: 65, pressure: 1008,
  },
  {
    sensorId: "WS-PU-003",
    tipo: "general",
    zona: { lat: -26.8214, lng: -65.2028, nombre: "Plaza Urquiza - Barrio Norte" },
    temperature: 22, humidity: 78, windSpeed: 25, pressure: 1015,
  },
  {
    sensorId: "FL-RL-001",
    tipo: "flood",
    zona: { lat: -26.8453, lng: -65.2198, nombre: "Av. Roca y Lincoln - Zona Sur" },
    temperature: 20, humidity: 95, windSpeed: 30, pressure: 1010,
  },
]

export const CAMERA_REPORTS: CameraReport[] = [
  {
    cameraId: "CAM-SM-047",
    tipo: "fire",
    zona: { lat: -26.8398, lng: -65.2088, nombre: "Plaza San Martín - Barrio Sur" },
    imageUrl: "https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=600",
  },
  {
    cameraId: "CAM-TO-023",
    tipo: "fire",
    zona: { lat: -26.8366, lng: -65.1954, nombre: "Terminal de Ómnibus - Av. Brígido Terán" },
    imageUrl: "https://images.unsplash.com/photo-1486551937199-baf066858de7?w=600",
  },
]

// ---------------------------------------------------------------------------
// Zonas y helpers para incidentes generados dinamicamente (respawn)
// ---------------------------------------------------------------------------

export const RESPAWN_ZONES = [
  { nombre: "Plaza Independencia - Centro Histórico", lat: -26.8305, lng: -65.2038 },
  { nombre: "Plaza Urquiza - Barrio Norte", lat: -26.8214, lng: -65.2028 },
  { nombre: "Plaza San Martín - Barrio Sur", lat: -26.8398, lng: -65.2088 },
  { nombre: "Parque 9 de Julio - Av. Soldati", lat: -26.8288, lng: -65.1912 },
  { nombre: "Plazoleta Mitre - Av. Belgrano y Mitre", lat: -26.8159, lng: -65.2153 },
  { nombre: "Av. Ejército del Norte y Mendoza", lat: -26.8188, lng: -65.2346 },
  { nombre: "Parque Avellaneda - Av. Mate de Luna", lat: -26.8261, lng: -65.2239 },
  { nombre: "Terminal de Ómnibus - Av. Brígido Terán", lat: -26.8366, lng: -65.1954 },
  { nombre: "Av. Fco. de Aguirre y Juan B. Justo", lat: -26.8001, lng: -65.2014 },
  { nombre: "Av. Roca y Lincoln - Zona Sur", lat: -26.8453, lng: -65.2198 }
]

export const TIPOS: IncidentTipo[] = ["flood", "fire", "storm", "looting", "violence", "accident", "general"]
export const SEVERIDADES: IncidentSeveridad[] = ["critical", "high", "medium"]
export const FUENTES: IncidentFuente[] = ["social", "sensor", "camera"]

/** Construye un incidente aleatorio para el ciclo de respawn. 
 * Opcionalmente se le puede forzar una ubicacion o tipo especifico.
 */
export function buildRespawnIncident(base?: { tipo?: string; fuente?: string; zonaIndex?: number }) {
  const zonaObj = base?.zonaIndex !== undefined && base.zonaIndex >= 0 && base.zonaIndex < RESPAWN_ZONES.length 
    ? RESPAWN_ZONES[base.zonaIndex] 
    : RESPAWN_ZONES[Math.floor(Math.random() * RESPAWN_ZONES.length)]
  
  const zona = zonaObj.nombre
  const lat = zonaObj.lat
  const lng = zonaObj.lng

  const tipo = (base?.tipo as IncidentTipo) ?? TIPOS[Math.floor(Math.random() * TIPOS.length)]
  const severidad = SEVERIDADES[Math.floor(Math.random() * SEVERIDADES.length)]
  const fuente = (base?.fuente as IncidentFuente) ?? FUENTES[Math.floor(Math.random() * FUENTES.length)]

  const fuente_detalles: Record<string, unknown> =
    fuente === "social"
      ? { platform: "X (Twitter)", username: "@alerta_tucuman", content: `Nuevo incidente detectado en ${zona}. Ciudadanos reportando la situacion. #EmergenciaTucuman`, imageUrl: "https://images.unsplash.com/photo-1547683905-f686c993aae5?w=600" }
      : fuente === "sensor"
      ? { sensorId: `WS-${Math.floor(Math.random() * 999)}`, temperature: 20 + Math.floor(Math.random() * 10), humidity: 70 + Math.floor(Math.random() * 25), windSpeed: 20 + Math.floor(Math.random() * 60), pressure: 1005 + Math.floor(Math.random() * 15) }
      : { cameraId: `CAM-${Math.floor(Math.random() * 999)}`, cameraLocation: zona, imageUrl: "https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=600" }

  return {
    tipo, severidad,
    ubicacion: zona,
    latitud: lat,
    longitud: lng,
    personas_afectadas: 50 + Math.floor(Math.random() * 800),
    fuente, fuente_detalles,
    estado: "activo",
  }
}

// ---------------------------------------------------------------------------
// Metricas estaticas de referencia
// Cuando se integren APIs reales, reemplazar estos valores con llamadas al backend.
// ---------------------------------------------------------------------------

/**
 * Tiempo de respuesta promedio en minutos.
 * Representa el tiempo historico promedio entre la deteccion de un incidente
 * y el despacho de recursos. Valor de referencia basado en datos operacionales.
 * Para conectar una fuente real: reemplazar con una llamada a la API de turnos/despachos.
 */
export const STATIC_RESPONSE_TIME_MIN = 18

/**
 * Tiempos del ciclo de vida de un recurso despachado (ms).
 * Compartidos por use-resource-lifecycle.ts y use-simulation-loop.ts
 * para garantizar consistencia entre despacho manual y simulacion.
 *
 * Flujo: available → dispatched (50s) → busy (60s) → available
 */
export const RESOURCE_DISPATCHED_TO_BUSY_MS  = 50_000  // 50s en camino → ocupado
export const RESOURCE_BUSY_TO_AVAILABLE_MS   = 60_000  // 60s ocupado   → disponible

/** Intervalo entre spawns de incidentes en la simulacion automatica */
export const SIMULATION_SPAWN_INTERVAL_MS = 4 * 60 * 1000  // 4 minutos

