import type { Request } from 'express';

// Temporary endpoint to sync auth.users to public.usuarios
export async function syncAuthUsers(req: Request, res: any) {
  try {
    // This would normally be called from a backend with service role
    // For now, we'll return instructions for manual execution
    
    const syncSQL = `
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

-- Update admin roles
UPDATE public.usuarios SET rol = 'admin' 
WHERE email IN ('admin@telval.com', 'elkinvasquez256@gmail.com');
`;

    res.json({
      status: 'success',
      message: 'Execute the following SQL in Supabase dashboard',
      sql: syncSQL,
    });
  } catch (err) {
    res.status(500).json({ 
      status: 'error', 
      message: (err as Error).message 
    });
  }
}
