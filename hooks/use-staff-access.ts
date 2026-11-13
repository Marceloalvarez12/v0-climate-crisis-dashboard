"use client"

import useSWR from "swr"
import { fetcher } from "@/lib/api"

export function useStaffAccess() {
  const { data } = useSWR<{ id: string; name: string; role: string }>("/api/session", fetcher, { refreshInterval: 30000 })
  return { canOperate: !!data && ["admin", "operador"].includes(data.role), isAdmin: data?.role === "admin" }
}
