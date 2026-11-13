import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { Buffer } from "node:buffer"
import { URL } from "node:url"
import { test } from "node:test"
import ts from "typescript"

const moduleUrl = source => `data:text/javascript;base64,${Buffer.from(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText).toString("base64")}`
const read = file => readFileSync(new URL(file, import.meta.url), "utf8")
const { isPublicPath, isServicePath, roleCanAccess } = await import(moduleUrl(read("../lib/access-policy.ts")))
const { isNonReportIncident } = await import(moduleUrl(read("../lib/types.ts")))

test("citizen pages and verification stay public; operational routes require a session", () => {
  for (const path of ["/mapa", "/reportar", "/seguimiento/123", "/auditoria", "/login", "/recuperar", "/restablecer", "/auth/callback"]) assert.equal(isPublicPath(path, "GET"), true, path)
  for (const path of ["/", "/admin", "/admin/users", "/api/incidentes", "/api/recursos", "/api/operaciones", "/api/agent-logs", "/api/analytics", "/api/simulacion", "/reportar-admin", "/api/public-private"]) assert.equal(isPublicPath(path, "GET"), false, path)
})

test("a tracking UUID is public only for GET and never grants a mutation", () => {
  const path = "/api/incidentes/12345678-1234-4234-8234-123456789012"
  assert.equal(isPublicPath(path, "GET"), true)
  for (const method of ["POST", "PATCH", "DELETE"]) assert.equal(isPublicPath(path, method), false)
  assert.equal(isPublicPath("/api/incidentes/not-a-uuid", "GET"), false)
})

test("roles protect administration, agent scans and operational mutations", () => {
  for (const role of ["operador", "agente_ia", "visualizador"]) {
    assert.equal(roleCanAccess("/admin", "GET", role), false)
    assert.equal(roleCanAccess("/admin/users", "POST", role), false)
    assert.equal(roleCanAccess("/api/agent", "POST", role), false)
  }
  assert.equal(roleCanAccess("/admin", "GET", "admin"), true)
  assert.equal(roleCanAccess("/api/recursos", "PATCH", "operador"), true)
  assert.equal(roleCanAccess("/api/recursos", "PATCH", "visualizador"), false)
  assert.equal(roleCanAccess("/api/incidentes", "DELETE", "agente_ia"), false)
})

test("service credentials never grant access to administration or dispatch", () => {
  assert.equal(isServicePath("/api/agent"), true)
  assert.equal(isServicePath("/api/social/mention"), true)
  for (const path of ["/admin", "/api/recursos", "/api/incidentes/arkiv-dispatch", "/api/social/mention/extra"]) assert.equal(isServicePath(path), false)
})

test("missing database configuration rejects instead of seeding a demo database", async () => {
  const source = "const environment = {};\n" + read("../lib/db.ts").replaceAll("process.env.", "environment.")
  const { getDb } = await import(moduleUrl(source))
  await assert.rejects(getDb(), /Base de datos no configurada/)
})

test("historical simulation and external non-report rows are excluded without deleting data", () => {
  for (const details of [{ simulated: true }, { simulation_engine: true }]) assert.equal(isNonReportIncident({ fuente: "social", fuente_detalles: details }), true)
  assert.equal(isNonReportIncident({ fuente: "sensor", fuente_detalles: { source_api: "usgs" } }), true)
  assert.equal(isNonReportIncident({ fuente: "citizen", fuente_detalles: {} }), false)
  assert.equal(isNonReportIncident({ fuente: "social", fuente_detalles: {} }), false)
})
