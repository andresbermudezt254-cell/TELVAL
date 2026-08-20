-- Migration: 014_fix_user_role_enum
-- Purpose: Add missing roles to user_role enum and fix all type mismatches

-- Step 1: Alter the user_role enum to include all roles
ALTER TYPE public.user_role ADD VALUE 'almacen' BEFORE 'empleado';
ALTER TYPE public.user_role ADD VALUE 'superadmin' AFTER 'admin';

-- Verify the enum values
SELECT unnest(enum_range(NULL::public.user_role));
