import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://fkxecvvyyvxqbhzbvhsx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreGVjdnZ5eXZ4cWJoemJ2aHN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMDkxMDcsImV4cCI6MjA5NDg4NTEwN30.aRsUSEoLbdVnoQdCOwq5wdLK0eIifQE02tRqAfNoROI'
)

const { data, error } = await supabase
  .from('requisiciones')
  .select(`*,empleado:usuarios!empleado_id(id,nombre_completo,email,especialidad),admin:usuarios!admin_id(id,nombre_completo),detalles:detalle_requisicion(id,requisicion_id,producto_id,proveedor_sugerido_id,cantidad,numero_item,precio_unitario_sugerido:precio_unitario,total_linea,notas,created_at,completado,completado_at,producto:productos(id,codigo,nombre,unidad_medida,categoria_id),proveedor_sugerido:proveedores!proveedor_sugerido_id(id,nombre,whatsapp,codigo_interno)),proveedor_final:proveedores!proveedor_final_id(id,nombre,contacto_nombre,telefono,whatsapp)`)
  .eq('id', 25)
  .single()

console.log('data', data)
console.log('error', error)
