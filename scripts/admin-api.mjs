import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'

const envPath = path.resolve(process.cwd(), '.env')
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const index = trimmed.indexOf('=')
    if (index === -1) continue

    const key = trimmed.slice(0, index).trim()
    let value = trimmed.slice(index + 1).trim()
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

const PORT = Number(process.env.ADMIN_API_PORT || process.env.PORT || 4000)
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno')
  process.exit(1)
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY)

function sendJSON(res, status, body) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  })
  res.end(payload)
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    })
    res.end()
    return
  }

  if (req.url === '/users' && req.method === 'POST') {
    try {
      let body = ''
      for await (const chunk of req) body += chunk
      const data = JSON.parse(body)

      const { email, password, nombre_completo, rol = 'empleado', especialidad = null, whatsapp = null } = data

      if (!email || !password || !nombre_completo) {
        return sendJSON(res, 400, { error: 'Faltan campos requeridos' })
      }

      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nombre_completo },
      })
      if (createErr) return sendJSON(res, 500, { error: createErr.message })

      const { error: updErr } = await supabaseAdmin
        .from('usuarios')
        .upsert(
          { id: newUser.user.id, nombre_completo, rol, especialidad, whatsapp },
          { onConflict: 'id' }
        )

      if (updErr) {
        if (updErr.message?.includes('invalid input value for enum user_role')) {
          return sendJSON(res, 422, {
            error: 'Rol inválido en la base de datos. Ejecuta la migración para agregar el valor almacen al enum user_role.',
          })
        }
        return sendJSON(res, 500, { error: updErr.message })
      }

      return sendJSON(res, 201, { id: newUser.user.id, email: newUser.user.email })
    } catch (e) {
      return sendJSON(res, 500, { error: (e instanceof Error) ? e.message : String(e) })
    }
  }

  if (req.url === '/users/reset-password' && req.method === 'POST') {
    try {
      let body = ''
      for await (const chunk of req) body += chunk
      const data = JSON.parse(body)
      const { id, password } = data

      if (!id || !password) {
        return sendJSON(res, 400, { error: 'Faltan id o password' })
      }

      const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
        password,
        email_confirm: true,
      })
      if (error) return sendJSON(res, 500, { error: error.message })

      return sendJSON(res, 200, { success: true })
    } catch (e) {
      return sendJSON(res, 500, { error: (e instanceof Error) ? e.message : String(e) })
    }
  }

  sendJSON(res, 404, { error: 'Not found' })
})

server.listen(PORT, () => console.log(`Admin API listening on http://localhost:${PORT}`))
