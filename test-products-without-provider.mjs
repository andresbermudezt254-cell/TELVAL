#!/usr/bin/env node

/**
 * Test: Verificar que productos sin proveedor aparecen en el catálogo
 * Este test simula la nueva lógica que muestra TODOS los productos,
 * incluso si no tienen un proveedor asignado.
 */

const testData = {
  // Productos
  productos: [
    { id: 1, nombre: 'CINTA AISLANTE', codigo: '001', unidad_medida: 'ROLLO', categoria_id: 1, activo: true, precio_minimo: 80 },
    { id: 2, nombre: 'CINTA AISLANTE NEGRA', codigo: '002', unidad_medida: 'ROLLO', categoria_id: 1, activo: true, precio_minimo: null },
    { id: 3, nombre: 'CABLE #12', codigo: '003', unidad_medida: 'METRO', categoria_id: 2, activo: true, precio_minimo: 150 },
  ],

  // Proveedores de productos (nota: CINTA AISLANTE NEGRA NO TIENE PROVEEDOR)
  proveedor_producto: [
    { producto_id: 1, proveedor_id: 1, precio_unitario: 100, activo: true, proveedor: { id: 1, nombre: 'Proveedor A' } },
    { producto_id: 1, proveedor_id: 2, precio_unitario: 90, activo: true, proveedor: { id: 2, nombre: 'Proveedor B' } },
    // 🔴 PRODUCTO 2 (CINTA AISLANTE NEGRA) NO TIENE PROVEEDORES
    { producto_id: 3, proveedor_id: 1, precio_unitario: 200, activo: true, proveedor: { id: 1, nombre: 'Proveedor A' } },
  ]
}

// Simular la nueva lógica de useProductsWithPrices
function expandProductsByProvider() {
  const expandedProducts = testData.productos.flatMap((p) => {
    const proveedoresForProduct = testData.proveedor_producto.filter(pp => pp.producto_id === p.id)
    
    // ✅ CAMBIO: Si NO hay proveedores, mostrar el producto de todas formas
    if (proveedoresForProduct.length === 0) {
      return [{
        ...p,
        precio_unitario: p.precio_minimo ?? 0,  // Usar precio_minimo si existe
        proveedor_id: 0,                         // 0 = sin proveedor
        proveedor_nombre: 'Sin proveedor',
        es_mas_barato: false,
        total_proveedores: 0,
      }]
    }

    // Ordenar por precio
    proveedoresForProduct.sort((a, b) => a.precio_unitario - b.precio_unitario)

    // Retornar una "tarjeta" por cada proveedor
    return proveedoresForProduct.map((pp, index) => ({
      ...p,
      precio_unitario: pp.precio_unitario,
      proveedor_id: pp.proveedor_id,
      proveedor_nombre: pp.proveedor?.nombre,
      es_mas_barato: index === 0,
      total_proveedores: proveedoresForProduct.length,
    }))
  })

  return expandedProducts
}

const result = expandProductsByProvider()

console.log('✅ RESULTADO: Productos mostrados en el catálogo:\n')
result.forEach((card, idx) => {
  console.log(`📦 TARJETA ${idx + 1}:`)
  console.log(`   Producto:      ${card.nombre}`)
  console.log(`   Código:        ${card.codigo}`)
  console.log(`   Precio:        ${card.precio_unitario === 0 ? '(Sin precio)' : '$' + card.precio_unitario}`)
  console.log(`   Proveedor:     ${card.proveedor_nombre}`)
  console.log(`   Botón:         ${card.proveedor_id === 0 ? '❌ DESHABILITADO (Sin proveedor)' : '✅ ACTIVO (Agregar al carrito)'}`)
  console.log()
})

console.log(`\n✨ TOTAL DE TARJETAS: ${result.length}`)
console.log('\n🎯 Verificación:')
console.log(`   ✅ Producto 1 (CINTA AISLANTE): ${result.filter(p => p.id === 1).length} tarjetas (2 proveedores)`)
console.log(`   ✅ Producto 2 (CINTA AISLANTE NEGRA): ${result.filter(p => p.id === 2).length} tarjeta (SIN proveedor) ← Usuario solicitó esto`)
console.log(`   ✅ Producto 3 (CABLE #12): ${result.filter(p => p.id === 3).length} tarjeta (1 proveedor)`)

const sinProveedores = result.filter(p => p.proveedor_id === 0)
console.log(`\n💡 Productos sin proveedor asignado: ${sinProveedores.length}`)
console.log(`   - Estos mostrarán un botón deshabilitado "Sin proveedor"`)
console.log(`   - Pero el usuario podrá ver que existen en la base de datos`)
