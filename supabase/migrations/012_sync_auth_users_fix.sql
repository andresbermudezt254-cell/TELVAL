-- Migration: 012_sync_auth_users_fix
-- Purpose: Sync all auth.users to public.usuarios table
-- This is a recovery migration that fixes the failed migration 011

-- First, check current state
-- SELECT COUNT(*) as usuarios_count FROM public.usuarios;
-- SELECT COUNT(*) as auth_users_count FROM auth.users;

-- Sync all auth users that aren't already in usuarios table
INSERT INTO public.usuarios (id, email, nombre_completo, rol, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email) as nombre_completo,
  'almacen' as rol,
  au.created_at,
  NOW() as updated_at
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.usuarios pu WHERE pu.id = au.id
)
ON CONFLICT (id) DO NOTHING;

-- Update the "Administrador TELVAL" user to have admin role if it exists
UPDATE public.usuarios 
SET rol = 'admin'
WHERE email IN (
  'admin@telval.com',
  'elkinvasquez256@gmail.com'
);

-- Verify the sync worked
SELECT 
  COUNT(*) as total_usuarios,
  COUNT(CASE WHEN rol = 'admin' THEN 1 END) as admin_count,
  COUNT(CASE WHEN rol = 'almacen' THEN 1 END) as almacen_count
FROM public.usuarios;
