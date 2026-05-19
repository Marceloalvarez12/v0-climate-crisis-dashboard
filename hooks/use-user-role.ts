import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface UserProfile {
  nombre: string
  rol: 'admin' | 'operador' | 'agente_ia' | 'visualizador'
}

export function useUserRole() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data } = await supabase
        .from('perfiles')
        .select('nombre, rol')
        .eq('id', user.id)
        .single()

      if (data) {
        setProfile({ nombre: data.nombre, rol: data.rol as UserProfile['rol'] })
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  return { profile, loading, isAdmin: profile?.rol === 'admin', refetch: fetchProfile }
}
