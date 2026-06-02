import { useState } from 'react'
import { Plus, Check, Tag, ChevronDown, ChevronUp, TrendingDown } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useCart } from '@/hooks/useCart'
import { formatCOP } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import type { Producto } from '@/types'

interface ProductCardProps {
  product: Producto
}

// Map category → tailwind color classes for the card header accent
const categoryColors: Record<string, { bg: string; text: string }> = {
  'Pinturas y anticorrosivos':       { bg: 'bg-rose-50',    text: 'text-rose-600' },
  'Ferretería y tornillería':        { bg: 'bg-slate-100',  text: 'text-slate-600' },
  'Tuberías y fontanería':           { bg: 'bg-cyan-50',    text: 'text-cyan-700' },
  'Drywall y tabiquería':            { bg: 'bg-amber-50',   text: 'text-amber-600' },
  'Elementos de seguridad (EPP)':    { bg: 'bg-yellow-50',  text: 'text-yellow-700' },
  'Herramientas manuales':           { bg: 'bg-orange-50',  text: 'text-orange-600' },
  'Herramientas eléctricas':         { bg: 'bg-violet-50',  text: 'text-violet-600' },
  'Materiales de construcción':      { bg: 'bg-stone-100',  text: 'text-stone-600' },
  'Productos eléctricos':            { bg: 'bg-blue-50',    text: 'text-blue-600' },
  'Empaques y almacenamiento':       { bg: 'bg-teal-50',    text: 'text-teal-600' },
  'Limpieza e higiene':              { bg: 'bg-green-50',   text: 'text-green-600' },
  'Otros insumos':                   { bg: 'bg-gray-100',   text: 'text-gray-500' },
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem, items } = useCart()
  const isInCart = items.some((i) => i.producto.id === product.id)
  const [showPrices, setShowPrices] = useState(false)

  const catName = product.categoria?.nombre ?? ''
  const colors = categoryColors[catName] ?? { bg: 'bg-slate-100', text: 'text-slate-500' }
  const initials = catName.substring(0, 2).toUpperCase() || 'PR'

  // Cargar comparación de precios solo cuando se expande
  const { data: precios } = useQuery({
    queryKey: ['comparacion-precios', product.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comparacion_precios')
        .select('*')
        .eq('producto_id', product.id)
        .order('ranking')
      if (error) throw error
      return data
    },
    enabled: showPrices,
    staleTime: 1000 * 60 * 5,
  })

  return (
    <div className="bg-white rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-200 flex flex-col group">
      {/* Header */}
      <div className={`h-24 ${colors.bg} rounded-t-2xl flex items-center justify-center relative overflow-hidden`}>
        {product.imagen_url ? (
          <img src={product.imagen_url} alt={product.nombre} className="h-full w-full object-cover rounded-t-2xl group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <span className={`text-4xl font-black ${colors.text} opacity-20 select-none tracking-tight`}>{initials}</span>
        )}
        {product.codigo && (
          <span className="absolute top-2 left-2 text-[9px] font-mono bg-white/80 backdrop-blur-sm text-gray-500 px-1.5 py-0.5 rounded-md">
            #{product.codigo}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-3.5 gap-2">
        <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">{product.nombre}</h3>

        {product.categoria && (
          <div className="flex items-center gap-1">
            <Tag size={10} className="text-gray-300" />
            <span className="text-[10px] text-gray-400 uppercase tracking-wide truncate">{product.categoria.nombre}</span>
          </div>
        )}

        <div className="mt-auto pt-2.5 border-t border-gray-100">
          {product.precio_minimo ? (
            <div>
              <div className="flex items-baseline gap-1">
                <p className="text-base font-bold text-[#1e3a5f]">{formatCOP(product.precio_minimo)}</p>
                <span className="text-[10px] text-gray-400">/{product.unidad_medida}</span>
              </div>
              {product.proveedor_mas_barato && (
                <p className="text-[10px] text-emerald-600 font-medium truncate flex items-center gap-0.5 mt-0.5">
                  <TrendingDown size={9} /> {product.proveedor_mas_barato}
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">Sin precio disponible</p>
          )}
        </div>

        {/* Comparador de precios desplegable */}
        {product.precio_minimo && (
          <button
            onClick={() => setShowPrices(v => !v)}
            className="flex items-center justify-between w-full text-[10px] text-gray-400 hover:text-[#1e3a5f] transition-colors py-1 border-t border-gray-100"
          >
            <span>Ver precios por proveedor</span>
            {showPrices ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
        )}

        {showPrices && precios && precios.length > 0 && (
          <div className="rounded-xl overflow-hidden border border-gray-100">
            {precios.map((p: any, i: number) => (
              <div
                key={p.proveedor_id}
                className={`flex items-center justify-between px-2.5 py-1.5 text-xs ${
                  i === 0 ? 'bg-emerald-50' : 'bg-white border-t border-gray-100'
                }`}
              >
                <span className={`truncate flex-1 ${i === 0 ? 'text-emerald-700 font-semibold' : 'text-gray-600'}`}>
                  {i === 0 && '🏆 '}{p.proveedor_nombre}
                </span>
                <span className={`font-bold ml-2 whitespace-nowrap ${i === 0 ? 'text-emerald-700' : 'text-gray-700'}`}>
                  {formatCOP(p.precio_unitario)}
                </span>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => addItem(product)}
          className={`flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-sm font-semibold transition-all duration-150 ${
            isInCart
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
              : 'bg-[#1e3a5f] text-white hover:bg-[#16305a] shadow-sm hover:shadow-md'
          }`}
        >
          {isInCart ? <Check size={14} /> : <Plus size={14} />}
          {isInCart ? 'Agregado' : 'Agregar al carrito'}
        </button>
      </div>
    </div>
  )
}
