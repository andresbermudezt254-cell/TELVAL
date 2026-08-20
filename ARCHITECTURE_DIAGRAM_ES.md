# 🏗️ DIAGRAMA DE ARQUITECTURA - Sistema Multi-Proveedor

## Flujo de Datos: Antes vs Después

### ❌ ANTES (Problema)

```
┌─────────────────────────────────────────────────────────────┐
│              DATABASE (PostgreSQL)                           │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  proveedor_producto (Tabla)                                 │
│  ┌──────────────────────────────────────────┐               │
│  │ producto_id │ proveedor_id │ precio │     │               │
│  │─────────────┼──────────────┼────────┤     │               │
│  │ 1 (CINTA)   │ Proveedor A  │ $100   │ ✓   │               │
│  │ 1 (CINTA)   │ Proveedor B  │ $120   │ ✓   │               │
│  │ 1 (CINTA)   │ Proveedor C  │ $90    │ ✓   │   ← TODOS     │
│  │ 1 (CINTA)   │ Proveedor D  │ $150   │ ✓   │     AQUÍ      │
│  └──────────────────────────────────────────┘               │
│                                                               │
│  mejor_proveedor_por_producto (VIEW - FILTERED)             │
│  ┌──────────────────────────────────────────┐               │
│  │ producto_id │ proveedor_id │ precio │     │               │
│  │─────────────┼──────────────┼────────┤     │               │
│  │ 1 (CINTA)   │ Proveedor C  │ $90    │ ✓   │   ← SOLO EL   │
│  └──────────────────────────────────────────┘       BARATO   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│           useProductsWithPrices HOOK                         │
├─────────────────────────────────────────────────────────────┤
│  Query: SELECT * FROM mejor_proveedor_por_producto         │
│  WHERE ranking = 1  ← ❌ FILTRADO EN BD                     │
│                                                               │
│  Resultado: 1 objeto por producto (el más barato)          │
│  ┌──────────────────────────────┐                           │
│  │ Producto: CINTA AISLANTE     │                           │
│  │ Proveedor: C                 │                           │
│  │ Precio: $90                  │                           │
│  └──────────────────────────────┘                           │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              FRONTEND - ProductCard Component               │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────┐               │
│  │ 🏷️  CINTA AISLANTE                       │               │
│  │ 📦 Categoría: Ferretería                 │               │
│  │ 💵 $90  (solo este precio)              │               │
│  │ 🏢 Proveedor C                           │               │
│  │                                         │               │
│  │ [+ Agregar al carrito]                  │               │
│  └─────────────────────────────────────────┘               │
│                                                               │
│ ❌ PROBLEMA: El usuario NO VE a los Proveedores A, B, D   │
│             No puede elegir otro proveedor                 │
│             No sabe que hay opciones más caras disponibles │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

### ✅ DESPUÉS (Solución)

```
┌─────────────────────────────────────────────────────────────┐
│              DATABASE (PostgreSQL)                           │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  proveedor_producto (Tabla)      ← DIRECTA (NO FILTRADA)   │
│  ┌──────────────────────────────────────────┐               │
│  │ producto_id │ proveedor_id │ precio │     │               │
│  │─────────────┼──────────────┼────────┤     │               │
│  │ 1 (CINTA)   │ Proveedor A  │ $100   │ ✓   │               │
│  │ 1 (CINTA)   │ Proveedor B  │ $120   │ ✓   │   ← TODOS     │
│  │ 1 (CINTA)   │ Proveedor C  │ $90    │ ✓   │     LOS       │
│  │ 1 (CINTA)   │ Proveedor D  │ $150   │ ✓   │     DATOS     │
│  └──────────────────────────────────────────┘               │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│           useProductsWithPrices HOOK                         │
├─────────────────────────────────────────────────────────────┤
│  Query: SELECT * FROM proveedor_producto  ← ✅ SIN FILTRO   │
│  WHERE producto.activo = true                               │
│                                                               │
│  Processing (APLICACIÓN):                                   │
│  const expandedProducts = productsQuery.data?.flatMap((p) =>│
│    proveedoresForProduct.map((pp, idx) => ({                │
│      ...p,                                                   │
│      proveedor_id: pp.proveedor_id,      ← Ahora sí incluye │
│      proveedor_nombre: pp.proveedor?.nombre,                │
│      precio_unitario: pp.precio_unitario,                   │
│      es_mas_barato: idx === 0,                              │
│      total_proveedores: proveedoresForProduct.length        │
│    }))                                                       │
│  )                                                           │
│                                                               │
│  Resultado: 4 objetos separados (uno por proveedor)        │
│  ┌──────────────────────────────┐                           │
│  │ Producto: CINTA AISLANTE     │ ← Mismo para todos       │
│  │ Proveedor: C                 │                           │
│  │ Precio: $90                  │                           │
│  │ Es Más Barato: true          │                           │
│  │ Total Proveedores: 4         │                           │
│  └──────────────────────────────┘                           │
│  ┌──────────────────────────────┐                           │
│  │ Producto: CINTA AISLANTE     │                           │
│  │ Proveedor: A                 │                           │
│  │ Precio: $100                 │                           │
│  │ Es Más Barato: false         │                           │
│  │ Total Proveedores: 4         │                           │
│  └──────────────────────────────┘                           │
│  ┌──────────────────────────────┐                           │
│  │ Producto: CINTA AISLANTE     │                           │
│  │ Proveedor: B                 │                           │
│  │ Precio: $120                 │                           │
│  │ Es Más Barato: false         │                           │
│  │ Total Proveedores: 4         │                           │
│  └──────────────────────────────┘                           │
│  ┌──────────────────────────────┐                           │
│  │ Producto: CINTA AISLANTE     │                           │
│  │ Proveedor: D                 │                           │
│  │ Precio: $150                 │                           │
│  │ Es Más Barato: false         │                           │
│  │ Total Proveedores: 4         │                           │
│  └──────────────────────────────┘                           │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│        FRONTEND - 4× ProductCard Components                  │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────┐  ┌──────────────────────┐  │
│  │ 🏷️  CINTA AISLANTE           │  │ 🏷️  CINTA AISLANTE   │  │
│  │ 📦 Ferretería                │  │ 📦 Ferretería       │  │
│  │ 💵 $90                       │  │ 💵 $100             │  │
│  │ 🏆 Proveedor C (MÁS BARATO) │  │ 🏢 Proveedor A      │  │
│  │ +3 proveedores disponibles   │  │ +3 proveedores     │  │
│  │ [+ Agregar al carrito]      │  │ [+ Agregar]         │  │
│  └─────────────────────────────┘  └──────────────────────┘  │
│                                                               │
│  ┌──────────────────────────┐  ┌───────────────────────┐   │
│  │ 🏷️  CINTA AISLANTE       │  │ 🏷️  CINTA AISLANTE    │   │
│  │ 📦 Ferretería            │  │ 📦 Ferretería        │   │
│  │ 💵 $120                  │  │ 💵 $150              │   │
│  │ 🏢 Proveedor B           │  │ 🏢 Proveedor D       │   │
│  │ +3 proveedores           │  │ +3 proveedores       │   │
│  │ [+ Agregar al carrito]   │  │ [+ Agregar]          │   │
│  └──────────────────────────┘  └───────────────────────┘   │
│                                                               │
│ ✅ SOLUCIÓN: El usuario VE todas las opciones               │
│             Puede elegir cualquier proveedor                │
│             Sabe la diferencia de precio                   │
│             El badge 🏆 indica cuál es más barato          │
│                                                               │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│           CARRITO (Zustand cartStore)                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Lógica de diferenciación:                                   │
│  ┌─────────────────────────────────────────────┐            │
│  │ const existing = items.find((i) =>           │            │
│  │   i.producto.id === producto.id &&          │            │
│  │   i.producto.proveedor_id === producto.id   │ ← CLAVE    │
│  │ )                                            │            │
│  └─────────────────────────────────────────────┘            │
│                                                               │
│  Resultado en Carrito:                                       │
│  ┌────────────────────────────────────────────────┐          │
│  │ 📝 LÍNEA 1:                                    │          │
│  │   Producto: CINTA AISLANTE                    │          │
│  │   Proveedor: C ($90 c/u)                      │          │
│  │   Cantidad: 7 unidades                        │          │
│  │   Subtotal: $630                              │          │
│  ├────────────────────────────────────────────────┤          │
│  │ 📝 LÍNEA 2:                                    │          │
│  │   Producto: CINTA AISLANTE                    │          │
│  │   Proveedor: A ($100 c/u)                     │          │
│  │   Cantidad: 3 unidades                        │          │
│  │   Subtotal: $300                              │          │
│  ├────────────────────────────────────────────────┤          │
│  │ 📝 LÍNEA 3:                                    │          │
│  │   Producto: CINTA AISLANTE                    │          │
│  │   Proveedor: D ($150 c/u)                     │          │
│  │   Cantidad: 1 unidad                          │          │
│  │   Subtotal: $150                              │          │
│  ├────────────────────────────────────────────────┤          │
│  │ 💰 TOTAL: $1,080                              │          │
│  └────────────────────────────────────────────────┘          │
│                                                               │
│ ✅ Cada proveedor = línea separada (no se mezclan)          │
│    Las cantidades del mismo proveedor SÍ se suman           │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Comparación de Cambios Clave

| Aspecto | Antes ❌ | Después ✅ |
|---------|---------|----------|
| **Query BD** | `mejor_proveedor_por_producto` (VIEW filtrada) | `proveedor_producto` (TABLE completa) |
| **Procesamiento** | Agregación (un producto) | Expansión (múltiples via flatMap) |
| **Tarjetas visibles** | 1 por producto | N por producto (uno por proveedor) |
| **Precio mostrado** | Mínimo solamente | Específico del proveedor |
| **Proveedor visible** | El más barato | Todos (con badge si es barato) |
| **Opciones usuario** | Sin opciones | Puede elegir cualquiera |
| **Carrito** | Línea única | Línea por proveedor |
| **Diferenciación** | Por producto ID | Por producto ID + proveedor ID |

---

## 🎯 Resumen Visual: La Transformación

```
ANTES:
Producto 1 → [Barato]  (Usuario no ve otros)

DESPUÉS:
Producto 1 → [Opción A: $X - Proveedor A]
          → [Opción B: $Y - Proveedor B] ← Elegible
          → [Opción C: $Z - Proveedor C] ← Elegible
          → [Opción D: $W - Proveedor D] ← Elegible
             (Usuario elige cual quiere, a cualquier precio)
```

---

## 💻 Código Mínimo (Reducido)

### useProductsWithPrices - La Clave

```typescript
// ✨ Una sola línea hace la magia:
return productsQuery.data?.flatMap((p) => 
  // Para cada producto, retorna un array de objetos
  // uno por cada proveedor → se aplana a un solo array
  proveedoresForProduct.map(pp => ({...p, ...pp}))
)
```

### CartStore - La Diferenciación

```typescript
// ✨ Dos propiedades hacen la diferencia:
const existing = items.find(i => 
  i.producto.id === producto.id &&           // Mismo producto
  i.producto.proveedor_id === producto.proveedor_id  // Mismo proveedor
)
```

---

## 📊 Impacto

| Métrica | Valor |
|---------|-------|
| Productos únicos mostrados | 100% (todos) |
| Proveedores por producto (avg) | Todos disponibles |
| Opciones de compra | Aumentadas 300%+ |
| Flexibilidad de usuario | Máxima |
| Tipo de cambio | Arquitectura aplicación (no BD) |

---

✨ **La magia está en flatMap: transforma un array de productos en múltiples arrays, uno por proveedor, que se aplanan en un solo array de "tarjetas" 🎯**
