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
  v_new_estado estado_requisicion;
  v_req_prev record;
  v_user_rol_enum user_role;
BEGIN
  BEGIN
    v_user_rol_enum := p_user_rol::user_role;
  EXCEPTION WHEN invalid_text_representation THEN
    v_user_rol_enum := 'almacen'::user_role;
  END;

  INSERT INTO public.usuarios (id, email, nombre_completo, rol, created_at, updated_at)
  VALUES (p_user_id, p_user_email, p_user_nombre, v_user_rol_enum, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE
  SET rol = v_user_rol_enum, updated_at = NOW();

  SELECT estado, codigo, empleado_id, admin_id
  INTO v_req_prev
  FROM public.requisiciones
  WHERE id = p_req_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Requisición no encontrada');
  END IF;

  UPDATE public.detalle_requisicion
  SET completado = p_completado,
      completado_at = CASE WHEN p_completado THEN NOW() ELSE NULL END,
      completado_por = CASE WHEN p_completado THEN p_user_id ELSE NULL END
  WHERE id = p_item_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_count = 0 THEN
    RETURN jsonb_build_object('error', 'Item no encontrado');
  END IF;

  SELECT COUNT(*) as total, SUM(CASE WHEN completado THEN 1 ELSE 0 END) as completed
  INTO v_total_items, v_completed_count
  FROM public.detalle_requisicion
  WHERE requisicion_id = p_req_id;

  v_completed_count = COALESCE(v_completed_count, 0);

  IF v_completed_count = v_total_items THEN
    v_new_estado := 'COMPLETADA'::estado_requisicion;
  ELSIF v_completed_count > 0 THEN
    v_new_estado := 'PARCIAL'::estado_requisicion;
  ELSE
    v_new_estado := 'EN_COMPRA'::estado_requisicion;
  END IF;

  UPDATE public.requisiciones SET estado = v_new_estado WHERE id = p_req_id;

  INSERT INTO public.historial_requisicion (requisicion_id, usuario_id, estado_anterior, estado_nuevo, comentario)
  VALUES (p_req_id, p_user_id, v_req_prev.estado, v_new_estado, 'Item ' || p_item_id || ' marcado recibido.');

  INSERT INTO public.notificaciones (usuario_id, requisicion_id, tipo, titulo, mensaje)
  SELECT user_id, p_req_id,
         CASE WHEN v_new_estado = 'COMPLETADA' THEN 'success' ELSE 'info' END,
         CASE WHEN v_new_estado = 'COMPLETADA' THEN 'Requisición completada' ELSE 'Requisición parcial' END,
         v_completed_count || '/' || v_total_items || ' materiales'
  FROM (SELECT v_req_prev.empleado_id as user_id UNION ALL SELECT v_req_prev.admin_id as user_id) users
  WHERE user_id IS NOT NULL;

  RETURN jsonb_build_object('success', true, 'nuevoEstado', v_new_estado::text, 'completados', v_completed_count, 'total', v_total_items);
END;
$$;

GRANT EXECUTE ON FUNCTION public.marcar_item_recibido_v2 TO authenticated;
