import { useState } from 'react'
import { Plus, Edit2, DollarSign, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useProductsWithPrices, useCategorias, useProductById } from '@/hooks/useProducts'
import { usePricesForProduct } from '@/hooks/useProducts'
import { useSuppliers, useUpsertPrice } from '@/hooks/useSuppliers'
import { productoSchema, type ProductoFormData } from '@/lib/validations'
import { supabase } from '@/lib/supabase'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { PageLoader } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { CurrencyCOP } from '@/components/ui/CurrencyCOP'
import { Badge } from '@/components/ui/Badge'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

function PricesPanel({ productoId }: { productoId: number }) {
  const { data } = usePricesForProduct(productoId)
  if (!data?.length) return <p className="text-sm text-gray-500 italic">Sin precios registrados.</p>
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-xs text-gray-500 uppercase tracking-wider">
          <th className="text-left py-1">Proveedor</th>
          <th className="text-right py-1">Precio Unit.</th>
          <th className="text-right py-1">Ranking</th>
        </tr>
      </thead>
      <tbody>
        {data.map((p: any, i: number) => (
          <tr key={p.proveedor_id} className="border-t">
            <td className="py-1.5">{p.proveedor_nombre}</td>
            <td className="py-1.5 text-right font-semibold"><CurrencyCOP value={p.precio_unitario} /></td>
            <td className="py-1.5 text-right">
              <Badge className={i === 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}>
                #{p.ranking}
              </Badge>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function ProductModal({ open, onClose, productId }: { open: boolean; onClose: () => void; productId?: number }) {
  const { data: categorias } = useCategorias()
  const { data: product } = useProductById(productId)
  const { data: suppliers } = useSuppliers()
  const { data: existingPrices } = usePricesForProduct(productId ?? 0)
  const qc = useQueryClient()
  const upsertPrice = useUpsertPrice()

  // Map: proveedor_id → precio string (para el input)
  const [precios, setPrecios] = useState<Record<number, string>>({})
  const [showSuppliers, setShowSuppliers] = useState(false)

  // Inicializar precios existentes cuando se abre en modo edición
  const initialPrecios: Record<number, string> = {}
  if (existingPrices?.length) {
    existingPrices.forEach((p: any) => {
      initialPrecios[p.proveedor_id] = String(p.precio_unitario)
    })
  }

  const deletePrice = useMutation({
    mutationFn: async ({ proveedor_id }: { proveedor_id: number }) => {
      const { error } = await supabase.from('proveedor_producto')
        .delete().eq('proveedor_id', proveedor_id).eq('producto_id', productId!)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prices-for-product', productId] })
      toast.success('Precio eliminado')
    },
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ProductoFormData>({
    resolver: zodResolver(productoSchema) as any,
    values: product ? {
      codigo: product.codigo,
      nombre: product.nombre,
      descripcion: product.descripcion ?? '',
      unidad_medida: product.unidad_medida,
      categoria_id: product.categoria_id,
      activo: product.activo,
    } : undefined,
  })

  const onSubmit = async (data: ProductoFormData) => {
    let pid = productId
    if (pid) {
      const { error } = await supabase.from('productos').update(data).eq('id', pid)
      if (error) { toast.error(error.message); return }
    } else {
      const { data: created, error } = await supabase.from('productos').insert(data).select('id').single()
      if (error) { toast.error(error.message); return }
      pid = created.id
    }

    // Guardar precios por proveedor
    const preciosMerged = { ...initialPrecios, ...precios }
    const priceEntries = Object.entries(preciosMerged).filter(([, val]) => val && Number(val) > 0)
    for (const [proveedor_id, precio] of priceEntries) {
      await upsertPrice.mutateAsync({
        proveedor_id: Number(proveedor_id),
        producto_id: pid!,
        precio_unitario: Number(precio),
      })
    }

    toast.success(productId ? 'Producto actualizado' : 'Producto creado')
    qc.invalidateQueries({ queryKey: ['products'] })
    setPrecios({})
    reset()
    onClose()
  }

  const mergedPrecios = { ...initialPrecios, ...precios }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={productId ? 'Editar producto' : 'Nuevo producto'}
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button form="product-form" type="submit" loading={isSubmitting}>Guardar</Button>
        </div>
      }
    >
      <form id="product-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Código" required error={errors.codigo?.message} {...register('codigo')} />
          <Input label="Unidad de medida" placeholder="UND, M, KG..." required error={errors.unidad_medida?.message} {...register('unidad_medida')} />
        </div>
        <Input label="Nombre" required error={errors.nombre?.message} {...register('nombre')} />
        <Input label="Descripción" error={errors.descripcion?.message} {...register('descripcion')} />
        <Select
          label="Categoría"
          required
          error={errors.categoria_id?.message as string}
          options={(categorias ?? []).map((c) => ({ value: String(c.id), label: `${c.icono} ${c.nombre}` }))}
          placeholder="Selecciona categoría"
          {...register('categoria_id', { valueAsNumber: true })}
        />
      </form>

      {/* Precios por proveedor — colapsable */}
      <div className="mt-5 pt-4 border-t">
        <button
          type="button"
          onClick={() => setShowSuppliers(v => !v)}
          className="flex items-center justify-between w-full group"
        >
          <div className="flex items-center gap-2">
            <DollarSign size={14} className="text-green-600" />
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Precios por proveedor</p>
            {Object.values(mergedPrecios).filter(v => Number(v) > 0).length > 0 && (
              <span className="bg-green-100 text-green-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {Object.values(mergedPrecios).filter(v => Number(v) > 0).length} precios
              </span>
            )}
          </div>
          {showSuppliers ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
        </button>

        {showSuppliers && (
          <div className="mt-3 space-y-2 max-h-56 overflow-y-auto pr-1">
            {(suppliers ?? []).map((s: any) => {
              const currentVal = mergedPrecios[s.id] ?? ''
              const hasExisting = !!initialPrecios[s.id]
              return (
                <div key={s.id} className="flex items-center gap-2">
                  <span className="flex-1 text-sm text-gray-700 truncate">{s.nombre}</span>
                  <div className="relative w-36">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      value={precios[s.id] ?? (hasExisting ? initialPrecios[s.id] : '')}
                      onChange={(e) => setPrecios(p => ({ ...p, [s.id]: e.target.value }))}
                      className="w-full pl-6 pr-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                    />
                  </div>
                  {hasExisting && productId && (
                    <button
                      type="button"
                      onClick={() => deletePrice.mutate({ proveedor_id: s.id })}
                      className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                      title="Eliminar precio"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                  {currentVal && Number(currentVal) > 0 && (
                    <Badge className="bg-green-50 text-green-700 text-[10px] whitespace-nowrap">
                      <CurrencyCOP value={Number(currentVal)} />
                    </Badge>
                  )}
                </div>
              )
            })}
            {!suppliers?.length && (
              <p className="text-sm text-gray-400 italic">No hay proveedores registrados aún.</p>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}

export default function ProductsPage() {
  const [search, setSearch] = useState('')
  const [categoriaId, setCategoriaId] = useState<number | undefined>()
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<number | undefined>()

  const { data: products, isLoading } = useProductsWithPrices(search, categoriaId)
  const { data: categorias } = useCategorias()

  const openEdit = (id?: number) => { setEditId(id); setModalOpen(true) }
  const closeModal = () => { setModalOpen(false); setEditId(undefined) }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar producto..."
          className="flex-1 px-3 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
        />
        <Select
          options={(categorias ?? []).map((c) => ({ value: String(c.id), label: c.nombre }))}
          placeholder="Todas las categorías"
          value={categoriaId ? String(categoriaId) : ''}
          onChange={(e) => setCategoriaId(e.target.value ? Number(e.target.value) : undefined)}
          className="w-48"
        />
        <Button onClick={() => openEdit()} icon={<Plus size={16} />}>Nuevo</Button>
      </div>

      {isLoading ? (
        <PageLoader />
      ) : !products?.length ? (
        <EmptyState title="Sin productos" description="No se encontraron productos." action={<Button onClick={() => openEdit()}>Crear producto</Button>} />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Código', 'Nombre', 'Categoría', 'UM', 'Precio mín.', 'Proveedor más barato', 'Estado', 'Acciones'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.codigo}</td>
                  <td className="px-4 py-3 font-medium">{p.nombre}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{p.categoria?.icono} {p.categoria?.nombre}</td>
                  <td className="px-4 py-3">{p.unidad_medida}</td>
                  <td className="px-4 py-3 font-semibold text-green-700">
                    {(p as any).precio_minimo
                      ? <CurrencyCOP value={(p as any).precio_minimo} />
                      : <span className="text-gray-400 text-xs">Sin precio</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{(p as any).proveedor_mas_barato ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Badge className={p.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}>
                      {p.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => openEdit(p.id)} className="p-1.5 rounded hover:bg-blue-100 text-gray-500 hover:text-[#1e3a5f]">
                      <Edit2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ProductModal open={modalOpen} onClose={closeModal} productId={editId} />
    </div>
  )
}
