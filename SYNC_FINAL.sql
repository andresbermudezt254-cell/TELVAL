-- ============================================================================
-- SINCRONIZACIÓN FINAL - EJECUTA ESTO EN SUPABASE SQL EDITOR
-- ============================================================================
-- URL: https://supabase.com/dashboard/project/fkxecvvyyvxqbhzbvhsx/sql

-- PASO 1: Agregar roles faltantes al ENUM user_role
ALTER TYPE public.user_role ADD VALUE 'almacen' BEFORE 'empleado';
ALTER TYPE public.user_role ADD VALUE 'superadmin' AFTER 'admin';

-- Verificar que los roles se agregaron
SELECT unnest(enum_range(NULL::public.user_role)) as available_roles;

-- ============================================================================
-- PASO 2: Crear/Actualizar la función RPC que hace TODO automáticamente
-- ============================================================================

DROP FUNCTION IF EXISTS public.marcar_item_recibido_v2(uuid, text, text, text, integer, integer, boolean);

CREATE FUNCTION public.marcar_item_recibido_v2(
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
AS $$
DECLARE
  v_result jsonb;
  v_count integer;
  v_total_items integer;
  v_completed_count integer;
  v_new_estado varchar;
  v_req_prev record;
  v_user_rol_enum user_role;
BEGIN
  -- Cast the text rol to user_role enum
  BEGIN
    v_user_rol_enum := p_user_rol::user_role;
  EXCEPTION WHEN invalid_text_representation THEN
    v_user_rol_enum := 'almacen'::user_role;
  END;

  -- Step 1: Ensure user exists in usuarios table
  INSERT INTO public.usuarios (id, email, nombre_completo, rol, created_at, updated_at)
  VALUES (p_user_id, p_user_email, p_user_nombre, v_user_rol_enum, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE
  SET rol = v_user_rol_enum, updated_at = NOW();

  -- Step 2: Get current requisition state
  SELECT estado, codigo, empleado_id, admin_id
  INTO v_req_prev
  FROM public.requisiciones
  WHERE id = p_req_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Requisición no encontrada');
  END IF;

  -- Step 3: Update the item
  UPDATE public.detalle_requisicion
  SET 
    completado = p_completado,
    completado_at = CASE WHEN p_completado THEN NOW() ELSE NULL END,
    completado_por = CASE WHEN p_completado THEN p_user_id ELSE NULL END
  WHERE id = p_item_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_count = 0 THEN
    RETURN jsonb_build_object('error', 'Item no encontrado');
  END IF;

  -- Step 4: Calculate new state
  SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN completado THEN 1 ELSE 0 END) as completed
  INTO v_total_items, v_completed_count
  FROM public.detalle_requisicion
  WHERE requisicion_id = p_req_id;

  v_completed_count = COALESCE(v_completed_count, 0);

  IF v_completed_count = v_total_items THEN
    v_new_estado = 'COMPLETADA';
  ELSIF v_completed_count > 0 THEN
    v_new_estado = 'PARCIAL';
  ELSE
    v_new_estado = 'EN_COMPRA';
  END IF;

  -- Step 5: Update requisition estado
  UPDATE public.requisiciones
  SET estado = v_new_estado
  WHERE id = p_req_id;

  -- Step 6: Record in historial
  INSERT INTO public.historial_requisicion 
    (requisicion_id, usuario_id, estado_anterior, estado_nuevo, comentario)
  VALUES 
    (p_req_id, p_user_id, v_req_prev.estado, v_new_estado,
     'Ítem ' || p_item_id || ' ' || CASE WHEN p_completado THEN 'marcado como recibido' ELSE 'desmarcado' END ||
     '. ' || v_completed_count || '/' || v_total_items || ' recibidos.')
  ON CONFLICT DO NOTHING;

  -- Step 7: Send notifications
  INSERT INTO public.notificaciones 
    (usuario_id, requisicion_id, tipo, titulo, mensaje)
  SELECT 
    user_id,
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
    SELECT v_req_prev.empleado_id as user_id
    UNION ALL
    SELECT v_req_prev.admin_id as user_id
  ) users
  WHERE user_id IS NOT NULL;

  v_result = jsonb_build_object(
    'success', true,
    'nuevoEstado', v_new_estado,
    'completados', v_completed_count,
    'total', v_total_items
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.marcar_item_recibido_v2 TO authenticated;

-- Verificar que la función se creó
SELECT * FROM pg_proc WHERE proname = 'marcar_item_recibido_v2';
