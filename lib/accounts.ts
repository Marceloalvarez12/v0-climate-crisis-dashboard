import { randomUUID } from "node:crypto"
import { hashPassword } from "better-auth/crypto"
import { transaction } from "./postgres"

export async function createAccount(input: { nombre: string; email: string; password: string }, role: "admin" | "operador") {
  if (input.password.length < 12 || input.password.length > 128) throw new Error("La contraseña debe tener entre 12 y 128 caracteres")
  const id = randomUUID(), password = await hashPassword(input.password)
  const email = input.email.trim().toLowerCase()
  await transaction(async client => {
    if (role === "admin") {
      await client.query("SELECT pg_advisory_xact_lock(20261113)")
      const existing = await client.query("SELECT id FROM perfiles WHERE rol='admin' AND status='activo' LIMIT 1")
      if (existing.rowCount) throw new Error("Ya existe un administrador activo")
    }
    await client.query('INSERT INTO "user" (id,name,email,"emailVerified","createdAt","updatedAt") VALUES ($1,$2,$3,true,now(),now())', [id, input.nombre, email])
    await client.query('INSERT INTO account (id,"accountId","providerId","userId",password,"createdAt","updatedAt") VALUES ($1,$2,\'credential\',$2,$3,now(),now())', [randomUUID(), id, password])
    await client.query("INSERT INTO perfiles (id,nombre,rol,status) VALUES ($1,$2,$3,'activo')", [id, input.nombre, role])
  })
  return { id, nombre: input.nombre, email, rol: role, status: "activo", last_sign_in_at: null }
}
