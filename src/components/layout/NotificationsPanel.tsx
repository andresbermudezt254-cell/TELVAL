import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Check, CheckCheck, ClipboardList, X } from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import type { Notificacion } from '@/types'
import { useAuthStore } from '@/store/authStore'

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs} h`
  const days = Math.floor(hrs / 24)
  return `hace ${days} d`
}

const tipoColors: Record<string, string> = {
  success: 'bg-green-500',
  error:   'bg-red-500',
  warning: 'bg-amber-500',
  info:    'bg-blue-500',
}

interface Props {
  open: boolean
  onClose: () => void
}

export function NotificationsPanel({ open, onClose }: Props) {
  const { notifications, unreadCount, markRead, markAllRead, isMarkingAllRead } = useNotifications()
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const panelRef = useRef<HTMLDivElement>(null)

  // Cerrar al hacer clic fuera
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose])

  if (!open) return null

  const handleClick = (n: Notificacion) => {
    if (!n.leida) markRead(n.id)
    if (n.requisicion_id) {
      const path = user?.rol === 'admin' || user?.rol === 'almacen' || user?.rol === 'superadmin'
        ? `/admin/requisiciones/${n.requisicion_id}`
        : '/mis-requisiciones'
      navigate(path)
    }
    onClose()
  }

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-2 w-[360px] max-h-[480px] bg-white rounded-2xl shadow-xl border border-gray-100 flex flex-col z-50 overflow-hidden"
      style={{ animation: 'fadeSlideDown 0.15s ease-out' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-[#1e3a5f]" />
          <span className="text-sm font-bold text-gray-800">Notificaciones</span>
          {unreadCount > 0 && (
            <span className="min-w-[20px] h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1.5">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={() => markAllRead()}
              disabled={isMarkingAllRead}
              className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
              title="Marcar todas como leídas"
            >
              <CheckCheck size={13} />
              Leídas
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="overflow-y-auto flex-1">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-6">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <Bell size={22} className="text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-500">Sin notificaciones</p>
            <p className="text-xs text-gray-400 mt-1">Aquí aparecerán los avisos de tus requisiciones</p>
          </div>
        ) : (
          notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => handleClick(n)}
              className={`w-full text-left flex items-start gap-3 px-4 py-3 border-b border-gray-50 transition-colors ${
                n.leida ? 'hover:bg-gray-50' : 'bg-blue-50/40 hover:bg-blue-50'
              }`}
            >
              {/* Dot indicator */}
              <div className="flex-shrink-0 mt-1">
                <div className={`w-2 h-2 rounded-full ${n.leida ? 'bg-gray-300' : (tipoColors[n.tipo] ?? 'bg-blue-500')}`} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-xs leading-snug ${n.leida ? 'text-gray-600' : 'text-gray-900 font-semibold'}`}>
                    {n.titulo}
                  </p>
                  <span className="text-[10px] text-gray-400 whitespace-nowrap flex-shrink-0">
                    {timeAgo(n.created_at)}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5 leading-snug line-clamp-2">{n.mensaje}</p>
                {n.requisicion_id && (
                  <div className="flex items-center gap-1 mt-1">
                    <ClipboardList size={10} className="text-gray-400" />
                    <span className="text-[10px] text-blue-500 font-medium">Ver requisición →</span>
                  </div>
                )}
              </div>

              {/* Mark read */}
              {!n.leida && (
                <button
                  onClick={(e) => { e.stopPropagation(); markRead(n.id) }}
                  className="flex-shrink-0 p-1 rounded hover:bg-blue-100 text-blue-400 hover:text-blue-600 transition-colors mt-0.5"
                  title="Marcar como leída"
                >
                  <Check size={13} />
                </button>
              )}
            </button>
          ))
        )}
      </div>

      <style>{`
        @keyframes fadeSlideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
