import { useEffect, useState } from 'react'
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
import { Modal } from '@/components/ui/Modal'
import { formatCOP, buildWhatsAppUrl, unidadMedidaLabel } from '@/lib/utils'
import type { Producto } from '@/types'

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

interface UnitOption {
  value: string
  label: string
}

interface UnitGroup {
  label: string
  options: UnitOption[]
}

const UNIT_GROUPS: UnitGroup[] = [
  {
    label: 'Fracciones',
    options: [
      { value: '1/2', label: '1/2 — Medio' },
      { value: '1/3', label: '1/3 — Un tercio' },
      { value: '1/4', label: '1/4 — Un cuarto' },
      { value: '1/5', label: '1/5 — Un quinto' },
      { value: '1/6', label: '1/6 — Un sexto' },
      { value: '1/8', label: '1/8 — Un octavo' },
      { value: '3/4', label: '3/4 — Tres cuartos' },
      { value: '5/8', label: '5/8 — Cinco octavos' },
      { value: '7/8', label: '7/8 — Siete octavos' },
    ],
  },
  {
    label: 'Longitud',
    options: [
      { value: 'mm', label: 'mm — Milímetro' },
      { value: 'cm', label: 'cm — Centímetro' },
      { value: 'dm', label: 'dm — Decímetro' },
      { value: 'm', label: 'm — Metro' },
      { value: 'dam', label: 'dam — Decámetro' },
      { value: 'hm', label: 'hm — Hectómetro' },
      { value: 'km', label: 'km — Kilómetro' },
      { value: 'in', label: 'in — Pulgada' },
      { value: 'ft', label: 'ft — Pie' },
      { value: 'yd', label: 'yd — Yarda' },
      { value: 'mi', label: 'mi — Milla' },
    ],
  },
  {
    label: 'Área (Superficie)',
    options: [
      { value: 'mm²', label: 'mm² — Milímetro cuadrado' },
      { value: 'cm²', label: 'cm² — Centímetro cuadrado' },
      { value: 'dm²', label: 'dm² — Decímetro cuadrado' },
      { value: 'm²', label: 'm² — Metro cuadrado' },
      { value: 'dam²', label: 'dam² — Decámetro cuadrado' },
      { value: 'hm²', label: 'hm² — Hectómetro cuadrado' },
      { value: 'km²', label: 'km² — Kilómetro cuadrado' },
      { value: 'ha', label: 'ha — Hectárea' },
    ],
  },
  {
    label: 'Volumen',
    options: [
      { value: 'mm³', label: 'mm³ — Milímetro cúbico' },
      { value: 'cm³', label: 'cm³ — Centímetro cúbico' },
      { value: 'dm³', label: 'dm³ — Decímetro cúbico' },
      { value: 'm³', label: 'm³ — Metro cúbico' },
      { value: 'km³', label: 'km³ — Kilómetro cúbico' },
    ],
  },
  {
    label: 'Capacidad',
    options: [
      { value: 'mL', label: 'mL — Mililitro' },
      { value: 'cL', label: 'cL — Centilitro' },
      { value: 'dL', label: 'dL — Decilitro' },
      { value: 'L', label: 'L — Litro' },
      { value: 'daL', label: 'daL — Decalitro' },
      { value: 'hL', label: 'hL — Hectolitro' },
      { value: 'kL', label: 'kL — Kilolitro' },
      { value: 'GL', label: 'GL — Galón' },
    ],
  },
  {
    label: 'Masa o Peso',
    options: [
      { value: 'mg', label: 'mg — Miligramo' },
      { value: 'cg', label: 'cg — Centigramo' },
      { value: 'dg', label: 'dg — Decigramo' },
      { value: 'g', label: 'g — Gramo' },
      { value: 'dag', label: 'dag — Decagramo' },
      { value: 'hg', label: 'hg — Hectogramo' },
      { value: 'kg', label: 'kg — Kilogramo' },
      { value: 't', label: 't — Tonelada' },
    ],
  },
  {
    label: 'Temperatura',
    options: [
      { value: '°C', label: '°C — Grados Celsius' },
      { value: '°F', label: '°F — Grados Fahrenheit' },
      { value: 'K', label: 'K — Kelvin' },
    ],
  },
  {
    label: 'Tiempo',
    options: [
      { value: 's', label: 's — Segundo' },
      { value: 'min', label: 'min — Minuto' },
      { value: 'h', label: 'h — Hora' },
      { value: 'd', label: 'd — Día' },
      { value: 'sem', label: 'sem — Semana' },
      { value: 'mes', label: 'mes — Mes' },
      { value: 'año', label: 'año — Año' },
    ],
  },
  {
    label: 'Presión',
    options: [
      { value: 'Pa', label: 'Pa — Pascal' },
      { value: 'kPa', label: 'kPa — Kilopascal' },
      { value: 'bar', label: 'bar — Bar' },
      { value: 'psi', label: 'psi — Libras por pulgada cuadrada' },
    ],
  },
  {
    label: 'Energía',
    options: [
      { value: 'J', label: 'J — Julio' },
      { value: 'kJ', label: 'kJ — Kilojulio' },
      { value: 'cal', label: 'cal — Caloría' },
      { value: 'kcal', label: 'kcal — Kilocaloría' },
      { value: 'kWh', label: 'kWh — Kilovatio-hora' },
    ],
  },
  {
    label: 'Potencia',
    options: [
      { value: 'W', label: 'W — Vatio' },
      { value: 'kW', label: 'kW — Kilovatio' },
      { value: 'HP', label: 'HP — Caballo de fuerza' },
    ],
  },
  {
    label: 'Electricidad',
    options: [
      { value: 'V', label: 'V — Voltio' },
      { value: 'A', label: 'A — Amperio' },
      { value: 'Ω', label: 'Ω — Ohmio' },
    ],
  },
  {
    label: 'Unidades comerciales y de inventario',
    options: [
      { value: 'UND', label: 'UND — Unidad' },
      { value: 'PAR', label: 'PAR — Par' },
      { value: 'DOC', label: 'DOC — Docena' },
      { value: 'CEN', label: 'CEN — Centena' },
      { value: 'MIL', label: 'MIL — Millar' },
      { value: 'CJ', label: 'CJ — Caja' },
      { value: 'PQ', label: 'PQ — Paquete' },
      { value: 'SAC', label: 'SAC — Saco' },
      { value: 'BUL', label: 'BUL — Bulto' },
      { value: 'RLL', label: 'RLL — Rollo' },
      { value: 'BOT', label: 'BOT — Botella' },
      { value: 'LAT', label: 'LAT — Lata' },
      { value: 'BL', label: 'BL — Bolsa' },
    ],
  },
]

const CAPITULOS_SINCO = [
  { value: '1.1', label: '1.1 - Oficiales' },
  { value: '1.2', label: '1.2 - Auxiliar de mantenimiento' },
  { value: '3.1', label: '3.1 - Concretos, morteros y cemento' },
  { value: '3.2', label: '3.2 - Aceros, mallas y alambres' },
  { value: '3.3', label: '3.3 - Estucos, pinturas y aditivos' },
  { value: '3.4', label: '3.4 - Material eléctrico' },
  { value: '3.5', label: '3.5 - Material hidráulico' },
  { value: '3.6', label: '3.6 - Material de ferretería - consumibles' },
  { value: '3.7', label: '3.7 - Material de cantera - pavimentos' },
  { value: '3.8', label: '3.8 - Sistemas de construcción livianas' },
  { value: '3.9', label: '3.9 - Pisos y enchapes' },
  { value: '3.10', label: '3.10 - Cubiertas - Impermeabilizaciones' },
  { value: '3.11', label: '3.11 - Red de gas' },
  { value: '3.12', label: '3.12 - Prefabricados' },
  { value: '3.13', label: '3.13 - Neopreno' },
  { value: '3.14', label: '3.14 - Cerraduras - Chapas' },
  { value: '3.15', label: '3.15 - Micropilotes y anclajes' },
  { value: '3.16', label: '3.16 - Estudios' },
  { value: '3.17', label: '3.17 - Maderas de obra' },
  { value: '4.1', label: '4.1 - Andamios' },
  { value: '4.2', label: '4.2 - Formaleta' },
  { value: '4.3', label: '4.3 - Equipo menor alquiler' },
  { value: '4.4', label: '4.4 - Herramienta y equipo menor (compra)' },
  { value: '4.5', label: '4.5 - Transporte de personal' },
  { value: '5.1', label: '5.1 - Transporte de material' },
  { value: '5.2', label: '5.2 - Combustible' },
]

const CATEGORY_PRESET_GROUPS: Record<string, string[]> = {
  'Pinturas y anticorrosivos': ['Capacidad', 'Masa o Peso', 'Unidades comerciales y de inventario'],
  'Limpieza e higiene': ['Capacidad', 'Masa o Peso', 'Unidades comerciales y de inventario'],
  'Tuberías y fontanería': ['Longitud', 'Área (Superficie)', 'Volumen', 'Capacidad', 'Unidades comerciales y de inventario'],
  'Materiales de construcción': ['Longitud', 'Área (Superficie)', 'Volumen', 'Masa o Peso', 'Unidades comerciales y de inventario'],
  'Drywall y tabiquería': ['Longitud', 'Área (Superficie)', 'Unidades comerciales y de inventario'],
  'Herramientas manuales': ['Longitud', 'Masa o Peso', 'Unidades comerciales y de inventario'],
  'Herramientas eléctricas': ['Electricidad', 'Longitud', 'Unidades comerciales y de inventario'],
  'Productos eléctricos': ['Electricidad', 'Masa o Peso', 'Unidades comerciales y de inventario'],
  'Empaques y almacenamiento': ['Unidades comerciales y de inventario', 'Capacidad'],
  'Elementos de seguridad (EPP)': ['Unidades comerciales y de inventario', 'Masa o Peso'],
}

const getUnitGroupsForProduct = (product: Producto): UnitGroup[] => {
  const categoryName = product.categoria?.nombre ?? ''
  const preferred = CATEGORY_PRESET_GROUPS[categoryName] ?? []
  const preferredGroups = UNIT_GROUPS.filter((group) => preferred.includes(group.label))
  const remainingGroups = UNIT_GROUPS.filter((group) => !preferred.includes(group.label))
  return [...preferredGroups, ...remainingGroups]
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
  const todayValue = new Date().toISOString().split('T')[0]

  const [selectedUnits, setSelectedUnits] = useState<Record<number, string>>({})
  const [showSincoEditor, setShowSincoEditor] = useState<Record<number, boolean>>({})
  const [selectedSinco, setSelectedSinco] = useState<Record<number, string>>({})
  const [selectedChapter, setSelectedChapter] = useState<Record<number, string>>({})
  const [chapterModal, setChapterModal] = useState<{ open: boolean; productId?: number }>({ open: false })

  useEffect(() => {
    setSelectedUnits((current) => {
      const updated = { ...current }
      items.forEach((item) => {
        if (!updated[item.producto.id]) {
          updated[item.producto.id] = item.producto.unidad_medida
        }
      })
      return updated
    })
  }, [items])

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

              <Input
                label="Fecha máxima de entrega"
                type="date"
                required
                min={todayValue}
                error={errors.fecha_maxima_entrega?.message}
                {...register('fecha_maxima_entrega')}
              />
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
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="flex flex-wrap gap-2 items-center">
                            <p className="font-semibold text-gray-900 text-sm">{producto.nombre}</p>
                            {!producto.codigo && (
                              <button
                                type="button"
                                onClick={() => setShowSincoEditor((prev) => ({
                                  ...prev,
                                  [producto.id]: !prev[producto.id],
                                }))}
                                className="inline-flex items-center gap-1 rounded-full border border-[#1e3a5f] px-3 py-1 text-[11px] font-semibold text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white transition-colors"
                              >
                                + Agregar código SINCO
                              </button>
                            )}
                          </div>

                          {(producto.codigo || selectedSinco[producto.id] || selectedChapter[producto.id]) && (
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                              <span className="rounded-full bg-slate-100 px-2 py-1 font-medium text-slate-700">Código SINCO:</span>
                              <span className="rounded-full bg-slate-50 px-2 py-1 border border-slate-200 text-slate-700">
                                {selectedSinco[producto.id] ?? producto.codigo}
                              </span>
                            </div>
                          )}

                          <div className="mt-2 flex items-center gap-2 flex-wrap text-xs text-slate-600">
                            <button
                              type="button"
                              onClick={() => setChapterModal({ open: true, productId: producto.id })}
                              className="inline-flex items-center gap-1 rounded-full border border-[#1e3a5f] px-3 py-1 text-[11px] font-semibold text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white transition-colors"
                            >
                              Capítulo SINCO
                            </button>
                            {selectedChapter[producto.id] && (
                              <span className="rounded-full bg-[#1e3a5f]/10 text-[#1e3a5f] px-2 py-1 font-semibold">
                                {selectedChapter[producto.id]}
                              </span>
                            )}
                          </div>

                          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr,220px] items-end">
                            <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
                              <span className="font-semibold">Unidad:</span>
                              <span className="uppercase tracking-wider text-slate-600 bg-slate-100 px-2 py-1 rounded-full">{unidadMedidaLabel(selectedUnits[producto.id] ?? producto.unidad_medida)}</span>
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-semibold text-slate-700 uppercase tracking-widest">Selecciona la unidad</label>
                              <select
                                value={selectedUnits[producto.id] ?? producto.unidad_medida}
                                onChange={(event) => setSelectedUnits((current) => ({
                                  ...current,
                                  [producto.id]: event.target.value,
                                }))}
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                              >
                                {getUnitGroupsForProduct(producto).map((group) => (
                                  <optgroup key={group.label} label={group.label}>
                                    {group.options.map((option) => (
                                      <option key={`${group.label}-${option.value}`} value={option.value}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </optgroup>
                                ))}
                                {(() => {
                                  const currentValue = selectedUnits[producto.id] ?? producto.unidad_medida
                                  const hasCurrent = getUnitGroupsForProduct(producto).some((group) =>
                                    group.options.some((option) => option.value === currentValue)
                                  )
                                  return !hasCurrent ? (
                                    <option key={`fallback-${currentValue}`} value={currentValue}>
                                      {unidadMedidaLabel(currentValue)}
                                    </option>
                                  ) : null
                                })()}
                              </select>
                            </div>
                          </div>

                          {showSincoEditor[producto.id] && (
                            <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                              <label className="block text-xs font-semibold text-slate-700 mb-2">Agregar código SINCO</label>
                              <input
                                type="text"
                                value={selectedSinco[producto.id] ?? ''}
                                onChange={(event) => setSelectedSinco((prev) => ({
                                  ...prev,
                                  [producto.id]: event.target.value,
                                }))}
                                placeholder="Ingresa el código SINCO"
                                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                              />
                            </div>
                          )}

                          {best ? (
                            <div className="mt-2 flex items-center gap-2 flex-wrap">
                              <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span className="text-xs font-semibold text-emerald-700">{best.proveedor_nombre}</span>
                                <span className="text-xs text-emerald-600 font-bold">· {formatCOP(best.precio_unitario)}</span>
                              </div>
                              {best.proveedor_whatsapp && (
                                <a
                                  href={buildWhatsAppUrl(best.proveedor_whatsapp, `Hola ${best.proveedor_nombre}, necesito cotizar: ${producto.nombre} (${cantidad} ${unidadMedidaLabel(selectedUnits[producto.id] ?? producto.unidad_medida)})`)}
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

            <div>
              <Modal
                open={chapterModal.open}
                onClose={() => setChapterModal({ open: false })}
                title="Seleccionar capítulo SINCO"
                size="sm"
              >
                <div className="space-y-3">
                  {CAPITULOS_SINCO.map((cap) => (
                    <button
                      key={cap.value}
                      type="button"
                      onClick={() => {
                        if (chapterModal.productId) {
                          setSelectedChapter((prev) => ({ ...prev, [chapterModal.productId!]: cap.label }))
                        }
                        setChapterModal({ open: false })
                      }}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-left text-sm text-gray-800 hover:bg-[#f8fafc] transition-colors"
                    >
                      <div className="font-semibold">{cap.value}</div>
                      <div className="text-xs text-gray-500">{cap.label}</div>
                    </button>
                  ))}
                </div>
              </Modal>
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
