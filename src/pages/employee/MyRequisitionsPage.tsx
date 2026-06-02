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
    <div className="space-y-4">
      {/* Estado chips */}
      <div className="flex flex-wrap gap-2">
        {ESTADOS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setEstadoFilter(value === 'all' ? undefined : value as EstadoRequisicion)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              (value === 'all' && !estadoFilter) || estadoFilter === value
                ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                : 'bg-white text-gray-600 border-gray-300 hover:border-[#1e3a5f] hover:text-[#1e3a5f]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <PageLoader />
      ) : !requisiciones.length ? (
        <EmptyState title="Sin requisiciones" description="Aún no has creado requisiciones." />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Código', 'Fecha', 'Punto', 'Aviso', 'Categoría', 'Estado', 'Total Est.'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {requisiciones.map((req) => (
                <tr
                  key={req.id}
                  onClick={() => setSelectedId(req.id)}
                  className="border-b last:border-0 hover:bg-blue-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-mono font-semibold text-[#1e3a5f]">{req.codigo}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(req.fecha_solicitud)}</td>
                  <td className="px-4 py-3">{req.punto}</td>
                  <td className="px-4 py-3">{req.numero_aviso}</td>
                  <td className="px-4 py-3"><CategoryBadge categoria={req.categoria} /></td>
                  <td className="px-4 py-3"><StatusBadge estado={req.estado} /></td>
                  <td className="px-4 py-3 font-semibold"><CurrencyCOP value={req.total_estimado} /></td>
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
