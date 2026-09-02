import { useState, useMemo } from 'react'
import { Truck, PackageCheck, Clock3, CheckCircle2, Search, User, Building2 } from 'lucide-react'
import { useRequisitions, useRequisitionById, useMarcarItemCompletado } from '@/hooks/useRequisitions'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { RequisitionStatusBadge as StatusBadge } from '@/components/requisitions/StatusBadge'
import { formatDate } from '@/lib/utils'
import { CurrencyCOP } from '@/components/ui/CurrencyCOP'

function progreso(detalles: Array<{ completado: boolean }> | undefined) {
  const total = detalles?.length ?? 0
  const recibidos = detalles?.filter((d) => d.completado).length ?? 0
  return { total, recibidos, pct: total ? Math.round((recibidos / total) * 100) : 0 }
}

export default function WarehousePage() {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const { data: requisitionsResponse, isLoading } = useRequisitions({ estado: ['EN_COMPRA', 'PARCIAL'] })
  const requisitions = requisitionsResponse?.data ?? []

  const filteredRequisitions = useMemo(() => {
    if (!search.trim()) return requisitions
    const q = search.toLowerCase()
    return requisitions.filter(
      (r) =>
        r.codigo.toLowerCase().includes(q) ||
        (r as any).empleado?.nombre_completo?.toLowerCase().includes(q) ||
        r.punto?.toLowerCase().includes(q)
    )
  }, [requisitions, search])

  const selected = selectedId ? requisitions.find((r) => r.id === selectedId) : null
  const { data: reqDetail, isLoading: isDetailLoading } = useRequisitionById(selected?.id)
  const marcarRecibido = useMarcarItemCompletado()

  const detailProgress = progreso(reqDetail?.detalles)

  return (
    <div className="space-y-5">
      {/* Header card */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200/70 flex items-center justify-center text-amber-700 font-black text-sm shadow-2xs">
            <Truck size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Recepción en Almacén</h1>
              <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                {requisitions.length} pendientes
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Control de entrada de materiales, insumos y verificación de pedidos</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-24"><Spinner /></div>
      ) : !requisitions.length ? (
        <EmptyState
          icon={<Truck size={40} className="text-slate-300" />}
          title="No hay requisiciones pendientes para almacén"
          description="Aquí aparecerán solo requisiciones EN_COMPRA y PARCIAL listas para ser recibidas."
        />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[400px,1fr] gap-5 items-start">
          {/* Left panel: List of pending requisitions */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Requisiciones en tránsito</p>
                <span className="text-xs font-bold text-slate-700 bg-slate-200/60 px-2 py-0.5 rounded-md">
                  {filteredRequisitions.length}
                </span>
              </div>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por código, punto o empleado..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] bg-white shadow-2xs"
                />
              </div>
            </div>

            <div className="max-h-[70vh] overflow-y-auto divide-y divide-slate-100">
              {filteredRequisitions.map((req) => {
                const p = progreso((req as any).detalles)
                const active = req.id === selectedId
                return (
                  <button
                    key={req.id}
                    onClick={() => setSelectedId(req.id)}
                    className={`w-full text-left p-4 transition-all duration-150 ${
                      active
                        ? 'bg-blue-50/70 border-l-4 border-l-[#1e3a5f]'
                        : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-[#1e3a5f] bg-white border border-slate-200 px-2 py-0.5 rounded shadow-2xs">
                        {req.codigo}
                      </span>
                      <StatusBadge estado={req.estado} size="sm" />
                    </div>

                    <p className="text-xs font-bold text-slate-800 mt-2">
                      {(req as any).empleado?.nombre_completo ?? 'Sin solicitante'}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {req.punto ?? 'Sin punto'} · Entrega: {req.fecha_maxima_entrega ? formatDate(req.fecha_maxima_entrega) : '—'}
                    </p>

                    {/* Progress bar */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-semibold text-slate-500">{p.recibidos} de {p.total} recibidos</span>
                        <span className="font-bold text-slate-700">{p.pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${p.pct === 100 ? 'bg-emerald-500' : 'bg-[#1e3a5f]'}`}
                          style={{ width: `${p.pct}%` }}
                        />
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Right panel: Requisition item reception detail */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden min-h-[460px]">
            {!selectedId ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-12 space-y-3">
                <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <Clock3 size={28} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-700">Selecciona una requisición</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    Elige una requisición del panel izquierdo para verificar y marcar los insumos recibidos.
                  </p>
                </div>
              </div>
            ) : isDetailLoading || !reqDetail ? (
              <div className="h-full flex items-center justify-center py-20"><Spinner /></div>
            ) : (
              <div className="space-y-6 p-6">
                {/* Requisition Summary Header */}
                <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-black text-[#1e3a5f] bg-white border border-slate-200 px-2.5 py-0.5 rounded shadow-2xs">
                          {reqDetail.codigo}
                        </span>
                        <StatusBadge estado={reqDetail.estado} size="sm" />
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-1">
                        <span className="flex items-center gap-1">
                          <User size={12} className="text-slate-400" />
                          {(reqDetail as any).empleado?.nombre_completo ?? '—'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Building2 size={12} className="text-slate-400" />
                          Proveedor: {(reqDetail as any).proveedor_final?.nombre ?? 'Por asignar'}
                        </span>
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Total Requisición</p>
                      <p className="text-base font-black text-slate-900 mt-0.5">
                        <CurrencyCOP value={reqDetail.total_estimado} />
                      </p>
                    </div>
                  </div>

                  {/* Overall progress bar */}
                  <div className="pt-2 border-t border-slate-200/60">
                    <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                      <span className="text-slate-600">Progreso de recepción física</span>
                      <span className="text-emerald-700">{detailProgress.recibidos} de {detailProgress.total} ítems ({detailProgress.pct}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200/70 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          detailProgress.pct === 100 ? 'bg-emerald-500' : 'bg-[#1e3a5f]'
                        }`}
                        style={{ width: `${detailProgress.pct}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Items Checklist */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Ítems para recibir ({reqDetail.detalles?.length ?? 0})
                    </h3>
                  </div>

                  <div className="space-y-2.5">
                    {reqDetail.detalles?.map((item) => (
                      <div
                        key={item.id}
                        className={`rounded-2xl border p-4 transition-all duration-200 ${
                          item.completado
                            ? 'bg-emerald-50/70 border-emerald-200 shadow-2xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="space-y-1">
                            <p className={`text-sm font-bold ${item.completado ? 'text-emerald-900' : 'text-slate-900'}`}>
                              #{item.numero_item ?? item.id} · {item.producto?.nombre}
                            </p>
                            <p className="text-xs text-slate-500 font-medium">
                              Cantidad requerida: <span className="font-bold text-slate-800">{item.cantidad} {item.producto?.unidad_medida ?? 'UND'}</span>
                              {item.producto?.codigo ? ` · Ref: ${item.producto.codigo}` : ''}
                            </p>
                            {item.completado && (
                              <p className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1 pt-0.5">
                                <CheckCircle2 size={11} />
                                Recibido {item.completado_at ? formatDate(item.completado_at) : ''}
                                {item.completado_por_usuario?.nombre_completo ? ` por ${item.completado_por_usuario.nombre_completo}` : ''}
                              </p>
                            )}
                          </div>

                          <div className="flex-shrink-0">
                            {item.completado ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-100/80 border border-emerald-300 px-3 py-1.5 rounded-full shadow-2xs">
                                <CheckCircle2 size={13} className="text-emerald-600" /> Recibido
                              </span>
                            ) : (
                              <button
                                disabled={marcarRecibido.isPending}
                                onClick={() =>
                                  marcarRecibido.mutate({ itemId: item.id, requisicionId: reqDetail.id, completado: true })
                                }
                                className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] hover:bg-[#162d4a] text-white text-xs font-bold px-4 py-2 shadow-sm transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
                              >
                                <PackageCheck size={14} />
                                <span>Marcar recibido</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
