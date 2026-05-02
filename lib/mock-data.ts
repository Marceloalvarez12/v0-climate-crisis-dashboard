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

export type IncidentTipo = "flood" | "fire" | "storm" | "general"
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
    texto: "URGENTE: Inundacion severa en Plaza Independencia. El agua supera los 50cm. Vecinos atrapados en edificios. #InundacionTucuman",
    fuente: "@tucuman_alerta",
    tipo: "flood",
    zona: { lat: -26.8241, lng: -65.2226, nombre: "Centro Historico - Plaza Independencia" },
    imageUrl: "https://images.unsplash.com/photo-1547683905-f686c993aae5?w=600",
  },
  {
    texto: "Canal San Pablo desbordado. Evacuacion de 180 familias en curso. Corte total de Av. Ejercito del Norte. #AlertaTucuman",
    fuente: "@rescate_tucuman",
    tipo: "flood",
    zona: { lat: -26.8400, lng: -65.2500, nombre: "Barrio San Pablo - Canal Norte" },
    imageUrl: "https://images.unsplash.com/photo-1446824505046-e43605ffb17f?w=600",
  },
  {
    texto: "EMERGENCIA MAXIMA en Barrio Sur. Hospital solicita evacuacion. Ambulancias no pueden acceder. #SOSTucuman",
    fuente: "@emergencias_tuc",
    tipo: "flood",
    zona: { lat: -26.8380, lng: -65.2150, nombre: "Barrio Sur - Av. Roca" },
    imageUrl: "https://images.unsplash.com/photo-1583245177184-4ab53e5e391a?w=600",
  },
  {
    texto: "EMERGENCIA en Villa Urquiza: El rio Sali crecio de golpe y esta entrando agua a las casas de la costanera.",
    fuente: "@rescate_tucuman",
    tipo: "flood",
    zona: { lat: -26.8550, lng: -65.1720, nombre: "Villa Urquiza - Costanera Rio Sali" },
  },
  {
    texto: "URGENTE: El fuego esta bajando por el Cerro San Javier hacia las viviendas de El Corte. Necesitamos bomberos YA! #IncendioTucuman",
    fuente: "@vecino_sanjavier",
    tipo: "fire",
    zona: { lat: -26.7850, lng: -65.3200, nombre: "Cerro San Javier - El Corte" },
  },
  {
    texto: "Se incendia deposito de neumaticos en zona industrial de Banda del Rio Sali. Columna de humo negro visible.",
    fuente: "@emergencias_tuc",
    tipo: "fire",
    zona: { lat: -26.8520, lng: -65.1580, nombre: "Banda del Rio Sali - Zona Industrial" },
  },
  {
    texto: "Alerta roja por tormenta electrica. Vientos de 85km/h. Arboles caidos en Av. Mitre. #TormentaTucuman",
    fuente: "@meteo_noa",
    tipo: "storm",
    zona: { lat: -26.8500, lng: -65.2000, nombre: "Banda del Rio Sali - Zona Industrial" },
    imageUrl: "https://images.unsplash.com/photo-1527482937786-6f4c6c3fd49c?w=600",
  },
  {
    texto: "Granizo del tamano de pelotas de golf cayendo en Yerba Buena! Autos destrozados. #TormentaTucuman",
    fuente: "@yerbabuena_info",
    tipo: "storm",
    zona: { lat: -26.8150, lng: -65.2950, nombre: "Yerba Buena - Centro" },
  },
  {
    texto: "Tormenta electrica SEVERA en Tafi Viejo. Varios postes de luz caidos, arboles en la calle y corte de energia.",
    fuente: "@meteo_noa",
    tipo: "storm",
    zona: { lat: -26.7280, lng: -65.2650, nombre: "Tafi Viejo - Centro" },
  },
  {
    texto: "URGENTE: Canal norte desbordado en altura de Honduras y Ejercito del Norte. El agua arrastra autos estacionados.",
    fuente: "@bomberos_tuc",
    tipo: "flood",
    zona: { lat: -26.8100, lng: -65.2400, nombre: "Canal Norte - Honduras" },
  },
]

export const SENSOR_REPORTS: SensorReport[] = [
  {
    sensorId: "WS-YB-012",
    tipo: "storm",
    zona: { lat: -26.8150, lng: -65.2950, nombre: "Yerba Buena - Country Jockey Club" },
    temperature: 18, humidity: 94, windSpeed: 65, pressure: 1008,
  },
  {
    sensorId: "WS-EM-003",
    tipo: "general",
    zona: { lat: -26.8600, lng: -65.1900, nombre: "El Manantial - Ruta 301" },
    temperature: 22, humidity: 78, windSpeed: 25, pressure: 1015,
  },
  {
    sensorId: "FL-CN-001",
    tipo: "flood",
    zona: { lat: -26.8100, lng: -65.2400, nombre: "Canal Norte - Sensor Hidrometrico" },
    temperature: 20, humidity: 95, windSpeed: 30, pressure: 1010,
  },
]

export const CAMERA_REPORTS: CameraReport[] = [
  {
    cameraId: "CAM-BN-047",
    tipo: "fire",
    zona: { lat: -26.8050, lng: -65.2100, nombre: "Barrio Norte - Deposito Industrial" },
    imageUrl: "https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=600",
  },
  {
    cameraId: "CAM-V9J-023",
    tipo: "fire",
    zona: { lat: -26.7950, lng: -65.2350, nombre: "Villa 9 de Julio - Fabrica Textil" },
    imageUrl: "https://images.unsplash.com/photo-1486551937199-baf066858de7?w=600",
  },
]

// ---------------------------------------------------------------------------
// Zonas y helpers para incidentes generados dinamicamente (respawn)
// ---------------------------------------------------------------------------

export const SMT_BOUNDS = { latMin: -26.84, latMax: -26.80, lngMin: -65.23, lngMax: -65.18 }

export const RESPAWN_ZONES = [
  "Barrio Sur - Av. Mitre", "Las Talitas - Barrio Mutual", "Tafi Viejo - Zona Residencial",
  "Banda del Rio Sali - Acceso Norte", "Barrio Norte - Mercado Central",
  "Yerba Buena - Av. Aconquija", "El Manantial - Ruta Provincial 301",
  "San Pablo - Sector Industrial", "Alberdi - Barrio Obrero", "Reduccion - Zona Sur",
]

export const TIPOS: IncidentTipo[] = ["flood", "fire", "storm", "general"]
export const SEVERIDADES: IncidentSeveridad[] = ["critical", "high", "medium"]
export const FUENTES: IncidentFuente[] = ["social", "sensor", "camera"]

/** Construye un incidente aleatorio para el ciclo de respawn */
export function buildRespawnIncident(base?: { tipo?: string; fuente?: string }) {
  const lat = SMT_BOUNDS.latMin + Math.random() * (SMT_BOUNDS.latMax - SMT_BOUNDS.latMin)
  const lng = SMT_BOUNDS.lngMin + Math.random() * (SMT_BOUNDS.lngMax - SMT_BOUNDS.lngMin)
  const zona = RESPAWN_ZONES[Math.floor(Math.random() * RESPAWN_ZONES.length)]
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
    latitud: parseFloat(lat.toFixed(6)),
    longitud: parseFloat(lng.toFixed(6)),
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

