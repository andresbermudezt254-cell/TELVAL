import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const supabaseUrl = process.env.SUPABASE_URL || 'https://sb-fkxecvvyyvxqbhzbvhsx.supabase.co'
const supabaseKey = process.env.SUPABASE_ANON_KEY || ''

if (!supabaseKey) {
  console.error('Error: SUPABASE_ANON_KEY no está configurado en .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function runMigration() {
  try {
    // Leer la migración SQL
    const migrationPath = join(__dirname, '../supabase/migrations/009_stored_procedure_marcar_completado.sql')
    const sql = fs.readFileSync(migrationPath, 'utf-8')

    console.log('📝 Ejecutando migración 009...')
    console.log('SQL length:', sql.length, 'chars')

    // Ejecutar con rpc (nota: esto requiere estar autenticado como admin/service role)
    // Alternativa: usar sql.raw() si Supabase lo soporta

    // Para esto necesitamos usar la API de SQL directamente
    // const { data, error } = await supabase.sql.raw(sql)
    
    // O si no, ejecutar paso por paso
    console.log('⚠️ Nota: Para ejecutar migración SQL, necesitas:')
    console.log('   1. Ir a Supabase Dashboard → SQL Editor')
    console.log('   2. Copiar el contenido de: supabase/migrations/009_stored_procedure_marcar_completado.sql')
    console.log('   3. Pegar y ejecutar')
    
    console.log('\n📋 SQL a ejecutar:\n')
    console.log(sql.substring(0, 500))
    console.log('...')

  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

runMigration()
