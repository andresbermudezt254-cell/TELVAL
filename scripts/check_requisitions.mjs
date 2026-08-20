import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const fs = require('fs/promises')
const text = await fs.readFile('.env', 'utf8')
const env = Object.fromEntries(text.split(/\r?\n/).filter(Boolean).map(line => line.trim()).filter(line => !line.startsWith('#')).map(line => { const [k, ...v] = line.split('='); return [k, v.join('=')]; }))
const { createClient } = require('@supabase/supabase-js')
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { realtime: { enabled: false } })
const [{ data: users, error: usersErr }, { data: reqs, error: reqErr }] = await Promise.all([
  supabase.from('usuarios').select('id, nombre_completo, rol, activo').limit(20),
  supabase.from('requisiciones').select('id,codigo,empleado_id,estado,created_at').order('created_at',{ascending:false}).limit(20)
])
console.log(JSON.stringify({ usersErr, reqErr, users, reqs }, null, 2))