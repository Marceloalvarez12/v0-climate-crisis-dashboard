import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface UserProfile {
  nombre: string
  rol: 'admin' | 'operador' | 'agente_ia' | 'visualizador'
}

const getCacheKey = (userId: string) => `zntinel_user_profile_${userId}`
const CACHE_DURATION = 30000 // 30 seconds

interface CacheEntry {
  profile: UserProfile
  timestamp: number
}

function clearProfileCache() {
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('zntinel_user_profile_')) {
      localStorage.removeItem(key)
    }
  })
}

export function useUserRole() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setProfile(null)
        setLoading(false)
        return
      }

      const cacheKey = getCacheKey(user.id)
      try {
        const cached = localStorage.getItem(cacheKey)
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

      const { data } = await supabase
        .from('perfiles')
        .select('nombre, rol')
        .eq('id', user.id)
        .single()

      if (data) {
        const userProfile = { nombre: data.nombre, rol: data.rol as UserProfile['rol'] }
        setProfile(userProfile)
        localStorage.setItem(cacheKey, JSON.stringify({ profile: userProfile, timestamp: Date.now() }))
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProfile()

    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        clearProfileCache()
        fetchProfile()
      }
    })

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  return { profile, loading, isAdmin: profile?.rol === 'admin', refetch: fetchProfile }
}
