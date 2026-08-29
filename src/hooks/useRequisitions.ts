import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { Requisicion, NuevaRequisicionForm } from '@/types'
import { toast } from 'sonner'

export function useRequisitions(filters?: {
  estado?: string | string[]
  categoria?: string | string[]
  especialidad?: string
  empleadoId?: string
  page?: number
}) {
  const user = useAuthStore((s) => s.user)
  const page = filters?.page !== undefined ? filters.page + 1 : 1
  const pageSize = 20

  return useQuery({
    queryKey: ['requisitions', filters, user?.rol],
    queryFn: async () => {
      let query = supabase
        .from('requisiciones')
        .select(`
          *,
          empleado:usuarios!empleado_id(id, nombre_completo, email, especialidad),
          proveedor_final:proveedores!proveedor_final_id(id, nombre),
          detalles:detalle_requisicion(id, completado)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1)

      if (user?.rol === 'empleado') {
        query = query.eq('empleado_id', user.id)
      }
      if (filters?.estado) {
        if (Array.isArray(filters.estado)) query = query.in('estado', filters.estado)
        else query = query.eq('estado', filters.estado)
      }
      if (filters?.categoria) {
        if (Array.isArray(filters.categoria)) query = query.in('categoria', filters.categoria)
        else query = query.eq('categoria', filters.categoria)
      }
      if (filters?.especialidad) query = query.eq('especialidad', filters.especialidad)
      if (filters?.empleadoId) query = query.eq('empleado_id', filters.empleadoId)

      const { data, error, count } = await query
      if (error) throw error
      return { data: (data ?? []) as unknown as Requisicion[], count: count ?? 0 }
    },
    enabled: !!user,
  })
}

export function useRequisitionById(id?: number) {
  return useQuery({
    queryKey: ['requisition', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('requisiciones')
        .select(`
          *,
          empleado:usuarios!empleado_id(id, nombre_completo, email, especialidad, whatsapp),
          admin:usuarios!admin_id(id, nombre_completo),
          proveedor_final:proveedores!proveedor_final_id(id, nombre, whatsapp, contacto_nombre),
          detalles:detalle_requisicion(
            id, requisicion_id, producto_id, proveedor_sugerido_id, cantidad,
            precio_unitario, total_linea, notas, item_ppto, item_sinco_adpro, unidad_medida_item, created_at,
            completado, completado_at, completado_por,
            producto:productos(id, codigo, nombre, unidad_medida, categoria_id),
            proveedor_sugerido:proveedores!proveedor_sugerido_id(id, nombre, whatsapp, codigo_interno)
          ),
          historial:historial_requisicion(
            id, requisicion_id, estado_anterior, estado_nuevo, usuario_id, comentario, created_at,
            usuario:usuarios(id, nombre_completo)
          )
        `)
        .eq('id', id!)
        .single()
      if (error) throw error
      return (data ?? null) as unknown as Requisicion | null
    },
    enabled: !!id,
    staleTime: 0,
    gcTime: 1000 * 60 * 10,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  })
}

function generarCodigoReq(): string {
  const now = new Date()
  const yy = String(now.getFullYear()).slice(-2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase()
  return `REQ-${yy}${mm}-${rand}`
}

export function useSaveDraftRequisition() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async (form: NuevaRequisicionForm & { items: Array<{ producto_id: number; cantidad: number; notas?: string }> }) => {
      if (!user) throw new Error('Usuario no autenticado')

      const productIds = form.items.map((i) => i.producto_id)
      const { data: bestPrices } = await supabase
        .from('mejor_proveedor_por_producto')
        .select('*')
        .in('producto_id', productIds)
        .eq('ranking', 1)

      const priceMap = new Map<number, { precio_unitario?: number | null; producto_id?: number; proveedor_id?: number }>()
      ;(bestPrices ?? []).forEach((b: { producto_id?: number; precio_unitario?: number | null; proveedor_id?: number }) => {
        if (typeof b.producto_id === 'number') priceMap.set(b.producto_id, b)
      })
      const totalEstimado = form.items.reduce((sum, item) => {
        const best = priceMap.get(item.producto_id)
        return sum + Number(best?.precio_unitario ?? 0) * Number(item.cantidad)
      }, 0)

      const { data: existingDraft } = await supabase
        .from('requisiciones')
        .select('id, codigo')
        .eq('empleado_id', user.id)
        .eq('estado', 'BORRADOR')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const reqId = existingDraft?.id
      const codigo = existingDraft?.codigo ?? `BORRADOR-${Date.now()}`

      const { data: req, error: reqError } = await supabase
        .from('requisiciones')
        .upsert({
          id: reqId,
          codigo,
          empleado_id: user.id,
          especialidad: form.especialidad,
          numero_aviso: form.numero_aviso,
          punto: form.punto,
          categoria: form.categoria,
          fecha_maxima_entrega: form.fecha_maxima_entrega || null,
          item_ppto: form.item_ppto || null,
          notas_empleado: form.notas_empleado || null,
          total_estimado: totalEstimado,
          estado: 'BORRADOR',
        }, { onConflict: 'id' })
        .select()
        .single()

      if (reqError) throw reqError

      if (req.id) {
        const { error: deleteError } = await supabase
          .from('detalle_requisicion')
          .delete()
          .eq('requisicion_id', req.id)
        if (deleteError) throw deleteError
      }

      const detalles = form.items.map((item) => {
        const best = priceMap.get(item.producto_id)
        return {
          requisicion_id: req.id,
          producto_id: item.producto_id,
          cantidad: item.cantidad,
          notas: item.notas || null,
          item_ppto: item.item_ppto || null,
          item_sinco_adpro: item.item_sinco_adpro || null,
          unidad_medida_item: item.unidad_medida_item || null,
          proveedor_sugerido_id: best?.proveedor_id ?? null,
          precio_unitario: best?.precio_unitario ?? null,
        }
      })

      const { error: detError } = await supabase
        .from('detalle_requisicion')
        .insert(detalles)
      if (detError) throw detError

      return req as unknown as Requisicion
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['draft-requisition'] })
      await queryClient.invalidateQueries({ queryKey: ['requisitions'], refetchType: 'all' })
      toast.success('Borrador guardado correctamente')
    },
    onError: (err) => {
      toast.error('Error al guardar el borrador: ' + (err as Error).message)
    },
  })
}

export function useDraftRequisition() {
  const user = useAuthStore((s) => s.user)

  return useQuery({
    queryKey: ['draft-requisition', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('requisiciones')
        .select(`
          *,
          detalles:detalle_requisicion(
            id,
            requisicion_id,
            producto_id,
            cantidad,
            notas,
            precio_unitario,
            proveedor_sugerido_id,
            producto:productos(id, codigo, nombre, unidad_medida, categoria_id, precio_minimo)
          )
        `)
        .eq('empleado_id', user!.id)
        .eq('estado', 'BORRADOR')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') throw error
      return (data ?? null) as unknown as Requisicion | null
    },
  })
}

export function useCreateRequisition() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async (form: NuevaRequisicionForm & { items: Array<{ producto_id: number; cantidad: number; notas?: string }> }) => {
      const productIds = form.items.map((i) => i.producto_id)
      const { data: bestPrices } = await supabase
        .from('mejor_proveedor_por_producto')
        .select('*')
        .in('producto_id', productIds)
        .eq('ranking', 1)

      const priceMap = new Map<number, { precio_unitario?: number | null; producto_id?: number; proveedor_id?: number }>()
      ;(bestPrices ?? []).forEach((b: { producto_id?: number; precio_unitario?: number | null; proveedor_id?: number }) => {
        if (typeof b.producto_id === 'number') priceMap.set(b.producto_id, b)
      })

      const totalEstimado = form.items.reduce((sum, item) => {
        const best = priceMap.get(item.producto_id)
        return sum + Number(best?.precio_unitario ?? 0) * Number(item.cantidad)
      }, 0)

      const { data: existingDraft } = await supabase
        .from('requisiciones')
        .select('id, codigo')
        .eq('empleado_id', user!.id)
        .eq('estado', 'BORRADOR')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const reqId = existingDraft?.id
      const codigo = existingDraft?.codigo ?? generarCodigoReq()

      const { data: req, error: reqError } = await supabase
        .from('requisiciones')
        .upsert({
          id: reqId,
          codigo,
          empleado_id: user!.id,
          especialidad: form.especialidad,
          numero_aviso: form.numero_aviso,
          punto: form.punto,
          categoria: form.categoria,
          fecha_maxima_entrega: form.fecha_maxima_entrega || null,
          item_ppto: form.item_ppto || null,
          notas_empleado: form.notas_empleado || null,
          total_estimado: totalEstimado,
          estado: 'PENDIENTE',
        }, { onConflict: 'id' })
        .select()
        .single()

      if (reqError) throw reqError

      if (req.id) {
        const { error: deleteError } = await supabase
          .from('detalle_requisicion')
          .delete()
          .eq('requisicion_id', req.id)
        if (deleteError) throw deleteError
      }

      const detalles = form.items.map((item) => {
        const best = priceMap.get(item.producto_id)
        return {
          requisicion_id: req.id,
          producto_id: item.producto_id,
          cantidad: item.cantidad,
          notas: item.notas || null,
          item_ppto: item.item_ppto || null,
          item_sinco_adpro: item.item_sinco_adpro || null,
          unidad_medida_item: item.unidad_medida_item || null,
          proveedor_sugerido_id: best?.proveedor_id ?? null,
          precio_unitario: best?.precio_unitario ?? null,
        }
      })

      const { error: detError } = await supabase
        .from('detalle_requisicion')
        .insert(detalles)
      if (detError) throw detError

      const { data: admins } = await supabase
        .from('usuarios')
        .select('id')
        .eq('rol', 'admin')
        .eq('activo', true)

      if (admins?.length) {
        const adminRows = (admins ?? []) as Array<{ id?: string }>
        await supabase.from('notificaciones').insert(
          adminRows
            .filter((a) => typeof a.id === 'string')
            .map((a) => ({
              usuario_id: a.id as string,
              requisicion_id: req.id,
              tipo: 'info',
              titulo: '📋 Nueva requisición',
              mensaje: `${user!.nombre_completo || 'Un empleado'} envió la requisición ${req.codigo}`,
            }))
        )
      }

      return req as unknown as Requisicion
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['draft-requisition'] })
      await queryClient.invalidateQueries({ queryKey: ['requisitions'], refetchType: 'all' })
      await queryClient.invalidateQueries({ queryKey: ['order-summary'] })
      toast.success('Requisición enviada exitosamente')
    },
    onError: (err) => {
      toast.error('Error al crear la requisición: ' + (err as Error).message)
    },
  })
}

export function useUpdateRequisitionStatus() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async ({
      id,
      estado,
      notas_admin,
    }: {
      id: number
      estado: string
      notas_admin?: string
    }) => {
      const updates: Record<string, unknown> = { estado }
      if (notas_admin !== undefined) updates.notas_admin = notas_admin
      if (estado === 'APROBADA') {
        updates.admin_id = user!.id
        updates.fecha_aprobacion = new Date().toISOString()
      }

      const { data: prev } = await supabase
        .from('requisiciones')
        .select('estado')
        .eq('id', id)
        .single()

      const { error } = await supabase
        .from('requisiciones')
        .update(updates)
        .eq('id', id)
      if (error) throw error

      // Note: historial_requisicion would be logged here if needed
      // State change is persisted in requisiciones table with notas_admin

      // Notificar al empleado del cambio de estado
      const { data: reqData } = await supabase
        .from('requisiciones')
        .select('empleado_id, codigo')
        .eq('id', id)
        .single()

      if (reqData) {
        const notifMap: Record<string, { titulo: string; mensaje: string; tipo: string }> = {
          EN_REVISION: { tipo: 'info',    titulo: '🔍 En revisión',  mensaje: `Tu requisición ${reqData.codigo} está siendo revisada` },
          APROBADA:    { tipo: 'success', titulo: '✅ Aprobada',      mensaje: `Tu requisición ${reqData.codigo} fue aprobada` },
          RECHAZADA:   { tipo: 'error',   titulo: '❌ Rechazada',     mensaje: `Tu requisición ${reqData.codigo} fue rechazada${notas_admin ? ': ' + notas_admin : ''}` },
          EN_COMPRA:   { tipo: 'info',    titulo: '🛒 En compra',     mensaje: `Tu requisición ${reqData.codigo} está en proceso de compra` },
          COMPLETADA:  { tipo: 'success', titulo: '📦 Completada',    mensaje: `Tu requisición ${reqData.codigo} fue completada y entregada` },
        }
        const notif = notifMap[estado]
        if (notif) {
          await supabase.from('notificaciones').insert({
            usuario_id: reqData.empleado_id,
            requisicion_id: id,
            tipo: notif.tipo,
            titulo: notif.titulo,
            mensaje: notif.mensaje,
          })
        }
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['requisitions'] })
      queryClient.invalidateQueries({ queryKey: ['requisition', vars.id] })
      queryClient.invalidateQueries({ queryKey: ['order-summary'] })
      toast.success('Estado actualizado')
    },
    onError: () => toast.error('Error al actualizar el estado'),
  })
}

export function useMarcarItemCompletado() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async ({ itemId, requisicionId, completado }: { itemId: number; requisicionId: number; completado: boolean }) => {
      const { data: reqPrev } = await supabase
        .from('requisiciones')
        .select('estado, codigo, empleado_id, admin_id')
        .eq('id', requisicionId)
        .single()

      const { error } = await supabase
        .from('detalle_requisicion')
        .update({
          completado,
          completado_at: completado ? new Date().toISOString() : null,
          completado_por: completado ? user!.id : null,
        })
        .eq('id', itemId)
      if (error) throw error

      // Recalculate requisicion estado based on item completion
      const { data: items } = await supabase
        .from('detalle_requisicion')
        .select('completado')
        .eq('requisicion_id', requisicionId)

      if (items && items.length > 0) {
        const total = items.length
        const completados = items.filter((i) => i.completado).length

        let nuevoEstado: 'EN_COMPRA' | 'PARCIAL' | 'COMPLETADA' = 'EN_COMPRA'
        if (completados === total) {
          nuevoEstado = 'COMPLETADA'
        } else if (completados > 0) {
          nuevoEstado = 'PARCIAL'
        }

        const { error: estadoError } = await supabase
          .from('requisiciones')
          .update({ estado: nuevoEstado })
          .eq('id', requisicionId)
        if (estadoError) throw estadoError

        await supabase.from('historial_requisicion').insert({
          requisicion_id: requisicionId,
          usuario_id: user!.id,
          estado_anterior: reqPrev?.estado,
          estado_nuevo: nuevoEstado,
          comentario: `Ítem ${itemId} ${completado ? 'marcado como recibido' : 'desmarcado'}. ${completados}/${total} recibidos.`,
        })

        if (reqPrev?.empleado_id) {
          const titulo = nuevoEstado === 'COMPLETADA'
            ? `Requisición ${reqPrev.codigo} completada`
            : `Requisición ${reqPrev.codigo} parcial`
          const mensaje = nuevoEstado === 'COMPLETADA'
            ? 'Todos los materiales fueron entregados en almacén.'
            : `${completados} de ${total} materiales han llegado.`

          const notifications = [
            {
              usuario_id: reqPrev.empleado_id,
              requisicion_id: requisicionId,
              tipo: nuevoEstado === 'COMPLETADA' ? 'success' : 'info',
              titulo,
              mensaje,
            },
          ]

          if (reqPrev.admin_id) {
            notifications.push({
              usuario_id: reqPrev.admin_id,
              requisicion_id: requisicionId,
              tipo: nuevoEstado === 'COMPLETADA' ? 'success' : 'info',
              titulo,
              mensaje,
            })
          }

          await supabase.from('notificaciones').insert(notifications)
        }
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['requisition', vars.requisicionId] })
      queryClient.invalidateQueries({ queryKey: ['requisitions'] })
      queryClient.invalidateQueries({ queryKey: ['order-summary'] })
    },
    onError: () => { toast.error('Error al actualizar el ítem') },
  })
}

export function useUpdateDetalleCantidad() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ itemId, requisicionId, cantidad }: { itemId: number; requisicionId: number; cantidad: number }) => {
      console.log(`[useUpdateDetalleCantidad] Iniciando UPDATE: itemId=${itemId}, cantidad=${cantidad}`)
      
      const { data: item, error: itemError } = await supabase
        .from('detalle_requisicion')
        .select('id, precio_unitario, cantidad, total_linea')
        .eq('id', itemId)
        .single()
      if (itemError) {
        console.error('[useUpdateDetalleCantidad] Error al obtener item:', itemError)
        throw itemError
      }

      const unitPrice = Number(item.precio_unitario ?? 0)
      const normalizedCantidad = Number(cantidad)
      const nextTotalLinea = unitPrice > 0 ? unitPrice * normalizedCantidad : Number(item.total_linea ?? 0)

      const updates: Record<string, unknown> = { cantidad: normalizedCantidad, total_linea: nextTotalLinea }

      console.log('[useUpdateDetalleCantidad] Ejecutando UPDATE con:', updates)
      const { error: updateError } = await supabase
        .from('detalle_requisicion')
        .update(updates)
        .eq('id', itemId)
      if (updateError) {
        console.error('[useUpdateDetalleCantidad] Error al actualizar detalle:', updateError)
        throw updateError
      }
      console.log('[useUpdateDetalleCantidad] UPDATE completado exitosamente')

      const { data: detalles, error: detallesError } = await supabase
        .from('detalle_requisicion')
        .select('id, cantidad, precio_unitario, total_linea')
        .eq('requisicion_id', requisicionId)
      if (detallesError) throw detallesError

      const totalEstimado = (detalles ?? []).reduce((sum, d) => {
        const linea = d.total_linea !== null && d.total_linea !== undefined
          ? Number(d.total_linea)
          : Number(d.precio_unitario ?? 0) * Number(d.cantidad)
        return sum + linea
      }, 0)

      const { error: reqError } = await supabase
        .from('requisiciones')
        .update({ total_estimado: totalEstimado })
        .eq('id', requisicionId)
      if (reqError) throw reqError

      return {
        requisicionId,
        itemId,
        cantidad: normalizedCantidad,
        precio_unitario: unitPrice,
        total_linea: nextTotalLinea,
        total_estimado: totalEstimado,
      }
    },
    onMutate: async ({ itemId, requisicionId, cantidad }) => {
      const previous = queryClient.getQueryData(['requisition', requisicionId]) as any

      queryClient.setQueryData(['requisition', requisicionId], (old: any) => {
        if (!old || !Array.isArray(old.detalles)) return old
        return {
          ...old,
          total_estimado: Number(old.total_estimado ?? 0),
          detalles: old.detalles.map((d: any) => {
            if (d.id !== itemId) return d
            const unitPrice = Number(d.precio_unitario ?? 0)
            const nextCantidad = Number(cantidad)
            return {
              ...d,
              cantidad: nextCantidad,
              total_linea: unitPrice > 0 ? unitPrice * nextCantidad : Number(d.total_linea ?? 0),
            }
          }),
        }
      })

      return { previous }
    },
    onSuccess: async (result, vars) => {
      queryClient.setQueryData(['requisition', vars.requisicionId], (old: any) => {
        if (!old || !Array.isArray(old.detalles)) return old
        const detalles = old.detalles.map((d: any) => {
          if (d.id !== vars.itemId) return d
          return {
            ...d,
            cantidad: result.cantidad,
            precio_unitario: result.precio_unitario,
            total_linea: result.total_linea,
          }
        })
        return { ...old, total_estimado: result.total_estimado, detalles }
      })

      queryClient.setQueryData(['requisitions'], (old: any) => {
        if (!old) return old
        if (Array.isArray(old)) {
          return old.map((req: any) => req.id === vars.requisicionId ? { ...req, total_estimado: result.total_estimado } : req)
        }
        if (old && typeof old === 'object' && 'data' in old && Array.isArray(old.data)) {
          return {
            ...old,
            data: old.data.map((req: any) => req.id === vars.requisicionId ? { ...req, total_estimado: result.total_estimado } : req),
          }
        }
        return old
      })

      queryClient.setQueriesData({ queryKey: ['order-summary'] }, (old: any) => {
        if (!old) return old
        if (!Array.isArray(old)) return old
        return old.map((row: any) => {
          if (row.id !== vars.itemId) return row
          return {
            ...row,
            cantidad: result.cantidad,
            precio_unitario: result.precio_unitario,
            total_linea: Number(result.total_linea ?? 0),
            requisicion: row.requisicion ? { ...row.requisicion, total_estimado: result.total_estimado } : row.requisicion,
          }
        })
      })

      await queryClient.invalidateQueries({ queryKey: ['requisition', vars.requisicionId], refetchType: 'all' })
      await queryClient.invalidateQueries({ queryKey: ['requisitions'], refetchType: 'all' })
      await queryClient.invalidateQueries({ queryKey: ['order-summary'], refetchType: 'all' })

      toast.success('Cantidad actualizada')
    },
    onError: (error, vars, context: any) => {
      console.error('[useUpdateDetalleCantidad] ERROR en mutation:', error)
      console.error('[useUpdateDetalleCantidad] Variables:', vars)
      if (context?.previous) {
        console.log('[useUpdateDetalleCantidad] Restaurando datos anteriores...')
        queryClient.setQueryData(['requisition', vars.requisicionId], context.previous)
      }
      const message = error?.message || 'Error al actualizar la cantidad del insumo'
      toast.error(`Error: ${message}`)
    },
  })
}

export function useUpdateDetalleProveedor() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ itemId, requisicionId, proveedorId }: { itemId: number; requisicionId: number; proveedorId: number | null }) => {
      const { error } = await supabase
        .from('detalle_requisicion')
        .update({ proveedor_sugerido_id: proveedorId })
        .eq('id', itemId)
      if (error) throw error
    },
    onSuccess: (_, vars) => {
      queryClient.setQueryData(['requisition', vars.requisicionId], (old: any) => {
        if (!old || !Array.isArray(old.detalles)) return old
        return {
          ...old,
          detalles: old.detalles.map((d: any) => {
            if (d.id !== vars.itemId) return d
            return { ...d, proveedor_sugerido_id: vars.proveedorId }
          }),
        }
      })

      queryClient.invalidateQueries({ queryKey: ['requisition', vars.requisicionId], refetchType: 'all' })
      queryClient.invalidateQueries({ queryKey: ['requisitions'], refetchType: 'all' })
      queryClient.invalidateQueries({ queryKey: ['order-summary'], refetchType: 'all' })
      toast.success('Proveedor actualizado')
    },
    onError: () => { toast.error('Error al cambiar el proveedor del insumo') },
  })
}

export function useDeleteDetalleRequisicion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ itemId, requisicionId }: { itemId: number; requisicionId: number }) => {
      const { error: deleteError } = await supabase
        .from('detalle_requisicion')
        .delete()
        .eq('id', itemId)
      if (deleteError) throw deleteError

      const { data: detalles, error: selectError } = await supabase
        .from('detalle_requisicion')
        .select('id, cantidad, precio_unitario, total_linea')
        .eq('requisicion_id', requisicionId)
      if (selectError) throw selectError

      const totalEstimado = (detalles ?? []).reduce((sum, d) => {
        const linea = d.total_linea !== null && d.total_linea !== undefined
          ? Number(d.total_linea)
          : Number(d.precio_unitario ?? 0) * Number(d.cantidad)
        return sum + linea
      }, 0)

      const { error: updateError } = await supabase
        .from('requisiciones')
        .update({ total_estimado: totalEstimado })
        .eq('id', requisicionId)
      if (updateError) throw updateError

      return { itemId, requisicionId, total_estimado: totalEstimado }
    },
    onSuccess: (result, vars) => {
      queryClient.setQueryData(['requisition', vars.requisicionId], (old: any) => {
        if (!old || !Array.isArray(old.detalles)) return old
        return {
          ...old,
          total_estimado: result.total_estimado,
          detalles: old.detalles.filter((d: any) => d.id !== vars.itemId),
        }
      })

      queryClient.invalidateQueries({ queryKey: ['requisition', vars.requisicionId], refetchType: 'all' })
      queryClient.invalidateQueries({ queryKey: ['requisitions'], refetchType: 'all' })
      queryClient.invalidateQueries({ queryKey: ['order-summary'], refetchType: 'all' })
      toast.success('Insumo eliminado de la requisición')
    },
    onError: () => { toast.error('Error al eliminar el insumo') },
  })
}

export function useDeleteRequisition() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (requisicionId: number) => {
      const adminApiUrl = (import.meta.env.VITE_ADMIN_API_URL as string | undefined)
        || (import.meta.env.DEV ? 'http://localhost:4000' : undefined)
      if (!adminApiUrl) throw new Error('La API administrativa no está configurada')

      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData.session?.access_token
      if (!accessToken) throw new Error('La sesión ha expirado. Vuelve a iniciar sesión')

      const response = await fetch(`${adminApiUrl.replace(/\/$/, '')}/requisitions/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ id: requisicionId }),
      })
      const result = await response.json().catch(() => ({})) as { error?: string }
      if (!response.ok) throw new Error(result.error ?? 'No se pudo eliminar la requisición')
    },
    onSuccess: (_, requisicionId) => {
      queryClient.removeQueries({ queryKey: ['requisition', requisicionId] })
      queryClient.invalidateQueries({ queryKey: ['requisitions'] })
      queryClient.invalidateQueries({ queryKey: ['order-summary'] })
      toast.success('Requisición eliminada')
    },
    onError: (error) => toast.error(`Error al eliminar la requisición: ${(error as Error).message}`),
  })
}

export function useUpdateProveedorFinal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ requisicionId, proveedorFinalId }: { requisicionId: number; proveedorFinalId: number | null }) => {
      const { error } = await supabase
        .from('requisiciones')
        .update({ proveedor_final_id: proveedorFinalId })
        .eq('id', requisicionId)
      if (error) throw error
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['requisition', vars.requisicionId] })
      queryClient.invalidateQueries({ queryKey: ['requisitions'] })
      queryClient.invalidateQueries({ queryKey: ['order-summary'] })
      toast.success('Proveedor final actualizado')
    },
    onError: () => { toast.error('Error al cambiar el proveedor') },
  })
}

export function useWarehouseVerdict() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ requisicionId, estado, notas }: { requisicionId: number; estado: 'PARCIAL' | 'COMPLETADA'; notas?: string }) => {
      const { data: prev } = await supabase
        .from('requisiciones')
        .select('estado')
        .eq('id', requisicionId)
        .single()

      const { error } = await supabase
        .from('requisiciones')
        .update({ estado, notas_admin: notas ?? null })
        .eq('id', requisicionId)
      if (error) throw error

      await supabase.from('historial_requisicion').insert({
        requisicion_id: requisicionId,
        estado_anterior: prev?.estado,
        estado_nuevo: estado,
        comentario: notas ?? 'Veredicto de almacén',
      })
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['requisition', vars.requisicionId] })
      queryClient.invalidateQueries({ queryKey: ['requisitions'] })
      queryClient.invalidateQueries({ queryKey: ['order-summary'] })
      toast.success('Veredicto de almacén registrado')
    },
    onError: () => { toast.error('Error al registrar el veredicto de almacén') },
  })
}

// Note: History tracking would use historial_requisicion table
// For now, audit trail is available through timestamps and notas_admin
// This hook can be implemented when historial table is fully integrated
export function useRequisitionHistory(requisicionId?: number) {
  return useQuery({
    queryKey: ['requisition-history', requisicionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('historial_requisicion')
        .select(`*, usuario:usuarios(id, nombre_completo)`)
        .eq('requisicion_id', requisicionId!)
        .order('created_at')
      if (error) throw error
      return data
    },
    enabled: !!requisicionId,
  })
}

// Consolidado de compras: items de requisiciones activas agrupados para asignar a proveedores
export function useOrderSummary(
  estados: string[] = ['PENDIENTE', 'EN_REVISION', 'APROBADA', 'EN_COMPRA'],
  categorias: string[] = ['URGENTE', 'IMPORTANTE', 'PROGRAMADA']
) {
  return useQuery({
    queryKey: ['order-summary', estados, categorias],
    queryFn: async () => {
      // 1. Traer IDs de requisiciones con los estados y categorías seleccionadas
      const reqQuery = supabase
        .from('requisiciones')
        .select('id, codigo, estado, categoria, item_sinco_adpro')
        .in('estado', estados)

      if (categorias.length > 0) {
        reqQuery.in('categoria', categorias)
      }

      const { data: reqs, error: reqErr } = await reqQuery

      if (reqErr) throw reqErr
      if (!reqs?.length) return []

      const reqIds = reqs.map((r) => r.id)

      // 2. Traer líneas de detalle para esas requisiciones
      const { data, error } = await supabase
        .from('detalle_requisicion')
        .select(`
          id,
          requisicion_id,
          cantidad,
          precio_unitario,
          total_linea,
          completado,
          producto:productos(id, codigo, nombre, unidad_medida),
          proveedor:proveedores!proveedor_sugerido_id(id, nombre, whatsapp)
        `)
        .in('requisicion_id', reqIds)

      if (error) throw error

      const reqMap = Object.fromEntries(reqs.map((r) => [r.id, r]))
      return (data ?? []).map((d: any) => ({ ...d, requisicion: reqMap[d.requisicion_id] }))
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}
