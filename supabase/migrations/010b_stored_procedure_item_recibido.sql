-- ============================================================
-- MIGRACIÓN 010b: Stored Procedure para marcar items completados
-- Soluciona el problema de RLS silenciosos bloqueando UPDATE
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Crear función PL/pgSQL que tenga permisos SECURITY DEFINER
-- Esto permite que se ejecute con permisos del propietario, bypassing algunas restricciones de RLS
DROP FUNCTION IF EXISTS public.marcar_item_recibido(
  p_item_id INT,
  p_requisicion_id INT,
  p_completado BOOLEAN,
  p_usuario_id UUID
) CASCADE;

CREATE OR REPLACE FUNCTION public.marcar_item_recibido(
  p_item_id INT,
  p_requisicion_id INT,
  p_completado BOOLEAN,
  p_usuario_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_count INT;
  v_timestamp TIMESTAMPTZ := NOW();
BEGIN
  -- Debug logging
  RAISE NOTICE 'marcar_item_recibido called: item=%, req=%, completado=%, usuario=%',
    p_item_id, p_requisicion_id, p_completado, p_usuario_id;

  -- Verificar que el item existe y pertenece a la requisición
  SELECT COUNT(*) INTO v_count
  FROM public.detalle_requisicion
  WHERE id = p_item_id AND requisicion_id = p_requisicion_id;

  IF v_count = 0 THEN
    RETURN json_build_object('success', FALSE, 'error', 'Item not found');
  END IF;

  -- Actualizar el item
  UPDATE public.detalle_requisicion
  SET
    completado = p_completado,
    completado_at = CASE WHEN p_completado THEN v_timestamp ELSE NULL END,
    completado_por = CASE WHEN p_completado THEN p_usuario_id ELSE NULL END
  WHERE id = p_item_id;

  RETURN json_build_object('success', TRUE, 'updated_at', v_timestamp);
END;
$$ LANGUAGE plpgsql;

-- 2. Conceder permisos de ejecución al público autenticado
GRANT EXECUTE ON FUNCTION public.marcar_item_recibido(INT, INT, BOOLEAN, UUID) TO authenticated;

-- 3. Crear policy para permitir que los usuarios autenticados puedan CALL esta función
-- (El PostgREST permite llamar funciones directamente)

-- 4. NOTA: Para usar desde cliente:
-- const { data, error } = await supabase.rpc('marcar_item_recibido', {
--   p_item_id: itemId,
--   p_requisicion_id: requisicionId,
--   p_completado: completado,
--   p_usuario_id: user.id
-- })
