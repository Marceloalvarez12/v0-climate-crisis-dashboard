import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useAgentMode() {
  const [isAutonomous, setIsAutonomous] = useState(true)

  const fetchMode = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('config_sistema')
        .select('valor')
        .eq('clave', 'agent_mode')
        .single()

      if (!error && data) {
        setIsAutonomous((data.valor as { autonomous: boolean }).autonomous)
      }
    } catch {
      // Fallback to true
    }
  }, [])

  useEffect(() => {
    fetchMode()
    const interval = setInterval(fetchMode, 10000)
    return () => clearInterval(interval)
  }, [fetchMode])

  return isAutonomous
}
