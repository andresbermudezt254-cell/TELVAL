-- ============================================================
-- MIGRACIÓN 008: Columnas de almacén y estado de envío
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Agregar columnas faltantes en requisiciones
ALTER TABLE requisiciones
  ADD COLUMN IF NOT EXISTS proveedor_final_id INTEGER REFERENCES proveedores(id),
  ADD COLUMN IF NOT EXISTS notas_almacen TEXT,
  ADD COLUMN IF NOT EXISTS direccion_despacho TEXT,
  ADD COLUMN IF NOT EXISTS despachado_at TIMESTAMPTZ;

-- 2. Mejorar índices para performance
CREATE INDEX IF NOT EXISTS idx_requisiciones_estado ON requisiciones(estado);
CREATE INDEX IF NOT EXISTS idx_requisiciones_empleado_id ON requisiciones(empleado_id);
CREATE INDEX IF NOT EXISTS idx_detalle_requisicion_completado ON detalle_requisicion(completado);
CREATE INDEX IF NOT EXISTS idx_detalle_requisicion_requisicion_id ON detalle_requisicion(requisicion_id);

-- 3. RLS - Permitir que almacén actualice estado y campos de almacén
DROP POLICY IF EXISTS "almacen_actualiza_requisiciones" ON public.requisiciones;
CREATE POLICY "almacen_actualiza_requisiciones"
ON public.requisiciones
FOR UPDATE
TO authenticated
USING (
  (SELECT rol::text FROM public.usuarios WHERE id = auth.uid()) IN ('admin', 'almacen', 'superadmin')
)
WITH CHECK (
  (SELECT rol::text FROM public.usuarios WHERE id = auth.uid()) IN ('admin', 'almacen', 'superadmin')
);

-- 4. RLS - Permitir INSERT en historial_requisicion
ALTER TABLE public.historial_requisicion ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "historial_insert_scope" ON public.historial_requisicion;
CREATE POLICY "historial_insert_scope"
ON public.historial_requisicion
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.requisiciones r
    WHERE r.id = requisicion_id
      AND (SELECT rol::text FROM public.usuarios WHERE id = auth.uid()) IN ('admin', 'almacen', 'superadmin')
  )
);

-- 5. RLS - Permitir INSERT en notificaciones desde backend
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notificaciones_insert_sistema" ON public.notificaciones;
CREATE POLICY "notificaciones_insert_sistema"
ON public.notificaciones
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "notificaciones_read_usuario" ON public.notificaciones;
CREATE POLICY "notificaciones_read_usuario"
ON public.notificaciones
FOR SELECT
TO authenticated
USING (usuario_id = auth.uid());

-- Fin de la migración
