import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem, Producto } from '@/types'

interface CartState {
  items: CartItem[]
  addItem: (producto: Producto, cantidad?: number) => void
  removeItem: (productoId: number, proveedorId?: number) => void
  updateCantidad: (productoId: number, cantidad: number, proveedorId?: number) => void
  updateNotas: (productoId: number, notas: string, proveedorId?: number) => void
  replaceItems: (items: CartItem[]) => void
  clearCart: () => void
  totalItems: () => number
  totalEstimado: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (producto, cantidad = 1) => {
        set((state) => {
          // Buscar producto existente por ID + proveedor_id
          const existing = state.items.find((i) => 
            i.producto.id === producto.id && 
            i.producto.proveedor_id === producto.proveedor_id
          )
          if (existing) {
            return {
              items: state.items.map((i) =>
                (i.producto.id === producto.id && i.producto.proveedor_id === producto.proveedor_id)
                  ? { ...i, cantidad: i.cantidad + cantidad }
                  : i
              ),
            }
          }
          return { items: [...state.items, { producto, cantidad, notas: '' }] }
        })
      },

      removeItem: (productoId, proveedorId) => {
        set((state) => ({
          items: state.items.filter((i) => 
            !(i.producto.id === productoId && (proveedorId === undefined || i.producto.proveedor_id === proveedorId))
          )
        }))
      },

      updateCantidad: (productoId, cantidad, proveedorId) => {
        if (cantidad <= 0) {
          get().removeItem(productoId, proveedorId)
          return
        }
        set((state) => ({
          items: state.items.map((i) =>
            (i.producto.id === productoId && (proveedorId === undefined || i.producto.proveedor_id === proveedorId))
              ? { ...i, cantidad }
              : i
          ),
        }))
      },

      updateNotas: (productoId, notas, proveedorId) => {
        set((state) => ({
          items: state.items.map((i) =>
            (i.producto.id === productoId && (proveedorId === undefined || i.producto.proveedor_id === proveedorId))
              ? { ...i, notas }
              : i
          ),
        }))
      },

      replaceItems: (items) => set({ items }),

      clearCart: () => set({ items: [] }),

      totalItems: () => get().items.reduce((sum, i) => sum + i.cantidad, 0),

      totalEstimado: () =>
        get().items.reduce(
          (sum, i) => sum + (i.producto.precio_unitario ?? i.producto.precio_minimo ?? 0) * i.cantidad,
          0
        ),
    }),
    {
      name: 'telval-cart',
    }
  )
)
