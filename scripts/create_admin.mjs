/**
 * create_admin.mjs
 * Crea un usuario administrador en Supabase.
 *
 * USO:
 *   1. Obtén la Service Role Key en: Supabase Dashboard → Settings → API → service_role (secret)
 *   2. Pégala en el .env: SUPABASE_SERVICE_ROLE_KEY=eyJ...
 *   3. Ejecuta: node scripts/create_admin.mjs
 *
 * Puedes cambiar EMAIL, PASSWORD y NOMBRE antes de correr el script.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

// --- Configuración del nuevo admin ---
const EMAIL    = 'admin@telval.com'
const PASSWORD = 'Admin1234!'
const NOMBRE   = 'Administrador TELVAL'
// ------------------------------------

// Leer .env manualmente (sin dotenv)
function loadEnv() {
  try {
    const dir = resolve(fileURLToPath(import.meta.url), '../../')
    const raw = readFileSync(resolve(dir, '.env'), 'utf-8')
    const env = {}
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([^#=]+?)\s*=\s*(.*)\s*$/)
      if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
    }
    return env
  } catch {
    return {}
  }
}

const env = loadEnv()
const SUPABASE_URL      = env.VITE_SUPABASE_URL      || process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY  = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || SERVICE_ROLE_KEY === 'placeholder-service-role-key') {
  console.error('\n❌  Falta la SUPABASE_SERVICE_ROLE_KEY en el archivo .env')
  console.error('   Obtén la clave en: Supabase Dashboard → Settings → API → service_role\n')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  console.log(`\n🔧  Creando usuario admin: ${EMAIL}`)

  // 1. Crear el usuario auth (sin confirmación de email)
  const { data, error } = await supabase.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { nombre_completo: NOMBRE },
  })

  if (error) {
    if (error.message?.includes('already registered')) {
      console.log('⚠️   El email ya existe. Intentando actualizar rol a admin...')
      // Buscar usuario existente
      const { data: list } = await supabase.auth.admin.listUsers()
      const existing = list?.users?.find(u => u.email === EMAIL)
      if (existing) {
        await supabase.from('usuarios').update({ rol: 'admin' }).eq('id', existing.id)
        console.log(`✅  Rol actualizado a admin para ${EMAIL}`)
      }
    } else {
      console.error('❌  Error al crear usuario:', error.message)
      process.exit(1)
    }
    return
  }

  const userId = data.user?.id
  console.log(`✅  Usuario auth creado: ${userId}`)

  // 2. Actualizar perfil en tabla usuarios (el trigger ya lo crea, solo actualizamos)
  await new Promise(r => setTimeout(r, 1000)) // esperar trigger

  const { error: updateErr } = await supabase
    .from('usuarios')
    .upsert({
      id: userId,
      nombre_completo: NOMBRE,
      email: EMAIL,
      rol: 'admin',
      activo: true,
    }, { onConflict: 'id' })

  if (updateErr) {
    console.warn('⚠️   No se pudo actualizar el perfil:', updateErr.message)
    console.log('     Ejecuta este SQL en Supabase → SQL Editor:')
    console.log(`     UPDATE public.usuarios SET rol = 'admin', nombre_completo = '${NOMBRE}' WHERE id = '${userId}';`)
  } else {
    console.log('✅  Perfil configurado como admin en tabla usuarios')
  }

  console.log('\n════════════════════════════════════════')
  console.log('  Usuario administrador listo para usar ')
  console.log('════════════════════════════════════════')
  console.log(`  URL:        http://localhost:5173`)
  console.log(`  Email:      ${EMAIL}`)
  console.log(`  Contraseña: ${PASSWORD}`)
  console.log('════════════════════════════════════════\n')
}

main().catch(console.error)
