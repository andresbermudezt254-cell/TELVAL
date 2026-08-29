-- Add unit of measurement per detail line
ALTER TABLE public.detalle_requisicion
ADD COLUMN IF NOT EXISTS unidad_medida_item TEXT;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_detalle_requisicion_unidad_medida_item
ON public.detalle_requisicion(unidad_medida_item);
