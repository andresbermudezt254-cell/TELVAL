-- Separar la política de notificaciones en SELECT/UPDATE vs INSERT
-- para que un usuario autenticado pueda insertar notificaciones para otros usuarios

-- Eliminar la política anterior que bloquea inserts cruzados
DROP POLICY IF EXISTS "notif_own" ON public.notificaciones;

-- SELECT y UPDATE: solo las tuyas propias
CREATE POLICY "notif_select_own"
  ON public.notificaciones FOR SELECT
  USING (usuario_id = auth.uid());

CREATE POLICY "notif_update_own"
  ON public.notificaciones FOR UPDATE
  USING (usuario_id = auth.uid());

CREATE POLICY "notif_delete_own"
  ON public.notificaciones FOR DELETE
  USING (usuario_id = auth.uid());

-- INSERT: cualquier usuario autenticado puede insertar notificaciones para otros
-- (empleado → admin, admin → empleado)
CREATE POLICY "notif_insert_authenticated"
  ON public.notificaciones FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
