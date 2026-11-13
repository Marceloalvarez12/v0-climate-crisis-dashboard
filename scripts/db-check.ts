import { loadEnvConfig } from "@next/env"
import { getPool } from "../lib/postgres"

loadEnvConfig(process.cwd())
async function main() {
  const pool = getPool()
  const client = await pool.connect()
  try {
    const result = await client.query("SELECT current_database() AS database, current_user AS role, version() AS version")
    const connection = client as typeof client & { connection: { stream: { encrypted?: boolean; authorized?: boolean } } }
    console.log(JSON.stringify({ connected: true, ...result.rows[0], tls: connection.connection.stream.encrypted === true, certificateVerified: connection.connection.stream.authorized === true }, null, 2))
  } finally { client.release() }
  const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name")
  console.log("Tablas públicas:", tables.rows.map(row => row.table_name).join(", ") || "ninguna")
}
main().catch((error: unknown) => {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "connection_failed"
  console.error(`No se pudo verificar PostgreSQL (${code}); las credenciales no se muestran.`)
  process.exitCode = 1
}).finally(async () => { if (process.env.DATABASE_URL) await getPool().end() })
