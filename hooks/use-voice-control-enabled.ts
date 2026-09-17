import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"

export function useVoiceControlEnabled(): {
  enabled: boolean | null
  refresh: () => Promise<void>
} {
  const [enabled, setEnabled] = useState<boolean | null>(null)

  const fetchFlag = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("config_sistema")
        .select("valor")
        .eq("clave", "voice_control_enabled")
        .single()

      if (error || !data) {
        setEnabled(false)
        return
      }
      setEnabled(Boolean((data.valor as { enabled?: boolean }).enabled))
    } catch {
      setEnabled(false)
    }
  }, [])

  useEffect(() => {
    fetchFlag()
    const id = setInterval(fetchFlag, 15_000)
    return () => clearInterval(id)
  }, [fetchFlag])

  return { enabled, refresh: fetchFlag }
}
