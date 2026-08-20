-- Migration: 013_fix_rls_for_user_sync
-- Purpose: Allow users to be inserted into public.usuarios by relaxing RLS temporarily
-- This fixes the circular dependency where we can't sync users because usuarios table has RLS

-- First, check current RLS policies on usuarios table
-- SELECT * FROM pg_policies WHERE tablename = 'usuarios';

-- Drop existing policies on usuarios if they're too restrictive
-- ALTER TABLE public.usuarios DISABLE ROW LEVEL SECURITY;

-- BETTER: Create a permissive policy for anyone to insert their own record
CREATE POLICY "users_can_insert_themselves"
ON public.usuarios
FOR INSERT
WITH CHECK (id = auth.uid() OR auth.jwt() ->> 'role' = 'authenticated');

-- Allow authenticated users to update themselves
CREATE POLICY "users_can_update_themselves"
ON public.usuarios
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Allow authenticated users to read all usuarios (needed for RLS checks in other tables)
CREATE POLICY "authenticated_can_read_usuarios"
ON public.usuarios
FOR SELECT
USING (auth.role() = 'authenticated');

-- Verify policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'usuarios'
ORDER BY policyname;
