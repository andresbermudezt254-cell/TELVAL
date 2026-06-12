import { useState } from 'react'
import { Menu, Bell, ShoppingCart, ChevronRight } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useCartStore } from '@/store/cartStore'
import { useNotifications } from '@/hooks/useNotifications'
import { CartDrawer } from '@/components/catalog/CartDrawer'
import { NotificationsPanel } from '@/components/layout/NotificationsPanel'

const pageInfo: Record<string, { title: string; parent?: string }> = {
  '/admin/dashboard': { title: 'Dashboard' },
  '/admin/requisiciones': { title: 'Requisiciones', parent: 'Admin' },
  '/admin/productos': { title: 'Productos', parent: 'Admin' },
  '/admin/proveedores': { title: 'Proveedores', parent: 'Admin' },
  '/admin/usuarios': { title: 'Usuarios', parent: 'Admin' },
  '/admin/reportes': { title: 'Reportes', parent: 'Admin' },
  '/admin/consolidado': { title: 'Consolidado', parent: 'Admin' },
  '/catalogo': { title: 'Catálogo de Insumos' },
  '/nueva-requisicion': { title: 'Nueva Requisición' },
  '/mis-requisiciones': { title: 'Mis Requisiciones' },
}

interface NavbarProps {
  onMenuClick: () => void
}

export function Navbar({ onMenuClick }: NavbarProps) {
  const location = useLocation()
  const { user } = useAuthStore()
  const totalItems = useCartStore((s) => s.totalItems())
  const [cartOpen, setCartOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const { unreadCount } = useNotifications()

  const matched = Object.entries(pageInfo).find(([path]) => location.pathname.startsWith(path))
  const info = matched?.[1] ?? { title: 'TELVAL Compras' }

  const initial = (user?.nombre_completo || user?.email || '?').charAt(0).toUpperCase()
  const displayName = user?.nombre_completo?.split(' ').slice(0, 2).join(' ') || user?.email || ''
  const roleLabelMap = {
    admin: 'Administrador',
    empleado: 'Empleado',
    almacen: 'Almacén',
    superadmin: 'Superadmin',
  } as const

  return (
    <>
      <header className="h-14 bg-white/95 backdrop-blur-md border-b border-gray-100/80 flex items-center justify-between px-4 md:px-6 flex-shrink-0 shadow-[0_1px_3px_0_rgb(0,0,0,0.04)]">
        {/* Left: menu + breadcrumb */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <Menu size={18} />
          </button>
          <div className="flex items-center gap-1.5 text-sm">
            {info.parent && (
              <>
                <span className="text-gray-400 font-medium text-xs">{info.parent}</span>
                <ChevronRight size={12} className="text-gray-300" />
              </>
            )}
            <span className="font-semibold text-gray-800">{info.title}</span>
          </div>
        </div>

        {/* Right: actions + user */}
        <div className="flex items-center gap-1">
          {/* Cart (any role can shop) */}
          <button
            onClick={() => setCartOpen(true)}
            className="relative p-2 rounded-xl text-gray-500 hover:bg-orange-50 hover:text-[#f97316] transition-all"
          >
            <ShoppingCart size={18} />
            {totalItems > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] bg-[#f97316] text-white text-[9px] rounded-full flex items-center justify-center font-bold px-1 shadow-sm">
                {totalItems > 9 ? '9+' : totalItems}
              </span>
            )}
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen((v) => !v)}
              className={`relative p-2 rounded-xl transition-all ${notifOpen ? 'bg-blue-50 text-[#1e3a5f]' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold px-1 shadow-sm">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <NotificationsPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
          </div>

          {/* User avatar */}
          <div className="flex items-center gap-2 ml-1.5 pl-2.5 border-l border-gray-200">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1e3a5f] to-[#1a4a7a] flex items-center justify-center text-white font-bold text-xs shadow-md ring-2 ring-white">
              {initial}
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-semibold text-gray-800 leading-tight">{displayName}</p>
              <p className="text-[10px] text-gray-400 capitalize leading-tight">{user?.rol ? roleLabelMap[user.rol] : ''}</p>
            </div>
          </div>
        </div>
      </header>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  )
}