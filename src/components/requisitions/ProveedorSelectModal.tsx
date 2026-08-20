import { useState, useEffect } from 'react'
import { X, Building2, ChevronRight } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { CurrencyCOP } from '@/components/ui/CurrencyCOP'
import { supabase } from '@/lib/supabase'
import type { Proveedor } from '@/types'

interface ProveedorProducto {
  id: number
  proveedor_id: number
  producto_id: number
  precio_unitario: number | null
  cantidad_minima: number | null
  tiempo_entrega_dias: number | null
  proveedor?: Proveedor
}

interface ProveedorSelectModalProps {
  open: boolean
  productId: number
  productName?: string
  currentProveedorId: number | null
  onSelect: (proveedor: ProveedorProducto | null) => void
  onClose: () => void
}

const normalizeProductNameCandidates = (rawName?: string) => {
  if (!rawName) return []

  const cleaned = rawName.trim().replace(/\s+/g, ' ')
  if (!cleaned) return []

  const withoutParentheses = cleaned.replace(/\s*\([^)]*\)\s*$/g, '').trim()
  const compact = cleaned.replace(/[^a-zA-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
  const compactBase = withoutParentheses.replace(/[^a-zA-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()

  return Array.from(new Set([
    cleaned,
    withoutParentheses,
    compact,
    compactBase,
    cleaned.toUpperCase(),
    withoutParentheses.toUpperCase(),
  ].filter(Boolean)))
}

export function ProveedorSelectModal({
  open,
  productId,
  productName,
  currentProveedorId,
  onSelect,
  onClose,
}: ProveedorSelectModalProps) {
  const [proveedores, setProveedores] = useState<ProveedorProducto[]>([])
  const [loading, setLoading] = useState(false)

  // Cargar proveedores del producto cada vez que se abra el modal o cambie el producto.
  // Importante: no reutilizar la lista anterior porque un producto puede tener proveedores y otro no.
  useEffect(() => {
    const loadSuppliers = async () => {
      if (!open) {
        setProveedores([])
        setLoading(false)
        return
      }

      setLoading(true)
      setProveedores([])

      const numericProductId = Number(productId)
      console.log('ProveedorSelectModal: productId=', productId, 'numericProductId=', numericProductId, 'productName=', productName)
      let data: any[] | null = null
      let error: any = null

      if (Number.isFinite(numericProductId) && numericProductId > 0) {
        const result = await supabase
          .from('proveedor_producto')
          .select(`
            id, proveedor_id, producto_id, precio_unitario, cantidad_minima, tiempo_entrega_dias, activo,
            proveedor:proveedores(id, nombre, whatsapp, codigo_interno)
          `)
          .eq('producto_id', numericProductId)
          .eq('activo', true)
          .order('precio_unitario', { ascending: true })

        data = result.data ?? []
        error = result.error
      }

      if ((!error && (data ?? []).length === 0) || (Number.isNaN(numericProductId) || numericProductId <= 0)) {
        const candidates = normalizeProductNameCandidates(productName)

        if (candidates.length > 0) {
          const productMatches: Array<{ id: number | string }> = []

          for (const candidate of candidates) {
            const { data: matches, error: productError } = await supabase
              .from('productos')
              .select('id, nombre')
              .ilike('nombre', `%${candidate}%`)
              .limit(50)

            if (productError) continue
            productMatches.push(...((matches ?? []) as Array<{ id: number | string }>))
          }

          const matchingIds = Array.from(new Map(
            productMatches.map((p) => [Number(p.id), p])
          ).keys()).filter(Number.isFinite)

          if (matchingIds.length > 0) {
            const { data: fallbackData, error: fallbackError } = await supabase
              .from('proveedor_producto')
              .select(`
                id, proveedor_id, producto_id, precio_unitario, cantidad_minima, tiempo_entrega_dias, activo,
                proveedor:proveedores(id, nombre, whatsapp, codigo_interno)
              `)
              .in('producto_id', matchingIds)
              .eq('activo', true)
              .order('precio_unitario', { ascending: true })

            if (!fallbackError) {
              data = fallbackData ?? []
              error = null
            }
          }
        }
      }

      if ((!error && (data ?? []).length === 0) && productName && productName.trim()) {
        const candidates = normalizeProductNameCandidates(productName)
        const searchTerms = Array.from(new Set(candidates.flatMap((candidate) => {
          const tokens = candidate.split(' ').filter(Boolean)
          return tokens.length > 1 ? [tokens.join(' '), tokens.slice(0, 2).join(' '), tokens.slice(-2).join(' ')] : [candidate]
        })))

        for (const term of searchTerms) {
          const { data: byNameRows, error: byNameError } = await supabase
            .from('proveedor_producto')
            .select(`
              id, proveedor_id, producto_id, precio_unitario, cantidad_minima, tiempo_entrega_dias, activo,
              producto:productos(id, nombre, codigo),
              proveedor:proveedores(id, nombre, whatsapp, codigo_interno)
            `)
            .eq('activo', true)
            .not('producto_id', 'is', null)

          if (byNameError) continue

          const matches = (byNameRows ?? []).filter((row: any) => {
            const productoNombre = String(row.producto?.nombre ?? '')
            const productoCodigo = String(row.producto?.codigo ?? '')
            return productoNombre.toLowerCase().includes(term.toLowerCase()) || productoCodigo.toLowerCase().includes(term.toLowerCase())
          })

          if (matches.length > 0) {
            data = matches
            error = null
            break
          }
        }
      }

      if (!error) {
        setProveedores((data ?? []) as unknown as ProveedorProducto[])
      }
      setLoading(false)
    }

    void loadSuppliers()
  }, [open, productId, productName])

  const handleSelect = (proveedor: ProveedorProducto) => {
    onSelect(proveedor)
    handleClear()
    onClose()
  }

  const handleClear = () => {
    setProveedores([])
  }

  const handleRemoveProveedor = () => {
    onSelect(null)
    handleClear()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Seleccionar Proveedor">
      <div className="max-w-2xl w-full">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin">⏳</div>
          </div>
        ) : proveedores.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Building2 size={32} className="mx-auto mb-3 text-gray-300" />
            <p>No hay proveedores disponibles para este producto</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {proveedores.map((pp) => (
              <button
                key={pp.id}
                onClick={() => handleSelect(pp)}
                className={`w-full text-left p-4 border rounded-lg transition-colors ${
                  currentProveedorId === pp.proveedor_id
                    ? 'bg-blue-50 border-blue-300'
                    : 'hover:bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                      {pp.proveedor?.nombre}
                      {currentProveedorId === pp.proveedor_id && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                          ✓ Actual
                        </span>
                      )}
                    </h4>
                    <div className="flex gap-4 mt-2 text-xs text-gray-600">
                      {pp.precio_unitario !== null && (
                        <span>Precio: <CurrencyCOP value={Number(pp.precio_unitario)} /></span>
                      )}
                      {pp.cantidad_minima !== null && (
                        <span>Cant. mín: {pp.cantidad_minima}</span>
                      )}
                      {pp.tiempo_entrega_dias !== null && (
                        <span>Entrega: {pp.tiempo_entrega_dias}d</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-gray-400" />
                </div>
              </button>
            ))}
            
            {currentProveedorId !== null && (
              <button
                onClick={handleRemoveProveedor}
                className="w-full text-left p-4 border border-red-200 rounded-lg hover:bg-red-50 transition-colors text-red-600 font-medium"
              >
                <div className="flex items-center gap-2">
                  <X size={16} />
                  Remover proveedor
                </div>
              </button>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
