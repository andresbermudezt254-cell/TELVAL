import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Copy, Check, MessageCircle, Clock, CheckCircle2, ShoppingCart, PackageCheck, XCircle, RotateCcw, Truck, ChevronDown } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useRequisitionById, useUpdateRequisitionStatus, useMarcarItemCompletado, useUpdateProveedorFinal, useWarehouseVerdict } from '@/hooks/useRequisitions'
import { useSuppliers, useSuppliersByProducts } from '@/hooks/useSuppliers'
import { usePriceModal } from '@/components/suppliers/PriceCompareModal'
import { PriceCompareModal } from '@/components/suppliers/PriceCompareModal'
import { RequisitionStatusBadge as StatusBadge } from '@/components/requisitions/StatusBadge'
import { CategoryBadge } from '@/components/requisitions/CategoryBadge'
import { OrderTimeline as Timeline } from '@/components/requisitions/Timeline'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { CurrencyCOP } from '@/components/ui/CurrencyCOP'
import { Button } from '@/components/ui/Button'
import { PageLoader } from '@/components/ui/Spinner'
import { formatDate, generarResumenWhatsApp, unidadMedidaLabel } from '@/lib/utils'
import type { EstadoRequisicion } from '@/types'

const WORKFLOW: Array<{ estado: EstadoRequisicion; label: string; icon: React.ReactNode }> = [
  { estado: 'PENDIENTE',   label: 'Pendiente',   icon: <Clock size={13} /> },
  { estado: 'EN_REVISION', label: 'En revisión', icon: <RotateCcw size={13} /> },
  { estado: 'APROBADA',    label: 'Aprobada',    icon: <CheckCircle2 size={13} /> },
  { estado: 'EN_COMPRA',   label: 'En compra',   icon: <ShoppingCart size={13} /> },
  { estado: 'PARCIAL',     label: 'Parcial',     icon: <PackageCheck size={13} /> },
  { estado: 'COMPLETADA',  label: 'Completada',  icon: <PackageCheck size={13} /> },
]

function WorkflowBar({ estado }: { estado: EstadoRequisicion }) {
  if (estado === 'RECHAZADA') {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
        <XCircle size={15} />
        Requisición rechazada
      </div>
    )
  }
  const currentIdx = WORKFLOW.findIndex((s) => s.estado === estado)
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-5 py-3">
      <div className="flex items-center">
        {WORKFLOW.map((step, idx) => {
          const done = idx < currentIdx
          const active = idx === currentIdx
          return (
            <div key={step.estado} className="flex items-center flex-1 min-w-0">
              <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                active  ? 'bg-[#1e3a5f] text-white'
                : done  ? 'bg-green-50 text-green-700'
                        : 'text-gray-300'
              }`}>
                {step.icon}
                <span className="hidden sm:inline">{step.label}</span>
              </div>
              {idx < WORKFLOW.length - 1 && (
                <div className={`flex-1 h-px mx-1 ${done ? 'bg-green-300' : 'bg-gray-100'}`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function RequisitionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: req, isLoading, error } = useRequisitionById(Number(id))
  const updateStatus = useUpdateRequisitionStatus()
  const marcarItem = useMarcarItemCompletado()
  const updateProveedor = useUpdateProveedorFinal()
  const warehouseVerdict = useWarehouseVerdict()
  const { data: proveedores } = useSuppliers()
  const productIds = req?.detalles?.map((d) => d.producto_id) ?? []
  const { data: proveedoresConTodosLosProductos } = useSuppliersByProducts(productIds)
  const priceModal = usePriceModal()
  const user = useAuthStore((s) => s.user)
  const isWarehouseUser = user?.rol === 'almacen' || user?.rol === 'superadmin'
  const [copied, setCopied] = useState(false)
  const [comentario, setComentario] = useState('')
  const [confirmAction, setConfirmAction] = useState<'APROBADA' | 'RECHAZADA' | 'EN_COMPRA' | null>(null)
  const [proveedorFinalId, setProveedorFinalId] = useState<string>('')
  const [showProveedorEditor, setShowProveedorEditor] = useState(false)
  const [warehouseModalOpen, setWarehouseModalOpen] = useState(false)
  const [warehouseState, setWarehouseState] = useState<'PARCIAL' | 'COMPLETADA'>('COMPLETADA')
  const [warehouseNote, setWarehouseNote] = useState('')
  const [warehouseDirection, setWarehouseDirection] = useState('')
  const [warehouseDispatchCount, setWarehouseDispatchCount] = useState<number>(0)

  if (isLoading) return <PageLoader />
  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center text-gray-600">
        <p className="text-lg font-semibold text-gray-900">No se pudo cargar la requisición</p>
        <p className="mt-2 text-sm text-gray-500">{(error as Error).message || 'Hubo un problema al obtener los datos.'}</p>
      </div>
    )
  }
  if (!req) return <div className="text-center py-20 text-gray-500">Requisición no encontrada.</div>

  const availableProviders = ((proveedoresConTodosLosProductos?.length ?? 0) > 0 ? proveedoresConTodosLosProductos : proveedores ?? []) as any[]

  const handleCopyWhatsApp = async () => {
    const msg = generarResumenWhatsApp(req, req.detalles ?? [])
    await navigator.clipboard.writeText(msg)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleConfirm = async () => {
    if (!confirmAction) return
    await updateStatus.mutateAsync({ id: req.id, estado: confirmAction, notas_admin: comentario })
    setConfirmAction(null)
    setComentario('')
  }

  const actionLabel: Record<string, string> = {
    APROBADA: 'Aprobar',
    RECHAZADA: 'Rechazar',
    EN_COMPRA: 'En compra',
    COMPLETADA: 'Completada',
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={() => navigate(-1)} className="mt-0.5 p-2 rounded-lg hover:bg-gray-100 text-gray-500 flex-shrink-0">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-bold font-mono text-[#1e3a5f]">{req.codigo}</h1>
            <StatusBadge estado={req.estado} />
            <CategoryBadge categoria={req.categoria} />
          </div>
          <p className="text-sm text-gray-400 mt-0.5">
            Solicitado por <span className="text-gray-600 font-medium">{(req as any).empleado?.nombre_completo}</span>
            {' · '}{formatDate(req.fecha_solicitud)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            icon={copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
            onClick={handleCopyWhatsApp}
          >
            {copied ? '¡Copiado!' : 'Resumen WhatsApp'}
          </Button>
        </div>
      </div>

      {/* Workflow progress */}
      <WorkflowBar estado={req.estado} />

      {/* Data grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Work data */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Datos de la solicitud</h3>
          {[
            ['Especialidad', req.especialidad],
            ['Punto', req.punto],
            ['Aviso', req.numero_aviso],
            ['Fecha máx. entrega', req.fecha_maxima_entrega ? formatDate(req.fecha_maxima_entrega) : '—'],
            ['Artículos SINCO-ADPRO', req.item_sinco_adpro ? req.item_sinco_adpro : '—'],
          ].map(([label, value]) => (
            <div key={label as string} className="flex justify-between items-baseline gap-2 text-sm">
              <span className="text-gray-400 text-xs shrink-0">{label}</span>
              <span className="font-medium text-gray-800 text-right">{value}</span>
            </div>
          ))}
        </div>

        {/* Notes + actions */}
        <div className="space-y-3">
          {req.notas_empleado && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
              <p className="font-semibold text-amber-800 text-xs uppercase tracking-wider mb-1.5">Notas del empleado</p>
              <p className="text-amber-700 leading-relaxed">{req.notas_empleado}</p>
            </div>
          )}
          {req.motivo_rechazo && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm">
              <p className="font-semibold text-red-800 text-xs uppercase tracking-wider mb-1.5">Motivo de rechazo</p>
              <p className="text-red-700 leading-relaxed">{req.motivo_rechazo}</p>
            </div>
          )}

          {/* Action panel */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Acciones disponibles</p>
            <div className="flex flex-wrap gap-2">
              {req.estado === 'PENDIENTE' && (
                <>
                  <button
                    onClick={() => setConfirmAction('APROBADA')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1e3a5f] text-white text-sm font-semibold hover:bg-[#162d4a] transition-colors shadow-sm"
                  >
                    <CheckCircle2 size={14} /> Aprobar
                  </button>
                  <button
                    onClick={() => setConfirmAction('RECHAZADA')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm font-semibold hover:bg-red-100 transition-colors"
                  >
                    <XCircle size={14} /> Rechazar
                  </button>
                </>
              )}
              {req.estado === 'APROBADA' && (
                <button
                  onClick={() => setConfirmAction('EN_COMPRA')}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition-colors shadow-sm"
                >
                  <ShoppingCart size={14} /> Iniciar compra
                </button>
              )}
              {['EN_COMPRA', 'PARCIAL'].includes(req.estado) && (
                <div className="w-full rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                  <p className="font-medium text-gray-800">Recepción en almacén</p>
                  <p className="mt-1 text-xs text-gray-500">La recepción final y la marca de entrega completa se registran desde el módulo de Almacén.</p>
                </div>
              )}
              {(req as any).empleado?.whatsapp && (
                <a
                  href={`https://wa.me/57${(req as any).empleado.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-50 text-green-700 border border-green-200 text-sm font-semibold hover:bg-green-100 transition-colors"
                >
                  <MessageCircle size={14} /> WhatsApp empleado
                </a>
              )}
              {['COMPLETADA', 'RECHAZADA'].includes(req.estado) && (
                <p className="text-xs text-gray-400 italic self-center">No hay acciones pendientes.</p>
              )}
            </div>
          </div>

          {/* Proveedor final */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Proveedor</p>
              {!['COMPLETADA', 'RECHAZADA'].includes(req.estado) && (
                <button
                  onClick={() => { setShowProveedorEditor(v => !v); setProveedorFinalId(String(req.proveedor_final_id ?? '')) }}
                  className="flex items-center gap-1 text-xs text-[#1e3a5f] hover:underline font-medium"
                >
                  <Truck size={11} /> Cambiar <ChevronDown size={11} />
                </button>
              )}
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-gray-400 text-xs shrink-0">Proveedor sugerido</span>
                <span className="font-medium text-gray-700 text-right">
                  {(req.detalles ?? []).find(d => d.proveedor_sugerido)?.proveedor_sugerido?.nombre ?? '—'}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-gray-400 text-xs shrink-0">Proveedor final</span>
                {req.proveedor_final ? (
                  <span className="font-semibold text-[#1e3a5f] text-right flex items-center gap-1">
                    {req.proveedor_final.nombre}
                    {req.proveedor_final_id !== (req.detalles ?? []).find(d => d.proveedor_sugerido_id)?.proveedor_sugerido_id && (
                      <span className="text-[9px] bg-orange-100 text-orange-700 border border-orange-200 rounded px-1 py-0.5 font-semibold ml-1">Modificado</span>
                    )}
                  </span>
                ) : (
                  <span className="text-gray-300 italic text-xs">Sin asignar</span>
                )}
              </div>
            </div>
            {showProveedorEditor && (
              <div className="pt-2 border-t border-gray-100 space-y-2">
                <select
                  value={proveedorFinalId}
                  onChange={(e) => setProveedorFinalId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                >
                  <option value="">— Sin proveedor —</option>
                  {availableProviders
                    .filter((p) => p.activo)
                    .map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                </select>
                <button
                  disabled={updateProveedor.isPending}
                  onClick={() => {
                    updateProveedor.mutate({ requisicionId: req.id, proveedorFinalId: proveedorFinalId ? Number(proveedorFinalId) : null })
                    setShowProveedorEditor(false)
                  }}
                  className="w-full py-2 rounded-lg bg-[#1e3a5f] text-white text-sm font-semibold hover:bg-[#162d4a] transition-colors disabled:opacity-50"
                >
                  {updateProveedor.isPending ? 'Guardando...' : 'Guardar proveedor'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Almacén</p>
            <p className="text-sm text-gray-500">Envía esta requisición a almacén y registra si llegó completa o parcial.</p>
          </div>
          <div className="flex items-center gap-2">
            {req.estado === 'PARCIAL' && (
              <span className="px-3 py-2 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">Entrega parcial registrada</span>
            )}
            {req.estado === 'COMPLETADA' && (
              <span className="px-3 py-2 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">Despacho completo registrado</span>
            )}
            {isWarehouseUser && ['EN_COMPRA', 'PARCIAL'].includes(req.estado) && (
              <button
                onClick={() => {
                  setWarehouseModalOpen(true)
                  setWarehouseDirection(req.direccion_despacho ?? '')
                  setWarehouseDispatchCount(req.detalles?.filter((d) => d.completado).length ?? 0)
                  setWarehouseState(req.estado === 'PARCIAL' ? 'PARCIAL' : 'COMPLETADA')
                  setWarehouseNote(req.notas_almacen ?? '')
                }}
                className="inline-flex items-center gap-2 rounded-full bg-[#1e3a5f] px-3 py-2 text-xs font-semibold text-white hover:bg-[#162d4a] transition-colors"
              >
                <Truck size={12} /> Registrar en almacén
              </button>
            )}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Estado de almacén</p>
            <p className="text-sm text-gray-700">{req.estado === 'EN_COMPRA' ? 'Pendiente de veredicto' : req.estado === 'PARCIAL' ? 'Llegada parcial' : req.estado === 'COMPLETADA' ? 'Despacho completo' : 'Sin veredicto'}</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Dirección de despacho</p>
            <p className="text-sm text-gray-700">{req.direccion_despacho ? req.direccion_despacho : 'Aún no hay dirección registrada.'}</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Nota de almacén</p>
            <p className="text-sm text-gray-700">{req.notas_almacen ? req.notas_almacen : 'Aún no hay nota registrada.'}</p>
          </div>
        </div>
      </div>

      {/* Products table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">Insumos solicitados</h3>
          <div className="flex items-center gap-3">
            {(() => {
              const total = req.detalles?.length ?? 0
              const recibidos = req.detalles?.filter(d => d.completado).length ?? 0
              return (
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  recibidos === total && total > 0 ? 'bg-emerald-100 text-emerald-700'
                  : recibidos > 0 ? 'bg-violet-100 text-violet-700'
                  : 'bg-gray-100 text-gray-500'
                }`}>
                  {recibidos}/{total} recibidos
                </span>
              )
            })()}
            <span className="text-xs text-gray-400">{req.detalles?.length ?? 0} {(req.detalles?.length ?? 0) === 1 ? 'ítem' : 'ítems'}</span>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              {['#', 'Código SINCO', 'Producto', 'UM', 'Cant.', 'Proveedor sugerido', 'P. Unitario', 'Total', 'Recibido', ''].map((h) => (
                <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(req.detalles ?? []).map((d, idx) => (
              <tr key={d.id} className={`border-t transition-colors ${d.completado ? 'bg-emerald-50/50' : 'hover:bg-gray-50/50'}`}>
                <td className="px-4 py-3 text-xs font-mono text-gray-400">{d.numero_item ?? idx + 1}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-400">{d.producto?.codigo ?? '—'}</td>
                <td className={`px-4 py-3 ${d.completado ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">{d.producto?.nombre}</span>
                    <span className="text-[11px] text-gray-500">Unidad: {unidadMedidaLabel(d.producto?.unidad_medida ?? 'UND')}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">{unidadMedidaLabel(d.producto?.unidad_medida ?? 'UND')}</td>
                <td className="px-4 py-3 font-bold text-center text-gray-700">{d.cantidad}</td>
                <td className="px-4 py-3">
                  {d.proveedor_sugerido ? (
                    <span className="text-green-700 font-medium">{d.proveedor_sugerido.nombre}</span>
                  ) : (
                    <span className="text-gray-300 italic text-xs">Sin proveedor</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-700"><CurrencyCOP value={d.precio_unitario} /></td>
                <td className="px-4 py-3 font-semibold text-gray-900"><CurrencyCOP value={(d.precio_unitario ?? 0) * d.cantidad} /></td>
                <td className="px-4 py-3">
                  {d.completado ? (
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full">
                        <CheckCircle2 size={10} /> Recibido
                      </span>
                      {isWarehouseUser && !['COMPLETADA', 'RECHAZADA'].includes(req.estado) && (
                        <button
                          onClick={() => marcarItem.mutate({ itemId: d.id, requisicionId: req.id, completado: false })}
                          className="text-[10px] text-gray-400 hover:text-red-500 transition-colors"
                          title="Desmarcar"
                        >✕</button>
                      )}
                    </div>
                  ) : (
                    isWarehouseUser && ['EN_COMPRA', 'PARCIAL', 'APROBADA'].includes(req.estado) ? (
                      <button
                        disabled={marcarItem.isPending}
                        onClick={() => marcarItem.mutate({ itemId: d.id, requisicionId: req.id, completado: true })}
                        className="text-xs text-white bg-[#1e3a5f] hover:bg-[#162d4a] px-2.5 py-1 rounded-lg font-semibold transition-colors disabled:opacity-50 whitespace-nowrap"
                      >
                        Marcar recibido
                      </button>
                    ) : (
                      <span className="text-gray-300 text-xs italic">—</span>
                    )
                  )}
                </td>
                <td className="px-4 py-3">
                  {d.producto && (
                    <button
                      onClick={() => priceModal.openModal(d.producto!)}
                      className="text-xs text-[#1e3a5f] hover:underline whitespace-nowrap font-medium">
                      Ver precios
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-gray-100">
            <tr className="bg-gray-50">
              <td colSpan={7} className="px-4 py-3.5 text-right text-sm font-semibold text-gray-500">Total estimado</td>
              <td colSpan={3} className="px-4 py-3.5 font-bold text-xl text-[#1e3a5f]">
                <CurrencyCOP value={req.total_estimado} />
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Timeline */}
      {req.historial && req.historial.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Historial de cambios</h3>
          <Timeline historial={req.historial} />
        </div>
      )}

      {/* Confirm dialog */}
      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => { setConfirmAction(null); setComentario('') }}
        onConfirm={handleConfirm}
        title={`${actionLabel[confirmAction ?? '']} — ${req.codigo}`}
        message={
          <div>
            <p className="text-sm text-gray-600 mb-3">Confirma esta acción. Agrega un comentario si es necesario.</p>
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              rows={2}
              placeholder="Comentario (opcional)"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
            />
          </div>
        }
        confirmLabel={actionLabel[confirmAction ?? '']}
        variant={confirmAction === 'RECHAZADA' ? 'danger' : 'primary'}
        loading={updateStatus.isPending}
      />

      <PriceCompareModal
        producto={priceModal.producto}
        onClose={priceModal.closeModal}
      />
      <ConfirmDialog
        open={warehouseModalOpen}
        title="Enviar a almacén"
        message={
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Registra si el pedido llegó completo o si sólo parte de los productos fue recibido.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={`flex flex-col gap-2 rounded-xl border p-4 text-sm cursor-pointer ${warehouseState === 'COMPLETADA' ? 'border-[#1e3a5f] bg-[#eff6ff]' : 'border-gray-200 bg-white'}`}>
                <div className="font-semibold">Pedido completo</div>
                <div className="text-xs text-gray-500">Todos los productos llegaron.</div>
                <input
                  type="radio"
                  name="warehouseState"
                  value="COMPLETADA"
                  checked={warehouseState === 'COMPLETADA'}
                  onChange={() => setWarehouseState('COMPLETADA')}
                  className="sr-only"
                />
              </label>
              <label className={`flex flex-col gap-2 rounded-xl border p-4 text-sm cursor-pointer ${warehouseState === 'PARCIAL' ? 'border-[#1e3a5f] bg-[#eff6ff]' : 'border-gray-200 bg-white'}`}>
                <div className="font-semibold">Entrega parcial</div>
                <div className="text-xs text-gray-500">Sólo algunos productos llegaron.</div>
                <input
                  type="radio"
                  name="warehouseState"
                  value="PARCIAL"
                  checked={warehouseState === 'PARCIAL'}
                  onChange={() => setWarehouseState('PARCIAL')}
                  className="sr-only"
                />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Dirección de despacho</label>
                <input
                  value={warehouseDirection}
                  onChange={(e) => setWarehouseDirection(e.target.value)}
                  placeholder="Ej: Almacén central, bodega 3"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Productos despachados</label>
                <input
                  type="number"
                  value={warehouseDispatchCount}
                  min={1}
                  max={req.detalles?.length ?? 0}
                  onChange={(e) => setWarehouseDispatchCount(Number(e.target.value))}
                  placeholder="Cantidad"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                />
                <p className="text-[11px] text-gray-500 mt-1">Total de ítems en la requisición: {req.detalles?.length ?? 0}</p>
              </div>
            </div>
            <textarea
              rows={4}
              value={warehouseNote}
              onChange={(e) => setWarehouseNote(e.target.value)}
              placeholder="Nota de almacén... Ej: llegaron 3 de 5 productos"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
            />
          </div>
        }
        confirmLabel="Registrar en almacén"
        onClose={() => setWarehouseModalOpen(false)}
        onConfirm={async () => {
          if (!warehouseDirection.trim() || warehouseDispatchCount <= 0) return
          await warehouseVerdict.mutateAsync({
            requisicionId: req.id,
            estado: warehouseState,
            notas: warehouseNote,
            direccion_despacho: warehouseDirection,
            cantidad_despachada: warehouseDispatchCount,
          })
          setWarehouseModalOpen(false)
        }}
        variant="primary"
        loading={warehouseVerdict.isPending}
        confirmDisabled={
          !warehouseDirection.trim() ||
          warehouseDispatchCount <= 0 ||
          warehouseDispatchCount > (req.detalles?.length ?? 0) ||
          (warehouseState === 'COMPLETADA' && warehouseDispatchCount !== (req.detalles?.length ?? 0))
        }
      />
    </div>
  )
}

