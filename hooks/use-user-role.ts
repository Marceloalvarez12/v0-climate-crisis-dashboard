import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface UserProfile {
  nombre: string
  rol: 'admin' | 'operador' | 'agente_ia' | 'visualizador'
}

const CACHE_KEY = 'zntinel_user_profile'
const CACHE_DURATION = 30000 // 30 seconds

interface CacheEntry {
  profile: UserProfile
  timestamp: number
}

export function useUserRole() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async () => {
    // Check cache first
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        const entry: CacheEntry = JSON.parse(cached)
        if (Date.now() - entry.timestamp < CACHE_DURATION) {
          setProfile(entry.profile)
          setLoading(false)
          return
        }
      }
    } catch {
      // Cache invalid, proceed with fetch
    }

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
        const userProfile = { nombre: data.nombre, rol: data.rol as UserProfile['rol'] }
        setProfile(userProfile)
        localStorage.setItem(CACHE_KEY, JSON.stringify({ profile: userProfile, timestamp: Date.now() }))
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
