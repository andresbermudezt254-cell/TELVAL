-- ============================================================
-- MIGRACIÓN 020: Estabilización Integral de Esquema, RLS y Enums
-- ============================================================

-- 1. ASEGURAR TODOS LOS VALORES DEL ENUM especialidad_tipo
-- Evita errores 'invalid input value for enum especialidad_tipo' al crear requisiciones
DO $$
BEGIN
  -- Agregar especialidades faltantes en caso de que la columna use el enum
  ALTER TYPE public.especialidad_tipo ADD VALUE IF NOT EXISTS 'ACABADOS DIA';
  ALTER TYPE public.especialidad_tipo ADD VALUE IF NOT EXISTS 'ACABADOS NOCHE';
  ALTER TYPE public.especialidad_tipo ADD VALUE IF NOT EXISTS 'ALTURAS DIA';
  ALTER TYPE public.especialidad_tipo ADD VALUE IF NOT EXISTS 'ALTURAS NOCHE';
  ALTER TYPE public.especialidad_tipo ADD VALUE IF NOT EXISTS 'LIMPIEZAS DIA';
  ALTER TYPE public.especialidad_tipo ADD VALUE IF NOT EXISTS 'LIMPIEZAS NOCHE';
  ALTER TYPE public.especialidad_tipo ADD VALUE IF NOT EXISTS 'MANTENIMIENTOS MAYORES/MENORES';
  ALTER TYPE public.especialidad_tipo ADD VALUE IF NOT EXISTS 'PLOMERIA DIA';
  ALTER TYPE public.especialidad_tipo ADD VALUE IF NOT EXISTS 'PLOMERIA NOCHE';
  ALTER TYPE public.especialidad_tipo ADD VALUE IF NOT EXISTS 'CERRAJERIA DIA';
  ALTER TYPE public.especialidad_tipo ADD VALUE IF NOT EXISTS 'CERRAJERIA NOCHE';
  ALTER TYPE public.especialidad_tipo ADD VALUE IF NOT EXISTS 'MANTENIMIENTO LOCALES';
  ALTER TYPE public.especialidad_tipo ADD VALUE IF NOT EXISTS 'PEDIDOS SST';
  ALTER TYPE public.especialidad_tipo ADD VALUE IF NOT EXISTS 'PEDIDOS ALMACEN';
  ALTER TYPE public.especialidad_tipo ADD VALUE IF NOT EXISTS 'RESIDENCIA CIVIL';
  ALTER TYPE public.especialidad_tipo ADD VALUE IF NOT EXISTS 'COORDINACION LOGISTICA Y TRANSPORTE';
  ALTER TYPE public.especialidad_tipo ADD VALUE IF NOT EXISTS 'VIAS DIA';
  ALTER TYPE public.especialidad_tipo ADD VALUE IF NOT EXISTS 'VIAS NOCHE';
EXCEPTION WHEN OTHERS THEN
  -- Si especialidad es columna TEXT, no es necesario hacer nada
  NULL;
END $$;

-- 2. ASEGURAR ROLES EN user_role
DO $$
BEGIN
  ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'admin';
  ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'empleado';
  ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'almacen';
  ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'superadmin';
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 3. ASEGURAR ESTADOS EN estado_requisicion
DO $$
BEGIN
  ALTER TYPE public.estado_requisicion ADD VALUE IF NOT EXISTS 'BORRADOR';
  ALTER TYPE public.estado_requisicion ADD VALUE IF NOT EXISTS 'PENDIENTE';
  ALTER TYPE public.estado_requisicion ADD VALUE IF NOT EXISTS 'EN_REVISION';
  ALTER TYPE public.estado_requisicion ADD VALUE IF NOT EXISTS 'APROBADA';
  ALTER TYPE public.estado_requisicion ADD VALUE IF NOT EXISTS 'EN_COMPRA';
  ALTER TYPE public.estado_requisicion ADD VALUE IF NOT EXISTS 'PARCIAL';
  ALTER TYPE public.estado_requisicion ADD VALUE IF NOT EXISTS 'COMPLETADA';
  ALTER TYPE public.estado_requisicion ADD VALUE IF NOT EXISTS 'RECHAZADA';
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 4. ASEGURAR COLUMNAS EN TABLAS
ALTER TABLE public.detalle_requisicion ADD COLUMN IF NOT EXISTS unidad_medida_item text;

-- 5. FUNCIÓN SEGURA PARA OBTENER EL ROL DEL USUARIO ACTUAL SIN RECURSIÓN RLS
CREATE OR REPLACE FUNCTION public.current_user_role_safe()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT COALESCE(
    (SELECT rol::text FROM public.usuarios WHERE id = auth.uid() LIMIT 1),
    (auth.jwt() -> 'user_metadata' ->> 'rol'),
    'empleado'
  );
$$;

-- Otorgar ejecución a usuarios autenticados
GRANT EXECUTE ON FUNCTION public.current_user_role_safe() TO authenticated;

-- 5. POLÍTICAS RLS ROBUSTAS PARA usuarios
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "usuarios_self_read" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_read_policy" ON public.usuarios;
CREATE POLICY "usuarios_read_policy" ON public.usuarios
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() 
    OR public.current_user_role_safe() IN ('admin', 'superadmin', 'almacen')
  );

DROP POLICY IF EXISTS "usuarios_admin_write" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_write_policy" ON public.usuarios;
CREATE POLICY "usuarios_write_policy" ON public.usuarios
  FOR ALL
  TO authenticated
  USING (public.current_user_role_safe() IN ('admin', 'superadmin'))
  WITH CHECK (public.current_user_role_safe() IN ('admin', 'superadmin'));

-- 6. POLÍTICAS RLS ROBUSTAS PARA requisiciones
ALTER TABLE public.requisiciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_ve_todas_requisiciones" ON public.requisiciones;
DROP POLICY IF EXISTS "empleado_ve_sus_requisiciones" ON public.requisiciones;
DROP POLICY IF EXISTS "req_almacen_read" ON public.requisiciones;
DROP POLICY IF EXISTS "requisiciones_select_policy" ON public.requisiciones;

CREATE POLICY "requisiciones_select_policy" ON public.requisiciones
  FOR SELECT
  TO authenticated
  USING (
    empleado_id = auth.uid()
    OR public.current_user_role_safe() IN ('admin', 'almacen', 'superadmin')
  );

DROP POLICY IF EXISTS "req_empleado_insert" ON public.requisiciones;
DROP POLICY IF EXISTS "requisiciones_insert_policy" ON public.requisiciones;
CREATE POLICY "requisiciones_insert_policy" ON public.requisiciones
  FOR INSERT
  TO authenticated
  WITH CHECK (
    empleado_id = auth.uid()
    OR public.current_user_role_safe() IN ('admin', 'superadmin')
  );

DROP POLICY IF EXISTS "req_admin_update" ON public.requisiciones;
DROP POLICY IF EXISTS "admin_almacen_update_requisiciones" ON public.requisiciones;
DROP POLICY IF EXISTS "req_almacen_update" ON public.requisiciones;
DROP POLICY IF EXISTS "requisiciones_update_policy" ON public.requisiciones;

CREATE POLICY "requisiciones_update_policy" ON public.requisiciones
  FOR UPDATE
  TO authenticated
  USING (
    empleado_id = auth.uid()
    OR public.current_user_role_safe() IN ('admin', 'almacen', 'superadmin')
  )
  WITH CHECK (
    empleado_id = auth.uid()
    OR public.current_user_role_safe() IN ('admin', 'almacen', 'superadmin')
  );

DROP POLICY IF EXISTS "requisiciones_delete_policy" ON public.requisiciones;
CREATE POLICY "requisiciones_delete_policy" ON public.requisiciones
  FOR DELETE
  TO authenticated
  USING (
    (empleado_id = auth.uid() AND estado = 'BORRADOR')
    OR public.current_user_role_safe() IN ('admin', 'superadmin')
  );

-- 7. POLÍTICAS RLS ROBUSTAS PARA detalle_requisicion
ALTER TABLE public.detalle_requisicion ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ver_detalles_segun_rol" ON public.detalle_requisicion;
DROP POLICY IF EXISTS "detalle_read" ON public.detalle_requisicion;
DROP POLICY IF EXISTS "detalle_almacen_read" ON public.detalle_requisicion;
DROP POLICY IF EXISTS "detalle_select_policy" ON public.detalle_requisicion;

CREATE POLICY "detalle_select_policy" ON public.detalle_requisicion
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.requisiciones r
      WHERE r.id = requisicion_id
        AND (
          r.empleado_id = auth.uid()
          OR public.current_user_role_safe() IN ('admin', 'almacen', 'superadmin')
        )
    )
  );

DROP POLICY IF EXISTS "detalle_insert" ON public.detalle_requisicion;
DROP POLICY IF EXISTS "detalle_insert_policy" ON public.detalle_requisicion;
CREATE POLICY "detalle_insert_policy" ON public.detalle_requisicion
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.requisiciones r
      WHERE r.id = requisicion_id
        AND (
          r.empleado_id = auth.uid()
          OR public.current_user_role_safe() IN ('admin', 'superadmin')
        )
    )
  );

DROP POLICY IF EXISTS "actualizar_detalle_por_admin_almacen" ON public.detalle_requisicion;
DROP POLICY IF EXISTS "detalle_almacen_update" ON public.detalle_requisicion;
DROP POLICY IF EXISTS "detalle_update_policy" ON public.detalle_requisicion;
CREATE POLICY "detalle_update_policy" ON public.detalle_requisicion
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.requisiciones r
      WHERE r.id = requisicion_id
        AND (
          r.empleado_id = auth.uid()
          OR public.current_user_role_safe() IN ('admin', 'almacen', 'superadmin')
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.requisiciones r
      WHERE r.id = requisicion_id
        AND (
          r.empleado_id = auth.uid()
          OR public.current_user_role_safe() IN ('admin', 'almacen', 'superadmin')
        )
    )
  );

DROP POLICY IF EXISTS "detalle_delete_policy" ON public.detalle_requisicion;
CREATE POLICY "detalle_delete_policy" ON public.detalle_requisicion
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.requisiciones r
      WHERE r.id = requisicion_id
        AND (
          r.empleado_id = auth.uid()
          OR public.current_user_role_safe() IN ('admin', 'superadmin')
        )
    )
  );

-- 8. POLÍTICAS RLS ROBUSTAS PARA notificaciones
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notificaciones_select_owner" ON public.notificaciones;
DROP POLICY IF EXISTS "notif_select_own" ON public.notificaciones;
CREATE POLICY "notif_select_own" ON public.notificaciones
  FOR SELECT
  TO authenticated
  USING (usuario_id = auth.uid());

DROP POLICY IF EXISTS "notificaciones_update_owner" ON public.notificaciones;
DROP POLICY IF EXISTS "notif_update_own" ON public.notificaciones;
CREATE POLICY "notif_update_own" ON public.notificaciones
  FOR UPDATE
  TO authenticated
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());

DROP POLICY IF EXISTS "notificaciones_insert_admin_almacen" ON public.notificaciones;
DROP POLICY IF EXISTS "notif_insert_authenticated" ON public.notificaciones;
-- Cualquier usuario autenticado puede enviar notificaciones a otros (empleado a admin, admin a empleado, etc.)
CREATE POLICY "notif_insert_authenticated" ON public.notificaciones
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.role() = 'authenticated');

-- 9. PROCEDIMIENTO ALMACENADO ATÓMICO: marcar_item_recibido_v2
DROP FUNCTION IF EXISTS public.marcar_item_recibido_v2(uuid, text, text, text, integer, integer, boolean);

CREATE OR REPLACE FUNCTION public.marcar_item_recibido_v2(
  p_user_id uuid,
  p_user_email text,
  p_user_nombre text,
  p_user_rol text,
  p_item_id integer,
  p_req_id integer,
  p_completado boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_result jsonb;
  v_count integer;
  v_total_items integer;
  v_completed_count integer;
  v_new_estado varchar;
  v_req_prev record;
BEGIN
  -- 1. Verificar requisición
  SELECT estado, codigo, empleado_id, admin_id
  INTO v_req_prev
  FROM public.requisiciones
  WHERE id = p_req_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Requisición no encontrada');
  END IF;

  -- 2. Actualizar el detalle
  UPDATE public.detalle_requisicion
  SET 
    completado = p_completado,
    completado_at = CASE WHEN p_completado THEN NOW() ELSE NULL END,
    completado_por = CASE WHEN p_completado THEN p_user_id ELSE NULL END
  WHERE id = p_item_id AND requisicion_id = p_req_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ítem no encontrado en esta requisición');
  END IF;

  -- 3. Calcular estado consolidado
  SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN completado THEN 1 ELSE 0 END) as completed
  INTO v_total_items, v_completed_count
  FROM public.detalle_requisicion
  WHERE requisicion_id = p_req_id;

  v_completed_count := COALESCE(v_completed_count, 0);

  IF v_completed_count = v_total_items AND v_total_items > 0 THEN
    v_new_estado := 'COMPLETADA';
  ELSIF v_completed_count > 0 THEN
    v_new_estado := 'PARCIAL';
  ELSE
    v_new_estado := 'EN_COMPRA';
  END IF;

  -- 4. Actualizar requisición
  UPDATE public.requisiciones
  SET estado = v_new_estado::public.estado_requisicion
  WHERE id = p_req_id;

  -- 5. Registrar en historial
  INSERT INTO public.historial_requisicion 
    (requisicion_id, usuario_id, estado_anterior, estado_nuevo, comentario)
  VALUES 
    (p_req_id, p_user_id, v_req_prev.estado, v_new_estado::public.estado_requisicion,
     'Ítem ' || p_item_id || ' ' || CASE WHEN p_completado THEN 'marcado recibido' ELSE 'desmarcado' END ||
     ' (' || v_completed_count || '/' || v_total_items || ' recibidos)')
  ON CONFLICT DO NOTHING;

  -- 6. Enviar notificaciones
  INSERT INTO public.notificaciones 
    (usuario_id, requisicion_id, tipo, titulo, mensaje)
  SELECT 
    u_id,
    p_req_id,
    CASE WHEN v_new_estado = 'COMPLETADA' THEN 'success' ELSE 'info' END,
    CASE WHEN v_new_estado = 'COMPLETADA' 
      THEN 'Requisición ' || v_req_prev.codigo || ' completada'
      ELSE 'Requisición ' || v_req_prev.codigo || ' parcial'
    END,
    CASE WHEN v_new_estado = 'COMPLETADA'
      THEN 'Todos los materiales fueron entregados en almacén.'
      ELSE v_completed_count || ' de ' || v_total_items || ' materiales han llegado.'
    END
  FROM (
    SELECT v_req_prev.empleado_id AS u_id
    UNION
    SELECT v_req_prev.admin_id AS u_id
  ) target_users
  WHERE u_id IS NOT NULL AND u_id <> p_user_id;

  v_result := jsonb_build_object(
    'success', true,
    'nuevoEstado', v_new_estado,
    'completados', v_completed_count,
    'total', v_total_items
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.marcar_item_recibido_v2 TO authenticated;

