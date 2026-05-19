const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://kyfvmghkkrofyveixlqs.supabase.co'
const SUPABASE_SERVICE_ROLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5ZnZtZ2hra3JvZnl2ZWl4bHFzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzU3OTQ4MCwiZXhwIjoyMDkzMTU1NDgwfQ.GJTDzXEMdvGtxNZrChTThWd456u-W3e5GMcUd8qqq9o'

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)

async function checkAll() {
  const { data, error } = await supabaseAdmin.from('config_sistema').select('*')
  if (error) { console.error('❌', error.message); return }
  console.log('✅ Registros en config_sistema:', data.length)
  data.forEach(r => console.log(`  - ${r.clave}:`, r.valor))
}

checkAll()
