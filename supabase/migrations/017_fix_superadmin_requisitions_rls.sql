-- Permite a admin y superadmin consultar requisiciones de todos los empleados.
-- Usa la función de rol basada en el perfil del usuario autenticado para evitar
-- que una diferencia de esquema o de columnas bloquee la visibilidad.

ALTER TABLE public.requisiciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detalle_requisicion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historial_requisicion ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_ve_todas_requisiciones" ON public.requisiciones;
CREATE POLICY "admin_ve_todas_requisiciones"
ON public.requisiciones
FOR SELECT
TO authenticated
USING (
  public.current_user_role_text() IN ('admin', 'almacen', 'superadmin')
);

DROP POLICY IF EXISTS "empleado_ve_sus_requisiciones" ON public.requisiciones;
CREATE POLICY "empleado_ve_sus_requisiciones"
ON public.requisiciones
FOR SELECT
TO authenticated
USING (
  empleado_id = auth.uid()
  OR public.current_user_role_text() IN ('admin', 'almacen', 'superadmin')
);

DROP POLICY IF EXISTS "ver_detalles_segun_rol" ON public.detalle_requisicion;
CREATE POLICY "ver_detalles_segun_rol"
ON public.detalle_requisicion
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.requisiciones AS r
    WHERE r.id = requisicion_id
      AND (
        r.empleado_id = auth.uid()
        OR public.current_user_role_text() IN ('admin', 'almacen', 'superadmin')
      )
  )
);

DROP POLICY IF EXISTS "historial_read_scope" ON public.historial_requisicion;
CREATE POLICY "historial_read_scope"
ON public.historial_requisicion
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.requisiciones AS r
    WHERE r.id = requisicion_id
      AND (
        r.empleado_id = auth.uid()
        OR public.current_user_role_text() IN ('admin', 'almacen', 'superadmin')
      )
  )
);