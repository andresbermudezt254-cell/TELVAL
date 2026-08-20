-- ============================================================
-- MIGRACIÓN 011: Sincronizar usuarios de auth.users a usuarios table
-- Problema: RLS policy requiere que el usuario esté en tabla usuarios
-- Solución: Crear trigger que auto-crea entry en usuarios cuando se crea user en auth
-- ============================================================

-- 1. Crear función que copia usuarios de auth a usuarios table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.usuarios (id, email, nombre_completo, rol, activo, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'empleado'::user_role),
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    nombre_completo = EXCLUDED.nombre_completo,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Crear trigger en auth.users para ejecutar la función cuando se crea user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Sincronizar usuarios existentes que no estén en la tabla usuarios
INSERT INTO public.usuarios (id, email, nombre_completo, rol, activo, created_at, updated_at)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', u.email) as nombre_completo,
  COALESCE((u.raw_user_meta_data->>'role')::user_role, 'empleado'::user_role) as rol,
  true as activo,
  u.created_at,
  NOW()
FROM auth.users u
WHERE u.id NOT IN (SELECT id FROM public.usuarios)
ON CONFLICT (id) DO NOTHING;

-- 4. Verificar que sync funcionó
-- SELECT COUNT(*) as auth_users, (SELECT COUNT(*) FROM public.usuarios) as usuarios_table FROM auth.users;
