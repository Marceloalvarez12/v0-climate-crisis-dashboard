import { AuthCard, authInput, authButton } from "@/components/auth-card"
import { recoverPassword } from "@/app/login/actions"

export default async function Recover({ searchParams }: { searchParams: Promise<{ error?: string; sent?: string }> }) {
  const { error, sent } = await searchParams
  return <AuthCard title="Recuperar acceso">{sent ? <p role="status">Si existe una cuenta con ese correo, recibirás las instrucciones.</p> : <><p className="text-sm text-slate-300">Ingresá el correo de tu cuenta operativa.</p>{error && <p role="alert" className="text-sm text-red-300">No se pudo enviar la solicitud. Revisá el correo o intentá más tarde.</p>}<form action={recoverPassword} className="space-y-4"><label className="block space-y-2 text-sm"><span>Correo electrónico</span><input name="email" type="email" autoComplete="email" required className={authInput} /></label><button className={authButton}>Enviar enlace</button></form></>}</AuthCard>
}
