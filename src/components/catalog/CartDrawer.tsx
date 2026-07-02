import { X, Minus, Plus, ShoppingCart, ArrowRight, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '@/hooks/useCart'
import { formatCOP, unidadMedidaLabel } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'

interface CartDrawerProps {
  open: boolean
  onClose: () => void
}

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const navigate = useNavigate()
  const { items, removeItem, updateCantidad, totalEstimado } = useCart()

  const handleContinue = () => {
    onClose()
    navigate('/nueva-requisicion')
  }

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b">
          <div className="flex items-center gap-2">
            <ShoppingCart size={20} className="text-[#1e3a5f]" />
            <h2 className="font-semibold text-gray-900">Carrito de requisición</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto py-2">
          {items.length === 0 ? (
            <EmptyState
              icon={<ShoppingCart size={40} strokeWidth={1} />}
              title="Carrito vacío"
              description="Agrega insumos del catálogo para crear una requisición"
            />
          ) : (
            <ul className="divide-y divide-gray-100">
              {items.map(({ producto, cantidad }) => (
                <li key={producto.id} className="flex items-center gap-3 px-4 py-3">
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <ShoppingCart size={16} className="text-[#1e3a5f]" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{producto.nombre}</p>
                    <p className="text-xs text-gray-500">{unidadMedidaLabel(producto.unidad_medida)} · {producto.codigo}</p>
                    {producto.precio_minimo && (
                      <p className="text-xs font-semibold text-[#1e3a5f]">
                        {formatCOP(producto.precio_minimo * cantidad)}
                      </p>
                    )}
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateCantidad(producto.id, cantidad - 1)}
                      className="w-6 h-6 rounded flex items-center justify-center hover:bg-gray-100 text-gray-500 transition-colors"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="w-7 text-center text-sm font-medium">{cantidad}</span>
                    <button
                      onClick={() => updateCantidad(producto.id, cantidad + 1)}
                      className="w-6 h-6 rounded flex items-center justify-center hover:bg-gray-100 text-gray-500 transition-colors"
                    >
                      <Plus size={12} />
                    </button>
                    <button
                      onClick={() => removeItem(producto.id)}
                      className="ml-1 w-6 h-6 rounded flex items-center justify-center hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Total estimado</span>
              <span className="font-bold text-[#1e3a5f] text-base">{formatCOP(totalEstimado)}</span>
            </div>
            <Button className="w-full" onClick={handleContinue} icon={<ArrowRight size={16} />}>
              Continuar con la requisición
            </Button>
          </div>
        )}
      </div>
    </>
  )
}
