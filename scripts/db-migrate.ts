import { loadEnvConfig } from "@next/env"
import { createHash } from "node:crypto"
import { readFile, readdir } from "node:fs/promises"
import { getPool } from "../lib/postgres"

export async function migrate() {
  const client = await getPool().connect()
  try {
    await client.query("BEGIN")
    await client.query("SELECT pg_advisory_xact_lock(20261112)")
    await client.query("CREATE TABLE IF NOT EXISTS zntinel_migrations(name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())")
    const directory = new URL("../migrations/", import.meta.url)
    for (const name of (await readdir(directory)).filter(name => name.endsWith(".sql")).sort()) {
      const sql = await readFile(new URL(name, directory), "utf8")
      const checksum = createHash("sha256").update(sql).digest("hex")
      const existing = await client.query("SELECT checksum FROM zntinel_migrations WHERE name=$1", [name])
      if (existing.rowCount) {
        if (existing.rows[0].checksum !== checksum) throw new Error(`Migración modificada: ${name}`)
        continue
      }
      await client.query(sql)
      await client.query("INSERT INTO zntinel_migrations(name,checksum) VALUES($1,$2)", [name, checksum])
      console.log(`Preparada: ${name}`)
    }
    await client.query("COMMIT")
  } catch (error) { await client.query("ROLLBACK"); throw error }
  finally { client.release() }
}

loadEnvConfig(process.cwd())
migrate().then(() => console.log("Esquema listo, sin datos de ejemplo.")).catch(() => {
  console.error("No se pudieron aplicar las migraciones. Revisá DATABASE_URL, conexión y permisos; no se imprimen credenciales.")
  process.exitCode = 1
}).finally(async () => { if (process.env.DATABASE_URL) await getPool().end() })
