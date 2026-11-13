// Lectura de config_sistema con fallback tolerante: si el store no tiene
// la clave devuelve null y el caller usa su default. Cache corto para no
// golpear la base por cada ingest. En modo memoria el store ya viene
// sembrado con agent_mode/autonomous = true (ver lib/mock-db.ts).
const CACHE_TTL_MS = 10_000
const cache = new Map<string, { value: unknown; at: number }>()

export async function getSystemConfig<T>(clave: string): Promise<T | null> {
  const hit = cache.get(clave)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value as T
  try {
    const { getDb } = await import("@/lib/db")
    const db = await getDb()
    const value = await db.getConfig<T>(clave)
    if (value === null) return null
    cache.set(clave, { value, at: Date.now() })
    return value
  } catch {
    return null
  }
}

export async function getConfigNumber(clave: string, fallback: number): Promise<number> {
  const valor = await getSystemConfig<{ value?: number }>(clave)
  return typeof valor?.value === "number" ? valor.value : fallback
}

export function invalidateConfigCache(clave?: string) {
  if (clave) cache.delete(clave)
  else cache.clear()
}
