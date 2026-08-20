-- ============================================================
-- MIGRACIÓN 007: Asegurar columnas de completado en detalle_requisicion
-- ============================================================

ALTER TABLE detalle_requisicion
  ADD COLUMN IF NOT EXISTS completado BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS completado_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completado_por UUID REFERENCES auth.users(id);
