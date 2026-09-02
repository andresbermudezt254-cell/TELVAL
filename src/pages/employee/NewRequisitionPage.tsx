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
import { getCartItemKey } from '@/store/cartStore'
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
      ;(data ?? []).forEach((r: Record<string, unknown>) => {
        const productoId = Number(r.producto_id ?? NaN)
        if (!Number.isFinite(productoId)) return
        map.set(productoId, {
          proveedor_id: Number(r.proveedor_id ?? 0),
          proveedor_nombre: String(r.proveedor_nombre ?? 'Proveedor'),
          proveedor_whatsapp: typeof r.proveedor_whatsapp === 'string' ? r.proveedor_whatsapp : undefined,
          precio_unitario: Number(r.precio_unitario ?? 0),
        })
      })
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

const sincoAdproOptions = [
  { value: '1.1', label: '1.1 - Oficiales' },
  { value: '1.2', label: '1.2 - Auxiliar de mantenimiento' },
  { value: '3.1', label: '3.1 - Concretos, morteros y cemento' },
  { value: '3.2', label: '3.2 - Aceros, mallas y alambres' },
  { value: '3.3', label: '3.3 - Estucos, pinturas y aditivos' },
  { value: '3.4', label: '3.4 - Material eléctrico' },
  { value: '3.5', label: '3.5 - Material hidráulico' },
  { value: '3.6', label: '3.6 - Material de ferretería - consumibles' },
  { value: '3.7', label: '3.7 - Material de cantera - pavimentos' },
  { value: '3.8', label: '3.8 - Sistemas de construcciones livianas' },
  { value: '3.9', label: '3.9 - Pisos y enchapes' },
  { value: '3.10', label: '3.10 - Cubiertas - impermeabilizaciones' },
  { value: '3.11', label: '3.11 - Red de gas' },
  { value: '3.12', label: '3.12 - Prefabricados' },
  { value: '3.13', label: '3.13 - Neopreno' },
  { value: '3.14', label: '3.14 - Cerraduras - chapas' },
  { value: '3.15', label: '3.15 - Micropilotes y anclajes' },
  { value: '3.16', label: '3.16 - Estudios' },
  { value: '3.17', label: '3.17 - Maderas de obra' },
  { value: '4.1.1', label: '4.1.1 - Andamios' },
  { value: '4.1.2', label: '4.1.2 - Formaleta' },
  { value: '4.1.3', label: '4.1.3 - Equipo menor alquiler' },
  { value: '4.2.1', label: '4.2.1 - Herramienta y equipo menor (compra)' },
  { value: '5.1', label: '5.1 - Transporte de personal' },
  { value: '5.2', label: '5.2 - Transporte de material' },
  { value: '5.3', label: '5.3 - Combustible' },
]

const unidadesMedidaOptions = [
  { value: 'UND', label: 'UND - Unidad' },
  { value: 'ML', label: 'ML - Metro lineal' },
  { value: 'm2', label: 'm² - Metro cuadrado' },
  { value: 'm3', label: 'm³ - Metro cúbico' },
  { value: 'KG', label: 'KG - Kilogramo' },
  { value: 'TON', label: 'TON - Tonelada' },
  { value: 'LT', label: 'LT - Litro' },
  { value: 'GL', label: 'GL - Galón' },
  { value: 'cm', label: 'cm - Centímetro' },
  { value: 'm', label: 'm - Metro' },
  { value: 'mm', label: 'mm - Milímetro' },
  { value: 'SAC', label: 'SAC - Saco' },
  { value: 'CJ', label: 'CJ - Caja' },
  { value: 'RLL', label: 'RLL - Rollo' },
  { value: 'PQ', label: 'PQ - Paquete' },
  { value: 'BL', label: 'BL - Bolsa' },
  { value: 'BOT', label: 'BOT - Botella' },
  { value: 'LAT', label: 'LAT - Lata' },
  { value: 'PAR', label: 'PAR - Par' },
  { value: 'DOC', label: 'DOC - Docena' },
  { value: 'CEN', label: 'CEN - Centena' },
  { value: 'MIL', label: 'MIL - Millar' },
  { value: 'cm2', label: 'cm² - Centímetro cuadrado' },
  { value: 'cm3', label: 'cm³ - Centímetro cúbico' },
  { value: 'g', label: 'g - Gramo' },
  { value: 'mg', label: 'mg - Miligramo' },
  { value: 'mL', label: 'mL - Mililitro' },
  { value: 'in', label: 'in - Pulgada' },
  { value: 'ft', label: 'ft - Pie' },
  { value: 'yd', label: 'yd - Yarda' },
]

// ─── Main page ───────────────────────────────────────────────────────────────
export default function NewRequisitionPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const { items, removeItem, updateCantidad, updatePpto, updateSinco, updateUnidadMedida, clearCart, totalEstimado } = useCart()
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

  const formValues = watch()

  const categoria = watch('categoria')

  const onSubmit = async (data: RequisicionFormData) => {
    if (items.length === 0) return
    await createMutation.mutateAsync({
      ...data,
      items: items.map((i) => ({
        producto_id: i.producto.id,
        cantidad: i.cantidad,
        notas: i.notas,
        item_ppto: i.item_ppto,
        item_sinco_adpro: i.item_sinco_adpro,
        unidad_medida_item: i.unidad_medida_item,
        proveedor_sugerido_id: i.producto.proveedor_id ? Number(i.producto.proveedor_id) : (i.proveedor_sugerido_id ? Number(i.proveedor_sugerido_id) : undefined),
        precio_unitario: i.producto.precio_unitario ?? i.precio_unitario ?? undefined,
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
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-between items-center gap-3">
              <span className="text-xs text-gray-400">{items.length} producto{items.length !== 1 ? 's' : ''} en el carrito</span>
              <div className="flex items-center gap-2">
                <Button type="button" onClick={() => setStep(2)} icon={<ChevronRight size={16} />}>
                  Revisar insumos
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Datos de la requisición</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-gray-400">Especialidad</span>
                  <span className="font-medium text-gray-800 text-right">{formValues.especialidad || '—'}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-gray-400">Categoría</span>
                  <span className="font-medium text-gray-800 text-right">{formValues.categoria || '—'}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-gray-400">Número de aviso</span>
                  <span className="font-medium text-gray-800 text-right">{formValues.numero_aviso || '—'}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-gray-400">Punto</span>
                  <span className="font-medium text-gray-800 text-right">{formValues.punto || '—'}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-gray-400">Fecha máxima</span>
                  <span className="font-medium text-gray-800 text-right">{formValues.fecha_maxima_entrega || '—'}</span>
                </div>
              </div>
            </div>

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
                {items.map(({ producto, cantidad, item_ppto, item_sinco_adpro, unidad_medida_item, precio_unitario, proveedor_sugerido_id }) => {
                  const best = bestSuppliers?.get(producto.id)
                  const unitPrice = precio_unitario ?? producto.precio_unitario ?? best?.precio_unitario ?? (producto as any).precio_minimo
                  const lineTotal = unitPrice ? unitPrice * cantidad : null
                  const itemKey = getCartItemKey(producto.id, producto.proveedor_id)
                  const displaySupplierName = producto.proveedor_nombre || (best?.proveedor_id === (producto.proveedor_id || proveedor_sugerido_id) ? best?.proveedor_nombre : undefined)

                  return (
                    <div key={itemKey} className="px-6 py-4">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-slate-400 uppercase">
                            {(producto.nombre ?? 'PR').substring(0, 2)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm">{producto.nombre}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {producto.codigo} · {producto.unidad_medida}
                            {displaySupplierName ? ` · ${displaySupplierName}` : ''}
                          </p>

                          <div className="mt-3 space-y-3">
                            <div className="grid grid-cols-3 gap-3">
                              <Input
                                label="Item PPTO"
                                placeholder="Ej: 23.22"
                                value={item_ppto ?? ''}
                                onChange={(event) => updatePpto(producto.id, event.target.value, producto.proveedor_id)}
                              />
                              <div className="col-span-2">
                                <Select
                                  label="Unidad de medida"
                                  options={unidadesMedidaOptions}
                                  placeholder="Selecciona unidad"
                                  value={unidad_medida_item ?? ''}
                                  onChange={(event) => updateUnidadMedida(producto.id, event.target.value, producto.proveedor_id)}
                                />
                              </div>
                            </div>
                            <Select
                              label="Item SINCO-ADPRO"
                              options={sincoAdproOptions}
                              placeholder="Selecciona un código SINCO"
                              value={item_sinco_adpro ?? ''}
                              onChange={(event) => updateSinco(producto.id, event.target.value, producto.proveedor_id)}
                            />
                          </div>

                          {unitPrice ? (
                            <div className="mt-2 flex items-center gap-2 flex-wrap">
                              <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span className="text-xs font-semibold text-emerald-700">{displaySupplierName || best?.proveedor_nombre || 'Proveedor'}</span>
                                <span className="text-xs text-emerald-600 font-bold">· {formatCOP(unitPrice)}</span>
                              </div>
                              {best?.proveedor_whatsapp && (
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
                              <button type="button" onClick={() => updateCantidad(producto.id, Math.max(1, cantidad - 1), producto.proveedor_id)}
                                className="px-2.5 py-1.5 text-gray-400 hover:bg-gray-100 text-sm font-bold leading-none">−</button>
                              <input type="number" min="1" value={cantidad}
                                onChange={(e) => updateCantidad(producto.id, Math.max(1, Number(e.target.value)), producto.proveedor_id)}
                                className="w-12 text-center border-x border-gray-200 py-1.5 text-sm font-semibold focus:outline-none" />
                              <button type="button" onClick={() => updateCantidad(producto.id, cantidad + 1, producto.proveedor_id)}
                                className="px-2.5 py-1.5 text-gray-400 hover:bg-gray-100 text-sm font-bold leading-none">+</button>
                            </div>
                            {lineTotal !== null && (
                              <span className="text-sm font-bold text-[#1e3a5f]"><CurrencyCOP value={lineTotal} /></span>
                            )}
                          </div>
                          <button type="button" onClick={() => removeItem(producto.id, producto.proveedor_id)}
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
              <div className="flex gap-2">
                <Button type="submit" variant="secondary" loading={createMutation.isPending} icon={<Send size={16} />}>
                  Enviar requisición
                </Button>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
