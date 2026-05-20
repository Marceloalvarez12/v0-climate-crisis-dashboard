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

  const { data, error } = await supabase
    .from('config_sistema')
    .select('clave, valor')
    .in('clave', [
      'api_google_ai',
      'api_twitter',
      'api_supabase',
      'api_leaflet',
    ])

  if (error) {
    console.error('Error getting API credentials:', error.message)
    return { gemini: '', twitter: '', supabase: '', leaflet: '' }
  }

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

// ============================================
// USER MANAGEMENT (requires service role key)
// ============================================

import { createClient as createAdminClient } from '@supabase/supabase-js'

function getAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY no está configurada. Esta acción requiere acceso de administrador.')
  }
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
  )
}

export interface AdminUser {
  id: string
  name: string
  email: string
  role: 'admin' | 'operador' | 'agente_ia' | 'visualizador'
  status: 'activo' | 'suspendido'
  lastLogin: string | null
}

export async function getUsers(): Promise<AdminUser[]> {
  const supabase = await createClient()

  const { data: profiles, error } = await supabase
    .from('perfiles')
    .select('*')

  if (error) {
    console.error('Error fetching profiles:', error.message)
    return []
  }

  const adminClient = getAdminClient()
  const { data: authData } = await adminClient.auth.admin.listUsers()

  const authUsers = authData?.users || []

  return profiles.map((profile) => {
    const authUser = authUsers.find((u) => u.id === profile.id)
    return {
      id: profile.id,
      name: profile.nombre,
      email: authUser?.email || '',
      role: profile.rol as AdminUser['role'],
      status: (profile.status as AdminUser['status']) || 'activo',
      lastLogin: authUser?.last_sign_in_at || null,
    }
  })
}

export async function updateUserRole(
  userId: string,
  newRole: 'admin' | 'operador' | 'agente_ia' | 'visualizador'
): Promise<{ success: boolean }> {
  const supabase = await createClient()

  const { data: user } = await supabase.auth.getUser()
  if (!user.user) throw new Error('No autorizado')

  const { data: profile } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.user.id)
    .single()

  if (profile?.rol !== 'admin') {
    throw new Error('Solo administradores pueden cambiar roles')
  }

  const { error } = await supabase
    .from('perfiles')
    .update({ rol: newRole })
    .eq('id', userId)

  if (error) throw new Error(error.message)

  await supabase.rpc('registrar_auditoria', {
    p_accion: 'cambio_rol',
    p_detalle: JSON.stringify({
      usuario_afectado: userId,
      rol_anterior: profile.rol,
      rol_nuevo: newRole,
      ejecutado_por: user.user.email,
    }),
  })

  return { success: true }
}

export async function suspendUser(
  userId: string,
  status: 'activo' | 'suspendido'
): Promise<{ success: boolean }> {
  const supabase = await createClient()

  const { data: user } = await supabase.auth.getUser()
  if (!user.user) throw new Error('No autorizado')

  const { data: profile } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.user.id)
    .single()

  if (profile?.rol !== 'admin') {
    throw new Error('Solo administradores pueden suspender usuarios')
  }

  const { error } = await supabase
    .from('perfiles')
    .update({ status })
    .eq('id', userId)

  if (error) throw new Error(error.message)

  await supabase.rpc('registrar_auditoria', {
    p_accion: status === 'suspendido' ? 'suspension_usuario' : 'reactivacion_usuario',
    p_detalle: JSON.stringify({
      usuario_afectado: userId,
      nuevo_estado: status,
      ejecutado_por: user.user.email,
    }),
  })

  return { success: true }
}

export async function resetUserPassword(
  userId: string
): Promise<{ success: boolean }> {
  const supabase = await createClient()

  const { data: user } = await supabase.auth.getUser()
  if (!user.user) throw new Error('No autorizado')

  const { data: profile } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.user.id)
    .single()

  if (profile?.rol !== 'admin') {
    throw new Error('Solo administradores pueden restablecer contraseñas')
  }

  const adminClient = getAdminClient()
  const randomBytes = new Uint8Array(16)
  crypto.getRandomValues(randomBytes)
  const randomPart = Array.from(randomBytes, (b) => b.toString(36)).join('').slice(0, 12)
  const tempPassword = `Znt${randomPart}!A1`

  const { error } = await adminClient.auth.admin.updateUserById(userId, {
    password: tempPassword,
  })

  if (error) throw new Error(error.message)

  await supabase.rpc('registrar_auditoria', {
    p_accion: 'reset_password',
    p_detalle: JSON.stringify({
      usuario_afectado: userId,
      ejecutado_por: user.user.email,
    }),
  })

  return { success: true }
}

// ============================================
// RESOURCE ASSIGNMENT
// ============================================

export async function getOperatorAssignments(
  operatorId: string
): Promise<string[]> {
  const supabase = await createClient()

  const { data: user } = await supabase.auth.getUser()
  if (!user.user) throw new Error('No autorizado')

  const { data: profile } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.user.id)
    .single()

  if (profile?.rol !== 'admin') {
    throw new Error('Solo administradores pueden ver asignaciones')
  }

  const { data, error } = await supabase
    .from('asignaciones_recursos')
    .select('recurso_id')
    .eq('operador_id', operatorId)

  if (error) throw new Error(error.message)

  return data?.map((r) => r.recurso_id) || []
}

export async function assignResourcesToOperator(
  operatorId: string,
  resourceIds: string[]
): Promise<{ success: boolean }> {
  const supabase = await createClient()

  const { data: user } = await supabase.auth.getUser()
  if (!user.user) throw new Error('No autorizado')

  const { data: profile } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.user.id)
    .single()

  if (profile?.rol !== 'admin') {
    throw new Error('Solo administradores pueden asignar recursos')
  }

  const { error: deleteError } = await supabase
    .from('asignaciones_recursos')
    .delete()
    .eq('operador_id', operatorId)

  if (deleteError) throw new Error(deleteError.message)

  if (resourceIds.length > 0) {
    const assignments = resourceIds.map((recurso_id) => ({
      operador_id: operatorId,
      recurso_id,
    }))

    const { error: insertError } = await supabase
      .from('asignaciones_recursos')
      .insert(assignments)

    if (insertError) throw new Error(insertError.message)
  }

  await supabase.rpc('registrar_auditoria', {
    p_accion: 'asignacion_recursos',
    p_detalle: JSON.stringify({
      operador_id: operatorId,
      recursos_asignados: resourceIds.length,
      ejecutado_por: user.user.email,
    }),
  })

  return { success: true }
}
