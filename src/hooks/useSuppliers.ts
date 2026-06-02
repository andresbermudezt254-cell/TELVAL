import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Proveedor } from '@/types'
import { toast } from 'sonner'

export function useSuppliers(search = '') {
  return useQuery({
    queryKey: ['suppliers', search],
    queryFn: async () => {
      let query = supabase
        .from('proveedores')
        .select('*')
        .order('nombre')
      if (search.trim()) {
        query = query.ilike('nombre', `%${search}%`)
      }
      const { data, error } = await query
      if (error) throw error
      return data as Proveedor[]
    },
    staleTime: 1000 * 60 * 5,
  })
}

export function useSupplierById(id?: number) {
  return useQuery({
    queryKey: ['supplier', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proveedores')
        .select('*')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as Proveedor
    },
  })
}

export function useSupplierProducts(proveedorId?: number) {
  return useQuery({
    queryKey: ['supplier-products', proveedorId],
    enabled: !!proveedorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proveedor_producto')
        .select(`*, producto:productos(id, codigo, nombre, unidad_medida, categoria_id)`)
        .eq('proveedor_id', proveedorId!)
        .order('updated_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useProductCountsBySupplier() {
  return useQuery({
    queryKey: ['product-counts-by-supplier'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proveedor_producto')
        .select('proveedor_id')
        .eq('activo', true)
      if (error) throw error
      const counts = new Map<number, number>()
      data?.forEach((r) => counts.set(r.proveedor_id, (counts.get(r.proveedor_id) ?? 0) + 1))
      return counts
    },
    staleTime: 1000 * 60 * 5,
  })
}

export function useUpsertSupplier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (supplier: Partial<Proveedor> & { nombre: string }) => {
      const { error } = supplier.id
        ? await supabase.from('proveedores').update(supplier).eq('id', supplier.id)
        : await supabase.from('proveedores').insert(supplier)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      toast.success('Proveedor guardado')
    },
    onError: () => toast.error('Error al guardar el proveedor'),
  })
}

export function useUpsertPrice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: {
      proveedor_id: number
      producto_id: number
      precio_unitario: number
      fecha_precio?: string
      notas?: string
    }) => {
      const { error } = await supabase
        .from('proveedor_producto')
        .upsert(data, { onConflict: 'proveedor_id,producto_id' })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-catalog'] })
      queryClient.invalidateQueries({ queryKey: ['supplier-products'] })
      queryClient.invalidateQueries({ queryKey: ['comparacion-precios'] })
      queryClient.invalidateQueries({ queryKey: ['mejor-proveedor-all'] })
      queryClient.invalidateQueries({ queryKey: ['product-counts-by-supplier'] })
      toast.success('Precio guardado')
    },
    onError: (e) => toast.error('Error al guardar el precio: ' + (e as Error).message),
  })
}
