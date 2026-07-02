   -- ============================================================
-- MIGRACIÓN 005: Estados de Almacén + Rol Almacén
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Agregar nuevos valores al ENUM estado_requisicion
ALTER TYPE estado_requisicion ADD VALUE IF NOT EXISTS 'EN_ALMACEN';
ALTER TYPE estado_requisicion ADD VALUE IF NOT EXISTS 'DESPACHADO';
ALTER TYPE estado_requisicion ADD VALUE IF NOT EXISTS 'PARCIAL';

ALTER TABLE requisiciones
  DROP CONSTRAINT IF EXISTS requisiciones_estado_check;

ALTER TABLE requisiciones
  ADD CONSTRAINT requisiciones_estado_check
  CHECK (estado IN ('BORRADOR','PENDIENTE','EN_REVISION','APROBADA','EN_COMPRA','EN_ALMACEN','DESPACHADO','PARCIAL','COMPLETADA','RECHAZADA'));

-- 2. Agregar nuevo rol 'almacen' al ENUM user_role
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'almacen';

-- 3. Columna para tracking de despacho por item (cuántos despachados vs solicitados)
ALTER TABLE detalle_requisicion
  ADD COLUMN IF NOT EXISTS cantidad_despachada NUMERIC(12, 3) NOT NULL DEFAULT 0;

-- 4. Columna para nota de despacho en requisición (dirección, observaciones de entrega)
ALTER TABLE requisiciones
  ADD COLUMN IF NOT EXISTS notas_almacen TEXT,
  ADD COLUMN IF NOT EXISTS direccion_despacho TEXT,
  ADD COLUMN IF NOT EXISTS despachado_por UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS despachado_at TIMESTAMPTZ;

-- 5. Tabla de log de despachos por item (trazabilidad completa)
CREATE TABLE IF NOT EXISTS public.despacho_detalle (
  id              BIGSERIAL PRIMARY KEY,
  detalle_id      INTEGER NOT NULL REFERENCES public.detalle_requisicion(id) ON DELETE CASCADE,
  requisicion_id  INTEGER NOT NULL REFERENCES public.requisiciones(id) ON DELETE CASCADE,
  producto_id     INTEGER NOT NULL REFERENCES public.productos(id),
  cantidad_solicitada NUMERIC(12, 3) NOT NULL,
  cantidad_despachada NUMERIC(12, 3) NOT NULL,
  usuario_id      UUID NOT NULL REFERENCES auth.users(id),
  observaciones   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_despacho_detalle_requisicion ON public.despacho_detalle(requisicion_id);
CREATE INDEX IF NOT EXISTS idx_despacho_detalle_detalle ON public.despacho_detalle(detalle_id);
CREATE INDEX IF NOT EXISTS idx_despacho_detalle_usuario ON public.despacho_detalle(usuario_id);

-- 6. RLS para despacho_detalle
ALTER TABLE public.despacho_detalle ENABLE ROW LEVEL SECURITY;

-- Helper para rol actual (ya existe current_user_role pero aseguramos)
-- Verificamos que existe, si no la creamos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'current_user_role'
  ) THEN
    CREATE OR REPLACE FUNCTION public.current_user_role()
    RETURNS user_role LANGUAGE sql STABLE SECURITY DEFINER AS $$
      SELECT rol FROM public.usuarios WHERE id = auth.uid();
    $$;
  END IF;
END $$;

-- Políticas para despacho_detalle
-- Almacén y Admin pueden leer todo
CREATE POLICY "despacho_read_almacen_admin"
  ON public.despacho_detalle FOR SELECT
  USING (public.current_user_role() IN ('admin', 'almacen'));

-- Almacén y Admin pueden insertar (registrar despachos)
CREATE POLICY "despacho_insert_almacen_admin"
  ON public.despacho_detalle FOR INSERT
  WITH CHECK (public.current_user_role() IN ('admin', 'almacen'));

-- 7. Actualizar políticas de requisiciones para rol almacen
-- Almacén puede LEER requisiciones en estados de despacho
DROP POLICY IF EXISTS "req_almacen_read" ON public.requisiciones;
CREATE POLICY "req_almacen_read"
  ON public.requisiciones FOR SELECT
  USING (
    public.current_user_role() = 'almacen' AND
    estado IN ('EN_COMPRA', 'EN_ALMACEN', 'DESPACHADO', 'PARCIAL', 'COMPLETADA')
    OR public.current_user_role() = 'admin'
    OR empleado_id = auth.uid()
  );

-- Almacén puede ACTUALIZAR requisiciones (cambiar estados de despacho, agregar notas_almacen, direccion_despacho)
DROP POLICY IF EXISTS "req_almacen_update" ON public.requisiciones;
CREATE POLICY "req_almacen_update"
  ON public.requisiciones FOR UPDATE
  USING (
    public.current_user_role() IN ('admin', 'almacen')
  )
  WITH CHECK (
    public.current_user_role() IN ('admin', 'almacen')
  );

-- Almacén puede LEER detalle_requisicion de requisiciones accesibles
DROP POLICY IF EXISTS "detalle_almacen_read" ON public.detalle_requisicion;
CREATE POLICY "detalle_almacen_read"
  ON public.detalle_requisicion FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.requisiciones r
      WHERE r.id = requisicion_id
        AND (
          public.current_user_role() = 'almacen' AND r.estado IN ('EN_COMPRA', 'EN_ALMACEN', 'DESPACHADO', 'PARCIAL', 'COMPLETADA')
          OR public.current_user_role() = 'admin'
          OR r.empleado_id = auth.uid()
        )
    )
  );

-- Almacén puede ACTUALIZAR detalle_requisicion (marcar cantidad_despachada)
DROP POLICY IF EXISTS "detalle_almacen_update" ON public.detalle_requisicion;
CREATE POLICY "detalle_almacen_update"
  ON public.detalle_requisicion FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.requisiciones r
      WHERE r.id = requisicion_id
        AND public.current_user_role() IN ('admin', 'almacen')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.requisiciones r
      WHERE r.id = requisicion_id
        AND public.current_user_role() IN ('admin', 'almacen')
    )
  );

-- 8. Actualizar trigger de historial para incluir nuevos estados
-- El trigger historial_insert ya permite true, pero aseguramos que los nuevos estados funcionen

-- 9. Habilitar realtime para despacho_detalle
ALTER PUBLICATION supabase_realtime ADD TABLE public.despacho_detalle;

-- 10. Vista para resumen de despacho por requisición
CREATE OR REPLACE VIEW public.resumen_despacho_requisicion AS
SELECT
  r.id AS requisicion_id,
  r.codigo,
  r.estado,
  r.especialidad,
  r.punto,
  r.numero_aviso,
  r.fecha_solicitud,
  r.fecha_maxima_entrega,
  r.direccion_despacho,
  r.notas_almacen,
  r.despachado_at,
  r.despachado_por,
  u.nombre_completo AS despachado_por_nombre,
  COUNT(dr.id) AS total_items,
  SUM(dr.cantidad) AS total_cantidad_solicitada,
  SUM(dr.cantidad_despachada) AS total_cantidad_despachada,
  CASE
    WHEN SUM(dr.cantidad_despachada) >= SUM(dr.cantidad) AND SUM(dr.cantidad) > 0 THEN 'COMPLETO'
    WHEN SUM(dr.cantidad_despachada) > 0 THEN 'PARCIAL'
    ELSE 'PENDIENTE'
  END AS estado_despacho
FROM public.requisiciones r
LEFT JOIN public.detalle_requisicion dr ON dr.requisicion_id = r.id
LEFT JOIN public.usuarios u ON u.id = r.despachado_por
WHERE r.estado IN ('EN_COMPRA', 'EN_ALMACEN', 'DESPACHADO', 'PARCIAL', 'COMPLETADA')
GROUP BY r.id, u.nombre_completo;