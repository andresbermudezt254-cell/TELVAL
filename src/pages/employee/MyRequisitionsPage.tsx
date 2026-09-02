import { useState } from 'react'
import { useRequisitions, useRequisitionById } from '@/hooks/useRequisitions'
import { Modal } from '@/components/ui/Modal'
import { RequisitionStatusBadge as StatusBadge } from '@/components/requisitions/StatusBadge'
import { CategoryBadge } from '@/components/requisitions/CategoryBadge'
import { OrderTimeline as Timeline } from '@/components/requisitions/Timeline'
import { CurrencyCOP } from '@/components/ui/CurrencyCOP'
import { PageLoader } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDate } from '@/lib/utils'
import type { EstadoRequisicion } from '@/types'

const ESTADOS: { label: string; value: EstadoRequisicion | 'all' }[] = [
  { label: 'Todos', value: 'all' },
  { label: 'Borrador', value: 'BORRADOR' },
  { label: 'Pendiente', value: 'PENDIENTE' },
  { label: 'En revisión', value: 'EN_REVISION' },
  { label: 'Aprobada', value: 'APROBADA' },
  { label: 'En compra', value: 'EN_COMPRA' },
  { label: 'Completada', value: 'COMPLETADA' },
  { label: 'Rechazada', value: 'RECHAZADA' },
]

function DetailModal({ id, open, onClose }: { id: number; open: boolean; onClose: () => void }) {
  const { data: req, isLoading } = useRequisitionById(id)
  const r = req as any
  if (!open) return null
  return (
    <Modal open={open} onClose={onClose} title={r ? `Requisición ${r.codigo}` : 'Cargando...'} size="lg">
      {isLoading || !r ? (
        <PageLoader />
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-4 text-sm">
            <div><span className="text-gray-500">Punto:</span> <strong>{r.punto}</strong></div>
            <div><span className="text-gray-500">Aviso:</span> <strong>{r.numero_aviso}</strong></div>
            <div><span className="text-gray-500">Especialidad:</span> <strong>{r.especialidad}</strong></div>
            <div><span className="text-gray-500">Categoría:</span> <CategoryBadge categoria={r.categoria} /></div>
            {r.fecha_maxima_entrega && (
              <div><span className="text-gray-500">Fecha máx.:</span> <strong>{formatDate(r.fecha_maxima_entrega)}</strong></div>
            )}
            <div><span className="text-gray-500">Total estimado:</span> <strong><CurrencyCOP value={r.total_estimado} /></strong></div>
          </div>

          {r.notas_empleado && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
              <p className="font-medium text-yellow-800 mb-1">Notas</p>
              <p className="text-yellow-700">{r.notas_empleado}</p>
            </div>
          )}

          {r.motivo_rechazo && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
              <p className="font-medium text-red-800 mb-1">Motivo de rechazo</p>
              <p className="text-red-700">{r.motivo_rechazo}</p>
            </div>
          )}

          {r.historial && r.historial.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3">Historial</p>
              <Timeline historial={r.historial} />
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

export default function MyRequisitionsPage() {
  const [estadoFilter, setEstadoFilter] = useState<EstadoRequisicion | undefined>()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const { data: result, isLoading } = useRequisitions({ estado: estadoFilter })
  const requisiciones = result?.data ?? []

  return (
    <div className="space-y-5">
      {/* Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200/70 flex items-center justify-center text-[#1e3a5f] font-black text-sm shadow-2xs">
            <span className="text-base">📋</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Mis Requisiciones</h1>
              {!isLoading && (
                <span className="text-xs font-bold text-[#1e3a5f] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                  {requisiciones.length} registradas
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Seguimiento de pedidos solicitados y estado de entrega</p>
          </div>
        </div>
      </div>

      {/* Estado chips */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs flex flex-wrap gap-1.5 items-center">
        <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mr-2">Filtrar:</span>
        {ESTADOS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setEstadoFilter(value === 'all' ? undefined : value as EstadoRequisicion)}
            className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
              (value === 'all' && !estadoFilter) || estadoFilter === value
                ? 'bg-[#1e3a5f] text-white border-[#1e3a5f] shadow-sm'
                : 'bg-slate-50 text-slate-600 border-slate-200/80 hover:bg-white hover:border-[#1e3a5f]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <PageLoader />
      ) : !requisiciones.length ? (
        <EmptyState title="Sin requisiciones" description="Aún no has creado requisiciones con estos filtros." />
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/90 overflow-x-auto shadow-xs">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                {['Código', 'Fecha', 'Punto', 'Aviso', 'Categoría', 'Estado', 'Total Est.'].map((h) => (
                  <th key={h} className="text-left px-4 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requisiciones.map((req) => (
                <tr
                  key={req.id}
                  onClick={() => setSelectedId(req.id)}
                  className="hover:bg-blue-50/40 cursor-pointer transition-colors group"
                >
                  <td className="px-4 py-3.5">
                    <span className="font-mono text-xs font-bold text-[#1e3a5f] bg-slate-100/90 border border-slate-200/80 px-2 py-0.5 rounded shadow-2xs group-hover:bg-blue-50 group-hover:border-blue-200 transition-colors">
                      {req.codigo}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-500 font-medium">{formatDate(req.fecha_solicitud)}</td>
                  <td className="px-4 py-3.5 text-xs font-bold text-slate-800">{req.punto}</td>
                  <td className="px-4 py-3.5 text-xs font-mono text-slate-500">{req.numero_aviso}</td>
                  <td className="px-4 py-3.5"><CategoryBadge categoria={req.categoria} /></td>
                  <td className="px-4 py-3.5"><StatusBadge estado={req.estado} /></td>
                  <td className="px-4 py-3.5 font-bold text-slate-900"><CurrencyCOP value={req.total_estimado} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedId && (
        <DetailModal
          id={selectedId}
          open={!!selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  )
}
