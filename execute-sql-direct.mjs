import fetch from 'node-fetch';

const supabaseUrl = 'https://fkxecvvyyvxqbhzbvhsx.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreGVjdnZ5eXZ4cWJoemJ2aHN4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTMwOTEwNywiZXhwIjoyMDk0ODg1MTA3fQ.6_9LxjXF7CT76fCl7BNd2Y87wp-xVVxszda12y_YW40';

const sql = `DROP POLICY IF EXISTS "actualizar_detalle_por_admin_almacen" ON public.detalle_requisicion;
CREATE POLICY "actualizar_detalle_por_admin_almacen"
ON public.detalle_requisicion
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);`;

async function executeSQL() {
  console.log('\n🔧 === EJECUTANDO SQL VÍA SUPABASE API ===\n');

  try {
    console.log('1️⃣  Enviando SQL a Supabase...\n');
    
    // Nota: Supabase no tiene un endpoint directo para ejecutar SQL
    // Pero podemos usar el REST API para hacer cambios a la schema

    // Alternativa: Usar psql directamente si está disponible
    console.log('Intentando usar psql...');
    const { execSync } = await import('child_process');
    
    // Construir la connection string
    const connStr = `postgresql://postgres:YOUR_PASSWORD@fkxecvvyyvxqbhzbvhsx.supabase.co:5432/postgres`;
    
    console.log('⚠️  psql requiere contraseña de la BD (no disponible en este contexto)');
    console.log('\n✅ ALTERNATIVA RECOMENDADA:');
    console.log('Ejecuta manualmente en el SQL Editor de Supabase:');
    console.log('https://app.supabase.com/project/fkxecvvyyvxqbhzbvhsx/sql/new\n');
    console.log('SQL a pegar:');
    console.log('='.repeat(60));
    console.log(sql);
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

executeSQL();
