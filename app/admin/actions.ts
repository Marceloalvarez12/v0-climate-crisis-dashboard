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
