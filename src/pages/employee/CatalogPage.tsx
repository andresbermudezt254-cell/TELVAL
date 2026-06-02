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

  return (
    <div className="space-y-4">
      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={handleSearch}
            placeholder="Buscar insumo por nombre o código..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] bg-white"
          />
        </div>
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setCategoriaId(undefined)}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
            !categoriaId
              ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
              : 'bg-white text-gray-600 border-gray-300 hover:border-[#1e3a5f] hover:text-[#1e3a5f]'
          }`}
        >
          Todos
        </button>
        {categorias?.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategoriaId(cat.id === categoriaId ? undefined : cat.id)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              categoriaId === cat.id
                ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                : 'bg-white text-gray-600 border-gray-300 hover:border-[#1e3a5f] hover:text-[#1e3a5f]'
            }`}
          >
            {cat.icono} {cat.nombre}
          </button>
        ))}
      </div>

      {/* Results count */}
      {!isLoading && products && (
        <p className="text-sm text-gray-500">
          {products.length} insumo{products.length !== 1 ? 's' : ''} encontrado{products.length !== 1 ? 's' : ''}
        </p>
      )}

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
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  )
}
