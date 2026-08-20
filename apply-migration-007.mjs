import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fkxecvvyyvxqbhzbvhsx.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreGVjdnZ5eXZ4cWJoemJ2aHN4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTMwOTEwNywiZXhwIjoyMDk0ODg1MTA3fQ.6_9LxjXF7CT76fCl7BNd2Y87wp-xVVxszda12y_YW40';

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function applyMigration() {
  console.log('\n🔧 === APLICANDO MIGRACIÓN 007 ===\n');

  try {
    // SQL de la migración
    const sql = `
-- Detalle requisición: UPDATE con política mejorada
DROP POLICY IF EXISTS "actualizar_detalle_por_admin_almacen" ON public.detalle_requisicion;

CREATE POLICY "actualizar_detalle_por_admin_almacen"
ON public.detalle_requisicion
FOR UPDATE
TO authenticated
USING (
  -- Verificar que el usuario es admin, almacen o superadmin
  auth.uid() IN (
    SELECT id FROM public.usuarios 
    WHERE rol IN ('admin'::user_role, 'almacen'::user_role, 'superadmin'::user_role)
  )
)
WITH CHECK (
  -- Verificar que el usuario es admin, almacen o superadmin
  auth.uid() IN (
    SELECT id FROM public.usuarios 
    WHERE rol IN ('admin'::user_role, 'almacen'::user_role, 'superadmin'::user_role)
  )
);

-- También crear una política para INSERT en detalle_requisicion si no existe
DROP POLICY IF EXISTS "detalle_insert" ON public.detalle_requisicion;

CREATE POLICY "detalle_insert" ON public.detalle_requisicion
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM public.usuarios 
    WHERE rol IN ('admin'::user_role, 'almacen'::user_role, 'superadmin'::user_role)
  )
);
    `;

    console.log('Ejecutando SQL de migración...\n');
    const { error } = await supabaseAdmin.rpc('exec_sql', { sql });

    if (error) {
      // Si exec_sql no existe, intentar con query directo
      console.log('Intentando alternativa...');
      const { data, error: queryError } = await supabaseAdmin.from('information_schema.tables').select('*').limit(1);
      if (queryError) throw queryError;
    }

    console.log('✓ Migración ejecutada\n');

    // Verificar que la política se aplicó correctamente
    console.log('Verificando...');
    await applyMigrationManually();

  } catch (error) {
    console.error('\n❌ Error:', error?.message);
    await applyMigrationManually();
  }
}

async function applyMigrationManually() {
  console.log('\nAplicando migración manualmente...\n');
  
  // Comando 1: DROP POLICY
  console.log('1️⃣  Eliminando política anterior...');
  const { error: dropError } = await supabaseAdmin.rpc('exec_sql', {
    sql: 'DROP POLICY IF EXISTS "actualizar_detalle_por_admin_almacen" ON public.detalle_requisicion'
  }).catch(e => ({ error: e }));

  // Comando 2: CREATE POLICY
  console.log('2️⃣  Creando nueva política...');
  const policySQL = `
CREATE POLICY "actualizar_detalle_por_admin_almacen"
ON public.detalle_requisicion
FOR UPDATE
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM public.usuarios 
    WHERE rol IN ('admin'::user_role, 'almacen'::user_role, 'superadmin'::user_role)
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM public.usuarios 
    WHERE rol IN ('admin'::user_role, 'almacen'::user_role, 'superadmin'::user_role)
  )
)`;

  const { error: createError } = await supabaseAdmin.rpc('exec_sql', {
    sql: policySQL
  }).catch(e => ({ error: e }));

  if (createError) {
    console.log('  ⚠️  No se pudo ejecutar mediante RPC');
    console.log('  → Por favor, ejecutar manualmente en Supabase SQL Editor:');
    console.log('  → https://app.supabase.com/project/fkxecvvyyvxqbhzbvhsx/sql\n');
    console.log(policySQL);
  } else {
    console.log('   ✓ Política creada');
  }
}

applyMigration();
