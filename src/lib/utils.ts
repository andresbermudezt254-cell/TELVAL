/**
 * Formatea un número al formato de moneda colombiana: $1.234.567
 */
export function formatCOP(value: number | undefined | null): string {
  if (value === undefined || value === null) return '$0'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * Formatea una fecha ISO a formato colombiano: 15/05/2024
 */
export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr + (dateStr.includes('T') ? '' : 'T00:00:00'))
  return date.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * Formatea una fecha con hora
 */
export function formatDateTime(dateStr: string | undefined | null): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Construye la URL de WhatsApp para un número colombiano
 */
export function buildWhatsAppUrl(phone: string | undefined | null, message = ''): string {
  if (!phone) return '#'
  const cleaned = phone.replace(/\D/g, '')
  const number = cleaned.startsWith('57') ? cleaned : `57${cleaned}`
  const encoded = encodeURIComponent(message)
  return `https://wa.me/${number}${message ? `?text=${encoded}` : ''}`
}

/**
 * Clases de color según estado de requisición
 */
export function estadoBadgeClass(estado: string): string {
  const map: Record<string, string> = {
    PENDIENTE:   'bg-yellow-100 text-yellow-800 border-yellow-200',
    EN_REVISION: 'bg-blue-100 text-blue-800 border-blue-200',
    APROBADA:    'bg-green-100 text-green-700 border-green-200',
    EN_COMPRA:   'bg-orange-100 text-orange-800 border-orange-200',
    PARCIAL:     'bg-violet-100 text-violet-800 border-violet-200',
    COMPLETADA:  'bg-emerald-100 text-emerald-800 border-emerald-200',
    RECHAZADA:   'bg-red-100 text-red-800 border-red-200',
    BORRADOR:    'bg-gray-100 text-gray-600 border-gray-200',
    // legacy lowercase
    pendiente:  'bg-yellow-100 text-yellow-800 border-yellow-200',
    revisando:  'bg-blue-100 text-blue-800 border-blue-200',
    aprobado:   'bg-green-100 text-green-700 border-green-200',
    en_compra:  'bg-orange-100 text-orange-800 border-orange-200',
    completado: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    rechazado:  'bg-red-100 text-red-800 border-red-200',
  }
  return map[estado] ?? 'bg-gray-100 text-gray-700 border-gray-200'
}

/**
 * Etiqueta legible por estado
 */
export function estadoLabel(estado: string): string {
  const map: Record<string, string> = {
    PENDIENTE:   'Pendiente',
    EN_REVISION: 'En revisión',
    APROBADA:    'Aprobada',
    EN_COMPRA:   'En compra',
    PARCIAL:     'Parcial',
    COMPLETADA:  'Completada',
    RECHAZADA:   'Rechazada',
    BORRADOR:    'Borrador',
    // legacy
    pendiente:  'Pendiente',
    revisando:  'En revisión',
    aprobado:   'Aprobado',
    en_compra:  'En compra',
    completado: 'Completado',
    rechazado:  'Rechazado',
  }
  return map[estado] ?? estado
}

/**
 * Clases de color según categoría de requisición
 */
export function categoriaBadgeClass(categoria: string): string {
  const map: Record<string, string> = {
    URGENTE:    'bg-red-600 text-white',
    IMPORTANTE: 'bg-orange-500 text-white',
    MODERADA:   'bg-yellow-400 text-gray-900',
    PROGRAMADA: 'bg-gray-200 text-gray-700',
  }
  return map[categoria] ?? 'bg-gray-100 text-gray-700'
}

/**
 * Trunca un texto a un máximo de caracteres
 */
export function truncate(text: string, max = 50): string {
  if (text.length <= max) return text
  return text.slice(0, max) + '…'
}

/**
 * Genera el texto de resumen para WhatsApp
 */
export function generarResumenWhatsApp(
  requisicion: {
    codigo: string
    especialidad: string
    numero_aviso?: string
    punto?: string
    fecha_maxima_entrega?: string
    empleado?: { nombre_completo: string }
    total_estimado: number
  },
  detalles: Array<{
    cantidad: number
    producto?: { nombre: string; unidad_medida: string; codigo?: string }
    proveedor_sugerido?: { nombre: string }
    precio_unitario?: number
  }>
): string {
  const fecha = requisicion.fecha_maxima_entrega
    ? formatDate(requisicion.fecha_maxima_entrega)
    : '-'

  // Agrupar por proveedor
  const grupos: Record<string, typeof detalles> = {}
  for (const d of detalles) {
    const key = d.proveedor_sugerido?.nombre ?? 'Sin proveedor asignado'
    if (!grupos[key]) grupos[key] = []
    grupos[key].push(d)
  }

  let texto = `*REQUISICIÓN TELVAL S.A.S*\n`
  texto += `*Código:* ${requisicion.codigo}\n`
  texto += `*Solicitante:* ${requisicion.empleado?.nombre_completo ?? '-'}\n`
  texto += `*Especialidad:* ${requisicion.especialidad}\n`
  if (requisicion.numero_aviso) texto += `*Aviso #:* ${requisicion.numero_aviso}`
  if (requisicion.punto) texto += ` | *Punto:* ${requisicion.punto}`
  if (requisicion.numero_aviso || requisicion.punto) texto += '\n'
  texto += `*Fecha máx. entrega:* ${fecha}\n\n`

  let totalGeneral = 0
  for (const [proveedor, items] of Object.entries(grupos)) {
    texto += `*PROVEEDOR: ${proveedor}*\n`
    let subtotal = 0
    for (const item of items) {
      const precioUnit = item.precio_unitario ?? 0
      const sub = precioUnit * item.cantidad
      subtotal += sub
      totalGeneral += sub
      const nombre = item.producto?.nombre ?? 'Insumo'
      const um = item.producto?.unidad_medida ?? 'UN'
      texto += `• ${nombre} (${um}) x ${item.cantidad} — ${formatCOP(precioUnit)} c/u → ${formatCOP(sub)}\n`
    }
    texto += `*Subtotal:* ${formatCOP(subtotal)}\n\n`
  }

  texto += `*TOTAL ESTIMADO: ${formatCOP(totalGeneral || requisicion.total_estimado)}*`
  return texto
}

/**
 * Debounce genérico
 */
export function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): T {
  let timer: ReturnType<typeof setTimeout>
  return ((...args: unknown[]) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }) as T
}
