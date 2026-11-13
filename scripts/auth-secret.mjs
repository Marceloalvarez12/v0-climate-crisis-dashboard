import { randomBytes } from "node:crypto"
import console from "node:console"
import { readFileSync, writeFileSync, existsSync } from "node:fs"

const file = ".env.local"
const content = existsSync(file) ? readFileSync(file, "utf8") : readFileSync(".env.example", "utf8")
if (/^BETTER_AUTH_SECRET=.+$/m.test(content)) console.log("BETTER_AUTH_SECRET ya existe; se conserva.")
else {
  const line = `BETTER_AUTH_SECRET=${randomBytes(48).toString("base64url")}`
  writeFileSync(file, /^BETTER_AUTH_SECRET=.*$/m.test(content) ? content.replace(/^BETTER_AUTH_SECRET=.*$/m, line) : `${content}\n${line}\n`, { mode: 0o600 })
  console.log("Se guardó un secreto de sesión en .env.local (no se muestra en pantalla).")
}
