import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

function loadEnv() {
  const projectRoot = process.cwd()
  const envPath = path.resolve(projectRoot, '.env')
  if (!fs.existsSync(envPath)) {
    throw new Error(`.env file not found at ${envPath}`)
  }

  const raw = fs.readFileSync(envPath, 'utf8')
  const env = {}
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const index = trimmed.indexOf('=')
    if (index === -1) continue
    const key = trimmed.slice(0, index).trim()
    let value = trimmed.slice(index + 1).trim()
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1)
    }
    env[key] = value
  }
  return env
}

const env = loadEnv()
const SUPABASE_URL = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SERVICE_KEY = env.VITE_SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error('Missing VITE_SUPABASE_URL or service role key in .env')
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const sql = `ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'almacen';\nALTER TYPE user_role ADD VALUE IF NOT EXISTS 'superadmin';`

const result = await supabaseAdmin.rpc('sql', { query: sql }).catch(async (err) => {
  // Fallback if direct sql rpc isn't available; use the built-in query function via the REST API.
  console.error('RPC sql call failed:', err.message || err)
  throw err
})

console.log('Migration executed:', result)
