import { useState, useMemo } from 'react'
import {
  Truck,
  Package,
  ChevronDown,
  ChevronUp,
  ShoppingCart,
  Phone,
  CheckCircle2,
  Circle,
  Zap,
  AlertTriangle,
  Clock,
  Hash,
} from 'lucide-react'
import { useMarcarItemCompletado, useOrderSummary } from '@/hooks/useRequisitions'
import { formatCOP } from '@/lib/utils'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'

// ── Configuración visual ──────────────────────────────────────────
const ESTADOS_FILTRO = [
  { value: 'PENDIENTE',   label: 'Pendientes',  on: 'bg-yellow-400 text-white border-yellow-400',  off: 'bg-white text-yellow-600 border-yellow-300' },
  { value: 'EN_REVISION', label: 'En revisión', on: 'bg-blue-500 text-white border-blue-500',      off: 'bg-white text-blue-600 border-blue-300' },
  { value: 'APROBADA',    label: 'Aprobadas',   on: 'bg-emerald-500 text-white border-emerald-500',off: 'bg-white text-emerald-600 border-emerald-300' },
  { value: 'EN_COMPRA',   label: 'En compra',   on: 'bg-purple-500 text-white border-purple-500',  off: 'bg-white text-purple-600 border-purple-300' },
]

const ESTADO_CHIP: Record<string, string> = {
  PENDIENTE:   'bg-yellow-50 text-yellow-700 border border-yellow-200',
  EN_REVISION: 'bg-blue-50 text-blue-700 border border-blue-200',
  APROBADA:    'bg-emerald-50 text-emerald-700 border border-emerald-200',
  EN_COMPRA:   'bg-purple-50 text-purple-700 border border-purple-200',
  COMPLETADA:  'bg-gray-100 text-gray-500 border border-gray-200',
}
const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE:   'Pendiente',
  EN_REVISION: 'En revision',
  APROBADA:    'Aprobada',
  EN_COMPRA:   'En compra',
  COMPLETADA:  'Completada',
}

const URGENCIA: Record<string, { label: string; rowBg: string; badge: string; Icon: any; pulse: boolean }> = {
  URGENTE:    { label: 'URGENTE',    rowBg: 'bg-red-50/70',    badge: 'bg-red-500 text-white',       Icon: Zap,           pulse: true  },
  IMPORTANTE: { label: 'IMPORTANTE', rowBg: 'bg-orange-50/60', badge: 'bg-orange-400 text-white',    Icon: AlertTriangle, pulse: false },
  MODERADA:   { label: 'MODERADA',   rowBg: 'bg-yellow-50/40', badge: 'bg-yellow-400 text-gray-800', Icon: Clock,         pulse: false },
  PROGRAMADA: { label: 'PROGRAMADA', rowBg: '',                 badge: 'bg-gray-100 text-gray-500',   Icon: Clock,         pulse: false },
}

const CATEGORIAS_FILTRO = [
  { value: 'URGENTE', label: 'Urgente' },
  { value: 'IMPORTANTE', label: 'Importante' },
  { value: 'MODERADA', label: 'Moderada' },
  { value: 'PROGRAMADA', label: 'Programada' },
]

export default function OrderSummaryPage() {
  const [activeEstados, setActiveEstados] = useState<string[]>([
    'PENDIENTE', 'EN_REVISION', 'APROBADA', 'EN_COMPRA',
  ])
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [activeCategorias, setActiveCategorias] = useState<string[]>(['URGENTE', 'IMPORTANTE', 'MODERADA', 'PROGRAMADA'])

  const { data: items, isLoading } = useOrderSummary(activeEstados, activeCategorias)
  const marcarItem = useMarcarItemCompletado()

  const togglePedido = (item: { id: number; requisicion_id: number; completado: boolean }) => {
    marcarItem.mutate({
      itemId: item.id,
      requisicionId: item.requisicion_id,
      completado: !item.completado,
    })
  }

  const grouped = useMemo(() => {
    if (!items?.length) return {}
    const result: Record<string, { proveedor: any; rows: any[] }> = {}
    for (const item of items as any[]) {
      const key = item.proveedor?.id ? String(item.proveedor.id) : '__sin__'
      if (!result[key]) {
        result[key] = {
          proveedor: item.proveedor ?? { id: null, nombre: 'Sin proveedor asignado' },
          rows: [],
        }
      }
      result[key].rows.push(item)
    }
    const urgOrder: Record<string, number> = { URGENTE: 0, IMPORTANTE: 1, MODERADA: 2, PROGRAMADA: 3 }
    for (const g of Object.values(result)) {
      g.rows.sort((a, b) => {
        const au = urgOrder[a.requisicion?.categoria ?? 'PROGRAMADA'] ?? 3
        const bu = urgOrder[b.requisicion?.categoria ?? 'PROGRAMADA'] ?? 3
        return au - bu
      })
    }
    return result
  }, [items])

  const supplierEntries = Object.entries(grouped).sort(([a, ga], [b, gb]) => {
    if (a === '__sin__') return 1
    if (b === '__sin__') return -1
    return ga.proveedor.nombre.localeCompare(gb.proveedor.nombre)
  })

  const completedIds = useMemo(() => {
    const ids = new Set<number>()
    for (const row of (items as any[] | undefined) ?? []) {
      if (row.completado) ids.add(row.id)
    }
    return ids
  }, [items])

  const getLineTotal = (row: any) => Number(
    row.total_linea ?? (Number(row.precio_unitario ?? 0) * Number(row.cantidad ?? 0))
  )

  const grandTotal = supplierEntries.reduce(
    (acc, [, { rows }]) => acc + rows.reduce((s, r) => s + getLineTotal(r), 0),
    0
  )
  const totalLineas = supplierEntries.reduce((acc, [, { rows }]) => acc + rows.length, 0)
  const totalUnidades = supplierEntries.reduce((acc, [, { rows }]) => acc + rows.reduce((s, r) => s + Number(r.cantidad ?? 0), 0), 0)
  const totalPedidos = supplierEntries.reduce(
    (acc, [, { rows }]) => acc + rows.filter((row) => completedIds.has(row.id)).length,
    0
  )
  const pct = totalLineas > 0 ? Math.round((totalPedidos / totalLineas) * 100) : 0

  const toggleEstado = (e: string) =>
    setActiveEstados((prev) =>
      prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]
    )
  const toggleCategoria = (c: string) =>
    setActiveCategorias((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    )
  const isOpen = (key: string) => expanded[key] !== false
  const toggleExpanded = (key: string) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))

  return (
    <div className="space-y-5">
      {/* Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-200/70 flex items-center justify-center text-purple-700 font-black text-sm shadow-2xs">
            <ShoppingCart size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Consolidado de Compras</h1>
              <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                {totalLineas} ítems agrupados
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Agrupación por proveedor para cotización y despacho masivo</p>
          </div>
        </div>

        {totalLineas > 0 && (
          <div className="flex flex-col sm:items-end gap-1.5 bg-slate-50 border border-slate-200/80 p-3 rounded-2xl">
            <div className="flex items-center justify-between sm:justify-end gap-3 text-xs font-bold">
              <span className="text-slate-500">{totalPedidos} de {totalLineas} pedidos</span>
              <span className="text-emerald-700">{pct}% completado</span>
            </div>
            <div className="w-40 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: pct + '%' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* KPI Stats */}
      {!isLoading && supplierEntries.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="relative bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-blue-600" />
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Proveedores</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{supplierEntries.filter(([k]) => k !== '__sin__').length}</p>
          </div>
          <div className="relative bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#f97316]" />
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Líneas activas</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{totalLineas}</p>
          </div>
          <div className="relative bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-purple-600" />
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Unidades</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{totalUnidades.toLocaleString('es-CO')}</p>
          </div>
          <div className="relative bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-600" />
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total estimado</p>
            <p className="text-lg font-black text-slate-900 mt-1">{formatCOP(grandTotal)}</p>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold min-w-[70px]">Estado:</span>
          <div className="flex flex-wrap gap-1.5 items-center">
            {ESTADOS_FILTRO.map((e) => (
              <button
                key={e.value}
                onClick={() => toggleEstado(e.value)}
                className={`px-3 py-1 rounded-full text-xs font-bold border transition-all duration-200 ${
                  activeEstados.includes(e.value)
                    ? 'bg-[#1e3a5f] text-white border-[#1e3a5f] shadow-sm'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-[#1e3a5f]'
                }`}
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-3 border-t border-slate-100">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold min-w-[70px]">Prioridad:</span>
          <div className="flex flex-wrap gap-1.5 items-center">
            {CATEGORIAS_FILTRO.map((cat) => (
              <button
                key={cat.value}
                onClick={() => toggleCategoria(cat.value)}
                className={`px-3 py-1 rounded-full text-xs font-bold border transition-all duration-200 ${
                  activeCategorias.includes(cat.value)
                    ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-24"><Spinner /></div>
      ) : supplierEntries.length === 0 ? (
        <EmptyState
          icon={<ShoppingCart size={40} className="text-gray-300" />}
          title="Sin requisiciones activas"
          description="Activa alguno de los filtros de estado o espera a que haya solicitudes."
        />
      ) : (
        <div className="space-y-3">
          {supplierEntries.map(([key, { proveedor, rows }], idx) => {
            const open = isOpen(key)
            const isSin = key === '__sin__'
            const subtotal = rows.reduce((s, r) => s + getLineTotal(r), 0)
            const pedidosCount = rows.filter((r) => completedIds.has(r.id)).length
            const allDone = pedidosCount === rows.length && rows.length > 0
            const hasUrgent = rows.some((r) => r.requisicion?.categoria === 'URGENTE')

            return (
              <div
                key={key}
                className={`rounded-2xl border overflow-hidden shadow-sm transition-all duration-300 ${allDone ? 'border-emerald-200 bg-emerald-50/30' : hasUrgent ? 'border-red-200 bg-white' : 'border-gray-200 bg-white'}`}
              >
                <button
                  type="button"
                  onClick={() => toggleExpanded(key)}
                  className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-black/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${allDone ? 'bg-emerald-100' : isSin ? 'bg-gray-100' : hasUrgent ? 'bg-red-100' : 'bg-[#1e3a5f]/10'}`}>
                      {allDone ? (
                        <CheckCircle2 size={18} className="text-emerald-500" />
                      ) : (
                        <Truck size={17} className={isSin ? 'text-gray-400' : hasUrgent ? 'text-red-500' : 'text-[#1e3a5f]'} />
                      )}
                    </div>
                    <div className="text-left min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm font-bold leading-tight truncate ${isSin ? 'text-gray-400 italic' : 'text-gray-900'}`}>
                          {proveedor.nombre}
                        </p>
                        {hasUrgent && !allDone && (
                          <span className="inline-flex items-center gap-0.5 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full animate-pulse">
                            <Zap size={9} />URGENTE
                          </span>
                        )}
                        {allDone && (
                          <span className="inline-flex items-center gap-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-black px-1.5 py-0.5 rounded-full">
                            PEDIDO
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        <span className="font-semibold text-emerald-600">{pedidosCount}</span>/{rows.length} marcados
                        {subtotal > 0 && <span className="ml-2 font-semibold text-[#1e3a5f]">- {formatCOP(subtotal)}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {proveedor.whatsapp && (
                      <a
                        href={`https://wa.me/${proveedor.whatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                        title="Contactar por WhatsApp"
                      >
                        <Phone size={14} />
                      </a>
                    )}
                    {open ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
                  </div>
                </button>

                {rows.length > 0 && (
                  <div className="h-1 w-full bg-gray-100">
                    <div className="h-full bg-emerald-400 transition-all duration-500" style={{ width: Math.round((pedidosCount / rows.length) * 100) + '%' }} />
                  </div>
                )}

                {open && (
                  <div className="border-t border-gray-100 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-[10px] text-gray-400 uppercase tracking-wider">
                          <th className="w-8 px-3 py-2.5" />
                          <th className="text-left px-3 py-2.5 font-semibold">Producto</th>
                          <th className="text-left px-2 py-2.5 font-semibold">Requisicion</th>
                          <th className="text-left px-2 py-2.5 font-semibold">Prioridad</th>
                          <th className="text-left px-2 py-2.5 font-semibold">Estado</th>
                          <th className="text-center px-2 py-2.5 font-semibold">Cantidad</th>
                          <th className="text-right px-3 py-2.5 font-semibold">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {rows.map((row: any) => {
                          const isCompleted = !!row.completado
                          const marcado = isCompleted
                          const cat = row.requisicion?.categoria ?? 'PROGRAMADA'
                          const urg = URGENCIA[cat] ?? URGENCIA.PROGRAMADA
                          const UrgIcon = urg.Icon

                          return (
                            <tr
                              key={row.id}
                              className={`transition-colors duration-200 ${marcado ? 'bg-emerald-50/60' : urg.rowBg ? urg.rowBg : 'hover:bg-gray-50/60'}`}
                            >
                              <td className="px-3 py-3 text-center">
                                {isCompleted ? (
                                  <span className="inline-flex" title="Recibido">
                                    <CheckCircle2 size={20} className="text-emerald-500 drop-shadow-sm" />
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => togglePedido(row)}
                                    className="transition-transform duration-150 active:scale-90 disabled:opacity-50"
                                    disabled={marcarItem.isPending}
                                    title={marcado ? 'Desmarcar recibido' : 'Marcar como recibido'}
                                  >
                                    {marcado ? (
                                      <CheckCircle2 size={20} className="text-emerald-500 drop-shadow-sm" />
                                    ) : (
                                      <Circle size={20} className="text-gray-300 hover:text-gray-400" />
                                    )}
                                  </button>
                                )}
                              </td>

                              <td className="px-3 py-3">
                                <div className="flex items-start gap-1.5">
                                  <Package size={11} className="text-gray-300 mt-0.5 flex-shrink-0" />
                                  <div>
                                    <p className={`text-xs font-semibold leading-tight ${marcado ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                      {row.producto?.nombre ?? '-'}
                                    </p>
                                    {row.producto?.codigo && (
                                      <p className="text-[10px] text-gray-400 font-mono">#{row.producto.codigo}</p>
                                    )}
                                  </div>
                                </div>
                              </td>

                              <td className="px-2 py-3">
                                {row.requisicion?.codigo ? (
                                  <span className="inline-flex items-center gap-1 bg-[#1e3a5f]/10 text-[#1e3a5f] text-[10px] font-black px-2 py-0.5 rounded-md">
                                    <Hash size={9} />{row.requisicion.codigo}
                                  </span>
                                ) : (
                                  <span className="text-gray-300 text-[10px]">-</span>
                                )}
                              </td>

                              <td className="px-2 py-3">
                                <span className={`inline-flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded-full ${urg.badge} ${cat === 'URGENTE' && !marcado ? 'animate-pulse' : ''}`}>
                                  <UrgIcon size={8} />{urg.label}
                                </span>
                              </td>

                              <td className="px-2 py-3">
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ESTADO_CHIP[row.requisicion?.estado ?? ''] ?? ''}`}>
                                  {ESTADO_LABEL[row.requisicion?.estado ?? ''] ?? '-'}
                                </span>
                              </td>

                              <td className="px-2 py-3 text-center">
                                <span className="text-xs font-black text-[#1e3a5f]">
                                  {Number(row.cantidad).toLocaleString('es-CO')}
                                </span>
                                <span className="text-[10px] text-gray-400 ml-0.5">{row.producto?.unidad_medida}</span>
                              </td>

                              <td className="px-3 py-3 text-right">
                                <span className={`text-xs font-bold ${marcado ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                                  {row.total_linea
                                    ? formatCOP(Number(row.total_linea))
                                    : row.precio_unitario
                                    ? formatCOP(Number(row.precio_unitario) * Number(row.cantidad))
                                    : '-'}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>

                      {subtotal > 0 && (
                        <tfoot>
                          <tr className="border-t-2 border-[#1e3a5f]/10 bg-[#1e3a5f]/5">
                            <td colSpan={6} className="px-3 py-2.5 text-right text-xs font-bold text-[#1e3a5f] uppercase tracking-wide">
                              Total pedido a{isSin ? ' este grupo' : (' ' + proveedor.nombre)}
                            </td>
                            <td className="px-3 py-2.5 text-right text-sm font-black text-[#1e3a5f]">{formatCOP(subtotal)}</td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                )}
              </div>
            )
          })}

          {grandTotal > 0 && (
            <div className="rounded-2xl overflow-hidden shadow-md" style={{ background: 'linear-gradient(135deg, #0f2440 0%, #1e3a5f 60%, #2a5298 100%)' }}>
              <div className="px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-xs font-semibold uppercase tracking-wider">Total general de compras</p>
                  <p className="text-white text-2xl font-black mt-0.5">{formatCOP(grandTotal)}</p>
                </div>
                <div className="text-right">
                  <p className="text-white/60 text-xs">{totalPedidos} de {totalLineas} líneas pedidas · {totalUnidades} unidades</p>
                  <p className="text-white font-black text-lg">{pct}%</p>
                  <div className="w-24 h-1.5 bg-white/20 rounded-full mt-1 overflow-hidden">
                    <div className="h-full bg-emerald-400 rounded-full transition-all duration-500" style={{ width: pct + '%' }} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
