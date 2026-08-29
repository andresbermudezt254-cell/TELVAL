import { useCartStore } from '@/store/cartStore'

export function useCart() {
  const { items, addItem, removeItem, updateCantidad, updateNotas, updatePpto, updateSinco, updateUnidadMedida, replaceItems, clearCart, totalItems, totalEstimado } = useCartStore()
  return { items, addItem, removeItem, updateCantidad, updateNotas, updatePpto, updateSinco, updateUnidadMedida, replaceItems, clearCart, totalItems: totalItems(), totalEstimado: totalEstimado() }
}
