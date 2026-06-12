export type UserRole = 'admin' | 'empleado' | 'almacen' | 'superadmin'

export type Especialidad =
  | 'ACABADOS DIA'
  | 'ACABADOS NOCHE'
  | 'ALTURAS DIA'
  | 'ALTURAS NOCHE'
  | 'LIMPIEZAS DIA'
  | 'LIMPIEZAS NOCHE'
  | 'MANTENIMIENTOS MAYORES/MENORES'
  | 'PLOMERIA DIA'
  | 'PLOMERIA NOCHE'
  | 'CERRAJERIA DIA'
  | 'CERRAJERIA NOCHE'
  | 'MANTENIMIENTO LOCALES'
  | 'PEDIDOS SST'
  | 'PEDIDOS ALMACEN'
  | 'RESIDENCIA CIVIL'
  | 'COORDINACION LOGISTICA Y TRANSPORTE'
  | 'VIAS DIA'
  | 'VIAS NOCHE'

export type CategoriaRequisicion = 'URGENTE' | 'IMPORTANTE' | 'MODERADA' | 'PROGRAMADA'

export type EstadoRequisicion =
  | 'BORRADOR'
  | 'PENDIENTE'
  | 'EN_REVISION'
  | 'APROBADA'
  | 'EN_COMPRA'
  | 'PARCIAL'
  | 'COMPLETADA'
  | 'RECHAZADA'

export interface Usuario {
  id: string
  nombre_completo: string
  email: string
  rol: UserRole
  especialidad?: Especialidad
  whatsapp?: string
  activo: boolean
  created_at: string
}

export interface Categoria {
  id: number
  nombre: string
  icono?: string
}

export interface UnidadMedida {
  id: number
  nombre: string
  abreviatura: string
}

export interface Proveedor {
  id: number
  codigo_interno?: string
  nit?: string
  nombre: string
  nombre_completo?: string
  contacto_nombre?: string
  telefono?: string
  whatsapp?: string
  email?: string
  ciudad?: string
  activo: boolean
  notas?: string
}

export interface Producto {
  id: number
  codigo?: string
  nombre: string
  descripcion?: string
  categoria_id?: number
  unidad_medida: string
  imagen_url?: string
  activo: boolean
  categoria?: Categoria
  precio_minimo?: number
  proveedor_mas_barato?: string
}

export interface ProveedorProducto {
  id: number
  proveedor_id: number
  producto_id: number
  precio: number
  disponible: boolean
  fecha_precio?: string
  tiempo_entrega_dias: number
  notas?: string
  proveedor?: Proveedor
  producto?: Producto
}

export interface MejorProveedor {
  producto_id: number
  proveedor_id: number
  proveedor_nombre: string
  proveedor_whatsapp?: string
  precio_unitario: number
  fecha_precio?: string
  ranking: number
}

export interface ComparacionPrecios {
  producto_id: number
  producto_nombre: string
  proveedor_id: number
  proveedor_nombre: string
  proveedor_whatsapp?: string
  precio_unitario: number
  fecha_precio?: string
  ranking: number
  pct_sobre_minimo: number
}

export interface Requisicion {
  id: number
  codigo: string
  numero_requisicion?: number
  empleado_id: string
  especialidad: Especialidad
  numero_aviso?: string
  punto?: string
  estado: EstadoRequisicion
  categoria: CategoriaRequisicion
  fecha_solicitud: string
  fecha_maxima_entrega?: string
  fecha_aprobacion?: string
  item_sinco_adpro?: string
  notas_empleado?: string
  notas_admin?: string
  motivo_rechazo?: string
  observaciones?: string
  total_estimado: number
  admin_id?: string
  proveedor_final_id?: number
  created_at: string
  empleado?: Usuario
  proveedor_final?: Proveedor
  detalles?: DetalleRequisicion[]
  historial?: HistorialRequisicion[]
}

export interface DetalleRequisicion {
  id: number
  requisicion_id: number
  producto_id: number
  cantidad: number
  numero_item?: number
  proveedor_sugerido_id?: number
  precio_unitario?: number
  notas?: string
  completado: boolean
  completado_at?: string
  completado_por?: string
  unidad_medida_id?: number
  producto?: Producto
  proveedor_sugerido?: Proveedor
  unidad_medida?: UnidadMedida
  completado_por_usuario?: Usuario
}

export interface CartItem {
  producto: Producto
  cantidad: number
  notas?: string
}

export interface NuevaRequisicionForm {
  especialidad: Especialidad
  numero_aviso: string
  punto: string
  categoria: CategoriaRequisicion
  fecha_maxima_entrega?: string
  item_sinco_adpro?: string
  notas_empleado?: string
  items: Array<{
    producto_id: number
    cantidad: number
    notas?: string
  }>
}

export interface Notificacion {
  id: number
  usuario_id: string
  titulo: string
  mensaje: string
  leida: boolean
  tipo: 'info' | 'success' | 'warning' | 'error'
  requisicion_id?: number
  created_at: string
}

export interface HistorialRequisicion {
  id: number
  requisicion_id: number
  estado_anterior?: string
  estado_nuevo: string
  usuario_id?: string
  comentario?: string
  created_at: string
  usuario?: Usuario
}

export interface DespachoDetalle {
  id: number
  detalle_id: number
  requisicion_id: number
  producto_id: number
  cantidad_solicitada: number
  cantidad_despachada: number
  usuario_id: string
  observaciones?: string
  created_at: string
  usuario?: Usuario
  producto?: Producto
}

export interface ResumenDespacho {
  requisicion_id: number
  codigo: string
  estado: EstadoRequisicion
  especialidad: Especialidad
  punto: string
  numero_aviso?: string
  fecha_solicitud: string
  fecha_maxima_entrega?: string
  direccion_despacho?: string
  notas_almacen?: string
  despachado_at?: string
  despachado_por?: string
  despachado_por_nombre?: string
  total_items: number
  total_cantidad_solicitada: number
  total_cantidad_despachada: number
  estado_despacho: 'PENDIENTE' | 'PARCIAL' | 'COMPLETO'
}
