import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import {
  ChevronLeft, ChevronRight, Send, Trash2, ShoppingCart,
  ClipboardList, Store, MessageCircle, CheckCircle2, AlertCircle,
} from 'lucide-react'
import { requisicionSchema, type RequisicionFormData, especialidadOptions, categoriaOptions } from '@/lib/validations'
import { useCart } from '@/hooks/useCart'
import { useCreateRequisition } from '@/hooks/useRequisitions'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { CurrencyCOP } from '@/components/ui/CurrencyCOP'
import { formatCOP, buildWhatsAppUrl } from '@/lib/utils'

// ─── Best supplier per product ───────────────────────────────────────────────
function useBestSuppliers(productIds: number[]) {
  return useQuery({
    queryKey: ['best-suppliers-cart', productIds],
    enabled: productIds.length > 0,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const { data } = await supabase
        .from('mejor_proveedor_por_producto')
        .select('producto_id, proveedor_id, proveedor_nombre, proveedor_whatsapp, precio_unitario')
        .in('producto_id', productIds)
        .eq('ranking', 1)
      const map = new Map<number, { proveedor_id: number; proveedor_nombre: string; proveedor_whatsapp?: string; precio_unitario: number }>()
      data?.forEach((r) => map.set(r.producto_id, r as any))
      return map
    },
  })
}

// ─── Step indicator ──────────────────────────────────────────────────────────
function StepBar({ step }: { step: number }) {
  const steps = [{ n: 1, label: 'Datos del pedido' }, { n: 2, label: 'Revisar y enviar' }]
  return (
    <div className="flex items-center mb-6">
      {steps.map(({ n, label }, i) => (
        <div key={n} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
              step > n ? 'bg-emerald-500 border-emerald-500 text-white'
                : step === n ? 'bg-[#1e3a5f] border-[#1e3a5f] text-white shadow-lg shadow-blue-200'
                  : 'bg-white border-gray-300 text-gray-400'
            }`}>
              {step > n ? <CheckCircle2 size={18} /> : n}
            </div>
            <span className={`text-[10px] font-semibold whitespace-nowrap ${step >= n ? 'text-[#1e3a5f]' : 'text-gray-400'}`}>
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-0.5 mx-3 mb-4 transition-all ${step > n ? 'bg-emerald-400' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function NewRequisitionPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const { items, removeItem, updateCantidad, clearCart, totalEstimado } = useCart()
  const createMutation = useCreateRequisition()

  const productIds = items.map((i) => i.producto.id)
  const { data: bestSuppliers } = useBestSuppliers(productIds)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RequisicionFormData>({
    resolver: zodResolver(requisicionSchema),
    defaultValues: { categoria: 'PROGRAMADA' },
  })

  const categoria = watch('categoria')

  const onSubmit = async (data: RequisicionFormData) => {
    if (items.length === 0) return
    await createMutation.mutateAsync({
      ...data,
      items: items.map((i) => ({
        producto_id: i.producto.id,
        cantidad: i.cantidad,
        notas: i.notas,
      })),
    })
    clearCart()
    navigate('/mis-requisiciones')
  }

  // Total usando precios de mejores proveedores
  const estimatedTotal = items.reduce((sum, { producto, cantidad }) => {
    const best = bestSuppliers?.get(producto.id)
    const price = best?.precio_unitario ?? (producto as any).precio_minimo ?? 0
    return sum + price * cantidad
  }, 0)

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingCart size={48} strokeWidth={1} />}
        title="Carrito vacío"
        description="Agrega insumos desde el catálogo antes de crear una requisición."
        action={<Button onClick={() => navigate('/catalogo')}>Ir al catálogo</Button>}
      />
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <StepBar step={step} />

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* ── STEP 1 ── */}
        {step === 1 && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b bg-gradient-to-r from-[#1e3a5f]/5 to-transparent flex items-center gap-2">
              <ClipboardList size={18} className="text-[#1e3a5f]" />
              <h2 className="text-base font-semibold text-gray-900">Datos de la requisición</h2>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Select
                  label="Especialidad de solicitud"
                  required
                  error={errors.especialidad?.message}
                  options={especialidadOptions.map((e) => ({ value: e, label: e }))}
                  placeholder="Selecciona una especialidad"
                  {...register('especialidad')}
                />
              </div>
              <Input label="Número de aviso" placeholder="Ej: 215700 o STOCK" required error={errors.numero_aviso?.message} {...register('numero_aviso')} />
              <Input label="Punto" placeholder="Lugar (ej: TAL, EST)" required error={errors.punto?.message} {...register('punto')} />

              <div className="sm:col-span-2">
                <p className="text-sm font-medium text-gray-700 mb-2">Categoría <span className="text-red-500">*</span></p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {categoriaOptions.map((cat) => (
                    <label key={cat} className={`flex items-center justify-center px-3 py-2.5 rounded-xl border-2 cursor-pointer transition-all text-sm font-medium ${
                      categoria === cat ? 'border-[#1e3a5f] bg-[#1e3a5f] text-white shadow-sm' : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }`}>
                      <input type="radio" value={cat} className="sr-only" {...register('categoria')} />
                      {cat}
                    </label>
                  ))}
                </div>
              </div>

              <Input label="Fecha máxima de entrega" type="date" error={errors.fecha_maxima_entrega?.message} {...register('fecha_maxima_entrega')} />
              <Input label="Item PPTO" placeholder="Ej: 23.22" error={errors.item_ppto?.message} {...register('item_ppto')} />
              <Input label="Item SINCO-ADPRO" placeholder="Ej: 5.4.1.3" error={errors.item_sinco_adpro?.message} {...register('item_sinco_adpro')} />
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-gray-700 block mb-1">Notas adicionales</label>
                <textarea
                  rows={3}
                  placeholder="Observaciones para el administrador..."
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] resize-none"
                  {...register('notas_empleado')}
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-between items-center">
              <span className="text-xs text-gray-400">{items.length} producto{items.length !== 1 ? 's' : ''} en el carrito</span>
              <Button type="button" onClick={() => setStep(2)} icon={<ChevronRight size={16} />}>
                Revisar insumos
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b bg-gradient-to-r from-[#1e3a5f]/5 to-transparent flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Store size={18} className="text-[#1e3a5f]" />
                  <h2 className="text-base font-semibold text-gray-900">Insumos solicitados</h2>
                </div>
                <span className="text-xs bg-blue-100 text-[#1e3a5f] font-semibold px-2.5 py-1 rounded-full">
                  {items.length} ítem{items.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="divide-y divide-gray-100">
                {items.map(({ producto, cantidad }) => {
                  const best = bestSuppliers?.get(producto.id)
                  const unitPrice = best?.precio_unitario ?? (producto as any).precio_minimo
                  const lineTotal = unitPrice ? unitPrice * cantidad : null
                  return (
                    <div key={producto.id} className="px-6 py-4">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-slate-400 uppercase">
                            {(producto.nombre ?? 'PR').substring(0, 2)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm">{producto.nombre}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{producto.codigo} · {producto.unidad_medida}</p>

                          {best ? (
                            <div className="mt-2 flex items-center gap-2 flex-wrap">
                              <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span className="text-xs font-semibold text-emerald-700">{best.proveedor_nombre}</span>
                                <span className="text-xs text-emerald-600 font-bold">· {formatCOP(best.precio_unitario)}</span>
                              </div>
                              {best.proveedor_whatsapp && (
                                <a
                                  href={buildWhatsAppUrl(best.proveedor_whatsapp, `Hola ${best.proveedor_nombre}, necesito cotizar: ${producto.nombre} (${cantidad} ${producto.unidad_medida})`)}
                                  target="_blank" rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-xs text-green-700 hover:text-green-800 font-medium"
                                >
                                  <MessageCircle size={12} /> Contactar
                                </a>
                              )}
                            </div>
                          ) : (
                            <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1 w-fit">
                              <AlertCircle size={11} /> Sin precio registrado
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="flex flex-col items-end gap-1">
                            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                              <button type="button" onClick={() => updateCantidad(producto.id, Math.max(1, cantidad - 1))}
                                className="px-2.5 py-1.5 text-gray-400 hover:bg-gray-100 text-sm font-bold leading-none">−</button>
                              <input type="number" min="1" value={cantidad}
                                onChange={(e) => updateCantidad(producto.id, Math.max(1, Number(e.target.value)))}
                                className="w-12 text-center border-x border-gray-200 py-1.5 text-sm font-semibold focus:outline-none" />
                              <button type="button" onClick={() => updateCantidad(producto.id, cantidad + 1)}
                                className="px-2.5 py-1.5 text-gray-400 hover:bg-gray-100 text-sm font-bold leading-none">+</button>
                            </div>
                            {lineTotal !== null && (
                              <span className="text-sm font-bold text-[#1e3a5f]"><CurrencyCOP value={lineTotal} /></span>
                            )}
                          </div>
                          <button type="button" onClick={() => removeItem(producto.id)}
                            className="p-2 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Total */}
              <div className="px-6 py-4 bg-gradient-to-r from-[#1e3a5f] to-blue-700 flex justify-between items-center">
                <div>
                  <p className="text-blue-200 text-xs font-medium">Total estimado</p>
                  <p className="text-white font-bold text-xl"><CurrencyCOP value={estimatedTotal || totalEstimado} /></p>
                </div>
                {bestSuppliers && bestSuppliers.size > 0 && (
                  <div className="text-right">
                    <p className="text-blue-300 text-[10px]">Precios de mejores proveedores</p>
                    <p className="text-blue-200 text-xs">{bestSuppliers.size} de {items.length} con precio</p>
                  </div>
                )}
              </div>
            </div>

            {/* Info banner */}
            <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
              <CheckCircle2 size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 leading-relaxed">
                Los proveedores sugeridos son los de menor precio registrado. El administrador puede ajustar la selección al aprobar la requisición.
              </p>
            </div>

            <div className="flex gap-3 justify-between">
              <Button type="button" variant="ghost" onClick={() => setStep(1)} icon={<ChevronLeft size={16} />}>
                Atrás
              </Button>
              <Button type="submit" variant="secondary" loading={createMutation.isPending} icon={<Send size={16} />}>
                Enviar requisición
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
