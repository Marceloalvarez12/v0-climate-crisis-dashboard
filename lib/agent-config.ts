import { createClient } from '@/lib/supabase/client'

export interface AgentMode {
  autonomous: boolean
  updatedAt?: string
  updatedBy?: string
}

export interface AgentThresholds {
  autoResolveMinutes: number
  confidenceThreshold: number
}

export async function getAgentMode(): Promise<AgentMode> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('config_sistema')
    .select('valor')
    .eq('clave', 'agent_mode')
    .single()

  if (error || !data) {
    return { autonomous: true }
  }

  const valor = data.valor as { autonomous: boolean; updated_at?: string; updated_by?: string }
  return {
    autonomous: valor.autonomous,
    updatedAt: valor.updated_at,
    updatedBy: valor.updated_by,
  }
}

export async function getAgentThresholds(): Promise<AgentThresholds> {
  const supabase = createClient()
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

  return { autoResolveMinutes: autoResolve, confidenceThreshold: confidence }
}
