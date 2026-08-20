-- Migración 007: Corregir política RLS para detalle_requisicion
-- Problema: La política anterior rechazaba silenciosamente los UPDATEs
-- Solución: Usar comparación directa de enum sin casting a text

DROP POLICY IF EXISTS "actualizar_detalle_por_admin_almacen" ON public.detalle_requisicion;

CREATE POLICY "actualizar_detalle_por_admin_almacen"
ON public.detalle_requisicion
FOR UPDATE
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM public.usuarios 
    WHERE rol IN ('admin'::user_role, 'almacen'::user_role, 'superadmin'::user_role)
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM public.usuarios 
    WHERE rol IN ('admin'::user_role, 'almacen'::user_role, 'superadmin'::user_role)
  )
);

-- Crear política para INSERT si no existe
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
