-- ============================================
-- ZNTINEL - Mission Control Database Setup
-- Ejecutar en: Supabase SQL Editor
-- ============================================

-- 1. Tabla de perfiles vinculada a auth.users
CREATE TABLE IF NOT EXISTS public.perfiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('admin', 'operador', 'agente_ia')),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habilitar Row Level Security
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;

-- 3. Política: cada usuario autenticado solo puede leer su propio perfil
DROP POLICY IF EXISTS "Usuarios leen su propio perfil" ON public.perfiles;
CREATE POLICY "Usuarios leen su propio perfil"
  ON public.perfiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- 4. Función para auto-crear perfil al registrar nuevo usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.perfiles (id, nombre, rol)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'rol', 'operador')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger automático sobre auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- TABLA CONFIG_SISTEMA (Kill Switch del Agente)
-- ============================================

-- 6. Tabla de configuración del sistema
CREATE TABLE IF NOT EXISTS public.config_sistema (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clave TEXT UNIQUE NOT NULL,
  valor JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Insertar configuración inicial del agente
INSERT INTO public.config_sistema (clave, valor)
VALUES ('agent_mode', '{"autonomous": true, "updated_by": "system"}')
ON CONFLICT (clave) DO NOTHING;

-- 8. Habilitar RLS en config_sistema
ALTER TABLE public.config_sistema ENABLE ROW LEVEL SECURITY;

-- 9. Política: todos los autenticados pueden leer la configuración
DROP POLICY IF EXISTS "Todos leen config" ON public.config_sistema;
CREATE POLICY "Todos leen config"
  ON public.config_sistema
  FOR SELECT
  TO authenticated
  USING (true);

-- 10. Política: solo admins pueden modificar la configuración
DROP POLICY IF EXISTS "Solo admins editan config" ON public.config_sistema;
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

-- 11. Función helper para verificar si un usuario es admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.perfiles
    WHERE perfiles.id = auth.uid() AND perfiles.rol = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
