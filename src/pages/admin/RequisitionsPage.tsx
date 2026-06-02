import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, CheckCircle2, ShoppingCart, XCircle, ChevronRight, RotateCcw, PackageCheck, Plus } from 'lucide-react'
import { useRequisitions, useUpdateRequisitionStatus } from '@/hooks/useRequisitions'
import { RequisitionStatusBadge as StatusBadge } from '@/components/requisitions/StatusBadge'
import { CategoryBadge } from '@/components/requisitions/CategoryBadge'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { CurrencyCOP } from '@/components/ui/CurrencyCOP'
import { PageLoader } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { formatDate } from '@/lib/utils'
import type { EstadoRequisicion } from '@/types'

const ESTADO_CONFIG: Record<EstadoRequisicion | 'all', { label: string; icon?: React.ReactNode; color: string }> = {
  all:        { label: 'Todas',        color: '' },
  PENDIENTE:  { label: 'Pendientes',   icon: <Clock size={11} />,         color: 'text-amber-600' },
  EN_REVISION:{ label: 'En revisión',  icon: <RotateCcw size={11} />,     color: 'text-blue-600' },
  APROBADA:   { label: 'Aprobadas',    icon: <CheckCircle2 size={11} />,  color: 'text-green-600' },
  EN_COMPRA:  { label: 'En compra',    icon: <ShoppingCart size={11} />,  color: 'text-purple-600' },
  COMPLETADA: { label: 'Completadas',  icon: <PackageCheck size={11} />,  color: 'text-slate-600' },
  RECHAZADA:  { label: 'Rechazadas',   icon: <XCircle size={11} />,       color: 'text-red-600' },
}

const ESTADOS = Object.keys(ESTADO_CONFIG) as Array<EstadoRequisicion | 'all'>

export default function RequisitionsPage() {
  const navigate = useNavigate()
  const [estadoFilter, setEstadoFilter] = useState<EstadoRequisicion | undefined>()
  const [page, setPage] = useState(0)
  const [confirmAction, setConfirmAction] = useState<{
    id: number; codigo: string; action: 'APROBADA' | 'RECHAZADA' | 'EN_COMPRA' | 'COMPLETADA'
  } | null>(null)
  const [comentario, setComentario] = useState('')

  const { data: result, isLoading } = useRequisitions({ estado: estadoFilter, page })
  const requisitions = result?.data ?? []
  const total = result?.count ?? 0
  const updateStatus = useUpdateRequisitionStatus()

  const handleConfirm = async () => {
    if (!confirmAction) return
    await updateStatus.mutateAsync({
      id: confirmAction.id,
      estado: confirmAction.action,
      notas_admin: comentario,
    })
    setConfirmAction(null)
    setComentario('')
  }

  const actionLabel: Record<string, string> = {
    APROBADA: 'Aprobar',
    RECHAZADA: 'Rechazar',
    EN_COMPRA: 'Poner en compra',
    COMPLETADA: 'Marcar completada',
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Requisiciones</h1>
          <p className="text-xs text-gray-400 mt-0.5">{total} {total === 1 ? 'requisición' : 'requisiciones'} en total</p>
        </div>
        <button
          onClick={() => navigate('/nueva-requisicion')}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1e3a5f] hover:bg-[#162d4a] text-white text-sm font-semibold transition-colors shadow-sm"
        >
          <Plus size={15} />
          Nueva
        </button>
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {ESTADOS.map((e) => {
          const cfg = ESTADO_CONFIG[e]
          const isActive = (e === 'all' && !estadoFilter) || estadoFilter === e
          return (
            <button
              key={e}
              onClick={() => { setEstadoFilter(e === 'all' ? undefined : e as EstadoRequisicion); setPage(0) }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                isActive
                  ? 'bg-[#1e3a5f] text-white border-[#1e3a5f] shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-[#1e3a5f] hover:text-[#1e3a5f]'
              }`}
            >
              {!isActive && cfg.icon && <span className={cfg.color}>{cfg.icon}</span>}
              {cfg.label}
            </button>
          )
        })}
      </div>

      {isLoading ? (
        <PageLoader />
      ) : !requisitions.length ? (
        <EmptyState title="Sin requisiciones" description="No hay requisiciones con estos filtros." />
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70">
                  {['Código', 'Empleado', 'Especialidad', 'Punto / Aviso', 'Categoría', 'Estado', 'Fecha máx.', 'Total', 'Acciones', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {requisitions.map((req) => (
                  <tr
                    key={req.id}
                    onClick={() => navigate(`/admin/requisiciones/${req.id}`)}
                    className="border-b border-gray-50 last:border-0 hover:bg-blue-50/40 cursor-pointer transition-colors group"
                  >
                    <td className="px-4 py-3.5 font-mono font-bold text-[#1e3a5f] text-xs">{req.codigo}</td>
                    <td className="px-4 py-3.5 text-gray-700 text-sm font-medium">{(req as any).empleado?.nombre_completo ?? '—'}</td>
                    <td className="px-4 py-3.5 text-xs text-gray-500">{req.especialidad}</td>
                    <td className="px-4 py-3.5 text-xs text-gray-600">
                      <span className="block font-medium text-gray-700">{req.punto}</span>
                      <span className="text-gray-400">{req.numero_aviso}</span>
                    </td>
                    <td className="px-4 py-3.5"><CategoryBadge categoria={req.categoria} /></td>
                    <td className="px-4 py-3.5"><StatusBadge estado={req.estado} /></td>
                    <td className="px-4 py-3.5 text-xs text-gray-500">{req.fecha_maxima_entrega ? formatDate(req.fecha_maxima_entrega) : '—'}</td>
                    <td className="px-4 py-3.5 font-semibold text-gray-900 whitespace-nowrap text-sm"><CurrencyCOP value={req.total_estimado} /></td>
                    <td className="px-4 py-3.5" onClick={(ev) => ev.stopPropagation()}>
                      <div className="flex gap-1 flex-wrap">
                        {req.estado === 'PENDIENTE' && (
                          <button
                            onClick={() => setConfirmAction({ id: req.id, codigo: req.codigo, action: 'APROBADA' })}
                            className="text-xs px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-semibold transition-colors"
                          >
                            Aprobar
                          </button>
                        )}
                        {(req.estado === 'PENDIENTE' || req.estado === 'EN_REVISION') && (
                          <button
                            onClick={() => setConfirmAction({ id: req.id, codigo: req.codigo, action: 'RECHAZADA' })}
                            className="text-xs px-2.5 py-1 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 font-semibold transition-colors"
                          >
                            Rechazar
                          </button>
                        )}
                        {req.estado === 'APROBADA' && (
                          <button
                            onClick={() => setConfirmAction({ id: req.id, codigo: req.codigo, action: 'EN_COMPRA' })}
                            className="text-xs px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 font-semibold transition-colors"
                          >
                            En compra
                          </button>
                        )}
                        {req.estado === 'EN_COMPRA' && (
                          <button
                            onClick={() => setConfirmAction({ id: req.id, codigo: req.codigo, action: 'COMPLETADA' })}
                            className="text-xs px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-semibold transition-colors"
                          >
                            Completar
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <ChevronRight size={14} className="text-gray-200 group-hover:text-[#1e3a5f] transition-colors" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > 20 && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">
                Mostrando {page * 20 + 1}–{Math.min((page + 1) * 20, total)} de {total}
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page === 0}>Anterior</Button>
                <Button variant="ghost" size="sm" onClick={() => setPage((p) => p + 1)} disabled={(page + 1) * 20 >= total}>Siguiente</Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Confirm dialog */}
      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => { setConfirmAction(null); setComentario('') }}
        onConfirm={handleConfirm}
        title={`${actionLabel[confirmAction?.action ?? '']} requisición ${confirmAction?.codigo}`}
        message={
          <div>
            <p className="text-sm text-gray-600 mb-3">
              {confirmAction?.action === 'RECHAZADA'
                ? '¿Estás seguro de rechazar esta requisición? Agrega el motivo:'
                : '¿Confirmas esta acción?'}
            </p>
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              rows={2}
              placeholder="Comentario (opcional)"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
            />
          </div>
        }
        confirmLabel={actionLabel[confirmAction?.action ?? '']}
        variant={confirmAction?.action === 'RECHAZADA' ? 'danger' : 'primary'}
        loading={updateStatus.isPending}
      />
    </div>
  )
}
