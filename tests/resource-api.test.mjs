import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { Buffer } from "node:buffer"
import { URL, pathToFileURL } from "node:url"
import { createRequire } from "node:module"
import { test } from "node:test"
import ts from "typescript"

const require = createRequire(import.meta.url)
const moduleUrl = source => `data:text/javascript;base64,${Buffer.from(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText).toString("base64")}`
const read = file => readFileSync(new URL(file, import.meta.url), "utf8")
const contextKey = "__zntinel_resource_api_test__"
const fixtureUrl = moduleUrl(`
  export async function getDb() { return globalThis.${contextKey}.db }
  export async function requireStaff(role) {
    const actor = globalThis.${contextKey}.actor;
    if (!actor || (role && actor.rol !== role)) throw new Error('Forbidden');
    return { profile: actor, user: { id: 'operator-id' } };
  }
  export const apiSuccess = (data, status = 200) => Response.json(data, {status});
  export const apiError = (error, status = 500) => Response.json({error}, {status});
  export const apiValidationError = details => Response.json({error: 'Validation error', details}, {status: 400});
`)
const validationUrl = moduleUrl(read("../lib/validation.ts").replace('"zod"', JSON.stringify(pathToFileURL(require.resolve("zod")).href)))
const helpersUrl = moduleUrl(read("../lib/resource-helpers.ts"))
const { groupResourcesByTypeAndBase } = await import(helpersUrl)
const typesUrl = moduleUrl(read("../lib/types.ts"))
let source = read("../app/api/recursos/route.ts")
for (const [specifier, url] of Object.entries({ "@/lib/db": fixtureUrl, "@/lib/auth": fixtureUrl, "@/lib/services/api-response": fixtureUrl, "@/lib/validation": validationUrl, "@/lib/resource-helpers": helpersUrl, "@/lib/types": typesUrl })) source = source.replaceAll(JSON.stringify(specifier), JSON.stringify(url))
const route = await import(moduleUrl(source))

function fixture(role = "operador") {
  const state = { resource: { id: "resource", estado: "available", incidente_id: null, cantidad: 2, cantidad_disponible: 2 }, writes: 0 }
  globalThis[contextKey] = { actor: { rol: role }, db: {
    findResourceById: async () => ({ ...state.resource }),
    findIncidentById: async id => id === "incident" ? { id, estado: "activo", fuente: "citizen", fuente_detalles: {} } : null,
    updateResource: async (_, update, options) => {
      if (options?.requireEstado && options.requireEstado !== state.resource.estado) return null
      state.writes++
      Object.assign(state.resource, update)
      return { ...state.resource }
    },
  } }
  return state
}
const patch = body => route.PATCH({ json: async () => body })

test("dispatch claims one real resource; a concurrent claim receives 409", async () => {
  const state = fixture()
  const results = await Promise.all([patch({ id: "resource", estado: "dispatched", incidente_id: "incident" }), patch({ id: "resource", estado: "dispatched", incidente_id: "incident" })])
  assert.deepEqual(results.map(r => r.status).sort(), [200, 409])
  assert.equal(state.writes, 1)
  assert.equal(state.resource.incidente_id, "incident")
  assert.equal(state.resource.cantidad_disponible, 0)
})

test("arrival and release happen only on explicit operator requests", async () => {
  const state = fixture()
  assert.equal((await patch({ id: "resource", estado: "dispatched", incidente_id: "incident" })).status, 200)
  assert.equal(state.resource.estado, "dispatched")
  assert.equal((await patch({ id: "resource", estado: "busy" })).status, 200)
  assert.equal(state.resource.estado, "busy")
  assert.equal((await patch({ id: "resource", estado: "available" })).status, 200)
  assert.equal(state.resource.incidente_id, null)
  assert.equal(state.resource.cantidad_disponible, 2)
})

test("invalid incident, direct busy state and mixed state/quantity requests cannot write", async () => {
  const state = fixture()
  assert.equal((await patch({ id: "resource", estado: "dispatched", incidente_id: "missing" })).status, 400)
  assert.equal((await patch({ id: "resource", estado: "busy" })).status, 409)
  assert.equal((await patch({ id: "resource", estado: "dispatched", incidente_id: "incident", cantidad_disponible: 2 })).status, 400)
  assert.equal(state.writes, 0)
})

test("read-only staff cannot dispatch and operators cannot edit admin fields", async () => {
  const state = fixture("visualizador")
  assert.equal((await patch({ id: "resource", estado: "dispatched", incidente_id: "incident" })).status, 403)
  globalThis[contextKey].actor.rol = "operador"
  assert.equal((await patch({ id: "resource", nombre: "Renamed" })).status, 403)
  assert.equal((await route.DELETE({ url: "http://localhost/api/recursos?id=resource" })).status, 403)
  assert.equal(state.writes, 0)
})

test("a retired resource is never reused by dispatch", async () => {
  const state = fixture()
  state.resource.estado = "retired"
  assert.equal((await patch({ id: "resource", estado: "dispatched", incidente_id: "incident" })).status, 409)
  assert.equal(state.writes, 0)
})

test("administration cannot retire an assigned resource or resize it during service", async () => {
  const state = fixture("admin")
  Object.assign(state.resource, { estado: "dispatched", incidente_id: "incident", cantidad_disponible: 0 })
  assert.equal((await route.DELETE({ url: "http://localhost/api/recursos?id=resource" })).status, 409)
  assert.equal((await patch({ id: "resource", cantidad: 3 })).status, 409)
  assert.equal(state.writes, 0)
})

test("editing the card never implies that a dispatched resource has arrived", async () => {
  const state = fixture("admin")
  Object.assign(state.resource, { estado: "dispatched", incidente_id: "incident", cantidad_disponible: 0 })
  assert.equal((await patch({ id: "resource", nombre: "New name", cantidad: 2 })).status, 200)
  assert.equal(state.resource.estado, "dispatched")
  assert.equal(state.resource.incidente_id, "incident")
})

test("resource groups never count dispatched or busy units as available", () => {
  const rows = ["available", "dispatched", "busy"].map(estado => ({ id: estado, tipo: "ambulance", ubicacion: "Base", cantidad: 2, cantidad_disponible: 2, estado }))
  const [group] = groupResourcesByTypeAndBase(rows)
  assert.equal(group.totalCantidad, 6)
  assert.equal(group.totalDisponible, 2)
})
