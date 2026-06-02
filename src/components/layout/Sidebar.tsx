import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  ClipboardList,
  Package,
  Truck,
  Users,
  BarChart3,
  ShoppingBag,
  ListOrdered,
  X,
  LogOut,
  ChevronRight,
  ShoppingCart,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

interface SidebarProps {
  onClose?: () => void
}

const adminLinks = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/requisiciones', icon: ClipboardList, label: 'Requisiciones' },
  { to: '/nueva-requisicion', icon: ShoppingCart, label: 'Nueva Requisición' },
  { to: '/catalogo', icon: ShoppingBag, label: 'Catálogo' },
  { to: '/admin/productos', icon: Package, label: 'Productos' },
  { to: '/admin/proveedores', icon: Truck, label: 'Proveedores' },
  { to: '/admin/usuarios', icon: Users, label: 'Usuarios' },
  { to: '/admin/consolidado', icon: ListOrdered, label: 'Consolidado' },
  { to: '/admin/reportes', icon: BarChart3, label: 'Reportes' },
]

const employeeLinks = [
  { to: '/catalogo', icon: ShoppingBag, label: 'Catálogo' },
  { to: '/nueva-requisicion', icon: ClipboardList, label: 'Nueva Requisición' },
  { to: '/mis-requisiciones', icon: ListOrdered, label: 'Mis Requisiciones' },
]

export function Sidebar({ onClose }: SidebarProps) {
  const user = useAuthStore((s) => s.user)
  const { logout } = useAuthStore()
  const navigate = useNavigate()
  const links = user?.rol === 'admin' ? adminLinks : employeeLinks

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const initial = (user?.nombre_completo || user?.email || '?').charAt(0).toUpperCase()
  const displayName = user?.nombre_completo?.split(' ')[0] || user?.email?.split('@')[0] || 'Usuario'

  return (
    <div className="flex flex-col h-full text-white" style={{ background: 'linear-gradient(180deg, #0f2440 0%, #1e3a5f 100%)' }}>
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#f97316] flex items-center justify-center flex-shrink-0">
            <span className="text-white font-black text-xs">T</span>
          </div>
          <div>
            <p className="text-sm font-bold tracking-wide leading-none text-white">TELVAL</p>
            <p className="text-[9px] text-blue-300 uppercase tracking-widest mt-0.5">Compras & Suministros</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="md:hidden p-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Section label */}
      <div className="px-5 pt-5 pb-2">
        <p className="text-[9px] font-bold uppercase tracking-widest text-blue-400/70">
          {user?.rol === 'admin' ? 'Administración' : 'Mi espacio'}
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-white text-[#1e3a5f] shadow-sm'
                  : 'text-blue-100/80 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`flex-shrink-0 transition-colors ${
                  isActive ? 'text-[#f97316]' : 'text-blue-300 group-hover:text-white'
                }`}>
                  <Icon size={17} />
                </div>
                <span className="flex-1">{label}</span>
                {isActive && <ChevronRight size={13} className="text-[#f97316]" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User area */}
      {user && (
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/5 transition-colors">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#f97316] to-orange-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-md">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">{displayName}</p>
              <p className="text-[10px] text-blue-300 capitalize">{user.rol === 'admin' ? 'Administrador' : 'Empleado'}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              className="p-1.5 rounded-lg text-blue-300 hover:bg-red-500/20 hover:text-red-300 transition-colors flex-shrink-0"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
