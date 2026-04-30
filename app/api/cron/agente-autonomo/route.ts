import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// Reportes crudos simulados de redes sociales sobre desastres en Tucumán
const reportesCrudos = [
  {
    texto: "URGENTE: El fuego está bajando por el Cerro San Javier hacia las viviendas de El Corte. Necesitamos bomberos YA! El humo es insoportable. #IncendioTucuman",
    fuente: "@vecino_sanjavier",
    tipo: "fire",
    zona: { lat: -26.7850, lng: -65.3200, nombre: "Cerro San Javier - El Corte" }
  },
  {
    texto: "El canal sur se desbordó por la tormenta, el agua entra a las casas en Av. Alem y Catamarca. Hay familias atrapadas en los techos pidiendo ayuda!",
    fuente: "@alertatucuman",
    tipo: "flood",
    zona: { lat: -26.8380, lng: -65.2150, nombre: "Barrio Sur - Av. Alem" }
  },
  {
    texto: "ALERTA: Incendio en pastizales cerca del Aeropuerto de Tucumán. El viento está llevando el fuego hacia la ruta 9. Visibilidad reducida para conductores.",
    fuente: "@transito_tuc",
    tipo: "fire",
    zona: { lat: -26.8400, lng: -65.1050, nombre: "Aeropuerto - Ruta 9" }
  },
  {
    texto: "Tormenta eléctrica SEVERA en Tafí Viejo. Varios postes de luz caídos, árboles en la calle y corte de energía en todo el centro. Rayos cayendo constantemente.",
    fuente: "@meteo_noa",
    tipo: "storm",
    zona: { lat: -26.7280, lng: -65.2650, nombre: "Tafí Viejo - Centro" }
  },
  {
    texto: "EMERGENCIA en Villa Urquiza: El río Salí creció de golpe y está entrando agua a las casas de la costanera. Defensa Civil presente pero necesitan más lanchas.",
    fuente: "@rescate_tucuman",
    tipo: "flood",
    zona: { lat: -26.8550, lng: -65.1720, nombre: "Villa Urquiza - Costanera Río Salí" }
  },
  {
    texto: "Se incendia depósito de neumáticos en zona industrial de Banda del Río Salí. Columna de humo negro visible desde el centro. Bomberos en camino.",
    fuente: "@emergencias_tuc",
    tipo: "fire",
    zona: { lat: -26.8520, lng: -65.1580, nombre: "Banda del Río Salí - Zona Industrial" }
  },
  {
    texto: "Granizo del tamaño de pelotas de golf cayendo en Yerba Buena! Autos destrozados, vidrios rotos en casas. No salgan a la calle! #TormentaTucuman",
    fuente: "@yerbabuena_info",
    tipo: "storm",
    zona: { lat: -26.8150, lng: -65.2950, nombre: "Yerba Buena - Centro" }
  },
  {
    texto: "URGENTE: Canal norte desbordado en altura de Honduras y Ejercito del Norte. El agua arrastra autos estacionados. Situación crítica.",
    fuente: "@bomberos_tuc",
    tipo: "flood",
    zona: { lat: -26.8100, lng: -65.2400, nombre: "Canal Norte - Honduras" }
  }
]

// Función para determinar severidad basada en palabras clave
function analizarSeveridad(texto: string): "critical" | "high" | "medium" | "low" {
  const textoLower = texto.toLowerCase()
  if (textoLower.includes("urgente") || textoLower.includes("emergencia") || textoLower.includes("crítica") || textoLower.includes("atrapadas") || textoLower.includes("ya!")) {
    return "critical"
  }
  if (textoLower.includes("alerta") || textoLower.includes("severa") || textoLower.includes("peligro") || textoLower.includes("evacuación")) {
    return "high"
  }
  if (textoLower.includes("cuidado") || textoLower.includes("precaución")) {
    return "medium"
  }
  return "low"
}

// Función para estimar personas afectadas
function estimarAfectados(tipo: string, severidad: string): number {
  const base = tipo === "flood" ? 500 : tipo === "fire" ? 200 : 300
  const multiplicador = severidad === "critical" ? 3 : severidad === "high" ? 2 : severidad === "medium" ? 1.5 : 1
  return Math.floor(base * multiplicador * (0.8 + Math.random() * 0.4))
}

export async function POST() {
  try {
    const supabase = await createClient()
    
    // 1. Seleccionar un reporte aleatorio
    const reporteIndex = Math.floor(Math.random() * reportesCrudos.length)
    const reporte = reportesCrudos[reporteIndex]
    
    // 2. Simular análisis del Agente IA
    const severidad = analizarSeveridad(reporte.texto)
    const personasAfectadas = estimarAfectados(reporte.tipo, severidad)
    
    // 3. Estructurar datos procesados
    const incidenteProcesado = {
      tipo: reporte.tipo,
      severidad: severidad,
      ubicacion: reporte.zona.nombre,
      latitud: reporte.zona.lat + (Math.random() - 0.5) * 0.01, // Pequeña variación
      longitud: reporte.zona.lng + (Math.random() - 0.5) * 0.01,
      personas_afectadas: personasAfectadas,
      fuente: "social" as const,
      fuente_detalles: {
        platform: "X (Twitter)",
        username: reporte.fuente,
        content: reporte.texto,
        processed_by: "Agente IA v1.0",
        confidence: 85 + Math.floor(Math.random() * 13), // 85-97%
        processing_time_ms: 1200 + Math.floor(Math.random() * 800)
      }
    }
    
    // 4. Insertar en tabla incidentes
    const { data: incidente, error: incidenteError } = await supabase
      .from("incidentes")
      .insert(incidenteProcesado)
      .select()
      .single()
    
    if (incidenteError) {
      throw new Error(`Error insertando incidente: ${incidenteError.message}`)
    }
    
    // 5. Registrar en agent_logs - paso de extracción
    await supabase.from("agent_logs").insert({
      tipo: "search",
      mensaje: `Extrayendo datos de X (Twitter) - ${reporte.fuente}`,
      razonamiento: {
        steps: ["Conectando a API de X...", "Buscando hashtags de emergencia...", `Tweet detectado de ${reporte.fuente}`],
        sources: 1
      }
    })
    
    // 6. Registrar análisis
    await supabase.from("agent_logs").insert({
      tipo: "analysis",
      mensaje: `Analizando reporte de ${reporte.tipo === "flood" ? "inundación" : reporte.tipo === "fire" ? "incendio" : "tormenta"} en ${reporte.zona.nombre}`,
      confianza: incidenteProcesado.fuente_detalles.confidence,
      ubicacion: reporte.zona.nombre,
      razonamiento: {
        steps: [
          "Procesando texto con NLP...",
          `Tipo de emergencia detectado: ${reporte.tipo}`,
          `Severidad calculada: ${severidad}`,
          `Geolocalizando ubicación: ${reporte.zona.nombre}`,
          `Estimando ${personasAfectadas} personas afectadas`
        ],
        sources: 1,
        keywords_detected: reporte.texto.match(/#\w+/g) || []
      }
    })
    
    // 7. Registrar alerta si es crítico o alto
    if (severidad === "critical" || severidad === "high") {
      await supabase.from("agent_logs").insert({
        tipo: "alert",
        mensaje: `ALERTA ${severidad === "critical" ? "CRITICA" : "ALTA"}: Nuevo incidente en ${reporte.zona.nombre}`,
        confianza: incidenteProcesado.fuente_detalles.confidence,
        severidad: severidad,
        ubicacion: reporte.zona.nombre,
        razonamiento: {
          steps: [
            "Validando información...",
            "Cruzando con datos de sensores...",
            severidad === "critical" ? "EMERGENCIA CONFIRMADA - Requiere acción inmediata" : "Alerta validada - Monitoreo activo"
          ],
          sources: 1
        }
      })
    }
    
    // 8. Registrar acción completada
    await supabase.from("agent_logs").insert({
      tipo: "success",
      mensaje: `Incidente registrado y coordenadas enviadas a central de emergencias`,
    })
    
    return NextResponse.json({
      success: true,
      message: "Ciclo de agente completado",
      incidente: {
        id: incidente.id,
        tipo: incidenteProcesado.tipo,
        severidad: incidenteProcesado.severidad,
        ubicacion: incidenteProcesado.ubicacion,
        personas_afectadas: incidenteProcesado.personas_afectadas,
        confianza: incidenteProcesado.fuente_detalles.confidence
      },
      reporte_original: reporte.texto
    })
    
  } catch (error) {
    console.error("[Agente Autónomo] Error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Error desconocido" },
      { status: 500 }
    )
  }
}

// GET para verificar que la ruta existe
export async function GET() {
  return NextResponse.json({
    status: "online",
    description: "API del Agente Autónomo de Crisis - Use POST para ejecutar un ciclo de scraping simulado",
    reportes_disponibles: reportesCrudos.length
  })
}
