-- ============================================================================
-- CRITICAL FIX: Sincronizar usuarios de auth.users a public.usuarios
-- ============================================================================
-- 
-- PROBLEMA: La tabla public.usuarios está VACÍA (0 registros)
-- CAUSA: La migración 011 no se ejecutó correctamente
-- IMPACTO: Todos los UPDATEs fallan con error "RLS policy" silenciosamente
--
-- SOLUCIÓN: Ejecutar este script en Supabase SQL Editor
-- URL: https://supabase.com/dashboard/project/fkxecvvyyvxqbhzbvhsx/sql
--
-- ============================================================================

-- PASO 1: Sincronizar todos los usuarios de auth.users a public.usuarios
INSERT INTO public.usuarios (id, email, nombre_completo, rol, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email) as nombre_completo,
  'almacen' as rol,  -- Rol por defecto
  au.created_at,
  NOW() as updated_at
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.usuarios pu WHERE pu.id = au.id
)
ON CONFLICT (id) DO NOTHING;

-- PASO 2: Actualizar roles de administradores
UPDATE public.usuarios 
SET rol = 'admin'
WHERE email IN (
  'admin@telval.com',
  'elkinvasquez256@gmail.com',
  'administrador@telval.com'
);

-- PASO 3: Verificar resultados
SELECT 
  COUNT(*) as total_usuarios_sync,
  COUNT(CASE WHEN rol = 'admin' THEN 1 END) as admin_users,
  COUNT(CASE WHEN rol = 'almacen' THEN 1 END) as almacen_users,
  COUNT(CASE WHEN rol = 'empleado' THEN 1 END) as empleado_users
FROM public.usuarios;

-- PASO 4: Mostrar usuarios sincronizados
SELECT 
  id,
  email,
  nombre_completo,
  rol,
  created_at
FROM public.usuarios
ORDER BY created_at DESC
LIMIT 20;
