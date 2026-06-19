import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'
import type { Usuario } from '@/types'

interface AuthState {
  user: Usuario | null
  session: boolean
  loading: boolean
  setUser: (user: Usuario | null) => void
  setLoading: (v: boolean) => void
  login: (email: string, password: string) => Promise<{ error: string | null }>
  logout: () => Promise<void>
  loadProfile: (userId: string) => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: false,
      loading: true,

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
        }
        return { error: null }
      },

      logout: async () => {
        await supabase.auth.signOut()
        set({ user: null, session: false })
      },

      loadProfile: async (userId) => {
        const { data } = await supabase
          .from('usuarios')
          .select('*')
          .eq('id', userId)
          .single()
        if (data && data.activo === false) {
          await supabase.auth.signOut()
          set({ user: null, session: false })
          return
        }
        if (data) set({ user: data as Usuario, session: true })
      },
    }),
    {
      name: 'telval-auth',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        user: state.user,
        session: state.session,
      }),
    }
  )
)
