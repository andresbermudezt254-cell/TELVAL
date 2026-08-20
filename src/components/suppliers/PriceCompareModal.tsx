import { useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { formatCOP, formatDate, buildWhatsAppUrl } from '@/lib/utils'
import { usePricesForProduct } from '@/hooks/useProducts'
import { Spinner } from '@/components/ui/Spinner'
import type { Producto } from '@/types'

interface PriceCompareModalProps {
  producto: Producto | null
  onClose: () => void
}

export function PriceCompareModal({ producto, onClose }: PriceCompareModalProps) {
  const { data: precios, isLoading } = usePricesForProduct(producto?.id)

  return (
    <Modal
      open={!!producto}
      onClose={onClose}
      title={`Comparación de precios — ${producto?.nombre ?? ''}`}
      size="lg"
    >
      {isLoading ? (
        <Spinner className="py-10" />
      ) : !precios?.length ? (
        <p className="text-center text-gray-400 py-8">No hay proveedores disponibles</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-3 py-2 text-left text-xs text-gray-500 font-semibold">#</th>
                <th className="px-3 py-2 text-left text-xs text-gray-500 font-semibold">Proveedor</th>
                <th className="px-3 py-2 text-right text-xs text-gray-500 font-semibold">Precio Unit.</th>
                <th className="px-3 py-2 text-right text-xs text-gray-500 font-semibold">% sobre mín.</th>
                <th className="px-3 py-2 text-left text-xs text-gray-500 font-semibold">Fecha precio</th>
                <th className="px-3 py-2 text-left text-xs text-gray-500 font-semibold">WhatsApp</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {precios.map((p) => {
                const isBest = p.ranking_precio === 1
                return (
                  <tr
                    key={p.proveedor_id}
                    className={isBest ? 'bg-green-50' : 'hover:bg-gray-50'}
                  >
                    <td className="px-3 py-2 font-bold text-center w-8">
                      <span className={`inline-block w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold ${
                        isBest ? 'bg-green-500 text-white' : p.ranking_precio === 2 ? 'bg-yellow-400 text-gray-900' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {p.ranking_precio}
                      </span>
                    </td>
                    <td className={`px-3 py-2 font-medium ${isBest ? 'text-green-800' : 'text-gray-800'}`}>
                      {p.proveedor_nombre}
                    </td>
                    <td className={`px-3 py-2 text-right font-semibold ${isBest ? 'text-green-700' : ''}`}>
                      {formatCOP(p.precio)}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-500">
                      {isBest ? (
                        <span className="text-green-600 font-medium">Mejor precio</span>
                      ) : (
                        <span className="text-red-500">+{p.porcentaje_sobre_minimo}%</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-500">{formatDate(p.fecha_precio)}</td>
                    <td className="px-3 py-2">
                      {p.proveedor_whatsapp ? (
                        <a
                          href={buildWhatsAppUrl(p.proveedor_whatsapp)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-green-600 hover:text-green-700 text-xs"
                        >
                          WhatsApp <ExternalLink size={10} />
                        </a>
                      ) : '-'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  )
}

export function usePriceModal() {
  const [producto, setProducto] = useState<Producto | null>(null)
  return { producto, openModal: setProducto, closeModal: () => setProducto(null) }
}
