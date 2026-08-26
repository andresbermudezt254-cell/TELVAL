-- Permite asignar un código SINCO-ADPRO diferente a cada insumo solicitado.
ALTER TABLE public.detalle_requisicion
  ADD COLUMN IF NOT EXISTS item_ppto TEXT,
  ADD COLUMN IF NOT EXISTS item_sinco_adpro TEXT;