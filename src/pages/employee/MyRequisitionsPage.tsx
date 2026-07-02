import { useState } from 'react'
import { useRequisitions, useRequisitionById } from '@/hooks/useRequisitions'
import type { Requisicion } from '@/types'
import { Modal } from '@/components/ui/Modal'
import { RequisitionStatusBadge as StatusBadge } from '@/components/requisitions/StatusBadge'
import { CategoryBadge } from '@/components/requisitions/CategoryBadge'
import { OrderTimeline as Timeline } from '@/components/requisitions/Timeline'
import { CurrencyCOP } from '@/components/ui/CurrencyCOP'
import { PageLoader } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDate, unidadMedidaLabel } from '@/lib/utils'
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
  const { data: req, isLoading, error } = useRequisitionById(id)

  if (!open) return null

  return (
    <Modal open={open} onClose={onClose} title={req ? `Requisición ${req.codigo}` : 'Detalles de requisición'} size="lg">
      {isLoading ? (
        <PageLoader />
      ) : error ? (
        <div className="p-6 text-sm text-red-700">
          <p className="font-semibold">No se pudo cargar la requisición.</p>
          <p className="mt-2">{error.message || 'Ocurrió un error al obtener los detalles.'}</p>
        </div>
      ) : !req ? (
        <div className="p-6 text-sm text-gray-600">Requisición no encontrada.</div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-4 text-sm">
            <div><span className="text-gray-500">Punto:</span> <strong>{req.punto}</strong></div>
            <div><span className="text-gray-500">Aviso:</span> <strong>{req.numero_aviso}</strong></div>
            <div><span className="text-gray-500">Especialidad:</span> <strong>{req.especialidad}</strong></div>
            <div><span className="text-gray-500">Categoría:</span> <CategoryBadge categoria={req.categoria} /></div>
            {req.fecha_maxima_entrega && (
              <div><span className="text-gray-500">Fecha máx.:</span> <strong>{formatDate(req.fecha_maxima_entrega)}</strong></div>
            )}
            <div><span className="text-gray-500">Total estimado:</span> <strong><CurrencyCOP value={req.total_estimado} /></strong></div>
          </div>

          {req.notas_empleado && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
              <p className="font-medium text-yellow-800 mb-1">Notas</p>
              <p className="text-yellow-700">{req.notas_empleado}</p>
            </div>
          )}

          {req.motivo_rechazo && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
              <p className="font-medium text-red-800 mb-1">Motivo de rechazo</p>
              <p className="text-red-700">{req.motivo_rechazo}</p>
            </div>
          )}

          <div>
            <p className="text-sm font-semibold text-gray-700 mb-3">Productos solicitados</p>
            {req.detalles && req.detalles.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500">#</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500">Código SINCO</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500">Producto</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500">Cant.</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500">UM</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500">Proveedor sugerido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {req.detalles.map((item, index) => (
                      <tr key={item.id}>
                        <td className="px-3 py-2 text-xs text-gray-500">{item.numero_item ?? index + 1}</td>
                        <td className="px-3 py-2 text-xs font-mono text-gray-500">{item.producto?.codigo ?? '—'}</td>
                        <td className="px-3 py-2 text-sm text-gray-700">{item.producto?.nombre ?? 'Sin producto'}</td>
                        <td className="px-3 py-2 text-sm text-gray-700">{item.cantidad}</td>
                        <td className="px-3 py-2 text-sm text-gray-700">{unidadMedidaLabel(item.producto?.unidad_medida ?? 'UND')}</td>
                        <td className="px-3 py-2 text-sm text-gray-700">{item.proveedor_sugerido?.nombre ?? 'Sin proveedor'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No hay productos asociados a esta requisición.</p>
            )}
          </div>

          {req.historial && req.historial.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3">Historial</p>
              <Timeline historial={req.historial} />
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

export default function MyRequisitionsPage() {
  const [estadoFilter, setEstadoFilter] = useState<EstadoRequisicion | undefined>(undefined)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const { data: result, isLoading, isError, error } = useRequisitions({ estado: estadoFilter })
  const requisiciones = (result?.data ?? []) as Requisicion[]

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
      ) : isError ? (
        <div className="bg-white rounded-xl border border-red-200 p-6 text-red-600 text-sm">
          <p className="font-semibold">No se pudieron cargar las requisiciones.</p>
          <p className="mt-2">{error?.message ?? 'Ocurrió un error al consultar tus requisiciones.'}</p>
        </div>
      ) : result?.count === 0 ? (
        <EmptyState title="Sin requisiciones" description="Aún no has creado requisiciones." />
      ) : !requisiciones.length ? (
        <div className="bg-white rounded-xl border border-red-200 p-6 text-red-600 text-sm">
          <p className="font-semibold">No se encontraron requisiciones para tu cuenta.</p>
          <p className="mt-2">Esto puede ocurrir si tu sesión no cargó el usuario correctamente o si hay un filtro activo.</p>
          <p className="mt-2 text-xs text-gray-500">Si ya enviaste una requisición, recarga la página o cierra sesión e ingresa nuevamente.</p>
        </div>
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
