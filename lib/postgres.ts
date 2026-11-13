import { Pool, type PoolClient } from "pg"

let pool: Pool | undefined
export function getPool(): Pool {
  if (!process.env.DATABASE_URL) throw new Error("Base de datos no configurada")
  if (!pool) {
    const url = new URL(process.env.DATABASE_URL)
    if (!["postgres:", "postgresql:"].includes(url.protocol)) throw new Error("DATABASE_URL debe ser PostgreSQL")
    if (url.hostname.endsWith(".neon.tech")) url.searchParams.set("sslmode", "verify-full")
    pool = new Pool({ connectionString: url.toString(), enableChannelBinding: true, max: 5, idleTimeoutMillis: 30000, connectionTimeoutMillis: 10000 })
    pool.on("error", () => console.error("[PostgreSQL] Conexión interrumpida"))
  }
  return pool
}

export async function transaction<T>(operation: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect()
  try {
    await client.query("BEGIN")
    const result = await operation(client)
    await client.query("COMMIT")
    return result
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally { client.release() }
}
