/**
 * lib/resource-matching.ts
 *
 * Mapa de tipo de incidente → tipos de recurso recomendados en orden de prioridad.
 * Usado por el auto-dispatch para asignar el recurso más apropiado automáticamente.
 */

export const INCIDENT_RESOURCE_MAP: Record<string, string[]> = {
  flood:    ["boat", "ambulance", "firefighter"],
  fire:     ["firefighter", "ambulance", "helicopter"],
  storm:    ["firefighter", "ambulance", "police"],
  looting:  ["police", "ambulance"],
  violence: ["police", "ambulance"],
  accident: ["ambulance", "firefighter", "police"],
  general:  ["police"],
}

export const RESOURCE_LABELS: Record<string, string> = {
  ambulance:   "Ambulancia",
  firefighter: "Bomberos",
  helicopter:  "Helicóptero",
  boat:        "Lancha",
  shelter:     "Albergue",
  medical:     "Médico",
  police:      "Policía",
}

export function getRecommendedResourceType(incidentTipo: string): string[] {
  return INCIDENT_RESOURCE_MAP[incidentTipo] ?? INCIDENT_RESOURCE_MAP.general
}

export function getResourceLabel(tipo: string): string {
  return RESOURCE_LABELS[tipo] ?? tipo
}
