-- ================================================
-- TELVAL S.A.S – Seed Data
-- ================================================

-- Categorías de productos
INSERT INTO public.categorias (nombre, descripcion, icono) VALUES
  ('Eléctrico', 'Materiales y componentes eléctricos', '⚡'),
  ('Mecánico', 'Repuestos y piezas mecánicas', '⚙️'),
  ('Civil', 'Materiales de construcción y civil', '🏗️'),
  ('Hidráulico', 'Equipos y partes hidráulicas', '💧'),
  ('Instrumentación', 'Equipos de medición y control', '📏'),
  ('Ferretería', 'Tornillería, herramientas y ferretería general', '🔧'),
  ('Lubricantes', 'Aceites, grasas y lubricantes', '🛢️'),
  ('Seguridad', 'Elementos de protección personal', '⛑️'),
  ('Neumático', 'Válvulas, tuberías y componentes neumáticos', '🌬️'),
  ('Electrónico', 'Tarjetas, sensores y componentes electrónicos', '🖥️'),
  ('Consumibles', 'Insumos de consumo frecuente', '📦'),
  ('Otros', 'Materiales varios no clasificados', '🔲')
ON CONFLICT (nombre) DO NOTHING;

-- Proveedor de ejemplo 1
INSERT INTO public.proveedores (codigo_interno, nombre, whatsapp, email, ciudad, contacto_nombre) VALUES
  ('PROV-001', 'Electrónicos del Metro S.A.S', '3001234567', 'ventas@electrometro.com', 'Medellín', 'Carlos Pérez'),
  ('PROV-002', 'Ferretería Industrial Andina', '3101234567', 'pedidos@ferrandina.com', 'Medellín', 'Ana Torres'),
  ('PROV-003', 'Suministros Técnicos HidroPres', '3201234567', 'info@hidropres.com', 'Bogotá', 'Juan Villa')
ON CONFLICT (codigo_interno) DO NOTHING;
