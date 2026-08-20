import { useState } from 'react'
import { useRequisitions, useMarcarItemCompletado } from '@/hooks/useRequisitions'
import { PageLoader } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { unidadMedidaLabel } from '@/lib/utils'

export default function WarehouseArrivalsPage() {
  const { data, isLoading, error } = useRequisitions({ estado: ['EN_COMPRA', 'PARCIAL'] })
  const marcarItem = useMarcarItemCompletado()


  const [selectedReq, setSelectedReq] = useState<number | null>(null)

  if (isLoading) return <PageLoader />
  if (error) return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
      <p className="font-semibold">Error cargando requisiciones</p>
      <p className="mt-2 text-xs text-red-600">{error.message}</p>
    </div>
  )

  const openModal = (id: number) => setSelectedReq(id)
  const closeModal = () => setSelectedReq(null)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Almacén — Llegadas</h2>
      </div>

      {!data?.data.length ? (
        <div className="p-6 bg-white rounded-xl border">No hay requisiciones en compra.</div>
      ) : (
        <div className="grid gap-3">
          {data.data.map((r) => (
            <div key={r.id} className="bg-white p-4 rounded-xl border flex items-center justify-between">
              <div>
                <p className="font-semibold">{r.codigo} • {r.empleado?.nombre_completo}</p>
                <p className="text-sm text-gray-500">Estado: {r.estado} • {r.detalles?.length ?? 0} ítems</p>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={() => openModal(r.id)}>Marcar llegada</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ArrivalModal
        open={!!selectedReq}
        requisitionId={selectedReq}
        onClose={closeModal}
        marcarItem={marcarItem}
      />
    </div>
  )
}

function ArrivalModal({ open, requisitionId, onClose, marcarItem }: any) {
  const { data } = useRequisitions({})
  const req = data?.data.find((x) => x.id === requisitionId)

  if (!open) return null

  const totalArrived = req?.detalles?.filter((d: any) => d.completado).length ?? 0

  const handleToggle = async (item: any) => {
    try {
      if (!req) return
      await marcarItem.mutateAsync({ itemId: item.id, requisicionId: req.id, completado: !item.completado })
    } catch (e) {
      // error handled by hook
    }
  }

  const handleClose = () => {
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={`Llegadas — ${req?.codigo ?? ''}`} size="lg" footer={
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={handleClose}>Cerrar</Button>
      </div>
    }>
      {!req ? <p>Cargando...</p> : (
        <div className="space-y-4">
          <div className="space-y-2">
            {(req.detalles ?? []).map((d: any) => (
              <div key={d.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <div>
                  <p className="font-medium">{d.producto?.nombre}</p>
                  <p className="text-xs text-gray-500">Solicitado: {d.cantidad} {unidadMedidaLabel(d.producto?.unidad_medida ?? 'UND')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={!!d.completado} onChange={() => handleToggle(d)} />
                    <span className="text-sm">Llegó</span>
                  </label>
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-500">Marca los ítems recibidos. El despacho a tecnólogos se gestiona fuera de este módulo.</p>
        </div>
      )}
    </Modal>
  )
}
