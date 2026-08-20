# INFORME TÉCNICO: Problema de Persistencia en Edición de Cantidades de Requisiciones

**Fecha:** 15-Ago-2026  
**Usuario:** Admin  
**Síntoma:** Cuando el administrador cambia la cantidad de un producto (ej: de 5 a 3), el valor no se queda guardado. Al salir de la vista y volver, vuelve a mostrar la cantidad original.

---

## 1. DIAGNÓSTICO DEL PROBLEMA

### 1.1 Flujo de Edición Actual

Cuando presionas el botón **"+"** o **"-"** o escribes directamente en el spinbutton de cantidad:

```
Usuario cambia cantidad
    ↓
persistCantidad() en RequisitionDetailPage.tsx
    ↓
updateCantidadDetalle.mutate({ itemId, requisicionId, cantidad })
    ↓
Hook useUpdateDetalleCantidad()
```

---

## 2. ANÁLISIS DETALLADO DEL CÓDIGO

### 2.1 La Función `useUpdateDetalleCantidad()` 

**Ubicación:** `src/hooks/useRequisitions.ts` (líneas 501-650)

**¿Qué hace?**

1. **onMutate** (antes de enviar al servidor):
   ```typescript
   // Actualiza el cache LOCAL de React Query inmediatamente
   queryClient.setQueryData(['requisition', requisicionId], (old) => {
     return {
       ...old,
       detalles: old.detalles.map((d) => {
         if (d.id === itemId) {
           return { ...d, cantidad: newCantidad, total_linea: unitPrice * newCantidad }
         }
         return d
       })
     }
   })
   ```
   ✅ **Esto es correcto:** Le muestra al usuario el cambio inmediatamente.

2. **mutationFn** (envía al servidor):
   ```typescript
   // 1. Actualiza detalle_requisicion (cantidad y total_linea)
   await supabase
     .from('detalle_requisicion')
     .update({ cantidad, total_linea })
     .eq('id', itemId)
   
   // 2. Lee TODOS los detalles de esa requisición
   const { data: detalles } = await supabase
     .from('detalle_requisicion')
     .select('...')
     .eq('requisicion_id', requisicionId)
   
   // 3. Recalcula el total_estimado AQUÍ (no en la base)
   const totalEstimado = detalles.reduce((sum, d) => sum + d.total_linea, 0)
   
   // 4. Actualiza requisiciones.total_estimado
   await supabase
     .from('requisiciones')
     .update({ total_estimado: totalEstimado })
     .eq('id', requisicionId)
   ```
   ✅ **Esto es correcto:** Persiste el cambio en la base de datos.

3. **onSuccess** (después de que el servidor responde):
   ```typescript
   // Actualiza el cache manualmente con los datos del servidor
   queryClient.setQueryData(['requisition', requisicionId], (old) => {
     return { ...old, total_estimado: result.total_estimado, detalles: updatedDetalles }
   })
   
   // ⚠️ PROBLEMA: Luego invalida la query
   queryClient.invalidateQueries({ queryKey: ['requisition', vars.requisicionId] })
   queryClient.invalidateQueries({ queryKey: ['requisition'] })
   queryClient.invalidateQueries({ queryKey: ['requisitions'] })
   queryClient.invalidateQueries({ queryKey: ['order-summary'] })
   ```
   ❌ **AQUÍ ESTÁ EL PROBLEMA PRINCIPAL**

---

## 3. EL PROBLEMA RAÍZ

### 3.1 Invalidación Prematura de Cache

**El flujo problemático es:**

```
1. Usuario cambia cantidad: 5 → 3
   ✓ UI actualiza inmediatamente (onMutate)

2. Se envía al servidor y SE GUARDA EN LA BASE DE DATOS ✓
   - detalle_requisicion.cantidad = 3 ✓
   - requisiciones.total_estimado = actualizado ✓

3. onSuccess() actualiza el cache MANUALMENTE
   ✓ queryClient.setQueryData() actualiza con el valor correcto (3)

4. ❌ PROBLEMA: Luego invalida la query
   queryClient.invalidateQueries({ queryKey: ['requisition', id] })
   
   Esto marca el cache como "stale" (obsoleto)

5. Como staleTime = 0 (siempre vencido), React Query hace un REFETCH automático
   
6. ❌ En ese momento, si hay un lag o timing issue:
   - El servidor AÚN no tiene el valor completamente propagado
   - O hay un listener de Realtime que está reenviando datos viejos
   - UI muestra el valor ORIGINAL (5) nuevamente ❌
```

---

## 4. FACTORES QUE EMPEORAN EL PROBLEMA

### 4.1 Configuración Agresiva de React Query

En `useRequisitionById()`:

```typescript
queryKey: ['requisition', id],
staleTime: 0,           // ← Siempre considera datos como "vencidos"
gcTime: 0,              // ← Limpia cache muy rápido
refetchOnMount: true,   // ← Refetch cuando se monta el componente
refetchOnWindowFocus: false,
refetchOnReconnect: true, // ← Refetch cuando se reconecta internet
```

✅ **staleTime: 0** es correcto para datos dinámicos.  
❌ **Pero combined con invalidateQueries(), causa demasiadas revalidaciones.**

### 4.2 Suscripciones en Tiempo Real (AppLayout.tsx)

```typescript
.on(
  'postgres_changes',
  { event: '*', schema: 'public', table: 'detalle_requisicion' },
  () => {
    queryClient.invalidateQueries({ queryKey: ['requisitions'] })
    queryClient.invalidateQueries({ queryKey: ['order-summary'] })
  }
)
```

⚠️ **¿Qué pasa?**  
Cuando cambias cantidad en **detalle_requisicion**, Supabase Realtime notifica a TODOS los clientes.  
Cada cliente invalida sus queries.  
Si tu propia actualización llega a Realtime antes de que se complete todo, puede triggear una revalidación con datos parcialmente actualizados.

### 4.3 Posible Race Condition

```
Momento T0:  Usuario cambia: 5 → 3
Momento T1:  Se manda request al servidor ✓
Momento T2:  onMutate actualiza cache LOCAL a 3 ✓ (UI muestra 3)
Momento T3:  El servidor guarda: detalle.cantidad = 3 ✓
Momento T4:  El servidor lee TODOS los detalles (para recalcular)
Momento T5:  Supabase Realtime notifica a TODOS los clientes
            "Cambió detalle_requisicion"
Momento T6:  Tu cliente recibe Realtime event y también tu onSuccess()
            Ambos hacen cosas SIMULTÁNEAMENTE
Momento T7:  Uno de ellos invalida la query
Momento T8:  React Query hace refetch AUTOMÁTICO de la base
Momento T9:  ❌ Traer datos viejos si en la base hay lag o si otro listener
            recuperó el estado anterior
```

---

## 5. POR QUÉ SE VE COMO QUE "LA BASE REGRESA EL VALOR"

El usuario observa:

> "Cambio de 5 a 3, pero cuando salgo de la vista y vuelvo, vuelve a 5"

**La realidad:**

1. **NO es que la base de datos revierte el valor.**
2. **Es que React Query invalida y refetch trae un valor que no está completamente sincronizado.**
3. **O bien, hay un listener que está reenviando datos del estado anterior de sesión.**

---

## 6. TABLA COMPARATIVA: LO QUE ESTÁ MAL vs. LO CORRECTO

| Aspecto | ACTUAL (MAL) | DESEADO (CORRECTO) |
|---------|--------------|-------------------|
| **Actualización en BD** | ✓ Se guarda | ✓ Se guarda |
| **Actualización en cache** | ✓ Se actualiza en onMutate | ✓ Se actualiza en onMutate |
| **Invalidación post-update** | ❌ Invalida todo luego | ⚠️ **No debería invalidar,<br/>solo setQueryData** |
| **Refetch automático** | ❌ Sí, causa revert | ❌ No, no es necesario |
| **Realtime listeners** | ❌ Puede trigger invalidación | ✓ O se desactiva para edits propios<br/>O se ignora durante edit |
| **Persistencia** | ❌ Inestable | ✓ Garantizada |

---

## 7. SOLUCIÓN RECOMENDADA

### 7.1 Opción 1: REMOVER invalidateQueries en onSuccess()

**Cambio en `useUpdateDetalleCantidad()`:**

```typescript
onSuccess: (result, vars) => {
  // ✅ Solo actualizar el cache, SIN invalidar
  queryClient.setQueryData(['requisition', vars.requisicionId], (old) => {
    if (!old) return old
    return {
      ...old,
      total_estimado: result.total_estimado,
      detalles: old.detalles.map((d) => 
        d.id === vars.itemId 
          ? { ...d, cantidad: result.cantidad, total_linea: result.total_linea }
          : d
      )
    }
  })
  
  // ✅ Actualizar lista de requisiciones (sin invalidar)
  queryClient.setQueryData(['requisitions'], (old) => {
    if (!old) return old
    if (Array.isArray(old)) {
      return old.map((req) => 
        req.id === vars.requisicionId 
          ? { ...req, total_estimado: result.total_estimado }
          : req
      )
    }
    return old
  })
  
  // ✅ NO invalidar aquí
  // queryClient.invalidateQueries(...)
  
  toast.success('Cantidad actualizada')
}
```

**Ventaja:** El cache se actualiza pero NO se invalida, evitando refetch automático.

### 7.2 Opción 2: Cambiar staleTime en useRequisitionById()

```typescript
staleTime: 1000 * 60 * 5,  // 5 minutos
gcTime: 1000 * 60 * 10,    // 10 minutos
refetchOnMount: false,      // NO refetch al montar
```

**Ventaja:** El cache dura más tiempo, menos refetches.  
**Desventaja:** Si otro admin edita la misma requisición, tu vista no se actualiza automáticamente.

### 7.3 Opción 3: Desactivar Realtime listeners para edits propios

En `AppLayout.tsx`, agregar lógica para NO invalidar si el cambio viene de ti mismo:

```typescript
.on('postgres_changes', 
  { event: '*', schema: 'public', table: 'detalle_requisicion' },
  (payload) => {
    // Solo invalidar si NO es mi propia edición
    if (payload.new.updated_at !== myLastUpdateTime) {
      queryClient.invalidateQueries({ queryKey: ['requisitions'] })
    }
  }
)
```

---

## 8. RECOMENDACIÓN FINAL

**Implementar Opción 1 + Opción 2:**

```typescript
// useRequisitions.ts - useUpdateDetalleCantidad()
onSuccess: (result, vars) => {
  // Solo setQueryData, SIN invalidateQueries
  queryClient.setQueryData(['requisition', vars.requisicionId], (old) => {
    // ... actualizar cache manualmente ...
  })
  toast.success('Cantidad actualizada')
}

// useRequisitions.ts - useRequisitionById()
staleTime: 1000 * 60 * 5,  // 5 minutos
gcTime: 1000 * 60 * 10,    // 10 minutos
refetchOnMount: false,      // NO refetch al entrar
```

**Resultado:**
- ✅ La cantidad se actualiza en la base de datos
- ✅ La cantidad se mantiene en la UI
- ✅ NO hay revert inexplicable
- ✅ Cache dura 5 minutos (suficiente para casos normales)
- ✅ Si otro admin edita, tu cache se invalida en 5 minutos máximo

---

## 9. VERIFICACIÓN

Para confirmar que está funcionando:

1. Entra a una requisición en admin
2. Cambia cantidad: 5 → 3
3. **NO SALGAS** de la vista
4. Abre DevTools → Network → revisa que se hizo 1 solo request UPDATE
5. Verifica en Supabase (SQL Editor) que `detalle_requisicion.cantidad = 3`
6. Sal y vuelve a entrar
7. **Debería mostrar 3 ahora**

Si sigue mostrando 5 después de salir y entrar:
- El problema es el refetch automático
- Necesitas revisar `staleTime` y `gcTime`
- Verifica que `onSuccess` NO está invalidando queries

---

## 10. CÓDIGO QUE NECESITA CAMBIOS

**Archivo:** `src/hooks/useRequisitions.ts`

**Cambios:**

1. **useRequisitionById()** (línea 88):
   ```typescript
   - staleTime: 0,
   + staleTime: 1000 * 60 * 5,
   
   - gcTime: 0,
   + gcTime: 1000 * 60 * 10,
   
   - refetchOnMount: true,
   + refetchOnMount: false,
   ```

2. **useUpdateDetalleCantidad()** (línea 615):
   ```typescript
   // Remover estas líneas:
   - queryClient.invalidateQueries({ queryKey: ['requisition', vars.requisicionId] })
   - queryClient.invalidateQueries({ queryKey: ['requisition'] })
   - queryClient.invalidateQueries({ queryKey: ['requisitions'] })
   - queryClient.invalidateQueries({ queryKey: ['order-summary'] })
   ```

---

## CONCLUSIÓN

**NO es un problema de la base de datos.**  
**Es un problema de cómo React Query maneja el cache y los refetches automáticos.**

El fix es simple: **dejar de invalidar y solo actualizar manualmente el cache**.

