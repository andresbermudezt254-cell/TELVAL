-- ============================================================
-- MIGRACIÓN 006: RLS para visibilidad por rol (admin/almacen/superadmin)
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Requisiciones: SELECT por rol
ALTER TABLE public.requisiciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_ve_todas_requisiciones" ON public.requisiciones;
CREATE POLICY "admin_ve_todas_requisiciones"
ON public.requisiciones
FOR SELECT
TO authenticated
USING (
  (SELECT rol::text FROM public.usuarios WHERE id = auth.uid()) IN ('admin', 'almacen', 'superadmin')
);

DROP POLICY IF EXISTS "empleado_ve_sus_requisiciones" ON public.requisiciones;
CREATE POLICY "empleado_ve_sus_requisiciones"
ON public.requisiciones
FOR SELECT
TO authenticated
USING (
  empleado_id = auth.uid()
  OR (SELECT rol::text FROM public.usuarios WHERE id = auth.uid()) IN ('admin', 'almacen', 'superadmin')
);

-- Requisiciones: UPDATE por admin/almacen/superadmin
DROP POLICY IF EXISTS "admin_almacen_update_requisiciones" ON public.requisiciones;
CREATE POLICY "admin_almacen_update_requisiciones"
ON public.requisiciones
FOR UPDATE
TO authenticated
USING (
  (SELECT rol::text FROM public.usuarios WHERE id = auth.uid()) IN ('admin', 'almacen', 'superadmin')
)
WITH CHECK (
  (SELECT rol::text FROM public.usuarios WHERE id = auth.uid()) IN ('admin', 'almacen', 'superadmin')
);

-- Detalle requisición: SELECT por alcance de requisición
ALTER TABLE public.detalle_requisicion ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ver_detalles_segun_rol" ON public.detalle_requisicion;
CREATE POLICY "ver_detalles_segun_rol"
ON public.detalle_requisicion
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.requisiciones r
    WHERE r.id = requisicion_id
      AND (
        r.empleado_id = auth.uid()
        OR (SELECT rol::text FROM public.usuarios WHERE id = auth.uid()) IN ('admin', 'almacen', 'superadmin')
      )
  )
);

-- Detalle requisición: UPDATE para recepción de almacén/admin/superadmin
DROP POLICY IF EXISTS "actualizar_detalle_por_admin_almacen" ON public.detalle_requisicion;
CREATE POLICY "actualizar_detalle_por_admin_almacen"
ON public.detalle_requisicion
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.requisiciones r
    WHERE r.id = requisicion_id
      AND (SELECT rol::text FROM public.usuarios WHERE id = auth.uid()) IN ('admin', 'almacen', 'superadmin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.requisiciones r
    WHERE r.id = requisicion_id
      AND (SELECT rol::text FROM public.usuarios WHERE id = auth.uid()) IN ('admin', 'almacen', 'superadmin')
  )
);

-- Historial: lectura para participantes y roles de gestión
ALTER TABLE public.historial_requisicion ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "historial_read_scope" ON public.historial_requisicion;
CREATE POLICY "historial_read_scope"
ON public.historial_requisicion
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.requisiciones r
    WHERE r.id = requisicion_id
      AND (
        r.empleado_id = auth.uid()
        OR (SELECT rol::text FROM public.usuarios WHERE id = auth.uid()) IN ('admin', 'almacen', 'superadmin')
      )
  )
);

DROP POLICY IF EXISTS "historial_insert_admin_almacen" ON public.historial_requisicion;
CREATE POLICY "historial_insert_admin_almacen"
ON public.historial_requisicion
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT rol::text FROM public.usuarios WHERE id = auth.uid()) IN ('admin', 'almacen', 'superadmin')
);

-- Notificaciones: cada usuario lee y actualiza las suyas
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notificaciones_select_owner" ON public.notificaciones;
CREATE POLICY "notificaciones_select_owner"
ON public.notificaciones
FOR SELECT
TO authenticated
USING (usuario_id = auth.uid());

DROP POLICY IF EXISTS "notificaciones_update_owner" ON public.notificaciones;
CREATE POLICY "notificaciones_update_owner"
ON public.notificaciones
FOR UPDATE
TO authenticated
USING (usuario_id = auth.uid())
WITH CHECK (usuario_id = auth.uid());

DROP POLICY IF EXISTS "notificaciones_insert_admin_almacen" ON public.notificaciones;
CREATE POLICY "notificaciones_insert_admin_almacen"
ON public.notificaciones
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT rol::text FROM public.usuarios WHERE id = auth.uid()) IN ('admin', 'almacen', 'superadmin')
);
