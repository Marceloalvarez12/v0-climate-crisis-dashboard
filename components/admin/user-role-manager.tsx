"use client"

import { useState } from "react"
import { Users, UserPlus, Search, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { getUsers, updateUserRole, suspendUser, resetUserPassword, type StaffUser } from "@/app/admin/actions"
import { ResourceAssignmentModal } from "./resource-assignment-modal"
import { CreateOperatorModal } from "./create-operator-modal"

export function UserRoleManager({ initialUsers, currentUserId }: { initialUsers: StaffUser[]; currentUserId: string }) {
  const [users, setUsers] = useState(initialUsers)
  const [query, setQuery] = useState("")
  const [pending, setPending] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [assignment, setAssignment] = useState<StaffUser | null>(null)
  async function refresh() {
    try { setUsers(await getUsers()) }
    catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo actualizar la lista de usuarios") }
  }
  async function act(user: StaffUser, operation: () => Promise<void>, message: string) {
    setPending(user.id)
    try { await operation(); toast.success(message); await refresh() }
    catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo completar la acción") }
    finally { setPending(null) }
  }
  const filtered = users.filter(user => `${user.name} ${user.email}`.toLocaleLowerCase("es-AR").includes(query.toLocaleLowerCase("es-AR")))
  return <section className="overflow-hidden rounded-xl border border-[#30373e] bg-[#11161a]">
    <header className="flex items-center gap-3 border-b border-slate-700/50 p-4 sm:p-6"><Users className="h-5 w-5 text-sky-300" /><div><h2 className="text-sm font-semibold">Usuarios y permisos</h2><p className="mt-1 text-xs text-slate-400">Acceso al centro de control y asignación de recursos</p></div></header>
    <div className="flex flex-col gap-3 border-b border-slate-700/50 p-4 sm:flex-row sm:p-6"><label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-600 bg-slate-950 px-3"><Search className="h-4 w-4 shrink-0 text-slate-400" /><input aria-label="Buscar usuarios" placeholder="Nombre o correo" value={query} onChange={event => setQuery(event.target.value)} className="h-11 min-w-0 w-full bg-transparent text-sm outline-none" /></label><button onClick={() => setCreateOpen(true)} className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-sky-300 px-4 text-sm font-semibold text-slate-950"><UserPlus className="h-4 w-4" />Crear operador</button></div>
    <ul className="divide-y divide-slate-700/50">{filtered.length === 0 && <li className="p-6 text-sm text-slate-400">{users.length ? "No hay usuarios que coincidan con la búsqueda." : "No hay usuarios registrados."}</li>}{filtered.map(user => <li key={user.id} className="space-y-3 p-4 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="break-words text-sm font-semibold">{user.name}{user.id === currentUserId && <span className="ml-2 text-xs text-sky-300">Tu cuenta</span>}</p><p className="mt-1 break-all text-xs text-slate-400">{user.email || "Correo no disponible"}</p></div><span className={user.status === "activo" ? "text-xs text-emerald-300" : "text-xs text-amber-300"}>{user.status === "activo" ? "Acceso activo" : "Cuenta suspendida"}</span></div><div className="flex flex-wrap items-center gap-3"><label className="flex items-center gap-2 text-xs text-slate-300"><span>Rol</span><select aria-label={`Rol de ${user.name}`} value={user.role} disabled={pending !== null || user.id === currentUserId} onChange={event => { const role = event.target.value as "admin" | "operador" | "agente_ia"; void act(user, () => updateUserRole(user.id, role), "Rol actualizado") }} className="min-h-10 rounded-lg border border-slate-600 bg-slate-950 px-2 text-sm disabled:opacity-60"><option value="admin">Administrador</option><option value="operador">Operador</option><option value="agente_ia">Agente IA</option>{user.role === "visualizador" && <option value="visualizador" disabled>Solo lectura</option>}</select></label><span className="text-xs text-slate-400">Último acceso: {user.lastLogin ? new Date(user.lastLogin).toLocaleString("es-AR") : "Sin registro"}</span></div><div className="flex flex-wrap gap-2">{user.role === "operador" && user.status === "activo" && <button disabled={pending !== null} onClick={() => setAssignment(user)} className="min-h-10 rounded-lg border border-sky-300/30 px-3 text-xs text-sky-200">Asignar recursos</button>}<button disabled={pending !== null} onClick={() => void act(user, () => resetUserPassword(user.id), "Solicitud de recuperación enviada")} className="min-h-10 rounded-lg border border-slate-600 px-3 text-xs">Enviar recuperación</button>{user.id !== currentUserId && <button disabled={pending !== null} onClick={() => { if (window.confirm(`¿Confirmás ${user.status === "activo" ? "suspender" : "activar"} el acceso de ${user.name}?`)) void act(user, () => suspendUser(user.id, user.status === "activo" ? "suspendido" : "activo"), "Acceso actualizado") }} className="min-h-10 rounded-lg border border-amber-400/30 px-3 text-xs text-amber-200">{user.status === "activo" ? "Suspender acceso" : "Activar acceso"}</button>}{pending === user.id && <Loader2 className="h-4 w-4 animate-spin self-center text-sky-300" />}</div></li>)}</ul>
    <CreateOperatorModal isOpen={createOpen} onClose={() => setCreateOpen(false)} onSuccess={() => { setCreateOpen(false); void refresh() }} />
    {assignment && <ResourceAssignmentModal isOpen onClose={() => setAssignment(null)} operatorId={assignment.id} operatorName={assignment.name} />}
  </section>
}
