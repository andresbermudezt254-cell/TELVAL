import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Producto, MejorProveedor } from '@/types'

export function useProducts(search = '', categoriaId?: number) {
  return useQuery({
    queryKey: ['products', search, categoriaId],
    queryFn: async () => {
      let query = supabase
        .from('productos')
        .select(`*, categoria:categorias(id, nombre, icono)`)
        .eq('activo', true)
        .order('nombre')

      if (search.trim()) {
        query = query.ilike('nombre', `%${search}%`)
      }
      if (categoriaId) {
        query = query.eq('categoria_id', categoriaId)
      }

      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as unknown as Producto[]
    },
    staleTime: 1000 * 60 * 5,
  })
}

export function useProductsWithPrices(search = '', categoriaId?: number) {
  const productsQuery = useProducts(search, categoriaId)

  const toNumericId = (value: unknown) => {
    const numericValue = Number(value)
    return Number.isFinite(numericValue) ? numericValue : null
  }

  // Cargar todas las ofertas activas por producto.
  const allProveedoresQuery = useQuery({
    queryKey: ['all-proveedores-by-product'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proveedor_producto')
        .select('producto_id, proveedor_id, precio_unitario, proveedores(id, nombre)')
        .eq('activo', true)
      if (error) throw error
      return (data ?? []) as unknown as Array<{
        producto_id: number | string
        proveedor_id: number | string
        precio_unitario: number
        proveedores?: { id: number; nombre: string } | Array<{ id: number; nombre: string }>
      }>
    },
    staleTime: 1000 * 60 * 5,
  })

  // Traer TODOS los productos y expandir uno por proveedor cuando existan.
  // Si un producto no tiene proveedores, se muestra igual en el catálogo para no perderlo.
  const expandedProducts = (productsQuery.data?.flatMap((p) => {
    const productId = toNumericId(p.id)
    const proveedoresForProduct = allProveedoresQuery.data?.filter((pp) => (
      productId !== null && toNumericId(pp.producto_id) === productId
    )) ?? []

    if (import.meta.env.DEV && proveedoresForProduct.length === 0) {
      console.warn('[Catálogo] Producto sin oferta coincidente', {
        productoId: p.id,
        productoIdType: typeof p.id,
        nombre: p.nombre,
        totalOfertasCargadas: allProveedoresQuery.data?.length ?? 0,
      })
    }

    if (proveedoresForProduct.length === 0) {
      return [{
        ...p,
        precio_unitario: p.precio_minimo ?? 0,
        proveedor_id: 0,
        proveedor_nombre: 'Sin proveedor',
        es_mas_barato: false,
        total_proveedores: 0,
      }]
    }

    proveedoresForProduct.sort((a, b) => a.precio_unitario - b.precio_unitario)

    return proveedoresForProduct.map((pp, index) => ({
      ...p,
      precio_unitario: pp.precio_unitario,
      proveedor_id: toNumericId(pp.proveedor_id) ?? 0,
      proveedor_nombre: Array.isArray(pp.proveedores)
        ? pp.proveedores[0]?.nombre
        : pp.proveedores?.nombre,
      es_mas_barato: index === 0,
      total_proveedores: proveedoresForProduct.length,
    }))
  }) ?? []) as Producto[]

  return {
    data: expandedProducts,
    isLoading: productsQuery.isLoading || allProveedoresQuery.isLoading,
    error: productsQuery.error ?? allProveedoresQuery.error,
  }
}

export function useProductById(id?: number) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('productos')
        .select(`*, categoria:categorias(id, nombre, icono)`)
        .eq('id', id!)
        .single()
      if (error) throw error
      return (data ?? null) as unknown as Producto | null
    },
    enabled: !!id,
  })
}

export function useCategorias() {
  return useQuery({
    queryKey: ['categorias'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .order('nombre')
      if (error) throw error
      return (data ?? []) as unknown as Array<{ id: number; nombre: string; icono?: string }>
    },
    staleTime: 1000 * 60 * 10,
  })
}

export function usePricesForProduct(productoId?: number) {
  return useQuery({
    queryKey: ['comparacion-precios', productoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comparacion_precios')
        .select('*')
        .eq('producto_id', productoId!)
        .order('ranking')
      if (error) throw error
      return (data ?? []) as unknown as Array<Record<string, any>>
    },
    enabled: !!productoId,
  })
}

export function useSupplierCatalog(proveedorId?: number) {
  return useQuery({
    queryKey: ['supplier-catalog', proveedorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proveedor_producto')
        .select('precio_unitario, fecha_precio, producto:productos(id, codigo, nombre, unidad_medida, categoria:categorias(nombre, icono))')
        .eq('proveedor_id', proveedorId!)
        .eq('activo', true)
        .order('precio_unitario')
      if (error) throw error
      return (data ?? []) as unknown as Array<Record<string, any>>
    },
    enabled: !!proveedorId,
  })
}
