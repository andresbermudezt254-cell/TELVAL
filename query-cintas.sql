-- Consulta para ver TODOS los productos con "cinta" y sus proveedores
SELECT 
  p.id,
  p.nombre,
  p.codigo,
  COUNT(pp.proveedor_id) as total_proveedores,
  STRING_AGG(prov.nombre || ' ($' || pp.precio_unitario || ')', ', ' ORDER BY pp.precio_unitario) as proveedores
FROM productos p
LEFT JOIN proveedor_producto pp ON pp.producto_id = p.id AND pp.activo = true
LEFT JOIN proveedores prov ON prov.id = pp.proveedor_id
WHERE LOWER(p.nombre) LIKE '%cinta%' AND p.activo = true
GROUP BY p.id, p.nombre, p.codigo
ORDER BY p.nombre;

-- Verificación: Todos los productos con proveedor_producto
-- SELECT 
--   p.id, 
--   p.nombre, 
--   pp.proveedor_id, 
--   prov.nombre, 
--   pp.precio_unitario
-- FROM productos p
-- LEFT JOIN proveedor_producto pp ON pp.producto_id = p.id
-- LEFT JOIN proveedores prov ON prov.id = pp.proveedor_id
-- WHERE LOWER(p.nombre) LIKE '%cinta%'
-- ORDER BY p.nombre, pp.precio_unitario;
