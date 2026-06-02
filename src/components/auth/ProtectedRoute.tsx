import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { PageLoader } from '@/components/ui/Spinner'
import type { UserRole } from '@/types'

interface ProtectedRouteProps {
  children: React.ReactNode
  rol?: UserRole
}

export function ProtectedRoute({ children, rol }: ProtectedRouteProps) {
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

  if (rol && user.rol !== rol) {
    return <Navigate to={user.rol === 'admin' ? '/admin/dashboard' : '/catalogo'} replace />
  }

  return <>{children}</>
}
