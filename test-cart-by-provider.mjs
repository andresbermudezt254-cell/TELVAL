#!/usr/bin/env node

/**
 * Test: Agregar a carrito - verificar que distingue
 * el mismo producto de diferentes proveedores
 */

// Simular carrito
const cart = {
  items: [],

  addItem(product, cantidad = 1) {
    // Buscar producto existente por ID + proveedor_id
    const existing = this.items.find((i) => 
      i.product.id === product.id && 
      i.product.proveedor_id === product.proveedor_id
    )
    if (existing) {
      existing.cantidad += cantidad
      return
    }
    this.items.push({ product, cantidad })
  },

  totalEstimado() {
    return this.items.reduce(
      (sum, i) => sum + (i.product.precio_unitario ?? 0) * i.cantidad,
      0
    )
  }
}

// Simular agregar el mismo producto de 3 proveedores diferentes
console.log('🛒 PRUEBA DE CARRITO: Agregar CINTA AISLANTE de diferentes proveedores\n')

const product1 = {
  id: 1, nombre: 'CINTA AISLANTE', codigo: '001', 
  proveedor_id: 1, proveedor_nombre: 'Proveedor A (más barato)', 
  precio_unitario: 90
}

const product2 = {
  id: 1, nombre: 'CINTA AISLANTE', codigo: '001',
  proveedor_id: 2, proveedor_nombre: 'Proveedor B',
  precio_unitario: 120
}

const product3 = {
  id: 1, nombre: 'CINTA AISLANTE', codigo: '001',
  proveedor_id: 3, proveedor_nombre: 'Proveedor C',
  precio_unitario: 150
}

console.log('1️⃣ Agregando 5 unidades de Proveedor A ($90 c/u)...')
cart.addItem(product1, 5)
console.log(`   ✓ Agregado. Carrito: ${cart.items.length} item(s)\n`)

console.log('2️⃣ Agregando 3 unidades de Proveedor B ($120 c/u)...')
cart.addItem(product2, 3)
console.log(`   ✓ Agregado. Carrito: ${cart.items.length} item(s)\n`)

console.log('3️⃣ Agregando 2 más del Proveedor A ($90 c/u)...')
cart.addItem(product1, 2)
console.log(`   ✓ Agregado. Carrito: ${cart.items.length} item(s)\n`)

console.log('4️⃣ Agregando 1 unidad de Proveedor C ($150 c/u)...')
cart.addItem(product3, 1)
console.log(`   ✓ Agregado. Carrito: ${cart.items.length} item(s)\n`)

console.log('📋 RESUMEN DEL CARRITO:\n')
cart.items.forEach((item, idx) => {
  const subtotal = item.product.precio_unitario * item.cantidad
  console.log(`${idx + 1}. ${item.product.nombre}`)
  console.log(`   Proveedor:   ${item.product.proveedor_nombre}`)
  console.log(`   Cantidad:    ${item.cantidad} unidades`)
  console.log(`   Unitario:    $${item.product.precio_unitario}`)
  console.log(`   Subtotal:    $${subtotal}`)
  console.log()
})

console.log(`💰 TOTAL ESTIMADO: $${cart.totalEstimado()}`)
console.log('\n✨ Nota: El carrito diferencia el mismo producto de diferentes proveedores 🎯')
