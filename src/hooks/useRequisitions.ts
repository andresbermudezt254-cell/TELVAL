import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { Requisicion, NuevaRequisicionForm } from '@/types'
import { toast } from 'sonner'
import type { UseQueryResult } from '@tanstack/react-query'

export function useRequisitions(filters?: {
  estado?: string | string[]
  categoria?: string
  especialidad?: string
  empleadoId?: string
  page?: number
}): UseQueryResult<{ data: Requisicion[]; count: number }, Error> {
  const user = useAuthStore((s) => s.user)
  const page = filters?.page !== undefined ? filters.page + 1 : 1
  const pageSize = 20

  const queryFn = async (): Promise<{ data: Requisicion[]; count: number }> => {
    let query = supabase
      .from('requisiciones')
      .select(`
        *,
        empleado:usuarios!requisiciones_empleado_id_fkey(id, nombre_completo, email, especialidad),
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
    if (error) {
      const invalidEnumMatch = error.message?.matchAll(/"([^"]+)"/g)
      const invalidEnums = invalidEnumMatch ? Array.from(invalidEnumMatch, (m) => m[1]) : []
      if (error.code === '22P02' && filters?.estado && invalidEnums.length > 0) {
        const requestedEstados = Array.isArray(filters.estado) ? filters.estado : [filters.estado]
        const validEstados = requestedEstados.filter((estado) => !invalidEnums.includes(estado))
        if (validEstados.length > 0) {
          let retryQuery = supabase
            .from('requisiciones')
            .select(`
        *,
        empleado:usuarios!requisiciones_empleado_id_fkey(id, nombre_completo, email, especialidad),
        detalles:detalle_requisicion(id)
      `, { count: 'exact' })
            .order('created_at', { ascending: false })
            .range((page - 1) * pageSize, page * pageSize - 1)

          if (user?.rol === 'empleado') {
            retryQuery = retryQuery.eq('empleado_id', user.id)
          }
          retryQuery = retryQuery.in('estado', validEstados)
          if (filters?.categoria) retryQuery = retryQuery.eq('categoria', filters.categoria)
          if (filters?.especialidad) retryQuery = retryQuery.eq('especialidad', filters.especialidad)
          if (filters?.empleadoId) retryQuery = retryQuery.eq('empleado_id', filters.empleadoId)

          const { data: retryData, error: retryError, count: retryCount } = await retryQuery
          if (retryError) throw retryError
          return { data: retryData as Requisicion[], count: retryCount ?? 0 }
        }
      }
      throw error
    }

    return { data: data as Requisicion[], count: count ?? 0 }
  }

  const queryOptions: UseQueryOptions<{ data: Requisicion[]; count: number }, Error> = {
    queryKey: ['requisitions', user?.id, user?.rol, filters],
    queryFn,
    enabled: !!user,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: false,
  }

  return useQuery<{ data: Requisicion[]; count: number }, Error>(queryOptions)
}

export function useRequisitionById(id?: number) {
  return useQuery<Requisicion | null, Error>({
    queryKey: ['requisition', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('requisiciones')
        .select(`
          *,
          empleado:usuarios!requisiciones_empleado_id_fkey(id, nombre_completo, email, especialidad, whatsapp),
          admin:usuarios!requisiciones_admin_id_fkey(id, nombre_completo),
          detalles:detalle_requisicion(
            id, requisicion_id, producto_id, proveedor_sugerido_id, cantidad,
            precio_unitario, total_linea, notas, created_at, completado, completado_at, completado_por,
            producto:productos(id, codigo, nombre, unidad_medida, categoria_id),
            proveedor_sugerido:proveedores!detalle_requisicion_proveedor_sugerido_id_fkey(id, nombre, whatsapp, codigo_interno)
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
    refetchOnMount: true,
    refetchOnWindowFocus: true,
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
      await queryClient.invalidateQueries({ queryKey: ['requisitions'] })
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
      if (estado === 'COMPLETADA') {
        throw new Error('El cierre final solo puede registrarse desde el módulo de almacén.')
      }

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
      if (user?.rol !== 'almacen' && user?.rol !== 'admin' && user?.rol !== 'superadmin') {
        throw new Error('Solo almacén o admin puede registrar la recepción de artículos.')
      }

      console.log('🔵 [mutationFn] Iniciando - itemId:', itemId, 'requisicionId:', requisicionId, 'completado:', completado)

      // Use RPC function instead of direct updates
      // This function handles user sync + item update + state calculation all in one transaction
      console.log('🔄 [RPC] Llamando marcar_item_recibido_v2...')

      const { data: rpcResult, error: rpcError } = await supabase.rpc('marcar_item_recibido_v2', {
        p_user_id: user!.id,
        p_user_email: user!.email,
        p_user_nombre: user!.nombre_completo || user!.email,
        p_user_rol: user!.rol,
        p_item_id: itemId,
        p_req_id: requisicionId,
        p_completado: completado,
      })

      console.log('📋 [RPC] Resultado:', { rpcResult, rpcError })

      if (rpcError) {
        console.error('❌ [RPC] Error:', rpcError.message)
        throw rpcError
      }

      if (!rpcResult || rpcResult.error) {
        console.error('⚠️ [RPC] Error en resultado:', rpcResult?.error)
        throw new Error(rpcResult?.error || 'Error en RPC marcar_item_recibido_v2')
      }

      console.log('✅ [mutationFn] Completado - estado:', rpcResult.nuevoEstado)
      return {
        nuevoEstado: rpcResult.nuevoEstado,
        completados: rpcResult.completados,
        total: rpcResult.total,
      }
    },
    onSuccess: async (result, vars) => {
      // Step 1: Update detail query cache with new data
      await queryClient.invalidateQueries({
        queryKey: ['requisition', vars.requisicionId],
        exact: true,
      })

      // Step 2: Update list query cache
      await queryClient.invalidateQueries({
        queryKey: ['requisitions'],
        exact: false,
      })

      // Step 3: Force refetch both queries immediately
      await queryClient.refetchQueries({
        queryKey: ['requisition', vars.requisicionId],
        exact: true,
      })

      await queryClient.refetchQueries({
        queryKey: ['requisitions'],
        exact: false,
      })

      toast.success('Recepción registrada con éxito')
    },
    onError: (err) => {
      const message = err && typeof err === 'object'
        ? ('message' in err && typeof (err as any).message === 'string' ? (err as any).message : JSON.stringify(err))
        : String(err)
      if (message.includes("Could not find the 'completado' column")) {
        toast.error('Error al actualizar el ítem: falta la columna completado en detalle_requisicion. Ejecuta la migración de base de datos.')
      } else {
        toast.error(`Error al actualizar el ítem: ${message}`)
      }
      console.error('useMarcarItemCompletado error', err)
    },
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

export function useChangeDetalleProveedor() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ detalleId, proveedorId }: { detalleId: number; proveedorId: number | null }) => {
      const { error } = await supabase
        .from('detalle_requisicion')
        .update({ proveedor_sugerido_id: proveedorId })
        .eq('id', detalleId)
      if (error) throw error
    },
    // Optimistic update: update cached order-summary and requisition immediately
    onMutate: async (vars: any) => {
      await queryClient.cancelQueries({ queryKey: ['order-summary'] })
      await queryClient.cancelQueries({ queryKey: ['requisition', vars.requisicionId] })

      const previousOrderSummaries = queryClient.getQueriesData(['order-summary'])
      const previousRequisition = queryClient.getQueryData(['requisition', vars.requisicionId])
      const suppliersCache = queryClient.getQueryData(['suppliers', '']) || queryClient.getQueryData(['suppliers'])
      const newSupplier = Array.isArray(suppliersCache) ? (suppliersCache as any[]).find((s) => s.id === vars.proveedorId) : undefined

      // Update all cached order-summary queries
      const summaries = queryClient.getQueriesData(['order-summary'])
      summaries.forEach(([key, data]: any) => {
        if (!data) return
        const items = (data as any[])
        const next = items.map((it: any) => {
          if (it.id === vars.detalleId) {
            return { ...it, proveedor: newSupplier ? { id: newSupplier.id, nombre: newSupplier.nombre, whatsapp: newSupplier.whatsapp } : it.proveedor }
          }
          return it
        })
        queryClient.setQueryData(key, next)
      })

      // Update requisition detail cache if present
      if (previousRequisition) {
        const req = previousRequisition as any
        const next = { ...req, detalles: (req.detalles ?? []).map((d: any) => d.id === vars.detalleId ? { ...d, proveedor_sugerido_id: vars.proveedorId, proveedor_sugerido: newSupplier ? { id: newSupplier.id, nombre: newSupplier.nombre, whatsapp: newSupplier.whatsapp } : d.proveedor_sugerido } : d) }
        queryClient.setQueryData(['requisition', vars.requisicionId], next)
      }

      return { previousOrderSummaries, previousRequisition }
    },
    onSuccess: async (_, vars: any) => {
      queryClient.invalidateQueries({ queryKey: ['order-summary'] })
      queryClient.invalidateQueries({ queryKey: ['requisitions'] })
      if (vars?.requisicionId) {
        queryClient.invalidateQueries({ queryKey: ['requisition', vars.requisicionId], exact: true })
        queryClient.refetchQueries({ queryKey: ['requisition', vars.requisicionId], exact: true })
      }
      toast.success('Proveedor del ítem actualizado')
    },
    onError: (err, vars, context: any) => {
      // rollback
      const prev = context?.previousOrderSummaries
      if (prev) {
        prev.forEach(([key, data]: any) => queryClient.setQueryData(key, data))
      }
      if (context?.previousRequisition) {
        queryClient.setQueryData(['requisition', vars.requisicionId], context.previousRequisition)
      }
      toast.error('Error al actualizar el proveedor del ítem')
    },
  })
}

export function useWarehouseVerdict() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async ({ requisicionId, estado, notas, direccion_despacho, cantidad_despachada }: { requisicionId: number; estado: 'PARCIAL' | 'COMPLETADA'; notas?: string; direccion_despacho: string; cantidad_despachada: number }) => {
      if (user?.rol !== 'almacen' && user?.rol !== 'superadmin') {
        throw new Error('Solo almacén puede registrar el veredicto de entrega.')
      }

      const { data: prev } = await supabase
        .from('requisiciones')
        .select('estado')
        .eq('id', requisicionId)
        .single()

      const formattedNotas = `Cantidad despachada: ${cantidad_despachada}. ${notas ?? ''}`.trim()

      const { error } = await supabase
        .from('requisiciones')
        .update({ estado, notas_almacen: formattedNotas || null, direccion_despacho, despachado_at: new Date().toISOString() })
        .eq('id', requisicionId)
      if (error) throw error

      await supabase.from('historial_requisicion').insert({
        requisicion_id: requisicionId,
        estado_anterior: prev?.estado,
        estado_nuevo: estado,
        comentario: formattedNotas || 'Veredicto de almacén',
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
