import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Faltan las variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY')
}

const createScopedStorage = (prefix: string): Storage => {
  const storage = globalThis.sessionStorage

  return {
    get length() {
      return Object.keys(storage).filter((key) => key.startsWith(`${prefix}:`)).length
    },
    clear: () => {
      for (let i = storage.length - 1; i >= 0; i -= 1) {
        const key = storage.key(i)
        if (key?.startsWith(`${prefix}:`)) storage.removeItem(key)
      }
    },
    getItem: (key) => storage.getItem(`${prefix}:${key}`),
    key: (index) => {
      const matchedKeys = Object.keys(storage).filter((key) => key.startsWith(`${prefix}:`))
      return matchedKeys[index] ? matchedKeys[index].replace(`${prefix}:`, '') : null
    },
    removeItem: (key) => storage.removeItem(`${prefix}:${key}`),
    setItem: (key, value) => storage.setItem(`${prefix}:${key}`, value),
  }
}

type SupabaseClient = ReturnType<typeof createClient>
const globalForSupabase = globalThis as typeof globalThis & {
  __TELVAL_SUPABASE__?: SupabaseClient
  __TELVAL_SUPABASE_ADMIN__?: SupabaseClient | null
}

export const supabase = globalForSupabase.__TELVAL_SUPABASE__ ?? (globalForSupabase.__TELVAL_SUPABASE__ = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: createScopedStorage('telval-auth'),
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
}))

// Cliente con Service Role Key — solo para operaciones de administrador
// (crear usuarios en Auth sin afectar la sesión activa)
const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string | undefined
export const supabaseAdmin = globalForSupabase.__TELVAL_SUPABASE_ADMIN__ ?? (globalForSupabase.__TELVAL_SUPABASE_ADMIN__ = serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        storage: createScopedStorage('telval-admin-auth'),
      },
    })
  : null)
