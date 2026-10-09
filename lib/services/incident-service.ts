import { getDb } from "@/lib/db"
import { CONFIG } from "@/lib/config"
import { isAutoSpawned, isNonReportIncident, type DbIncident } from "@/lib/types"

export class IncidentService {
  static async getActiveIncidents(): Promise<DbIncident[]> {
    const db = await getDb()
    const data = await db.listIncidents({ estado: "activo" })
    return data.filter(i => !isNonReportIncident(i))
  }

  static async getAttendedIncidents(): Promise<DbIncident[]> {
    const db = await getDb()
    const data = await db.listIncidents({ estado: "atendido", limit: CONFIG.INCIDENTS.MAX_HISTORY })
    return data.filter(i => !isNonReportIncident(i))
  }

  /** Los incidentes auto-generados por la simulación no consumen el cupo de reportes reales. */
  static async countActive(): Promise<number> {
    return (await this.getActiveIncidents()).filter(i => !isAutoSpawned(i)).length
  }

  static async findByLocation(ubicacion: string): Promise<DbIncident | null> {
    const db = await getDb()
    const found = await db.findIncidentByUbicacion(ubicacion)
    return found && !isNonReportIncident(found) ? found : null
  }

  static async findById(id: string): Promise<DbIncident | null> {
    const db = await getDb()
    return db.findIncidentById(id)
  }

  static async create(incident: Omit<DbIncident, "id" | "created_at" | "updated_at">): Promise<DbIncident> {
    const db = await getDb()
    const now = new Date().toISOString()
    return db.insertIncident({
      ...incident,
      fuente_detalles: incident.fuente_detalles ?? {},
      created_at: now,
      updated_at: now,
    })
  }

  static async update(id: string, updates: Partial<DbIncident>): Promise<DbIncident> {
    const db = await getDb()
    const updated = await db.updateIncident(id, { ...updates, updated_at: new Date().toISOString() })
    if (!updated) throw new Error("Failed to update incident: not found")
    return updated
  }

  static async canCreateMore(): Promise<boolean> {
    const count = await this.countActive()
    return count < CONFIG.INCIDENTS.MAX_ACTIVE
  }

  static async deleteById(id: string): Promise<void> {
    const db = await getDb()
    await db.deleteIncident(id)
  }

  static async deleteSimulated(estado?: "activo" | "atendido"): Promise<number> {
    const db = await getDb()
    return db.deleteSimulatedIncidents(estado)
  }
}
