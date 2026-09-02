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

/** Devuelve una etiqueta legible para una unidad de medida. */
export function unidadMedidaLabel(unidad: string): string {
  const labels: Record<string, string> = {
    UND: 'unidad',
    UN: 'unidad',
    M: 'metro',
    MT: 'metro',
    M2: 'metro cuadrado',
    M3: 'metro cúbico',
    KG: 'kilogramo',
    G: 'gramo',
    L: 'litro',
    ML: 'mililitro',
    PAR: 'par',
    CAJA: 'caja',
    ROLLO: 'rollo',
  }

  const normalized = unidad.trim().toUpperCase()
  return labels[normalized] ?? unidad
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
    PENDIENTE:   'bg-amber-50 text-amber-800 border-amber-200/80 shadow-xs',
    EN_REVISION: 'bg-blue-50 text-blue-800 border-blue-200/80 shadow-xs',
    APROBADA:    'bg-emerald-50 text-emerald-800 border-emerald-200/80 shadow-xs',
    EN_COMPRA:   'bg-orange-50 text-orange-800 border-orange-200/80 shadow-xs',
    PARCIAL:     'bg-purple-50 text-purple-800 border-purple-200/80 shadow-xs',
    COMPLETADA:  'bg-teal-50 text-teal-800 border-teal-200/80 shadow-xs',
    RECHAZADA:   'bg-rose-50 text-rose-800 border-rose-200/80 shadow-xs',
    BORRADOR:    'bg-slate-50 text-slate-700 border-slate-200/80 shadow-xs',
    // legacy lowercase
    pendiente:  'bg-amber-50 text-amber-800 border-amber-200/80 shadow-xs',
    revisando:  'bg-blue-50 text-blue-800 border-blue-200/80 shadow-xs',
    aprobado:   'bg-emerald-50 text-emerald-800 border-emerald-200/80 shadow-xs',
    en_compra:  'bg-orange-50 text-orange-800 border-orange-200/80 shadow-xs',
    completado: 'bg-teal-50 text-teal-800 border-teal-200/80 shadow-xs',
    rechazado:  'bg-rose-50 text-rose-800 border-rose-200/80 shadow-xs',
  }
  return map[estado] ?? 'bg-slate-50 text-slate-700 border-slate-200/80 shadow-xs'
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
    URGENTE:    'bg-rose-50 text-rose-700 border-rose-200/90 shadow-xs',
    IMPORTANTE: 'bg-amber-50 text-amber-800 border-amber-200/90 shadow-xs',
    MODERADA:   'bg-sky-50 text-sky-800 border-sky-200/90 shadow-xs',
    PROGRAMADA: 'bg-slate-50 text-slate-700 border-slate-200/90 shadow-xs',
  }
  return map[categoria] ?? 'bg-slate-50 text-slate-700 border-slate-200 shadow-xs'
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
    precio_unitario_sugerido?: number
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
      const precioUnit = item.precio_unitario_sugerido ?? 0
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
