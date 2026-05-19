import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://enkwuaswtbolqqkojltx.supabase.co'
const SUPABASE_SERVICE_ROLE =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVua3d1YXN3dGJvbHFxa29qbHR4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTIwMTU5OCwiZXhwIjoyMDk0Nzc3NTk4fQ.XALuOOiUMC0KYFTjtpDqMZd3-ykT5uTL_HFuh4B73JY'

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)

const users = [
  {
    email: 'admin@zntinel.com',
    password: 'Admin123!',
    nombre: 'Comandante Z',
    rol: 'admin',
  },
  {
    email: 'operador@zntinel.com',
    password: 'Operador123!',
    nombre: 'Operador Alpha',
    rol: 'operador',
  },
]

async function createUsers() {
  console.log('🔐 ZNTINEL - Creando usuarios de prueba...\n')

  for (const user of users) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: {
        nombre: user.nombre,
        rol: user.rol,
      },
    })

    if (error) {
      if (error.message.includes('already been registered')) {
        console.log(`⚠️  ${user.email} — Ya existe`)
      } else {
        console.error(`❌ ${user.email} — Error: ${error.message}`)
      }
    } else {
      console.log(`✅ ${user.email} — Creado (ID: ${data.user.id.slice(0, 8)}...)`)
      console.log(`   Nombre: ${user.nombre}`)
      console.log(`   Rol: ${user.rol}`)
    }
    console.log()
  }

  console.log('📋 Credenciales de prueba:')
  console.log('   admin@zntinel.com / Admin123!')
  console.log('   operador@zntinel.com / Operador123!')
}

createUsers()
