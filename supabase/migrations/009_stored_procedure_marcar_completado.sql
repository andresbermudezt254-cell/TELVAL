-- Función almacenada para marcar item como completado (transacción SERIALIZABLE)
-- Esto previene race conditions donde múltiples actualizaciones corrupen el estado

CREATE OR REPLACE FUNCTION public.marcar_item_completado(
  p_item_id INTEGER,
  p_requisicion_id INTEGER,
  p_completado BOOLEAN,
  p_usuario_id UUID,
  p_comentario TEXT DEFAULT ''
)
RETURNS TABLE (
  requisicion_id INTEGER,
  estado_nuevo TEXT,
  items_completados INTEGER,
  total_items INTEGER
) AS $$
DECLARE
  v_estado_anterior TEXT;
  v_estado_nuevo TEXT;
  v_total_items INTEGER;
  v_completados INTEGER;
  v_empleado_id UUID;
  v_admin_id UUID;
  v_codigo TEXT;
BEGIN
  -- 1. Leer estado anterior (con lock en la requisición)
  SELECT r.estado, r.empleado_id, r.admin_id, r.codigo
  INTO v_estado_anterior, v_empleado_id, v_admin_id, v_codigo
  FROM public.requisiciones r
  WHERE r.id = p_requisicion_id
  FOR UPDATE;

  -- 2. Actualizar item como completado
  UPDATE public.detalle_requisicion
  SET
    completado = p_completado,
    completado_at = CASE WHEN p_completado THEN NOW() ELSE NULL END,
    completado_por = CASE WHEN p_completado THEN p_usuario_id ELSE NULL END
  WHERE id = p_item_id AND requisicion_id = p_requisicion_id;

  -- 3. Recalcular estado basado en items ACTUALES (después del UPDATE)
  SELECT 
    COUNT(*)::INTEGER,
    COUNT(CASE WHEN dr.completado THEN 1 END)::INTEGER
  INTO v_total_items, v_completados
  FROM public.detalle_requisicion dr
  WHERE dr.requisicion_id = p_requisicion_id;

  -- 4. Determinar nuevo estado
  v_estado_nuevo := CASE
    WHEN v_completados = v_total_items AND v_total_items > 0 THEN 'COMPLETADA'
    WHEN v_completados > 0 THEN 'PARCIAL'
    ELSE 'EN_COMPRA'
  END;

  -- 5. Actualizar estado en requisiciones
  UPDATE public.requisiciones r
  SET estado = v_estado_nuevo
  WHERE r.id = p_requisicion_id;

  -- 6. Insertar en historial
  INSERT INTO public.historial_requisicion (requisicion_id, usuario_id, estado_anterior, estado_nuevo, comentario)
  VALUES (p_requisicion_id, p_usuario_id, v_estado_anterior, v_estado_nuevo, p_comentario)
  ON CONFLICT DO NOTHING;

  -- 7. Enviar notificaciones si estado cambió
  IF v_estado_anterior != v_estado_nuevo AND v_empleado_id IS NOT NULL THEN
    INSERT INTO public.notificaciones (usuario_id, requisicion_id, tipo, titulo, mensaje)
    VALUES (
      v_empleado_id,
      p_requisicion_id,
      CASE WHEN v_estado_nuevo = 'COMPLETADA' THEN 'success' ELSE 'info' END,
      CASE WHEN v_estado_nuevo = 'COMPLETADA' THEN format('Requisición %s completada', v_codigo) ELSE format('Requisición %s parcial', v_codigo) END,
      CASE WHEN v_estado_nuevo = 'COMPLETADA' THEN 'Todos los materiales fueron entregados en almacén.' ELSE format('%s de %s materiales han llegado.', v_completados, v_total_items) END
    )
    ON CONFLICT DO NOTHING;

    IF v_admin_id IS NOT NULL THEN
      INSERT INTO public.notificaciones (usuario_id, requisicion_id, tipo, titulo, mensaje)
      VALUES (
        v_admin_id,
        p_requisicion_id,
        CASE WHEN v_estado_nuevo = 'COMPLETADA' THEN 'success' ELSE 'info' END,
        CASE WHEN v_estado_nuevo = 'COMPLETADA' THEN format('Requisición %s completada', v_codigo) ELSE format('Requisición %s parcial', v_codigo) END,
        CASE WHEN v_estado_nuevo = 'COMPLETADA' THEN 'Todos los materiales fueron entregados en almacén.' ELSE format('%s de %s materiales han llegado.', v_completados, v_total_items) END
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- 8. Retornar resultado
  RETURN QUERY SELECT p_requisicion_id, v_estado_nuevo, v_completados, v_total_items;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.marcar_item_completado(INTEGER, INTEGER, BOOLEAN, UUID, TEXT) TO authenticated;
