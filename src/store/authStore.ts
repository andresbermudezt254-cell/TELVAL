import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'
import { enviarOTP } from '@/lib/otp'
import type { Usuario } from '@/types'

interface AuthState {
  user: Usuario | null
  session: boolean
  loading: boolean
  // OTP 2FA
  otpVerified: boolean
  pendingUserId: string | null
  pendingEmail: string | null
  devCode: string | null          // Código visible en pantalla (sin EmailJS)
  setUser: (user: Usuario | null) => void
  setLoading: (v: boolean) => void
  login: (email: string, password: string) => Promise<{ error: string | null; needsOtp?: boolean }>
  logout: () => Promise<void>
  loadProfile: (userId: string) => Promise<void>
  confirmOtp: () => void
  clearPending: () => void
  resendOtp: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: false,
      loading: true,
      otpVerified: false,
      pendingUserId: null,
      pendingEmail: null,
      devCode: null,

      setUser: (user) => set({ user, session: !!user }),
      setLoading: (loading) => set({ loading }),

      login: async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          if (error.message.includes('Email not confirmed')) return { error: 'Email no confirmado. Pide al administrador que restablezca tu contraseña.' }
          if (error.message.includes('Invalid login credentials')) return { error: 'Correo o contraseña incorrectos.' }
          return { error: error.message }
        }
        if (data.user) {
          await get().loadProfile(data.user.id)
          const profile = useAuthStore.getState().user
          if (profile && !profile.activo) {
            await supabase.auth.signOut()
            set({ user: null, session: false })
            return { error: 'Tu cuenta está desactivada. Contacta al administrador.' }
          }

          // Enviar OTP desde aquí (UNA sola vez, sin depender de useEffect)
          const userId   = data.user.id
          const userEmail = data.user.email ?? email
          let devCode: string | null = null
          try {
            const result = await enviarOTP(userId, userEmail)
            devCode = result.devCode ?? null
          } catch (_) {
            // No bloquear el login si el OTP falla — se puede reenviar
          }

          set({
            otpVerified: false,
            pendingUserId: userId,
            pendingEmail: userEmail,
            devCode,
          })
          return { error: null, needsOtp: true }
        }
        return { error: null }
      },

      logout: async () => {
        await supabase.auth.signOut()
        set({ user: null, session: false, otpVerified: false, pendingUserId: null, pendingEmail: null, devCode: null })
      },

      loadProfile: async (userId) => {
        const { data } = await supabase
          .from('usuarios')
          .select('*')
          .eq('id', userId)
          .single()
        if (data && data.activo === false) {
          await supabase.auth.signOut()
          set({ user: null, session: false, otpVerified: false, pendingUserId: null, pendingEmail: null, devCode: null })
          return
        }
        if (data) set({ user: data as Usuario, session: true })
      },

      confirmOtp: () => set({ otpVerified: true, pendingUserId: null, pendingEmail: null, devCode: null }),

      clearPending: () => set({ pendingUserId: null, pendingEmail: null, otpVerified: false, devCode: null }),

      resendOtp: async () => {
        const { pendingUserId, pendingEmail } = get()
        if (!pendingUserId || !pendingEmail) return
        try {
          const result = await enviarOTP(pendingUserId, pendingEmail)
          set({ devCode: result.devCode ?? null })
        } catch (e) {
          throw e
        }
      },
    }),
    {
      name: 'telval-auth',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        user: state.user,
        session: state.session,
        otpVerified: state.otpVerified,
        pendingUserId: state.pendingUserId,
        pendingEmail: state.pendingEmail,
        // devCode NO se persiste (es temporal)
      }),
    }
  )
)
