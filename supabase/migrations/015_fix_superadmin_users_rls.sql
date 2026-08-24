-- Permite que admin y superadmin consulten y administren todos los usuarios.
-- Antes, las politicas solo contemplaban el rol admin; al cambiar el usuario
-- actual a superadmin, la consulta devolvia unicamente su propio registro.

DROP POLICY IF EXISTS "usuarios_self_read" ON public.usuarios;
CREATE POLICY "usuarios_self_read" ON public.usuarios
  FOR SELECT
  USING (
    auth.uid() = id
    OR public.current_user_role()::text IN ('admin', 'superadmin')
  );

DROP POLICY IF EXISTS "usuarios_admin_write" ON public.usuarios;
CREATE POLICY "usuarios_admin_write" ON public.usuarios
  FOR ALL
  USING (public.current_user_role()::text IN ('admin', 'superadmin'))
  WITH CHECK (public.current_user_role()::text IN ('admin', 'superadmin'));
