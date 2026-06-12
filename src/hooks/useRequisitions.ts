import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { Requisicion, NuevaRequisicionForm } from '@/types'
import { toast } from 'sonner'

export function useRequisitions(filters?: {
  estado?: string | string[]
  categoria?: string
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
      if (filters?.categoria) query = query.eq('categoria', filters.categoria)
      if (filters?.especialidad) query = query.eq('especialidad', filters.especialidad)
      if (filters?.empleadoId) query = query.eq('empleado_id', filters.empleadoId)

      const { data, error, count } = await query
      if (error) throw error
      return { data: data as Requisicion[], count: count ?? 0 }
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
            numero_item, unidad_medida_id, precio_unitario, notas, created_at,
            completado, completado_at, completado_por,
            producto:productos(id, codigo, nombre, unidad_medida, categoria_id),
            proveedor_sugerido:proveedores!proveedor_sugerido_id(id, nombre, whatsapp, codigo_interno),
            unidad_medida:unidades_medida(id, nombre, abreviatura),
            completado_por_usuario:usuarios!detalle_requisicion_completado_por_fkey(id, nombre_completo)
          ),
          historial:historial_requisicion(
            id, requisicion_id, estado_anterior, estado_nuevo, usuario_id, comentario, created_at,
            usuario:usuarios(id, nombre_completo)
          )
        `)
        .eq('id', id!)
        .single()
      if (error) throw error
      return (data ?? null) as Requisicion | null
    },
    enabled: !!id,
  })
}

function generarCodigoReq(): string {
  const now = new Date()
  const yy = String(now.getFullYear()).slice(-2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase()
  return `REQ-${yy}${mm}-${rand}`
}

export function useCreateRequisition() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async (form: NuevaRequisicionForm & { items: Array<{ producto_id: number; cantidad: number; notas?: string }> }) => {
      // Get best providers for each product
      const productIds = form.items.map((i) => i.producto_id)
      const { data: bestPrices } = await supabase
        .from('mejor_proveedor_por_producto')
        .select('*')
        .in('producto_id', productIds)
        .eq('ranking', 1)

      const priceMap = new Map(bestPrices?.map((b) => [b.producto_id, b]) ?? [])

      // Calculate total
      const totalEstimado = form.items.reduce((sum, item) => {
        const best = priceMap.get(item.producto_id)
        return sum + (best?.precio_unitario ?? 0) * item.cantidad
      }, 0)

      const codigo = generarCodigoReq()

      // Create requisition
      const { data: req, error: reqError } = await supabase
        .from('requisiciones')
        .insert({
          codigo,
          empleado_id: user!.id,
          especialidad: form.especialidad,
          numero_aviso: form.numero_aviso,
          punto: form.punto,
          categoria: form.categoria,
          fecha_maxima_entrega: form.fecha_maxima_entrega || null,
          item_sinco_adpro: form.item_sinco_adpro || null,
          notas_empleado: form.notas_empleado || null,
          total_estimado: totalEstimado,
          estado: 'PENDIENTE',
        })
        .select()
        .single()

      if (reqError) throw reqError

      // Insert details
      const detalles = form.items.map((item) => {
        const best = priceMap.get(item.producto_id)
        return {
          requisicion_id: req.id,
          producto_id: item.producto_id,
          cantidad: item.cantidad,
          notas: item.notas || null,
          proveedor_sugerido_id: best?.proveedor_id ?? null,
          precio_unitario: best?.precio_unitario ?? null,
        }
      })

      const { error: detError } = await supabase
        .from('detalle_requisicion')
        .insert(detalles)
      if (detError) throw detError

      // Note: historial_requisicion would be logged here if needed
      // For now, we rely on requisiciones.updated_at and created_at timestamps

      // Notificar a todos los admins activos
      const { data: admins } = await supabase
        .from('usuarios')
        .select('id')
        .eq('rol', 'admin')
        .eq('activo', true)

      if (admins?.length) {
        await supabase.from('notificaciones').insert(
          admins.map((a: { id: string }) => ({
            usuario_id: a.id,
            requisicion_id: req.id,
            tipo: 'info',
            titulo: '📋 Nueva requisición',
            mensaje: `${user!.nombre_completo || 'Un empleado'} envió la requisición ${req.codigo}`,
          }))
        )
      }

      return req as Requisicion
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['requisitions'], refetchType: 'all' })
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
    },
    onError: () => { toast.error('Error al actualizar el ítem') },
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
export function useOrderSummary(estados: string[] = ['PENDIENTE', 'EN_REVISION', 'APROBADA', 'EN_COMPRA']) {
  return useQuery({
    queryKey: ['order-summary', estados],
    queryFn: async () => {
      // 1. Traer IDs de requisiciones con los estados seleccionados
      const { data: reqs, error: reqErr } = await supabase
        .from('requisiciones')
        .select('id, codigo, estado, categoria, item_sinco_adpro')
        .in('estado', estados)

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
          producto:productos(id, codigo, nombre, unidad_medida),
          proveedor:proveedores!proveedor_sugerido_id(id, nombre, whatsapp)
        `)
        .in('requisicion_id', reqIds)

      if (error) throw error

      const reqMap = Object.fromEntries(reqs.map((r) => [r.id, r]))
      return (data ?? []).map((d: any) => ({ ...d, requisicion: reqMap[d.requisicion_id] }))
    },
    staleTime: 1000 * 30,
  })
}
