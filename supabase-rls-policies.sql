-- ============================================
-- ZNTINEL - RLS Policies para tablas faltantes
-- Ejecutar en: Supabase SQL Editor
-- ============================================

-- ============================================
-- TABLA INCIDENTES
-- ============================================

-- 1. Habilitar RLS en incidentes
ALTER TABLE public.incidentes ENABLE ROW LEVEL SECURITY;

-- 2. Política: todos los autenticados pueden leer incidentes activos
DROP POLICY IF EXISTS "Todos leen incidentes activos" ON public.incidentes;
CREATE POLICY "Todos leen incidentes activos"
  ON public.incidentes
  FOR SELECT
  TO authenticated
  USING (estado = 'activo');

-- 3. Política: todos los autenticados pueden leer incidentes atendidos (historial)
DROP POLICY IF EXISTS "Todos leen historial incidentes" ON public.incidentes;
CREATE POLICY "Todos leen historial incidentes"
  ON public.incidentes
  FOR SELECT
  TO authenticated
  USING (estado = 'atendido');

-- 4. Política: solo admins pueden insertar incidentes
DROP POLICY IF EXISTS "Solo admins insertan incidentes" ON public.incidentes;
CREATE POLICY "Solo admins insertan incidentes"
  ON public.incidentes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.perfiles
      WHERE perfiles.id = auth.uid() AND perfiles.rol = 'admin'
    )
  );

-- 5. Política: admins y el agente IA pueden actualizar incidentes
DROP POLICY IF EXISTS "Admins y agente actualizan incidentes" ON public.incidentes;
CREATE POLICY "Admins y agente actualizan incidentes"
  ON public.incidentes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.perfiles
      WHERE perfiles.id = auth.uid() AND perfiles.rol IN ('admin', 'agente_ia')
    )
  );

-- ============================================
-- TABLA RECURSOS
-- ============================================

-- 6. Habilitar RLS en recursos
ALTER TABLE public.recursos ENABLE ROW LEVEL SECURITY;

-- 7. Política: todos los autenticados pueden leer recursos no retirados
DROP POLICY IF EXISTS "Todos leen recursos activos" ON public.recursos;
CREATE POLICY "Todos leen recursos activos"
  ON public.recursos
  FOR SELECT
  TO authenticated
  USING (estado != 'retired');

-- 8. Política: solo admins pueden insertar recursos
DROP POLICY IF EXISTS "Solo admins insertan recursos" ON public.recursos;
CREATE POLICY "Solo admins insertan recursos"
  ON public.recursos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.perfiles
      WHERE perfiles.id = auth.uid() AND perfiles.rol = 'admin'
    )
  );

-- 9. Política: admins pueden actualizar recursos
DROP POLICY IF EXISTS "Solo admins actualizan recursos" ON public.recursos;
CREATE POLICY "Solo admins actualizan recursos"
  ON public.recursos
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.perfiles
      WHERE perfiles.id = auth.uid() AND perfiles.rol = 'admin'
    )
  );

-- 10. Política: admins pueden eliminar recursos
DROP POLICY IF EXISTS "Solo admins eliminan recursos" ON public.recursos;
CREATE POLICY "Solo admins eliminan recursos"
  ON public.recursos
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.perfiles
      WHERE perfiles.id = auth.uid() AND perfiles.rol = 'admin'
    )
  );

-- ============================================
-- TABLA AGENT_LOGS
-- ============================================

-- 11. Habilitar RLS en agent_logs
ALTER TABLE public.agent_logs ENABLE ROW LEVEL SECURITY;

-- 12. Política: todos los autenticados pueden leer logs
DROP POLICY IF EXISTS "Todos leen agent_logs" ON public.agent_logs;
CREATE POLICY "Todos leen agent_logs"
  ON public.agent_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- 13. Política: solo admins y agente IA pueden insertar logs
DROP POLICY IF EXISTS "Admins y agente insertan logs" ON public.agent_logs;
CREATE POLICY "Admins y agente insertan logs"
  ON public.agent_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.perfiles
      WHERE perfiles.id = auth.uid() AND perfiles.rol IN ('admin', 'agente_ia')
    )
  );

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Verificar que todas las tablas tengan RLS habilitado
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('perfiles', 'config_sistema', 'auditoria_admin', 'asignaciones_recursos', 'incidentes', 'recursos', 'agent_logs')
ORDER BY tablename;
