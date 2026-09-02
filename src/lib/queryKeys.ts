/**
 * Centralización de Query Keys para TanStack React Query.
 * Garantiza consistencia en invalidaciones y evita claves huérfanas.
 */
export const queryKeys = {
  requisitions: {
    all: ['requisitions'] as const,
    list: (filters?: unknown, userRol?: string) => ['requisitions', filters, userRol] as const,
    detail: (id?: number) => ['requisition', id] as const,
    draft: (userId?: string) => ['draft-requisition', userId] as const,
    orderSummary: (estados?: string[], categorias?: string[]) => ['order-summary', estados, categorias] as const,
    history: (id?: number) => ['requisition-history', id] as const,
  },
  products: {
    all: ['products'] as const,
    list: (search = '', categoriaId?: number) => ['products', search, categoriaId] as const,
    allSuppliersByProduct: ['all-proveedores-by-product'] as const,
    detail: (id?: number) => ['product', id] as const,
    categorias: ['categorias'] as const,
    comparacionPrecios: (productoId?: number) => ['comparacion-precios', productoId] as const,
    bestSuppliersCart: (productIds: number[]) => ['best-suppliers-cart', productIds] as const,
  },
  suppliers: {
    all: ['suppliers'] as const,
    list: (search = '') => ['suppliers', search] as const,
    detail: (id?: number) => ['supplier', id] as const,
    products: (proveedorId?: number) => ['supplier-products', proveedorId] as const,
    catalog: (proveedorId?: number) => ['supplier-catalog', proveedorId] as const,
    productCounts: ['product-counts-by-supplier'] as const,
  },
  users: {
    all: ['users'] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    list: (userId?: string) => ['notifications', userId] as const,
  },
} as const

