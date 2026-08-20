import { useState } from 'react'
import { Truck, PackageCheck, Clock3, CheckCircle2 } from 'lucide-react'
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
  const { data: requisitionsResponse, isLoading } = useRequisitions({ estado: ['EN_COMPRA', 'PARCIAL'] })
  const requisitions = requisitionsResponse?.data ?? []

  const selected = selectedId ? requisitions.find((r) => r.id === selectedId) : null
  const { data: reqDetail, isLoading: isDetailLoading } = useRequisitionById(selected?.id)
  const marcarRecibido = useMarcarItemCompletado()

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-black text-gray-900">Almacén</h1>
        <p className="text-sm text-gray-500 mt-1">Recibe materiales ítem por ítem para requisiciones en compra o parciales.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-24"><Spinner /></div>
      ) : !requisitions.length ? (
        <EmptyState
          icon={<Truck size={40} className="text-gray-300" />}
          title="No hay requisiciones pendientes para almacén"
          description="Aquí aparecerán solo requisiciones EN_COMPRA y PARCIAL."
        />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[420px,1fr] gap-5">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b bg-gray-50">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Pendientes de recepción</p>
            </div>
            <div className="max-h-[70vh] overflow-y-auto">
              {requisitions.map((req) => {
                const p = progreso((req as any).detalles)
                const active = req.id === selectedId
                return (
                  <button
                    key={req.id}
                    onClick={() => setSelectedId(req.id)}
                    className={`w-full text-left px-4 py-3 border-b last:border-b-0 transition-colors ${active ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-mono text-xs font-bold text-[#1e3a5f]">{req.codigo}</p>
                      <StatusBadge estado={req.estado} size="sm" />
                    </div>
                    <p className="text-sm font-medium text-gray-800 mt-1">{(req as any).empleado?.nombre_completo ?? 'Sin solicitante'}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{req.punto ?? 'Sin punto'} · Fecha máx: {req.fecha_maxima_entrega ? formatDate(req.fecha_maxima_entrega) : '—'}</p>
                    <div className="mt-2">
                      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full bg-[#1e3a5f]" style={{ width: `${p.pct}%` }} />
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1">{p.recibidos}/{p.total} recibidos</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden min-h-[420px]">
            {!selectedId ? (
              <div className="h-full grid place-items-center text-center px-6 py-16">
                <div>
                  <Clock3 size={28} className="mx-auto text-gray-300" />
                  <p className="text-sm text-gray-500 mt-2">Selecciona una requisición para recibir materiales</p>
                </div>
              </div>
            ) : isDetailLoading || !reqDetail ? (
              <div className="h-full grid place-items-center py-16"><Spinner /></div>
            ) : (
              <div>
                <div className="px-5 py-4 border-b bg-gray-50">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-mono text-sm font-bold text-[#1e3a5f]">{reqDetail.codigo}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Solicitante: {(reqDetail as any).empleado?.nombre_completo ?? '—'} · Proveedor: {(reqDetail as any).proveedor_final?.nombre ?? '—'}</p>
                    </div>
                    <div className="text-right">
                      <StatusBadge estado={reqDetail.estado} size="sm" />
                      <p className="text-xs text-gray-500 mt-1"><CurrencyCOP value={reqDetail.total_estimado} /></p>
                    </div>
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  {reqDetail.detalles?.map((item) => (
                    <div key={item.id} className={`rounded-xl border p-3.5 ${item.completado ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-200'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className={`text-sm font-semibold ${item.completado ? 'text-emerald-800' : 'text-gray-800'}`}>
                            #{item.numero_item ?? item.id} · {item.producto?.nombre}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {item.cantidad} {item.unidad_medida?.abreviatura ?? item.producto?.unidad_medida ?? 'UND'}
                            {item.producto?.codigo ? ` · ${item.producto.codigo}` : ''}
                          </p>
                          {item.completado && (
                            <p className="text-[11px] text-emerald-700 mt-1">
                              Recibido {item.completado_at ? formatDate(item.completado_at) : ''}
                              {item.completado_por_usuario?.nombre_completo ? ` por ${item.completado_por_usuario.nombre_completo}` : ''}
                            </p>
                          )}
                        </div>

                        {item.completado ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-full">
                            <CheckCircle2 size={12} /> Recibido
                          </span>
                        ) : (
                          <button
                            disabled={marcarRecibido.isPending}
                            onClick={() => marcarRecibido.mutate({ itemId: item.id, requisicionId: reqDetail.id, completado: true })}
                            className="inline-flex items-center gap-1 rounded-lg bg-[#1e3a5f] text-white text-xs font-semibold px-3 py-2 hover:bg-[#162d4a] transition-colors disabled:opacity-50"
                          >
                            <PackageCheck size={13} /> Marcar recibido
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
