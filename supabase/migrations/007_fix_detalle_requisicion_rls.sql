-- ============================================================
-- MIGRACIÓN 007: Corregir políticas RLS para detalle_requisicion
-- El problema: La política para UPDATE estaba rechazando silenciosamente
-- debido a un problema en cómo se castea el rol a text
-- Solución: Usar sintaxis más robusta y directa
-- ============================================================

-- Detalle requisición: UPDATE con política mejorada
DROP POLICY IF EXISTS "actualizar_detalle_por_admin_almacen" ON public.detalle_requisicion;

CREATE POLICY "actualizar_detalle_por_admin_almacen"
ON public.detalle_requisicion
FOR UPDATE
TO authenticated
USING (
  -- Verificar que el usuario es admin, almacen o superadmin
  auth.uid() IN (
    SELECT id FROM public.usuarios 
    WHERE rol IN ('admin'::user_role, 'almacen'::user_role, 'superadmin'::user_role)
  )
)
WITH CHECK (
  -- Verificar que el usuario es admin, almacen o superadmin
  auth.uid() IN (
    SELECT id FROM public.usuarios 
    WHERE rol IN ('admin'::user_role, 'almacen'::user_role, 'superadmin'::user_role)
  )
);

-- También crear una política para INSERT en detalle_requisicion si no existe
DROP POLICY IF EXISTS "detalle_insert" ON public.detalle_requisicion;

CREATE POLICY "detalle_insert" ON public.detalle_requisicion
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM public.usuarios 
    WHERE rol IN ('admin'::user_role, 'almacen'::user_role, 'superadmin'::user_role)
  )
);

-- También crear una política para DELETE en detalle_requisicion
DROP POLICY IF EXISTS "eliminar_detalle_por_admin_almacen" ON public.detalle_requisicion;

CREATE POLICY "eliminar_detalle_por_admin_almacen"
ON public.detalle_requisicion
FOR DELETE
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM public.usuarios 
    WHERE rol IN ('admin'::user_role, 'almacen'::user_role, 'superadmin'::user_role)
  )
);
