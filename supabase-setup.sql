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
