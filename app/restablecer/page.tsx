import { AuthCard, authInput, authButton } from "@/components/auth-card"
import { resetPassword } from "@/app/login/actions"

export default async function Reset({ searchParams }: { searchParams: Promise<{ error?: string; token?: string }> }) {
  const { error, token } = await searchParams
  return <AuthCard title="Nueva contraseña">{error && <p role="alert" className="text-sm text-red-300">No se pudo actualizar la contraseña. Verificá el enlace y que ambas claves coincidan.</p>}<form action={resetPassword} className="space-y-4"><input type="hidden" name="token" value={token ?? ""} /><label className="block space-y-2 text-sm"><span>Nueva contraseña (mínimo 12 caracteres)</span><input className={authInput} name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required /></label><label className="block space-y-2 text-sm"><span>Confirmar contraseña</span><input className={authInput} name="confirm" type="password" autoComplete="new-password" minLength={12} maxLength={128} required /></label><button className={authButton}>Guardar contraseña</button></form></AuthCard>
}
