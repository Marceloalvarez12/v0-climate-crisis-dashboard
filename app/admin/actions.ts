'use server'

import { createClient } from '@/lib/supabase/server'

export async function getAgentMode(): Promise<boolean> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('config_sistema')
    .select('valor')
    .eq('clave', 'agent_mode')
    .single()

  if (error || !data) {
    return true
  }

  return (data.valor as { autonomous: boolean }).autonomous
}

export async function updateAgentMode(autonomous: boolean): Promise<{ success: boolean }> {
  const supabase = await createClient()

  const { data: user } = await supabase.auth.getUser()
  if (!user.user) {
    throw new Error('No autorizado')
  }

  const { data: profile } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.user.id)
    .single()

  if (profile?.rol !== 'admin') {
    throw new Error('Solo administradores pueden cambiar el modo del agente')
  }

  const { error } = await supabase
    .from('config_sistema')
    .update({
      valor: {
        autonomous,
        updated_by: user.user.email,
        updated_at: new Date().toISOString(),
      },
    })
    .eq('clave', 'agent_mode')

  if (error) {
    throw new Error(error.message)
  }

  return { success: true }
}

export async function getAgentThresholds(): Promise<{
  autoResolve: number
  confidence: number
}> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('config_sistema')
    .select('clave, valor')
    .in('clave', ['auto_resolve_minutes', 'confidence_threshold'])

  const autoResolve =
    data?.find((r) => r.clave === 'auto_resolve_minutes')
    ? ((data.find((r) => r.clave === 'auto_resolve_minutes')!.valor as { value: number }).value)
    : 5

  const confidence =
    data?.find((r) => r.clave === 'confidence_threshold')
    ? ((data.find((r) => r.clave === 'confidence_threshold')!.valor as { value: number }).value)
    : 80

  return { autoResolve, confidence }
}

export async function updateAgentThresholds(
  autoResolve: number,
  confidence: number
): Promise<{ success: boolean }> {
  const supabase = await createClient()

  const { data: user } = await supabase.auth.getUser()
  if (!user.user) {
    throw new Error('No autorizado')
  }

  const { data: profile } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.user.id)
    .single()

  if (profile?.rol !== 'admin') {
    throw new Error('Solo administradores pueden cambiar la configuración')
  }

  const { error: err1 } = await supabase
    .from('config_sistema')
    .upsert(
      {
        clave: 'auto_resolve_minutes',
        valor: { value: autoResolve, updated_by: user.user.email },
      },
      { onConflict: 'clave' }
    )

  if (err1) throw new Error(err1.message)

  const { error: err2 } = await supabase
    .from('config_sistema')
    .upsert(
      {
        clave: 'confidence_threshold',
        valor: { value: confidence, updated_by: user.user.email },
      },
      { onConflict: 'clave' }
    )

  if (err2) throw new Error(err2.message)

  return { success: true }
}

export async function getApiCredentials(): Promise<Record<string, string>> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('config_sistema')
    .select('clave, valor')
    .in('clave', [
      'api_google_ai',
      'api_twitter',
      'api_supabase',
      'api_leaflet',
    ])

  const keys: Record<string, string> = {}
  const keyMap: Record<string, string> = {
    api_google_ai: 'gemini',
    api_twitter: 'twitter',
    api_supabase: 'supabase',
    api_leaflet: 'leaflet',
  }

  data?.forEach((r) => {
    const serviceId = keyMap[r.clave]
    if (serviceId) {
      keys[serviceId] = (r.valor as { key: string }).key
    }
  })

  return keys
}

export async function saveApiCredentials(
  credentials: Record<string, string>
): Promise<{ success: boolean }> {
  const supabase = await createClient()

  const { data: user } = await supabase.auth.getUser()
  if (!user.user) {
    throw new Error('No autorizado')
  }

  const { data: profile } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.user.id)
    .single()

  if (profile?.rol !== 'admin') {
    throw new Error('Solo administradores pueden cambiar las credenciales')
  }

  const keyMap: Record<string, string> = {
    gemini: 'api_google_ai',
    twitter: 'api_twitter',
    supabase: 'api_supabase',
    leaflet: 'api_leaflet',
  }

  for (const [serviceId, key] of Object.entries(credentials)) {
    const dbKey = keyMap[serviceId]
    if (!dbKey || !key) continue

    const { error } = await supabase
      .from('config_sistema')
      .upsert(
        {
          clave: dbKey,
          valor: { key, updated_by: user.user.email },
        },
        { onConflict: 'clave' }
      )

    if (error) throw new Error(error.message)
  }

  return { success: true }
}
