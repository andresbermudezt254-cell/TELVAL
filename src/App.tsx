import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { useAuthStore } from './store/authStore'
import { supabase } from './lib/supabase'

export default function App() {
  const { setUser, setLoading, loadProfile } = useAuthStore()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadProfile(session.user.id).finally(() => setLoading(false))
      } else {
        setUser(null)
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        // Sesión cerrada: limpiar todo el estado de autenticación
        setUser(null)
        setLoading(false)
        useAuthStore.getState().clearPending()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return <RouterProvider router={router} />
}
