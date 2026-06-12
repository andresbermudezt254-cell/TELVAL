import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { PageLoader } from '@/components/ui/Spinner'
import type { UserRole } from '@/types'

interface ProtectedRouteProps {
  children: React.ReactNode
  roles?: UserRole[]
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user, loading, otpVerified, pendingUserId } = useAuthStore()

  if (loading) return <PageLoader />

  // Si hay un OTP pendiente sin verificar, redirigir al OTP
  if (pendingUserId && !otpVerified) {
    return <Navigate to="/verificar-otp" replace />
  }

  // Sin sesión autenticada
  if (!user) return <Navigate to="/login" replace />

  // Sesión activa pero OTP no verificado en esta sesión
  if (!otpVerified) return <Navigate to="/login" replace />

  if (roles && !roles.includes(user.rol)) {
    if (user.rol === 'admin' || user.rol === 'superadmin') return <Navigate to="/admin/dashboard" replace />
    if (user.rol === 'almacen') return <Navigate to="/almacen" replace />
    return <Navigate to="/catalogo" replace />
  }

  return <>{children}</>
}
