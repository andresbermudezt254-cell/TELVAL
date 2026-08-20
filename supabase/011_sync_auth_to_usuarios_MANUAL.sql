-- Script para sincronizar usuarios desde auth.users a public.usuarios
-- Este script ejecuta la inserción que debería haber hecho la migración 011

INSERT INTO public.usuarios (id, email, nombre_completo, rol, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  au.email,  -- nombre_completo por defecto = email
  'almacen',  -- rol por defecto
  au.created_at,
  au.updated_at
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.usuarios pu WHERE pu.id = au.id
)
ON CONFLICT (id) DO NOTHING;

-- Verificar cuántos usuarios se sincronizaron
SELECT 
  COUNT(*) as total_usuarios_synced,
  COUNT(CASE WHEN rol = 'almacen' THEN 1 END) as almacen_users,
  COUNT(CASE WHEN rol = 'admin' THEN 1 END) as admin_users
FROM public.usuarios;

-- Mostrar los usuarios sincronizados
SELECT id, email, nombre_completo, rol, created_at
FROM public.usuarios
ORDER BY created_at DESC
LIMIT 10;
