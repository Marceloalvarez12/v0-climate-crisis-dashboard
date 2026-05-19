const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://kyfvmghkkrofyveixlqs.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5ZnZtZ2hra3JvZnl2ZWl4bHFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1Nzk0ODAsImV4cCI6MjA5MzE1NTQ4MH0.j9eRdZlk5IST5ei2yZTKtReZfJUgJImReYySq7LnG5Q'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function test() {
  console.log('Testing config_sistema query...\n')

  const { data, error } = await supabase
    .from('config_sistema')
    .select('clave, valor')
    .in('clave', ['api_google_ai', 'api_twitter', 'api_supabase', 'api_leaflet'])

  if (error) {
    console.error('❌ Error:', error.message)
    console.error('   Code:', error.code)
    console.error('   Details:', error.details)
    return
  }

  console.log('✅ Query OK, records:', data.length)
  data.forEach(r => console.log(`  - ${r.clave}:`, r.valor))
}

test()
