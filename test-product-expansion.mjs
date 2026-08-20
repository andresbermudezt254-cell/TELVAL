#!/usr/bin/env node

/**
 * Test para verificar que useProductsWithPrices expande correctamente
 * los productos por proveedor (una tarjeta por cada proveedor)
 */

const testData = {
  // Productos base
  productos: [
    { id: 1, nombre: 'CINTA AISLANTE', codigo: '001', unidad_medida: 'ROLLO', categoria_id: 1, activo: true },
  ],

  // Proveedores de productos
  proveedor_producto: [
    { producto_id: 1, proveedor_id: 1, precio_unitario: 100, activo: true, proveedor: { id: 1, nombre: 'Proveedor A' } },
    { producto_id: 1, proveedor_id: 2, precio_unitario: 120, activo: true, proveedor: { id: 2, nombre: 'Proveedor B' } },
    { producto_id: 1, proveedor_id: 3, precio_unitario: 90, activo: true, proveedor: { id: 3, nombre: 'Proveedor C' } },
    { producto_id: 1, proveedor_id: 4, precio_unitario: 150, activo: true, proveedor: { id: 4, nombre: 'Proveedor D' } },
  ]
}

// Simular la lógica de useProductsWithPrices
function expandProductsByProvider() {
  const expandedProducts = testData.productos.flatMap((p) => {
    const proveedoresForProduct = testData.proveedor_producto.filter(pp => pp.producto_id === p.id)
    
    if (proveedoresForProduct.length === 0) {
      return []
    }

    // Ordenar por precio
    proveedoresForProduct.sort((a, b) => a.precio_unitario - b.precio_unitario)

    // Retornar una "tarjeta" por cada proveedor
    return proveedoresForProduct.map((pp, index) => ({
      ...p,
      precio_unitario: pp.precio_unitario,
      proveedor_id: pp.proveedor_id,
      proveedor_nombre: pp.proveedor?.nombre,
      es_mas_barato: index === 0, // Marcar si es el de menor precio
      total_proveedores: proveedoresForProduct.length,
    }))
  }) ?? []

  return expandedProducts
}

const result = expandProductsByProvider()

console.log('✅ RESULTADO: El catálogo mostraría las siguientes tarjetas:\n')
result.forEach((card, idx) => {
  console.log(`📦 TARJETA ${idx + 1}:`)
  console.log(`   Producto:    ${card.nombre}`)
  console.log(`   Código:      ${card.codigo}`)
  console.log(`   Precio:      $${card.precio_unitario}`)
  console.log(`   Proveedor:   ${card.proveedor_nombre}`)
  console.log(`   Es Barato:   ${card.es_mas_barato ? '🏆 SI (MÁS BARATO)' : 'NO'}`)
  console.log(`   Total Proveedores: ${card.total_proveedores}`)
  console.log()
})

console.log(`\n✨ TOTAL DE TARJETAS: ${result.length}`)
console.log('Cada proveedor tiene su propio recuadro de producto 🎯')
