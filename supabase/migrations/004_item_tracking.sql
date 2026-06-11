-- ============================================================
-- MIGRACIÓN 004: Item tracking + Proveedor final + Unidades de medida
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Tabla de unidades de medida
CREATE TABLE IF NOT EXISTS unidades_medida (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  abreviatura TEXT NOT NULL
);

INSERT INTO unidades_medida (nombre, abreviatura) VALUES
  ('Unidad', 'und'),
  ('Kilogramo', 'kg'),
  ('Gramo', 'g'),
  ('Tonelada', 'ton'),
  ('Litro', 'lt'),
  ('Mililitro', 'ml'),
  ('Metro', 'm'),
  ('Metro cuadrado', 'm²'),
  ('Metro cúbico', 'm³'),
  ('Centímetro', 'cm'),
  ('Milímetro', 'mm'),
  ('Pulgada', 'pulg'),
  ('Pie', 'pie'),
  ('Rollo', 'rollo'),
  ('Bolsa', 'bolsa'),
  ('Caja', 'caja'),
  ('Galón', 'gal'),
  ('Libra', 'lb'),
  ('Par', 'par'),
  ('Juego', 'juego'),
  ('Global', 'global')
ON CONFLICT DO NOTHING;

-- RLS para unidades_medida
ALTER TABLE unidades_medida ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leer unidades" ON unidades_medida
  FOR SELECT TO authenticated USING (true);

-- 2. Columnas nuevas en detalle_requisicion
ALTER TABLE detalle_requisicion
  ADD COLUMN IF NOT EXISTS numero_item INTEGER,
  ADD COLUMN IF NOT EXISTS completado BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS completado_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completado_por UUID REFERENCES auth.users(id);

-- 3. Estado PARCIAL en requisiciones
ALTER TABLE requisiciones
  DROP CONSTRAINT IF EXISTS requisiciones_estado_check;

ALTER TABLE requisiciones
  ADD CONSTRAINT requisiciones_estado_check
  CHECK (estado IN ('BORRADOR','PENDIENTE','EN_REVISION','APROBADA','EN_COMPRA','PARCIAL','COMPLETADA','RECHAZADA'));

-- 4. Proveedor final en requisiciones
ALTER TABLE requisiciones
  ADD COLUMN IF NOT EXISTS proveedor_final_id INTEGER REFERENCES proveedores(id);
