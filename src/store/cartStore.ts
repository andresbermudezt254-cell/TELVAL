import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem, Producto } from '@/types'

export function getCartItemKey(productoId: number, proveedorId?: number): string {
  return `${productoId}_${proveedorId ?? 0}`
}

interface CartState {
  items: CartItem[]
  addItem: (producto: Producto, cantidad?: number) => void
  removeItem: (productoId: number, proveedorId?: number) => void
  updateCantidad: (productoId: number, cantidad: number, proveedorId?: number) => void
  updateNotas: (productoId: number, notas: string, proveedorId?: number) => void
  updatePpto: (productoId: number, itemPpto: string, proveedorId?: number) => void
  updateSinco: (productoId: number, itemSincoAdpro: string, proveedorId?: number) => void
  updateUnidadMedida: (productoId: number, unidadMedida: string, proveedorId?: number) => void
  replaceItems: (items: CartItem[]) => void
  clearCart: () => void
  totalItems: () => number
  totalEstimado: () => number
}

function itemMatches(item: CartItem, productoId: number, proveedorId?: number): boolean {
  if (item.producto.id !== productoId) return false
  if (proveedorId === undefined) return true
  const itemProv = item.producto.proveedor_id ?? 0
  const targetProv = proveedorId ?? 0
  return itemProv === targetProv
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (producto, cantidad = 1) => {
        set((state) => {
          const provId = producto.proveedor_id ?? 0
          const existing = state.items.find((i) =>
            i.producto.id === producto.id && (i.producto.proveedor_id ?? 0) === provId
          )

          if (existing) {
            return {
              items: state.items.map((i) =>
                (i.producto.id === producto.id && (i.producto.proveedor_id ?? 0) === provId)
                  ? { ...i, cantidad: i.cantidad + cantidad }
                  : i
              ),
            }
          }

          const newItem: CartItem = {
            producto,
            cantidad,
            notas: '',
            proveedor_sugerido_id: producto.proveedor_id ? Number(producto.proveedor_id) : undefined,
            precio_unitario: producto.precio_unitario ?? producto.precio_minimo ?? undefined,
          }

          return { items: [...state.items, newItem] }
        })
      },

      removeItem: (productoId, proveedorId) => {
        set((state) => ({
          items: state.items.filter((i) => !itemMatches(i, productoId, proveedorId)),
        }))
      },

      updateCantidad: (productoId, cantidad, proveedorId) => {
        if (cantidad <= 0) {
          get().removeItem(productoId, proveedorId)
          return
        }
        set((state) => ({
          items: state.items.map((i) =>
            itemMatches(i, productoId, proveedorId)
              ? { ...i, cantidad }
              : i
          ),
        }))
      },

      updateNotas: (productoId, notas, proveedorId) => {
        set((state) => ({
          items: state.items.map((i) =>
            itemMatches(i, productoId, proveedorId)
              ? { ...i, notas }
              : i
          ),
        }))
      },

      updatePpto: (productoId, itemPpto, proveedorId) => {
        set((state) => ({
          items: state.items.map((i) =>
            itemMatches(i, productoId, proveedorId)
              ? { ...i, item_ppto: itemPpto }
              : i
          ),
        }))
      },

      updateSinco: (productoId, itemSincoAdpro, proveedorId) => {
        set((state) => ({
          items: state.items.map((i) =>
            itemMatches(i, productoId, proveedorId)
              ? { ...i, item_sinco_adpro: itemSincoAdpro }
              : i
          ),
        }))
      },

      updateUnidadMedida: (productoId, unidadMedida, proveedorId) => {
        set((state) => ({
          items: state.items.map((i) =>
            itemMatches(i, productoId, proveedorId)
              ? { ...i, unidad_medida_item: unidadMedida }
              : i
          ),
        }))
      },

      replaceItems: (items) => set({ items }),

      clearCart: () => set({ items: [] }),

      totalItems: () => get().items.reduce((sum, i) => sum + i.cantidad, 0),

      totalEstimado: () =>
        get().items.reduce((sum, i) => {
          const price = i.precio_unitario ?? i.producto.precio_unitario ?? i.producto.precio_minimo ?? 0
          return sum + price * i.cantidad
        }, 0),
    }),
    {
      name: 'telval-cart',
    }
  )
)
