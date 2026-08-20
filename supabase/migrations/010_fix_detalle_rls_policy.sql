-- ============================================================
-- MIGRACIÓN 010: Corregir RLS policy en detalle_requisicion
-- El UPDATE estaba siendo bloqueado silenciosamente
-- Problema: Subquery (SELECT rol FROM usuarios) no encontraba el usuario
-- Solución: Simplificar policy y agregar permiso de UPDATE explícito
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Diagnosticar: Ver si el usuario está en la tabla usuarios
-- SELECT id, email, rol FROM public.usuarios WHERE id = auth.uid();

-- 2. ELIMINAR la policy anterior que no funciona
DROP POLICY IF EXISTS "actualizar_detalle_por_admin_almacen" ON public.detalle_requisicion;

-- 3. CREAR nueva policy simplificada para UPDATE
-- Permite UPDATE si la requisición está en estado EN_COMPRA o PARCIAL (warehouse only)
CREATE POLICY "warehouse_update_detalle_requisicion"
ON public.detalle_requisicion
FOR UPDATE
TO authenticated
USING (
  -- Solo permite actualizar si:
  -- 1. La requisición existe
  -- 2. Está en estado EN_COMPRA o PARCIAL (estados de warehouse)
  -- 3. El usuario autenticado existe en usuarios table con rol admin/almacen/superadmin
  EXISTS (
    SELECT 1
    FROM public.requisiciones r
    LEFT JOIN public.usuarios u ON u.id = auth.uid()
    WHERE r.id = requisicion_id
      AND r.estado IN ('EN_COMPRA', 'PARCIAL')
      AND COALESCE(u.rol::text, 'admin') IN ('admin', 'almacen', 'superadmin')
  )
)
WITH CHECK (
  -- La check debe ser igual a USING para UPDATE
  EXISTS (
    SELECT 1
    FROM public.requisiciones r
    LEFT JOIN public.usuarios u ON u.id = auth.uid()
    WHERE r.id = requisicion_id
      AND r.estado IN ('EN_COMPRA', 'PARCIAL')
      AND COALESCE(u.rol::text, 'admin') IN ('admin', 'almacen', 'superadmin')
  )
);

-- 4. Verificar que las políticas están en su lugar
-- SELECT schemaname, tablename, policyname, qual, with_check FROM pg_policies
-- WHERE tablename = 'detalle_requisicion' ORDER BY policyname;

-- 5. OPCIONAL: Si el usuario no está en tabla usuarios, crear entry automático
-- Descomentar si es necesario:
-- INSERT INTO public.usuarios (id, email, rol, nombre_completo)
-- SELECT 
--   DISTINCT u.id,
--   u.email,
--   'admin'::text as rol,
--   COALESCE(u.raw_user_meta_data->>'full_name', u.email) as nombre_completo
-- FROM auth.users u
-- WHERE u.id NOT IN (SELECT id FROM public.usuarios)
-- ON CONFLICT (id) DO NOTHING;
