import { useState } from 'react'
import { Plus, Edit2, MessageCircle, BookOpen, MapPin, Hash, User, Mail, Package, DollarSign, Trash2, Truck } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSuppliers, useSupplierById, useUpsertSupplier, useProductCountsBySupplier, useUpsertPrice } from '@/hooks/useSuppliers'
import { useSupplierCatalog, useProducts } from '@/hooks/useProducts'
import { proveedorSchema, precioProveedorSchema, type ProveedorFormData, type PrecioProveedorForm } from '@/lib/validations'
import { supabase } from '@/lib/supabase'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { PageLoader } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { CurrencyCOP } from '@/components/ui/CurrencyCOP'
import { buildWhatsAppUrl } from '@/lib/utils'
import { toast } from 'sonner'

function PriceManagementModal({ supplier, onClose }: { supplier: { id: number; nombre: string } | null; onClose: () => void }) {
  const { data: products } = useProducts('', undefined)
  const qc = useQueryClient()
  const upsertPrice = useUpsertPrice()
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<PrecioProveedorForm>({
    resolver: zodResolver(precioProveedorSchema) as any,
  })

  // Existing prices for this supplier
  const { data: existingPrices } = useQuery({
    queryKey: ['supplier-prices-modal', supplier?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proveedor_producto')
        .select('*, producto:productos(id, codigo, nombre, unidad_medida)')
        .eq('proveedor_id', supplier!.id)
        .order('updated_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!supplier?.id,
  })

  const deletePrice = useMutation({
    mutationFn: async ({ proveedor_id, producto_id }: { proveedor_id: number; producto_id: number }) => {
      const { error } = await supabase.from('proveedor_producto')
        .delete().eq('proveedor_id', proveedor_id).eq('producto_id', producto_id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['supplier-prices-modal', supplier?.id] })
      qc.invalidateQueries({ queryKey: ['supplier-catalog'] })
      qc.invalidateQueries({ queryKey: ['product-counts-by-supplier'] })
      qc.invalidateQueries({ queryKey: ['mejor-proveedor-all'] })
      toast.success('Precio eliminado')
    },
    onError: () => toast.error('Error al eliminar precio'),
  })

  const onSubmit = async (data: PrecioProveedorForm) => {
    if (!supplier) return
    await upsertPrice.mutateAsync({
      proveedor_id: supplier.id,
      producto_id: data.producto_id,
      precio_unitario: data.precio_unitario,
      fecha_precio: data.fecha_precio || undefined,
      notas: data.notas || undefined,
    })
    qc.invalidateQueries({ queryKey: ['supplier-prices-modal', supplier?.id] })
    reset()
  }

  const productOptions = (products ?? []).map((p) => ({
    value: String(p.id),
    label: `${p.codigo ? p.codigo + ' — ' : ''}${p.nombre} (${p.unidad_medida})`,
  }))

  return (
    <Modal
      open={!!supplier}
      onClose={onClose}
      title={`Precios — ${supplier?.nombre ?? ''}`}
      size="xl"
      footer={<div className="flex justify-end"><Button variant="ghost" onClick={onClose}>Cerrar</Button></div>}
    >
      {/* Add price form */}
      <form onSubmit={handleSubmit(onSubmit)} className="bg-gray-50 rounded-xl p-4 mb-5 space-y-3">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Agregar / actualizar precio</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Producto"
            required
            error={errors.producto_id?.message as string}
            options={productOptions}
            placeholder="Selecciona producto..."
            {...register('producto_id', { valueAsNumber: true })}
          />
          <Input
            label="Precio unitario (COP)"
            type="number"
            required
            placeholder="0"
            error={errors.precio_unitario?.message}
            {...register('precio_unitario', { valueAsNumber: true })}
          />
          <Input
            label="Fecha del precio"
            type="date"
            error={errors.fecha_precio?.message}
            {...register('fecha_precio')}
          />
          <Input
            label="Notas"
            placeholder="Condiciones, vigencia..."
            error={errors.notas?.message}
            {...register('notas')}
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit" size="sm" loading={isSubmitting || upsertPrice.isPending} icon={<DollarSign size={14} />}>
            Guardar precio
          </Button>
        </div>
      </form>

      {/* Existing prices */}
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
          Precios registrados ({existingPrices?.length ?? 0})
        </p>
        {!existingPrices?.length ? (
          <p className="text-sm text-gray-400 italic text-center py-4">Sin precios registrados aún.</p>
        ) : (
          <div className="overflow-auto max-h-64 rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0 border-b">
                <tr>
                  {['Código', 'Producto', 'UM', 'Precio unitario', 'Fecha', ''].map((h) => (
                    <th key={h} className="text-left px-3 py-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {existingPrices.map((p: any) => (
                  <tr key={p.producto_id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-3 py-2.5 font-mono text-xs text-gray-400">{p.producto?.codigo}</td>
                    <td className="px-3 py-2.5 font-medium text-gray-800">{p.producto?.nombre}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-500">{p.producto?.unidad_medida}</td>
                    <td className="px-3 py-2.5 font-semibold text-green-700"><CurrencyCOP value={p.precio_unitario} /></td>
                    <td className="px-3 py-2.5 text-xs text-gray-400">
                      {p.fecha_precio ? new Date(p.fecha_precio).toLocaleDateString('es-CO') : '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        onClick={() => deletePrice.mutate({ proveedor_id: p.proveedor_id, producto_id: p.producto_id })}
                        className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
                        title="Eliminar precio"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  )
}

function CatalogModal({ open, onClose, supplier }: { open: boolean; onClose: () => void; supplier: { id: number; nombre: string } | null }) {
  const { data, isLoading } = useSupplierCatalog(supplier?.id)
  return (
    <Modal open={open} onClose={onClose} title={`Catálogo: ${supplier?.nombre ?? ''}`} size="xl"
      footer={<div className="flex justify-end"><Button variant="ghost" onClick={onClose}>Cerrar</Button></div>}
    >
      {isLoading ? (
        <PageLoader />
      ) : !data?.length ? (
        <p className="text-sm text-gray-500 italic text-center py-8">Este proveedor no tiene productos registrados.</p>
      ) : (
        <div className="overflow-auto max-h-[60vh]">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b sticky top-0">
              <tr>
                {['Código', 'Producto', 'Categoría', 'UM', 'Precio unitario', 'Fecha precio'].map((h) => (
                  <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((item: any) => (
                <tr key={item.producto?.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono text-xs text-gray-400">{item.producto?.codigo}</td>
                  <td className="px-3 py-2 font-medium">{item.producto?.nombre}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">{item.producto?.categoria?.icono} {item.producto?.categoria?.nombre}</td>
                  <td className="px-3 py-2 text-xs">{item.producto?.unidad_medida}</td>
                  <td className="px-3 py-2 font-semibold text-green-700"><CurrencyCOP value={item.precio_unitario} /></td>
                  <td className="px-3 py-2 text-xs text-gray-400">{item.fecha_precio ? new Date(item.fecha_precio).toLocaleDateString('es-CO') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-gray-400 mt-2 px-3">{data.length} productos registrados</p>
        </div>
      )}
    </Modal>
  )
}

function SupplierModal({
  open, onClose, supplierId
}: { open: boolean; onClose: () => void; supplierId?: number }) {
  const { data: supplier } = useSupplierById(supplierId)
  const upsert = useUpsertSupplier()

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ProveedorFormData>({
    resolver: zodResolver(proveedorSchema) as any,
    values: supplier ? {
      codigo_interno: supplier.codigo_interno ?? '',
      nombre: supplier.nombre,
      whatsapp: supplier.whatsapp ?? '',
      email: supplier.email ?? '',
      ciudad: supplier.ciudad ?? '',
      nit: supplier.nit ?? '',
      contacto_nombre: supplier.contacto_nombre ?? '',
      activo: supplier.activo,
    } : undefined,
  })

  const onSubmit = async (data: ProveedorFormData) => {
    await upsert.mutateAsync(supplierId ? { ...data, id: supplierId } : data)
    reset()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={supplierId ? 'Editar proveedor' : 'Nuevo proveedor'} size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button form="supplier-form" type="submit" loading={isSubmitting || upsert.isPending}>Guardar</Button>
        </div>
      }
    >
      <form id="supplier-form" onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
        <Input label="Código interno" error={errors.codigo_interno?.message} {...register('codigo_interno')} className="col-span-1" />
        <div className="col-span-2">
          <Input label="Nombre" required error={errors.nombre?.message} {...register('nombre')} />
        </div>
        <Input label="WhatsApp" placeholder="3001234567" error={errors.whatsapp?.message} {...register('whatsapp')} />
        <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
        <Input label="Ciudad" error={errors.ciudad?.message} {...register('ciudad')} />
        <Input label="NIT" error={errors.nit?.message} {...register('nit')} />
        <div className="col-span-2">
          <Input label="Nombre contacto" error={errors.contacto_nombre?.message} {...register('contacto_nombre')} />
        </div>
      </form>
    </Modal>
  )
}

export default function SuppliersPage() {
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<number | undefined>()
  const [catalogSupplier, setCatalogSupplier] = useState<{ id: number; nombre: string } | null>(null)
  const [priceSupplier, setPriceSupplier] = useState<{ id: number; nombre: string } | null>(null)

  const { data: suppliers, isLoading } = useSuppliers(search)
  const { data: productCounts } = useProductCountsBySupplier()

  const openEdit = (id?: number) => { setEditId(id); setModalOpen(true) }
  const closeModal = () => { setModalOpen(false); setEditId(undefined) }

  const AVATAR_COLORS = [
    'bg-[#1e3a5f]', 'bg-slate-700', 'bg-stone-600', 'bg-zinc-700',
    'bg-neutral-700', 'bg-gray-700', 'bg-slate-600', 'bg-stone-700',
  ]

  return (
    <div className="space-y-5">
      {/* Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200/70 flex items-center justify-center text-[#1e3a5f] font-black text-sm shadow-2xs">
            <Truck size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Directorio de Proveedores</h1>
              {!isLoading && suppliers && (
                <span className="text-xs font-bold text-[#1e3a5f] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                  {suppliers.length} registrados
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Gestión de contactos comerciales, tarifas y cotizaciones directas</p>
          </div>
        </div>

        <button
          onClick={() => openEdit()}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#f97316] hover:bg-[#ea580c] text-white text-xs font-bold tracking-wide transition-all shadow-md shadow-orange-950/20 hover:-translate-y-0.5"
        >
          <Plus size={16} />
          <span>Nuevo Proveedor</span>
        </button>
      </div>

      {/* Search Toolbar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar proveedor por nombre, ciudad, NIT o contacto..."
          className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-3 focus:ring-blue-100 focus:border-[#1e3a5f] bg-slate-50/50 shadow-2xs"
        />
      </div>

      {isLoading ? (
        <PageLoader />
      ) : !suppliers?.length ? (
        <EmptyState title="Sin proveedores" description="No se encontraron proveedores con ese término de búsqueda." action={<Button onClick={() => openEdit()}>Agregar proveedor</Button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {suppliers.map((s, idx) => {
            const numProducts = productCounts?.get(s.id) ?? 0
            const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length]
            const initial = s.nombre.charAt(0).toUpperCase()
            return (
              <div key={s.id} className="bg-white rounded-3xl border border-slate-200/90 hover:border-blue-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col overflow-hidden shadow-xs">
                {/* Header */}
                <div className="px-5 py-4 flex items-center gap-3 border-b border-slate-100 bg-slate-50/40">
                  <div className={`w-11 h-11 rounded-2xl ${avatarColor} flex items-center justify-center text-white font-black text-base flex-shrink-0 shadow-2xs`}>
                    {initial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900 text-sm leading-tight line-clamp-2">{s.nombre}</p>
                    {s.codigo_interno && (
                      <span className="font-mono text-[10px] text-slate-400 mt-0.5 block">{s.codigo_interno}</span>
                    )}
                  </div>
                </div>

                {/* Body */}
                <div className="px-5 py-3.5 flex-1 space-y-2">
                  {s.ciudad && (
                    <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                      <MapPin size={13} className="text-slate-400 flex-shrink-0" />
                      <span>{s.ciudad}</span>
                    </div>
                  )}
                  {s.nit && (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Hash size={13} className="text-slate-400 flex-shrink-0" />
                      <span>NIT: {s.nit}</span>
                    </div>
                  )}
                  {s.contacto_nombre && (
                    <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                      <User size={13} className="text-slate-400 flex-shrink-0" />
                      <span className="truncate">{s.contacto_nombre}</span>
                    </div>
                  )}
                  {s.email && (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Mail size={13} className="text-slate-400 flex-shrink-0" />
                      <span className="truncate">{s.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700 pt-1">
                    <Package size={13} className="text-blue-500 flex-shrink-0" />
                    <span>{numProducts} {numProducts === 1 ? 'producto activo' : 'productos activos'}</span>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/60 flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setCatalogSupplier({ id: s.id, nombre: s.nombre })}
                    className="flex items-center gap-1 text-[11px] font-bold text-[#1e3a5f] bg-white border border-slate-200 px-2.5 py-1 rounded-lg hover:bg-blue-50 shadow-2xs transition-colors"
                  >
                    <BookOpen size={11} /> Catálogo
                  </button>
                  <button
                    onClick={() => setPriceSupplier({ id: s.id, nombre: s.nombre })}
                    className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg hover:bg-emerald-100 shadow-2xs transition-colors"
                  >
                    <DollarSign size={11} /> Precios
                  </button>
                  {s.whatsapp && (
                    <a
                      href={buildWhatsAppUrl(s.whatsapp, `Hola ${s.nombre}, te contactamos desde TELVAL S.A.S`)}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg hover:bg-emerald-100 shadow-2xs transition-colors"
                    >
                      <MessageCircle size={11} /> WhatsApp
                    </a>
                  )}
                  <button
                    onClick={() => openEdit(s.id)}
                    className="ml-auto p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-500 shadow-2xs transition-colors"
                    title="Editar datos del proveedor"
                  >
                    <Edit2 size={12} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <SupplierModal open={modalOpen} onClose={closeModal} supplierId={editId} />
      <CatalogModal open={!!catalogSupplier} onClose={() => setCatalogSupplier(null)} supplier={catalogSupplier} />
      <PriceManagementModal supplier={priceSupplier} onClose={() => setPriceSupplier(null)} />
    </div>
  )
}
