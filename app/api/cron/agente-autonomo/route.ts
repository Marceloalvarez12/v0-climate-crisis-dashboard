import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { SOCIAL_REPORTS, analizarSeveridad, estimarAfectados } from "@/lib/mock-data"

// reportesCrudos, analizarSeveridad y estimarAfectados viven en lib/mock-data.ts
// Para conectar la API real de X/Twitter, reemplazar SOCIAL_REPORTS en ese archivo.

export async function POST() {
  try {
    const supabase = await createClient()
    
    // 1. Seleccionar un reporte aleatorio de SOCIAL_REPORTS (lib/mock-data.ts)
    const reporteIndex = Math.floor(Math.random() * SOCIAL_REPORTS.length)
    const r = SOCIAL_REPORTS[reporteIndex]
    const reporte = { texto: r.texto, fuente: r.fuente, tipo: r.tipo, zona: r.zona }
    
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
    reportes_disponibles: SOCIAL_REPORTS.length
  })
}
