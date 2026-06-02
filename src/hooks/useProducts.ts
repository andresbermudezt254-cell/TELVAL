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
      return data as Producto[]
    },
    staleTime: 1000 * 60 * 5,
  })
}

export function useProductsWithPrices(search = '', categoriaId?: number) {
  const productsQuery = useProducts(search, categoriaId)

  const mejorProveedorQuery = useQuery({
    queryKey: ['mejor-proveedor-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mejor_proveedor_por_producto')
        .select('*')
        .eq('ranking', 1)
      if (error) throw error
      return data as MejorProveedor[]
    },
    staleTime: 1000 * 60 * 5,
  })

  const priceMap = new Map<number, MejorProveedor>()
  mejorProveedorQuery.data?.forEach((m) => priceMap.set(m.producto_id, m))

  const products = productsQuery.data?.map((p) => {
    const mejor = priceMap.get(p.id)
    return {
      ...p,
      precio_minimo: mejor?.precio_unitario,
      proveedor_mas_barato: mejor?.proveedor_nombre,
    }
  })

  return {
    data: products,
    isLoading: productsQuery.isLoading || mejorProveedorQuery.isLoading,
    error: productsQuery.error ?? mejorProveedorQuery.error,
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
      return data as Producto
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
      return data
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
      return data
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
      return data
    },
    enabled: !!proveedorId,
  })
}
