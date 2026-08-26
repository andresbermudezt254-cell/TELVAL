import { useCartStore } from '@/store/cartStore'

export function useCart() {
  const { items, addItem, removeItem, updateCantidad, updateNotas, updatePpto, updateSinco, replaceItems, clearCart, totalItems, totalEstimado } = useCartStore()
  return { items, addItem, removeItem, updateCantidad, updateNotas, updatePpto, updateSinco, replaceItems, clearCart, totalItems: totalItems(), totalEstimado: totalEstimado() }
}
