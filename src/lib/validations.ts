import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})
export type LoginForm = z.infer<typeof loginSchema>

export const especialidadOptions = [
  'ACABADOS DIA',
  'ACABADOS NOCHE',
  'ALTURAS DIA',
  'ALTURAS NOCHE',
  'LIMPIEZAS DIA',
  'LIMPIEZAS NOCHE',
  'MANTENIMIENTOS MAYORES/MENORES',
  'PLOMERIA DIA',
  'PLOMERIA NOCHE',
  'CERRAJERIA DIA',
  'CERRAJERIA NOCHE',
  'MANTENIMIENTO LOCALES',
  'PEDIDOS SST',
  'PEDIDOS ALMACEN',
  'RESIDENCIA CIVIL',
  'COORDINACION LOGISTICA Y TRANSPORTE',
  'VIAS DIA',
  'VIAS NOCHE',
] as const

export const categoriaOptions = ['URGENTE', 'IMPORTANTE', 'MODERADA', 'PROGRAMADA'] as const

export const requisicionSchema = z.object({
  especialidad: z.enum(especialidadOptions),
  numero_aviso: z.string().min(1, 'Ingresa el número de aviso o escribe STOCK'),
  punto: z.string().min(1, 'Ingresa el punto'),
  categoria: z.enum(categoriaOptions),
  fecha_maxima_entrega: z.string().optional(),
  item_sinco_adpro: z.string().optional(),
  notas_empleado: z.string().optional(),
})
export type RequisicionFormData = z.infer<typeof requisicionSchema>

export const productoSchema = z.object({
  codigo: z.string().optional(),
  nombre: z.string().min(2, 'Mínimo 2 caracteres'),
  descripcion: z.string().optional(),
  categoria_id: z.number().optional(),
  unidad_medida: z.string().min(1, 'Requerido'),
  activo: z.boolean().default(true),
})
export type ProductoFormData = z.infer<typeof productoSchema>

export const usuarioCreateSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  nombre_completo: z.string().min(2, 'Mínimo 2 caracteres'),
  rol: z.enum(['admin', 'empleado', 'almacen', 'superadmin']),
  especialidad: z.enum(especialidadOptions).optional(),
  whatsapp: z.string().optional(),
})
export type UsuarioCreateForm = z.infer<typeof usuarioCreateSchema>

export const usuarioEditSchema = z.object({
  nombre_completo: z.string().min(2, 'Mínimo 2 caracteres'),
  rol: z.enum(['admin', 'empleado', 'almacen', 'superadmin']),
  especialidad: z.enum(especialidadOptions).optional(),
  whatsapp: z.string().optional(),
})
export type UsuarioEditForm = z.infer<typeof usuarioEditSchema>

export const precioProveedorSchema = z.object({
  producto_id: z.coerce.number().int().positive('Selecciona un producto'),
  precio_unitario: z.coerce.number().positive('Debe ser mayor que 0'),
  fecha_precio: z.string().optional(),
  notas: z.string().optional(),
})
export type PrecioProveedorForm = z.infer<typeof precioProveedorSchema>

export const proveedorSchema = z.object({
  codigo_interno: z.string().optional(),
  nit: z.string().optional(),
  nombre: z.string().min(2, 'Mínimo 2 caracteres'),
  contacto_nombre: z.string().optional(),
  telefono: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  ciudad: z.string().optional(),
  activo: z.boolean().default(true),
  notas: z.string().optional(),
})
export type ProveedorFormData = z.infer<typeof proveedorSchema>

export const precioSchema = z.object({
  precio: z.number().min(0, 'El precio debe ser positivo'),
  disponible: z.boolean().default(true),
  tiempo_entrega_dias: z.number().int().min(0).default(1),
  notas: z.string().optional(),
})
export type PrecioFormData = z.infer<typeof precioSchema>
