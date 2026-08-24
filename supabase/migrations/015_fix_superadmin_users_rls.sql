-- Permite que admin y superadmin consulten y administren todos los usuarios.
-- En la base existente, usuarios.id es bigint y auth.uid() es uuid; por eso
-- se usa el correo, que existe en Auth y en public.usuarios.

DROP POLICY IF EXISTS "usuarios_self_read" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_admin_write" ON public.usuarios;

CREATE OR REPLACE FUNCTION public.current_user_role_text()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rol
  FROM public.usuarios
  WHERE email = auth.email()
  LIMIT 1;
$$;

CREATE POLICY "usuarios_self_read" ON public.usuarios
  FOR SELECT
  USING (
    email = auth.email()
    OR public.current_user_role_text() IN ('admin', 'superadmin')
  );

CREATE POLICY "usuarios_admin_write" ON public.usuarios
  FOR ALL
  USING (public.current_user_role_text() IN ('admin', 'superadmin'))
  WITH CHECK (public.current_user_role_text() IN ('admin', 'superadmin'));
