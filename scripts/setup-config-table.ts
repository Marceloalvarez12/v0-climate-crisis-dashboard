const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://kyfvmghkkrofyveixlqs.supabase.co'
const SUPABASE_SERVICE_ROLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5ZnZtZ2hra3JvZnl2ZWl4bHFzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzU3OTQ4MCwiZXhwIjoyMDkzMTU1NDgwfQ.GJTDzXEMdvGtxNZrChTThWd456u-W3e5GMcUd8qqq9o'

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)

async function setupConfigTable() {
  console.log('🔧 Configurando tabla config_sistema...\n')

  const { data, error } = await supabaseAdmin.from('config_sistema').select('*')

  if (error && error.message.includes('Could not find')) {
    console.log('⚠️  La tabla config_sistema NO existe.')
    console.log('   Ejecutá el SQL de supabase-setup.sql en el Supabase SQL Editor.')
    console.log('   O ejecutá este SQL manualmente:\n')
    console.log(`
CREATE TABLE IF NOT EXISTS public.config_sistema (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clave TEXT UNIQUE NOT NULL,
  valor JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.config_sistema (clave, valor)
VALUES ('agent_mode', '{"autonomous": true, "updated_by": "system"}')
ON CONFLICT (clave) DO NOTHING;

ALTER TABLE public.config_sistema ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos leen config"
  ON public.config_sistema
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Solo admins editan config"
  ON public.config_sistema
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.perfiles
      WHERE perfiles.id = auth.uid() AND perfiles.rol = 'admin'
    )
  );
`)
    return
  }

  if (error) {
    console.log('❌ Error:', error.message)
    return
  }

  console.log('✅ Tabla config_sistema existe')
  console.log('   Registros:', data.length)

  const existing = data.find(r => r.clave === 'agent_mode')
  if (!existing) {
    const { error: insertErr } = await supabaseAdmin
      .from('config_sistema')
      .insert({ clave: 'agent_mode', valor: { autonomous: true, updated_by: 'system' } })

    if (insertErr) {
      console.log('❌ Error insertando config:', insertErr.message)
    } else {
      console.log('✅ Configuración agent_mode insertada')
    }
  } else {
    console.log('✅ agent_mode ya existe:', existing.valor)
  }
}

setupConfigTable()
