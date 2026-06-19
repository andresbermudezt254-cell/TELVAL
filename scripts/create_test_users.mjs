import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

function loadEnv() {
  try {
    const scriptDir = path.dirname(fileURLToPath(import.meta.url))
    const projectRoot = process.cwd()
    const envPaths = [
      path.resolve(projectRoot, '.env'),
      path.resolve(scriptDir, '..', '.env'),
    ]

    console.log('projectRoot', projectRoot)
    console.log('scriptDir', scriptDir)
    console.log('envPaths', envPaths)
    for (const envPath of envPaths) {
      if (fs.existsSync(envPath)) {
        console.log('Cargando .env desde:', envPath)
        const raw = fs.readFileSync(envPath, 'utf-8')
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
        console.log('env loaded keys', Object.keys(env))
        return env
      }
    }

    console.warn('No se encontró .env en los paths esperados:', envPaths.join(', '))
    return {}
  } catch (err) {
    console.error('Error cargando .env:', err)
    return {}
  }
}

const env = loadEnv()
const SUPABASE_URL = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SERVICE_KEY = env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
console.log('SUPABASE_URL len', SUPABASE_URL?.length, 'SERVICE_KEY len', SERVICE_KEY?.length)
console.log('SUPABASE_URL startsWith https', SUPABASE_URL?.startsWith('https'))
console.log('SERVICE_KEY startsWith eyJ', SERVICE_KEY?.startsWith('eyJ'))
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_SERVICE_ROLE_KEY en el entorno.')
  process.exit(1)
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const users = [
  { nombre_completo: 'Daniela Ramirez', email: 'daniela.ramirez@telval.com' },
  { nombre_completo: 'Lina Ocampo', email: 'yecid.vera@telval.com' },
  { nombre_completo: 'Julian Osorio', email: 'julian.osorio@telval.com' },
  { nombre_completo: 'Stephania Rozo', email: 'stephania.rozo@telval.com' },
  { nombre_completo: 'Residente Admin Metro', email: 'Residenteadminmetro@telval.com' },
  { nombre_completo: 'Lida Lesmes Nieto', email: 'residentesstmetro@telval.com' },
  { nombre_completo: 'Franderney Trillo', email: 'franderney.trillo@telval.com' },
  { nombre_completo: 'Juan Yepes', email: 'juan.yepes@telval.com' },
  { nombre_completo: 'Deimar Castrillo', email: 'Deimar.castrillo@telval.com' },
]

function buildPassword(fullName) {
  const firstName = fullName.trim().split(' ')[0] || fullName.trim()
  const normalized = firstName.charAt(0).toUpperCase() + firstName.slice(1)
  return `${normalized}22*`
}

async function findUserByEmail(email) {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ limit: 100, query: email })
  if (error) throw error
  return data?.users?.find((user) => user.email?.toLowerCase() === email.toLowerCase())
}

async function main() {
  console.log('Creando/actualizando usuarios de prueba...')

  for (const user of users) {
    const password = buildPassword(user.nombre_completo)
    try {
      const existing = await findUserByEmail(user.email)
      let userId = existing?.id
      if (existing) {
        console.log(`Usuario existente encontrado: ${user.email} (${userId}). Actualizando contraseña y metadata...`)
        const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          password,
          email_confirm: true,
          user_metadata: { nombre_completo: user.nombre_completo },
        })
        if (error) throw error
      } else {
        console.log(`Creando usuario nuevo: ${user.email}`)
        const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: user.email,
          password,
          email_confirm: true,
          user_metadata: { nombre_completo: user.nombre_completo },
        })
        if (createError) throw createError
        userId = createData.user?.id
        if (!userId) throw new Error('No se recibió userId al crear el usuario')
      }

      const { error: upsertError } = await supabaseAdmin
        .from('usuarios')
        .upsert(
          {
            id: userId,
            nombre_completo: user.nombre_completo,
            email: user.email,
            rol: 'empleado',
            activo: true,
            especialidad: null,
            whatsapp: null,
          },
          { onConflict: 'id' }
        )

      if (upsertError) throw upsertError

      console.log(`✅  ${user.email} listo. Contraseña: ${password}`)
    } catch (error) {
      console.error(`❌  Error con ${user.email}:`, (error instanceof Error ? error.message : String(error)))
    }
  }

  console.log('\nTerminó el script de creación de usuarios.')
}

main().catch((e) => {
  console.error('Error fatal:', e instanceof Error ? e.message : String(e))
  process.exit(1)
})
