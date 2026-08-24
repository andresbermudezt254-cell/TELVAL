-- Permite que admin y superadmin consulten y administren todos los usuarios.
-- La base existente no coincide con el esquema original: id puede ser bigint
-- y el nombre de la columna del rol puede variar. Se lee el registro como
-- JSON para evitar referencias directas a columnas ausentes.

DROP POLICY IF EXISTS "usuarios_self_read" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_admin_write" ON public.usuarios;

CREATE OR REPLACE FUNCTION public.current_user_role_text()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    to_jsonb(u)->>'rol',
    to_jsonb(u)->>'role',
    to_jsonb(u)->>'user_role',
    to_jsonb(u)->>'tipo_usuario'
  )
  FROM public.usuarios AS u
  WHERE to_jsonb(u)->>'email' = auth.email()
  LIMIT 1;
$$;

CREATE POLICY "usuarios_self_read" ON public.usuarios
  FOR SELECT
  USING (
    to_jsonb(usuarios)->>'email' = auth.email()
    OR public.current_user_role_text() IN ('admin', 'superadmin')
  );

CREATE POLICY "usuarios_admin_write" ON public.usuarios
  FOR ALL
  USING (public.current_user_role_text() IN ('admin', 'superadmin'))
  WITH CHECK (public.current_user_role_text() IN ('admin', 'superadmin'));
