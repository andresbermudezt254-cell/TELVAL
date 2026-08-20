-- ================================================
-- TELVAL S.A.S – Mantenimientos Metro
-- Supabase Migration: 001_initial_schema.sql
-- ================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE user_role AS ENUM ('admin', 'empleado');
CREATE TYPE estado_requisicion AS ENUM (
  'BORRADOR', 'PENDIENTE', 'EN_REVISION', 'APROBADA',
  'EN_COMPRA', 'COMPLETADA', 'RECHAZADA'
);
CREATE TYPE categoria_requisicion AS ENUM (
  'URGENTE', 'IMPORTANTE', 'MODERADA', 'PROGRAMADA'
);
CREATE TYPE especialidad_tipo AS ENUM (
  'ACABADOS NOCHE',
  'ACABADOS DIA',
  'ELECTRICO NOCHE',
  'ELECTRICO DIA',
  'ELECTROMECANICO',
  'MECANICO NOCHE',
  'MECANICO DIA',
  'CIVIL NOCHE',
  'CIVIL DIA',
  'HIDRAULICO',
  'INSTRUMENTACION',
  'OTROS'
);

-- ============================================================
-- TABLAS
-- ============================================================

-- Usuarios (profiles)
CREATE TABLE IF NOT EXISTS public.usuarios (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre_completo TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  rol           user_role NOT NULL DEFAULT 'empleado',
  especialidad  especialidad_tipo,
  whatsapp      TEXT,
  activo        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Categorías de producto
CREATE TABLE IF NOT EXISTS public.categorias (
  id          SERIAL PRIMARY KEY,
  nombre      TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  icono       TEXT DEFAULT '📦',
  activo      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Proveedores
CREATE TABLE IF NOT EXISTS public.proveedores (
  id              SERIAL PRIMARY KEY,
  codigo_interno  TEXT UNIQUE,
  nombre          TEXT NOT NULL,
  nit             TEXT,
  whatsapp        TEXT,
  email           TEXT,
  ciudad          TEXT,
  contacto_nombre TEXT,
  activo          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Productos / Insumos
CREATE TABLE IF NOT EXISTS public.productos (
  id            SERIAL PRIMARY KEY,
  codigo        TEXT NOT NULL UNIQUE,
  nombre        TEXT NOT NULL,
  descripcion   TEXT,
  unidad_medida TEXT NOT NULL DEFAULT 'UND',
  categoria_id  INTEGER REFERENCES public.categorias(id),
  imagen_url    TEXT,
  precio_minimo NUMERIC(15, 2),
  activo        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Proveedor-Producto (precios)
CREATE TABLE IF NOT EXISTS public.proveedor_producto (
  id              SERIAL PRIMARY KEY,
  proveedor_id    INTEGER NOT NULL REFERENCES public.proveedores(id) ON DELETE CASCADE,
  producto_id     INTEGER NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
  precio_unitario NUMERIC(15, 2) NOT NULL,
  fecha_precio    DATE,
  notas           TEXT,
  activo          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (proveedor_id, producto_id)
);

-- Requisiciones
CREATE TABLE IF NOT EXISTS public.requisiciones (
  id                    SERIAL PRIMARY KEY,
  codigo                TEXT UNIQUE,
  empleado_id           UUID NOT NULL REFERENCES public.usuarios(id),
  admin_id              UUID REFERENCES public.usuarios(id),
  estado                estado_requisicion NOT NULL DEFAULT 'PENDIENTE',
  categoria             categoria_requisicion NOT NULL DEFAULT 'PROGRAMADA',
  especialidad          especialidad_tipo NOT NULL,
  numero_aviso          TEXT NOT NULL,
  punto                 TEXT NOT NULL,
  fecha_solicitud       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_maxima_entrega  DATE,
  fecha_aprobacion      TIMESTAMPTZ,
  item_ppto             TEXT,
  item_sinco_adpro      TEXT,
  notas_empleado        TEXT,
  notas_admin           TEXT,
  motivo_rechazo        TEXT,
  total_estimado        NUMERIC(15, 2) DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Detalle requisicion
CREATE TABLE IF NOT EXISTS public.detalle_requisicion (
  id                    SERIAL PRIMARY KEY,
  requisicion_id        INTEGER NOT NULL REFERENCES public.requisiciones(id) ON DELETE CASCADE,
  producto_id           INTEGER NOT NULL REFERENCES public.productos(id),
  proveedor_sugerido_id INTEGER REFERENCES public.proveedores(id),
  cantidad              NUMERIC(12, 3) NOT NULL DEFAULT 1,
  precio_unitario       NUMERIC(15, 2),
  total_linea           NUMERIC(15, 2),
  notas                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Historial de estados
CREATE TABLE IF NOT EXISTS public.historial_requisicion (
  id              SERIAL PRIMARY KEY,
  requisicion_id  INTEGER NOT NULL REFERENCES public.requisiciones(id) ON DELETE CASCADE,
  usuario_id      UUID REFERENCES public.usuarios(id),
  estado_anterior estado_requisicion,
  estado_nuevo    estado_requisicion NOT NULL,
  comentario      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notificaciones
CREATE TABLE IF NOT EXISTS public.notificaciones (
  id              SERIAL PRIMARY KEY,
  usuario_id      UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  requisicion_id  INTEGER REFERENCES public.requisiciones(id) ON DELETE CASCADE,
  tipo            TEXT NOT NULL,
  titulo          TEXT NOT NULL,
  mensaje         TEXT,
  leida           BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- VIEWS
-- ============================================================

-- Mejor proveedor por producto (precio mínimo activo)
CREATE OR REPLACE VIEW public.mejor_proveedor_por_producto AS
SELECT
  pp.producto_id,
  pp.proveedor_id,
  p.nombre AS proveedor_nombre,
  p.whatsapp AS proveedor_whatsapp,
  pp.precio_unitario,
  pp.fecha_precio,
  RANK() OVER (PARTITION BY pp.producto_id ORDER BY pp.precio_unitario ASC) AS ranking
FROM public.proveedor_producto pp
JOIN public.proveedores p ON p.id = pp.proveedor_id
WHERE pp.activo = true AND p.activo = true;

-- Comparacion de precios de todos los proveedores por producto
CREATE OR REPLACE VIEW public.comparacion_precios AS
SELECT
  pp.producto_id,
  pr.nombre AS producto_nombre,
  pp.proveedor_id,
  pv.nombre AS proveedor_nombre,
  pv.whatsapp AS proveedor_whatsapp,
  pp.precio_unitario,
  pp.fecha_precio,
  RANK() OVER (PARTITION BY pp.producto_id ORDER BY pp.precio_unitario ASC) AS ranking,
  ROUND(
    ((pp.precio_unitario - MIN(pp.precio_unitario) OVER (PARTITION BY pp.producto_id)) /
     NULLIF(MIN(pp.precio_unitario) OVER (PARTITION BY pp.producto_id), 0)) * 100,
    1
  ) AS pct_sobre_minimo
FROM public.proveedor_producto pp
JOIN public.productos pr ON pr.id = pp.producto_id
JOIN public.proveedores pv ON pv.id = pp.proveedor_id
WHERE pp.activo = true AND pv.activo = true;

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Apply updated_at to tables
CREATE TRIGGER trg_usuarios_updated_at BEFORE UPDATE ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_proveedores_updated_at BEFORE UPDATE ON public.proveedores
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_productos_updated_at BEFORE UPDATE ON public.productos
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_proveedor_producto_updated_at BEFORE UPDATE ON public.proveedor_producto
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_requisiciones_updated_at BEFORE UPDATE ON public.requisiciones
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.usuarios (id, nombre_completo, email, rol)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre_completo', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'rol')::user_role, 'empleado')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Generate requisition code: REQ-YYYYMM-NNNN
CREATE OR REPLACE FUNCTION public.generar_codigo_requisicion()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  v_prefix TEXT;
  v_count  INTEGER;
BEGIN
  v_prefix := 'REQ-' || TO_CHAR(NOW(), 'YYYYMM') || '-';
  SELECT COUNT(*) + 1 INTO v_count
  FROM public.requisiciones
  WHERE codigo LIKE v_prefix || '%';
  RETURN v_prefix || LPAD(v_count::TEXT, 4, '0');
END;
$$;

-- Update producto precio_minimo when proveedor_producto changes
CREATE OR REPLACE FUNCTION public.sync_precio_minimo()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.productos
  SET precio_minimo = (
    SELECT MIN(precio_unitario)
    FROM public.proveedor_producto
    WHERE producto_id = COALESCE(NEW.producto_id, OLD.producto_id)
      AND activo = true
  )
  WHERE id = COALESCE(NEW.producto_id, OLD.producto_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_sync_precio_minimo
  AFTER INSERT OR UPDATE OR DELETE ON public.proveedor_producto
  FOR EACH ROW EXECUTE FUNCTION public.sync_precio_minimo();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proveedor_producto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requisiciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detalle_requisicion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historial_requisicion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;

-- Helper: current user role
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT rol FROM public.usuarios WHERE id = auth.uid();
$$;

-- Usuarios
CREATE POLICY "usuarios_self_read" ON public.usuarios FOR SELECT USING (auth.uid() = id OR public.current_user_role() = 'admin');
CREATE POLICY "usuarios_admin_write" ON public.usuarios FOR ALL USING (public.current_user_role() = 'admin');

-- Categorías (todos leen, admin escribe)
CREATE POLICY "categorias_read" ON public.categorias FOR SELECT USING (true);
CREATE POLICY "categorias_admin_write" ON public.categorias FOR ALL USING (public.current_user_role() = 'admin');

-- Productos
CREATE POLICY "productos_read" ON public.productos FOR SELECT USING (true);
CREATE POLICY "productos_admin_write" ON public.productos FOR ALL USING (public.current_user_role() = 'admin');

-- Proveedores
CREATE POLICY "proveedores_read" ON public.proveedores FOR SELECT USING (true);
CREATE POLICY "proveedores_admin_write" ON public.proveedores FOR ALL USING (public.current_user_role() = 'admin');

-- Proveedor-Producto
CREATE POLICY "pp_read" ON public.proveedor_producto FOR SELECT USING (true);
CREATE POLICY "pp_admin_write" ON public.proveedor_producto FOR ALL USING (public.current_user_role() = 'admin');

-- Requisiciones
CREATE POLICY "req_empleado_own" ON public.requisiciones FOR SELECT USING (
  empleado_id = auth.uid() OR public.current_user_role() = 'admin'
);
CREATE POLICY "req_empleado_insert" ON public.requisiciones FOR INSERT WITH CHECK (
  empleado_id = auth.uid()
);
CREATE POLICY "req_admin_update" ON public.requisiciones FOR UPDATE USING (
  public.current_user_role() = 'admin' OR empleado_id = auth.uid()
);

-- Detalle
CREATE POLICY "detalle_read" ON public.detalle_requisicion FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.requisiciones r
    WHERE r.id = requisicion_id
      AND (r.empleado_id = auth.uid() OR public.current_user_role() = 'admin')
  )
);
CREATE POLICY "detalle_insert" ON public.detalle_requisicion FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.requisiciones r
    WHERE r.id = requisicion_id AND r.empleado_id = auth.uid()
  )
);

-- Historial
CREATE POLICY "historial_read" ON public.historial_requisicion FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.requisiciones r
    WHERE r.id = requisicion_id
      AND (r.empleado_id = auth.uid() OR public.current_user_role() = 'admin')
  )
);
CREATE POLICY "historial_insert" ON public.historial_requisicion FOR INSERT WITH CHECK (true);

-- Notificaciones
CREATE POLICY "notif_own" ON public.notificaciones FOR ALL USING (usuario_id = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.requisiciones;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notificaciones;
