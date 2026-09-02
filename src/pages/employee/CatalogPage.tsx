import { useState, useCallback } from 'react'
import { Search } from 'lucide-react'
import { useProductsWithPrices, useCategorias } from '@/hooks/useProducts'
import { ProductCard } from '@/components/catalog/ProductCard'
import { PageLoader } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { debounce } from '@/lib/utils'

export default function CatalogPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [categoriaId, setCategoriaId] = useState<number | undefined>()

  const { data: categorias } = useCategorias()
  const { data: products, isLoading } = useProductsWithPrices(debouncedSearch, categoriaId)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleSearchDebounced = useCallback(
    debounce((val: unknown) => setDebouncedSearch(val as string), 300),
    []
  )

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
    handleSearchDebounced(e.target.value)
  }

  const clearSearch = () => {
    setSearch('')
    setDebouncedSearch('')
  }

  return (
    <div className="space-y-5">
      {/* Header and Search Toolbar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Catálogo de Insumos</h1>
              {!isLoading && products && (
                <span className="text-xs font-bold text-[#1e3a5f] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                  {products.length} disponibles
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Consulta precios de referencia y mejores opciones de proveedores</p>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={handleSearch}
              placeholder="Buscar insumo por nombre o código..."
              className="w-full pl-10 pr-9 py-2.5 rounded-2xl border border-slate-200/90 text-xs font-medium focus:outline-none focus:ring-3 focus:ring-blue-100 focus:border-[#1e3a5f] bg-slate-50/50 shadow-2xs transition-all"
            />
            {search && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold p-1"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Category chips */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-1.5 items-center">
          <button
            onClick={() => setCategoriaId(undefined)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
              !categoriaId
                ? 'bg-[#1e3a5f] text-white border-[#1e3a5f] shadow-sm'
                : 'bg-slate-50/80 text-slate-600 border-slate-200/80 hover:bg-white hover:border-[#1e3a5f] hover:text-[#1e3a5f]'
            }`}
          >
            Todos
          </button>
          {categorias?.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoriaId(cat.id === categoriaId ? undefined : cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all flex items-center gap-1.5 ${
                categoriaId === cat.id
                  ? 'bg-[#1e3a5f] text-white border-[#1e3a5f] shadow-sm'
                  : 'bg-slate-50/80 text-slate-600 border-slate-200/80 hover:bg-white hover:border-[#1e3a5f] hover:text-[#1e3a5f]'
              }`}
            >
              <span>{cat.icono}</span>
              <span>{cat.nombre}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <PageLoader />
      ) : !products?.length ? (
        <EmptyState
          title="Sin resultados"
          description="No se encontraron insumos con los filtros actuales."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((product) => (
            <ProductCard key={`${product.id}-${product.proveedor_id || 0}`} product={product} />
          ))}
        </div>
      )}
    </div>
  )
}
