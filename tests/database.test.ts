import assert from "node:assert/strict"
import { after, before, test } from "node:test"
import { readFile } from "node:fs/promises"
import { randomBytes } from "node:crypto"
import { PGlite } from "@electric-sql/pglite"
import { PGLiteSocketServer } from "@electric-sql/pglite-socket"
import { getPool } from "../lib/postgres"
import { neonDb as db } from "../lib/db-neon"
import { createAccount } from "../lib/accounts"
import { getAuth } from "../lib/auth-server"

let postgres: PGlite, server: PGLiteSocketServer
let adminId: string, operatorId: string
before(async () => {
  postgres = await PGlite.create()
  await postgres.exec(await readFile(new URL("../migrations/001-neon.sql", import.meta.url), "utf8"))
  server = new PGLiteSocketServer({ db: postgres, port: 3342, host: "127.0.0.1", maxConnections: 5 })
  await server.start()
  process.env.DATABASE_URL = `postgresql://postgres:postgres@${server.getServerConn()}/postgres`
  process.env.APP_URL = "http://localhost:3000"
  process.env.BETTER_AUTH_SECRET = randomBytes(48).toString("base64url")
  adminId = (await createAccount({ nombre: "Admin Test", email: "admin@example.test", password: "test-password-local" }, "admin")).id
  operatorId = (await db.createOperator({ nombre: "Operator Test", email: "operator@example.test", password: "test-password-local" })).id
})
after(async () => { await getPool().end(); await server?.stop(); await postgres?.close() })

test("PostgreSQL persists JSON, parameterized searches and guarded resource dispatch", async () => {
  const now = new Date().toISOString()
  const incident = await db.insertIncident({ tipo: "fire", severidad: "high", ubicacion: "Test ' OR 1=1 --", latitud: -26.8, longitud: -65.2, personas_afectadas: 2, fuente: "citizen", fuente_detalles: { related_post_ids: ["post'quoted"], ai_analysis: { arkiv_entity_key: "key'quoted" } }, estado: "activo", created_at: now, updated_at: now })
  assert.equal((await db.findIncidentByPostId("post'quoted"))?.id, incident.id)
  assert.equal((await db.findIncidentByArkivKey("key'quoted"))?.id, incident.id)
  assert.equal(await db.findIncidentByArkivKey("' OR 1=1 --"), null)
  assert.equal((await db.listIncidents({ estado: "activo", sinceIso: now, limit: 1 })).length, 1)
  assert.equal(typeof incident.created_at, "string")
  const resource = await db.insertResource({ tipo: "firefighter", nombre: "Unit test", estado: "available", ubicacion: "Base", incidente_id: null, cantidad: 1, cantidad_disponible: 1, updated_at: now })
  const first = await db.updateResource(resource.id, { estado: "dispatched", incidente_id: incident.id, cantidad_disponible: 0 }, { requireEstado: "available" })
  const second = await db.updateResource(resource.id, { estado: "dispatched", incidente_id: incident.id }, { requireEstado: "available" })
  assert.ok(first)
  assert.equal(second, null)
  assert.equal((await db.listIncidentResources(incident.id))[0].estado, "dispatched")
  await assert.rejects(db.deleteIncident(incident.id))
})

test("assignments replace atomically and reject missing resources without losing assignments", async () => {
  const resource = (await db.listResources())[0]
  await db.replaceAssignments(adminId, operatorId, [resource.id])
  await assert.rejects(db.replaceAssignments(adminId, operatorId, ["missing"]))
  assert.deepEqual(await db.getAssignments(operatorId), [resource.id])
  await assert.rejects(db.replaceAssignments(operatorId, operatorId, []))
  const audit = await getPool().query("SELECT * FROM auditoria_admin WHERE accion='assign_resources'")
  assert.equal(audit.rowCount, 1)
  assert.equal(audit.rows[0].admin_id, adminId)
})

test("Better Auth signs in real hashed accounts, validates cookies and disables public signup", async () => {
  const auth = getAuth()
  const response = await auth.api.signInEmail({ body: { email: "operator@example.test", password: "test-password-local" }, asResponse: true })
  assert.equal(response.status, 200)
  const cookie = response.headers.get("set-cookie")!
  assert.match(cookie, /httponly/i)
  const headers = new Headers({ cookie: cookie.split(";")[0] })
  assert.equal((await auth.api.getSession({ headers }))?.user.id, operatorId)
  await assert.rejects(auth.api.signInEmail({ body: { email: "operator@example.test", password: "wrong-password" } }))
  await assert.rejects(auth.api.signUpEmail({ body: { name: "Intruder", email: "intruder@example.test", password: "test-password-local" } }))
  await db.updateProfile(operatorId, { status: "suspendido" })
  assert.equal(await auth.api.getSession({ headers }), null)
  await assert.rejects(auth.api.signInEmail({ body: { email: "operator@example.test", password: "test-password-local" } }))
})

test("agent logs and configuration round-trip through PostgreSQL", async () => {
  assert.deepEqual(await db.getConfig("agent_mode"), { autonomous: false })
  await db.upsertConfigs([{ clave: "confidence_threshold", valor: { value: 87 } }, { clave: "agent_mode", valor: { autonomous: false } }])
  assert.deepEqual(await db.getConfig("confidence_threshold"), { value: 87 })
  assert.equal(await db.getConfig("missing"), null)
  await db.recordAgentEvent("complete", "Test scan", "Escaneo social")
  assert.equal((await db.listAgentEvents())[0].message, "Test scan")
  assert.equal(typeof await db.lastAgentScan(), "string")
})

test("password recovery tokens are single-use and revoke existing sessions", async () => {
  const auth = getAuth()
  const signed = await auth.api.signInEmail({ body: { email: "admin@example.test", password: "test-password-local" }, asResponse: true })
  const headers = new Headers({ cookie: signed.headers.get("set-cookie")!.split(";")[0] })
  const token = randomBytes(32).toString("hex")
  await getPool().query('INSERT INTO verification(id,identifier,value,"expiresAt") VALUES($1,$2,$3,now()+interval \'1 hour\')', [randomBytes(16).toString("hex"), `reset-password:${token}`, adminId])
  await auth.api.resetPassword({ body: { token, newPassword: "new-test-password-local" } })
  assert.equal(await auth.api.getSession({ headers }), null)
  await assert.rejects(auth.api.resetPassword({ body: { token, newPassword: "another-test-password" } }))
  await assert.rejects(auth.api.signInEmail({ body: { email: "admin@example.test", password: "test-password-local" } }))
  assert.equal((await auth.api.signInEmail({ body: { email: "admin@example.test", password: "new-test-password-local" } })).user.id, adminId)
})

test("HTTP auth rejects foreign origins and rate limits direct login attempts in PostgreSQL", async () => {
  const auth = getAuth()
  const request = (origin: string) => new Request("http://localhost:3000/api/auth/sign-in/email", {
    method: "POST",
    headers: { "content-type": "application/json", origin, "x-forwarded-for": "198.51.100.10" },
    body: JSON.stringify({ email: "missing@example.test", password: "invalid-password" }),
  })
  assert.equal((await auth.handler(request("https://foreign.example.test"))).status, 403)
  let status = 0
  for (let i = 0; i < 11; i++) status = (await auth.handler(request("http://localhost:3000"))).status
  assert.equal(status, 429)
  assert.ok((await getPool().query('SELECT count(*)::int AS count FROM "rateLimit"')).rows[0].count > 0)
})
