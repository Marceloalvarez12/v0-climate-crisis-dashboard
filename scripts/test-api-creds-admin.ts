const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://kyfvmghkkrofyveixlqs.supabase.co'
const SUPABASE_SERVICE_ROLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5ZnZtZ2hra3JvZnl2ZWl4bHFzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzU3OTQ4MCwiZXhwIjoyMDkzMTU1NDgwfQ.GJTDzXEMdvGtxNZrChTThWd456u-W3e5GMcUd8qqq9o'

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)

async function test() {
  console.log('Testing with service role key...\n')

  const { data, error } = await supabaseAdmin
    .from('config_sistema')
    .select('*')

  if (error) {
    console.error('❌ Error:', error.message)
    return
  }

  console.log('✅ All records:', data.length)
  data.forEach(r => console.log(`  - ${r.clave}:`, JSON.stringify(r.valor)))

  console.log('\nTesting .in() query for API keys...')
  const { data: apiData, error: apiError } = await supabaseAdmin
    .from('config_sistema')
    .select('clave, valor')
    .in('clave', ['api_google_ai', 'api_twitter', 'api_supabase', 'api_leaflet'])

  if (apiError) {
    console.error('❌ API query error:', apiError.message)
    return
  }

  console.log('✅ API records:', apiData.length)
  apiData.forEach(r => console.log(`  - ${r.clave}:`, JSON.stringify(r.valor)))
}

test()
