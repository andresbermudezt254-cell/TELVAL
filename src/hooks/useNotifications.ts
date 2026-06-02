import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { toast } from 'sonner'
import type { Notificacion } from '@/types'

export function useNotifications() {
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notificaciones')
        .select('*')
        .eq('usuario_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data as Notificacion[]
    },
    enabled: !!user,
  })

  const markRead = useMutation({
    mutationFn: async (id: number) => {
      await supabase.from('notificaciones').update({ leida: true }).eq('id', id)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const markAllRead = useMutation({
    mutationFn: async () => {
      await supabase
        .from('notificaciones')
        .update({ leida: true })
        .eq('usuario_id', user!.id)
        .eq('leida', false)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  // Realtime: escuchar nuevas notificaciones propias en la tabla notificaciones
  useEffect(() => {
    if (!user) return

    let active = true
    const channelName = `notifs-user-${user.id}`

    // Eliminar canal previo con el mismo nombre (React StrictMode ejecuta effects 2 veces)
    const existing = supabase.getChannels().find((c) => c.topic === `realtime:${channelName}`)
    if (existing) supabase.removeChannel(existing)

    const notifChannel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notificaciones',
        filter: `usuario_id=eq.${user.id}`,
      }, (payload) => {
        if (!active) return
        const n = payload.new as Notificacion
        toast(n.titulo, { description: n.mensaje })
        queryClient.invalidateQueries({ queryKey: ['notifications'] })
      })
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(notifChannel)
    }
  }, [user, queryClient])

  const unreadCount = query.data?.filter((n) => !n.leida).length ?? 0

  return {
    notifications: query.data ?? [],
    unreadCount,
    markRead: markRead.mutate,
    markAllRead: markAllRead.mutate,
    isMarkingAllRead: markAllRead.isPending,
  }
}
