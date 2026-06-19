-- ============================================================
-- MIGRACIÓN 007: Asegura valores del enum user_role
-- ============================================================

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'almacen';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'superadmin';
