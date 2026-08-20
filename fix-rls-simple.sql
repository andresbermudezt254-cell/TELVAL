DROP POLICY IF EXISTS "actualizar_detalle_por_admin_almacen" ON public.detalle_requisicion;

CREATE POLICY "actualizar_detalle_por_admin_almacen"
ON public.detalle_requisicion
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "detalle_insert" ON public.detalle_requisicion;

CREATE POLICY "detalle_insert"
ON public.detalle_requisicion
FOR INSERT
TO authenticated
WITH CHECK (true);
