import Link from "next/link"
import { AuthCard, authInput, authButton } from "@/components/auth-card"
import { login } from "./actions"

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; reset?: string }> }) {
  const { error, reset } = await searchParams
  const messages: Record<string, string> = { limited: "Demasiados intentos. Intentá nuevamente en unos minutos.", invalid: "Correo o contraseña incorrectos.", forbidden: "La cuenta no tiene acceso operativo activo.", unavailable: "La autenticación no está disponible en este entorno." }
  return <AuthCard title="Acceso al centro de control">{error && <p role="alert" className="text-sm text-red-300">{messages[error] ?? messages.invalid}</p>}{reset && <p className="text-sm text-emerald-300">Contraseña actualizada.</p>}<form action={login} className="space-y-4"><label className="block space-y-2 text-sm"><span>Correo electrónico</span><input className={authInput} name="email" type="email" autoComplete="username" required maxLength={254} /></label><label className="block space-y-2 text-sm"><span>Contraseña</span><input className={authInput} name="password" type="password" autoComplete="current-password" required maxLength={128} /></label><button className={authButton}>Ingresar</button></form><Link className="block text-sm text-sky-300" href="/recuperar">Recuperar contraseña</Link></AuthCard>
}
