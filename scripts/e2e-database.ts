// Test harness only: PostgreSQL/WASM on loopback, never a production fallback.
import { PGlite } from "@electric-sql/pglite"
import { PGLiteSocketServer } from "@electric-sql/pglite-socket"
import { readFile, writeFile } from "node:fs/promises"
import { createAccount } from "../lib/accounts"
import { getPool } from "../lib/postgres"

async function main() {
  const db = await PGlite.create()
  await db.exec(await readFile(new URL("../migrations/001-neon.sql", import.meta.url), "utf8"))
  const server = new PGLiteSocketServer({ db, host: "127.0.0.1", port: 3321, maxConnections: 50 })
  await server.start()
  process.env.DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:3321/postgres"
  await createAccount({ nombre: "Administración de prueba", email: "admin@example.test", password: "test-password-local" }, "admin")
  await createAccount({ nombre: "Operador de prueba", email: "operator@example.test", password: "test-password-local" }, "operador")
  await getPool().query("INSERT INTO incidentes(id,tipo,severidad,estado,fuente,ubicacion,latitud,longitud,personas_afectadas) VALUES ('20000000-0000-4000-8000-000000000001','fire','high','activo','citizen','Ubicación de prueba',-26.8241,-65.2226,2)")
  await getPool().query("INSERT INTO recursos(id,tipo,nombre,estado,ubicacion) VALUES('30000000-0000-4000-8000-000000000001','firefighter','Bomberos de prueba','available','Base de prueba')")
  await writeFile("test-results/private-ui/database-ready", "ready")
  const close = async () => { await getPool().end(); await server.stop(); await db.close(); process.exit(0) }
  process.on("SIGTERM", close)
  process.on("SIGINT", close)
}
main().catch(() => { console.error("No se pudo iniciar PostgreSQL de pruebas"); process.exitCode = 1 })
