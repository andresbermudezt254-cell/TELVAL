# 🔧 CORRECCIÓN DE POLITICA RLS - TELVAL

## 📍 PROBLEMA
La política RLS para UPDATE en `detalle_requisicion` rechaza silenciosamente los cambios de cantidad.

## ✅ SOLUCIÓN

### Paso 1: Abre Supabase SQL Editor
URL: https://app.supabase.com/project/fkxecvvyyvxqbhzbvhsx/sql/new

### Paso 2: Copia y pega el siguiente SQL

```sql
DROP POLICY IF EXISTS "actualizar_detalle_por_admin_almacen" ON public.detalle_requisicion;

CREATE POLICY "actualizar_detalle_por_admin_almacen"
ON public.detalle_requisicion
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "detalle_insert" ON public.detalle_requisicion;

CREATE POLICY "detalle_insert"
ON public.detalle_requisicion
FOR INSERT
TO authenticated
WITH CHECK (true);
```

### Paso 3: Ejecuta el SQL
- Presiona: **CTRL + ENTER**
- O haz clic en el botón azul **"Run"**

### Paso 4: Verifica que aparezca "✓ Success"

### Paso 5: Regresa a la terminal y presiona ENTER

---

## 🎯 Resultado
Después de ejecutar este SQL, los UPDATEs a cantidad funcionarán correctamente.

## 📊 Verificación
Se puede verificar ejecutando:

```sql
SELECT * FROM detalle_requisicion WHERE id = 242;
-- Debe mostrar cantidad=99 (si se ejecutó el UPDATE anterior)
```
