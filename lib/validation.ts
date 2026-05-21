import { z } from "zod"

export const IncidentCreateSchema = z.object({
  tipo: z.enum(["flood", "fire", "storm", "looting", "violence", "accident", "general"]),
  severidad: z.enum(["critical", "high", "medium", "low"]).default("medium"),
  ubicacion: z.string().min(2).max(200),
  latitud: z.number().min(-90).max(90).default(-26.8241),
  longitud: z.number().min(-180).max(180).default(-65.2226),
  personas_afectadas: z.number().int().min(0).default(0),
  fuente: z.enum(["social", "sensor", "camera"]),
  fuente_detalles: z.record(z.unknown()).optional(),
  estado: z.enum(["activo", "atendido"]).default("activo"),
})

export const IncidentPatchSchema = z.object({
  id: z.string().uuid(),
  estado: z.enum(["activo", "atendido"]).optional(),
  severidad: z.enum(["critical", "high", "medium", "low"]).optional(),
  personas_afectadas: z.number().int().min(0).optional(),
})

export const ResourcePatchSchema = z.object({
  id: z.string().uuid(),
  estado: z.enum(["available", "dispatched", "busy", "retired"]).optional(),
  incidente_id: z.string().uuid().nullable().optional(),
})

export const ResourceCreateSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  tipo: z.enum(["ambulance", "firefighter", "helicopter", "boat", "shelter", "medical", "police"]),
  numero: z.string().min(1, "El número es requerido"),
  ubicacion: z.string().min(1, "La ubicación es requerida"),
})

export const AgentLogSchema = z.object({
  scan_id: z.string().optional(),
  platform: z.string().max(50).optional(),
  posts_collected: z.number().int().min(0).optional(),
  incidents_found: z.number().int().min(0).optional(),
  status: z.enum(["success", "error", "timeout"]).default("success"),
  details: z.record(z.unknown()).optional(),
})
