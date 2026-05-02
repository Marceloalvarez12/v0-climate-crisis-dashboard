"use client"

import { useEffect, useCallback } from "react"
import { useSWRConfig } from "swr"

interface AutoResolveOptions {
  // Called for each auto-resolved incident location so the UI can log it
  onResolved?: (locations: string[]) => void
  // How often to check for stale incidents (ms). Defaults to 60 seconds.
  intervalMs?: number
}

/**
 * Periodically checks for active incidents older than 60 minutes and
 * marks them as "atendido" via the auto-resolve API endpoint.
 *
 * Kept as a standalone hook so it can be mounted independently from any
 * UI component without coupling to ai-activity-log or the simulation loop.
 * To connect a real external source, replace the fetch call with your API.
 */
export function useAutoResolve({ onResolved, intervalMs = 60_000 }: AutoResolveOptions = {}) {
  const { mutate } = useSWRConfig()

  const check = useCallback(async () => {
    try {
      const res = await fetch("/api/incidentes/auto-resolve", { method: "POST" })
      if (!res.ok) return
      const data = await res.json()
      if (data.resolved > 0) {
        mutate("/api/incidentes")
        mutate("/api/analytics")
        onResolved?.(data.locations ?? [])
      }
    } catch {
      // Non-blocking — never crash the UI if the network call fails
    }
  }, [mutate, onResolved])

  useEffect(() => {
    // Run once immediately on mount, then on the given interval
    check()
    const id = setInterval(check, intervalMs)
    return () => clearInterval(id)
  }, [check, intervalMs])
}
