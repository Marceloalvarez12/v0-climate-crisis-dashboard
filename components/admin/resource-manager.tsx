"use client"

import { useState, useCallback, useEffect } from "react"
import {
  Truck,
  Ambulance,
  Shield,
  Ship,
  Plane,
  Plus,
  Edit,
  Trash2,
  Search,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ResourceFormModal } from "./resource-form-modal"
import { toast } from "sonner"

interface DbResource {
  id: string
  tipo: string
  nombre: string
  numero: string
  estado: string
  ubicacion: string
}

const RESOURCE_ICONS: Record<string, React.ReactNode> = {
  ambulance: <Ambulance className="h-4 w-4" />,
  firefighter: <Truck className="h-4 w-4" />,
  helicopter: <Plane className="h-4 w-4" />,
  boat: <Ship className="h-4 w-4" />,
  shelter: <Truck className="h-4 w-4" />,
  medical: <Ambulance className="h-4 w-4" />,
  police: <Shield className="h-4 w-4" />,
}

const RESOURCE_LABELS: Record<string, string> = {
  ambulance: "Ambulancia",
  firefighter: "Bomberos",
  helicopter: "Helicóptero",
  boat: "Lancha",
  shelter: "Albergue",
  medical: "Médico",
  police: "Policía",
}

const STATUS_STYLES: Record<string, string> = {
  available: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  dispatched: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  busy: "bg-red-500/10 text-red-400 border-red-500/20",
  retired: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
}

const STATUS_LABELS: Record<string, string> = {
  available: "Disponible",
  dispatched: "En Camino",
  busy: "Ocupado",
  retired: "Retirado",
}

export function ResourceManager() {
  const [resources, setResources] = useState<DbResource[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [showFormModal, setShowFormModal] = useState(false)
  const [editResource, setEditResource] = useState<DbResource | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadResources = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/recursos")
      if (res.ok) {
        const data = await res.json()
        setResources(Array.isArray(data) ? data : [])
      }
    } catch {
      setResources([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadResources()
  }, [loadResources])

  const filteredResources = resources.filter(
    (r) =>
      r.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.ubicacion.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (RESOURCE_LABELS[r.tipo] || "").toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleDelete = async (resource: DbResource) => {
    if (!confirm(`¿Retirar "${resource.nombre}" del sistema?`)) return

    setDeletingId(resource.id)
    try {
      const res = await fetch(`/api/recursos?id=${resource.id}`, { method: "DELETE" })
      if (res.ok) {
        setResources((prev) => prev.filter((r) => r.id !== resource.id))
        toast.success("Recurso retirado del sistema")
      } else {
        toast.error("Error al retirar recurso")
      }
    } catch {
      toast.error("Error de conexión")
    } finally {
      setDeletingId(null)
    }
  }

  const handleFormSuccess = () => {
    setShowFormModal(false)
    setEditResource(null)
    loadResources()
    toast.success(editResource ? "Recurso actualizado" : "Recurso creado")
  }

  const openEdit = (resource: DbResource) => {
    setEditResource(resource)
    setShowFormModal(true)
  }

  const openCreate = () => {
    setEditResource(null)
    setShowFormModal(true)
  }

  const stats = {
    total: resources.length,
    available: resources.filter((r) => r.estado === "available").length,
    dispatched: resources.filter((r) => r.estado === "dispatched").length,
    busy: resources.filter((r) => r.estado === "busy").length,
  }

  return (
    <div className="flex flex-col h-full rounded-xl border border-zinc-800 bg-zinc-950/80 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-zinc-800 px-6 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
          <Truck className="h-5 w-5 text-orange-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">
            Gestión de Recursos
          </h2>
          <p className="text-[11px] text-zinc-500">
            Administrar unidades, vehículos y equipos del sistema
          </p>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 px-6 py-3 border-b border-zinc-800/50 bg-zinc-900/20">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-[10px] text-zinc-500 font-mono">
            {stats.available} disponibles
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-yellow-500" />
          <span className="text-[10px] text-zinc-500 font-mono">
            {stats.dispatched} en camino
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-red-500" />
          <span className="text-[10px] text-zinc-500 font-mono">
            {stats.busy} ocupados
          </span>
        </div>
        <span className="text-[10px] text-zinc-600 font-mono ml-auto">
          Total: {stats.total}
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-800/50">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, tipo o ubicación..."
            className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all"
          />
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-500 active:scale-95 transition-all"
        >
          <Plus className="h-4 w-4" />
          Añadir Recurso
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto overflow-x-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-orange-400" />
            <p className="text-xs text-zinc-500">Cargando recursos...</p>
          </div>
        ) : filteredResources.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-zinc-600">
            <Truck className="h-8 w-8 mb-2" />
            <p className="text-sm">No se encontraron recursos</p>
            <p className="text-xs mt-1">
              {searchQuery ? "Intenta con otro término de búsqueda" : "Añade un nuevo recurso para comenzar"}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="sticky top-0 z-10 border-b border-zinc-800/50 bg-zinc-950">
                <th className="text-left px-6 py-3 text-[10px] font-mono tracking-widest uppercase text-zinc-600">
                  Recurso
                </th>
                <th className="text-left px-6 py-3 text-[10px] font-mono tracking-widest uppercase text-zinc-600">
                  N°
                </th>
                <th className="text-left px-6 py-3 text-[10px] font-mono tracking-widest uppercase text-zinc-600">
                  Tipo
                </th>
                <th className="text-left px-6 py-3 text-[10px] font-mono tracking-widest uppercase text-zinc-600">
                  Estado
                </th>
                <th className="text-left px-6 py-3 text-[10px] font-mono tracking-widest uppercase text-zinc-600">
                  Base
                </th>
                <th className="text-right px-6 py-3 text-[10px] font-mono tracking-widest uppercase text-zinc-600">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/30">
              {filteredResources.map((resource) => (
                <tr key={resource.id} className="transition-colors hover:bg-zinc-900/20">
                  {/* Recurso */}
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400">
                        {RESOURCE_ICONS[resource.tipo] || <Truck className="h-4 w-4" />}
                      </div>
                      <span className="font-medium text-zinc-200">
                        {resource.nombre}
                      </span>
                    </div>
                  </td>

                  {/* Número */}
                  <td className="px-6 py-3">
                    <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
                      {resource.numero || "-"}
                    </span>
                  </td>

                  {/* Tipo */}
                  <td className="px-6 py-3">
                    <span className="text-xs text-zinc-400">
                      {RESOURCE_LABELS[resource.tipo] || resource.tipo}
                    </span>
                  </td>

                  {/* Estado */}
                  <td className="px-6 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
                        STATUS_STYLES[resource.estado] || STATUS_STYLES.available
                      )}
                    >
                      <div
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          resource.estado === "available" ? "bg-emerald-400" :
                          resource.estado === "dispatched" ? "bg-yellow-400" :
                          resource.estado === "busy" ? "bg-red-400" : "bg-zinc-500"
                        )}
                      />
                      {STATUS_LABELS[resource.estado] || resource.estado}
                    </span>
                  </td>

                  {/* Base */}
                  <td className="px-6 py-3">
                    <span className="text-xs text-zinc-500 font-mono">
                      {resource.ubicacion}
                    </span>
                  </td>

                  {/* Acciones */}
                  <td className="px-6 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(resource)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-cyan-400 hover:bg-zinc-800 transition-colors"
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(resource)}
                        disabled={deletingId === resource.id}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors disabled:opacity-30"
                        title="Retirar"
                      >
                        {deletingId === resource.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Form Modal */}
      <ResourceFormModal
        isOpen={showFormModal}
        onClose={() => {
          setShowFormModal(false)
          setEditResource(null)
        }}
        onSuccess={handleFormSuccess}
        editResource={editResource}
      />
    </div>
  )
}
