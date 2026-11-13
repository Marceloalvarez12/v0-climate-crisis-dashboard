import { loadEnvConfig } from "@next/env"
import { createInterface } from "node:readline/promises"
import { stdin, stdout } from "node:process"
import { Writable } from "node:stream"
import { z } from "zod"
import { createAccount } from "../lib/accounts"
import { getPool } from "../lib/postgres"

loadEnvConfig(process.cwd())
async function main() {
  let muted = false
  const output = new Writable({ write(chunk, _encoding, done) { if (!muted) stdout.write(chunk); done() } })
  const terminal = createInterface({ input: stdin, output, terminal: stdin.isTTY })
  try {
    const nombre = process.env.BOOTSTRAP_ADMIN_NAME || await terminal.question("Nombre del administrador: ")
    const email = process.env.BOOTSTRAP_ADMIN_EMAIL || await terminal.question("Email: ")
    // Credentials are read from the terminal, never command arguments or logs.
    let password = process.env.BOOTSTRAP_ADMIN_PASSWORD
    if (!password) {
      if (!stdin.isTTY) throw new Error("Usá una terminal interactiva para ingresar la contraseña")
      const answer = terminal.question("Contraseña (12–128 caracteres; oculta): ")
      muted = true
      password = await answer
      muted = false
      stdout.write("\n")
    }
    const input = z.object({ nombre: z.string().trim().min(2).max(120), email: z.string().trim().email().max(254), password: z.string().min(12).max(128) }).parse({ nombre, email, password })
    const exists = await getPool().query("SELECT id FROM perfiles WHERE rol='admin' AND status='activo' LIMIT 1")
    if (exists.rowCount) throw new Error("Ya existe un administrador activo. Gestioná las cuentas desde el panel.")
    await createAccount(input, "admin")
    console.log("Administrador creado. Ya podés iniciar sesión.")
  } finally { terminal.close() }
}
main().catch(() => { console.error("No se creó el administrador. Revisá el esquema, los datos ingresados y que no exista ya la cuenta."); process.exitCode = 1 }).finally(async () => { if (process.env.DATABASE_URL) await getPool().end() })
