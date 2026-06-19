import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const envPath = path.resolve(process.cwd(), '.env')
const raw = fs.readFileSync(envPath, 'utf8')
const env = {}
for (const line of raw.split(/\r?\n/)) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const idx = trimmed.indexOf('=')
  if (idx === -1) continue
  const key = trimmed.slice(0, idx).trim()
  let value = trimmed.slice(idx + 1).trim()
  if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
  env[key] = value
}

const supabaseAdmin = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

console.log('Calling rpc sql...')
try {
  const { data, error } = await supabaseAdmin.rpc('sql', { query: 'SELECT 1' })
  console.log('rpc sql result', { data, error })
} catch (err) {
  console.error('rpc sql failed:', err.message || err)
}

console.log('Querying pg_proc...')
try {
  const { data, error } = await supabaseAdmin.from('pg_proc').select('proname').ilike('proname', 'sql%').limit(20)
  console.log('pg_proc result', { data, error })
} catch (err) {
  console.error('pg_proc query failed:', err.message || err)
}
