'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    redirect('/login?error=invalid_credentials')
  }

  const { data: profile } = await supabase
    .from('perfiles')
    .select('rol, status')
    .eq('id', authData.user.id)
    .single()

  if (profile?.status === 'suspendido') {
    await supabase.auth.signOut()
    redirect('/login?error=suspended')
  }

  if (profile?.rol === 'admin') {
    redirect('/admin')
  }

  redirect('/')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()

  const cookieStore = await cookies()
  cookieStore.delete('sb-access-token')
  cookieStore.delete('sb-refresh-token')
  cookieStore.delete(`sb-${process.env.NEXT_PUBLIC_SUPABASE_URL!.split('://')[1].split('.')[0]}-auth-token`)

  redirect('/login')
}
