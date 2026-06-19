import { useState } from 'react'
import { useRequisitions, useMarcarItemCompletado, useWarehouseVerdict } from '@/hooks/useRequisitions'
import { PageLoader } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { toast } from 'sonner'

export default function WarehouseArrivalsPage() {
  const { data, isLoading } = useRequisitions({ estado: ['EN_COMPRA', 'PARCIAL'] })
  const marcarItem = useMarcarItemCompletado()
  const verdict = useWarehouseVerdict()

  const [selectedReq, setSelectedReq] = useState<number | null>(null)

  if (isLoading) return <PageLoader />

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
        verdict={verdict}
      />
    </div>
  )
}

function ArrivalModal({ open, requisitionId, onClose, marcarItem, verdict }: any) {
  const { data } = useRequisitions({})
  const req = data?.data.find((x) => x.id === requisitionId)
  const [direccion, setDireccion] = useState(req?.direccion_despacho || '')
  const [notas, setNotas] = useState('')

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

  const handleDispatch = async () => {
    if (!req) return
    const cantidad = (req.detalles ?? []).filter((d: any) => d.completado).length
    const estado = cantidad === (req.detalles ?? []).length ? 'COMPLETADA' : 'PARCIAL'
    try {
      await verdict.mutateAsync({ requisicionId: req.id, estado, notas, direccion_despacho: direccion, cantidad_despachada: cantidad })
      onClose()
    } catch (e) {
      // handled by hook
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Llegadas — ${req?.codigo ?? ''}`} size="lg" footer={
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cerrar</Button>
        <Button onClick={handleDispatch} loading={verdict.isPending}>Despachar ({totalArrived}/{req?.detalles?.length ?? 0})</Button>
      </div>
    }>
      {!req ? <p>Cargando...</p> : (
        <div className="space-y-4">
          <div className="space-y-2">
            {(req.detalles ?? []).map((d: any) => (
              <div key={d.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <div>
                  <p className="font-medium">{d.producto?.nombre}</p>
                  <p className="text-xs text-gray-500">Solicitado: {d.cantidad} {d.producto?.unidad_medida}</p>
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

          <div className="grid grid-cols-1 gap-2">
            <label className="text-sm">Dirección de despacho</label>
            <input className="w-full p-2 border rounded" value={direccion} onChange={(e) => setDireccion(e.target.value)} />
            <label className="text-sm">Notas de almacén</label>
            <textarea className="w-full p-2 border rounded h-24" value={notas} onChange={(e) => setNotas(e.target.value)} />
          </div>
        </div>
      )}
    </Modal>
  )
}
