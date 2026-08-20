import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fkxecvvyyvxqbhzbvhsx.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreGVjdnZ5eXZ4cWJoemJ2aHN4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTMwOTEwNywiZXhwIjoyMDk0ODg1MTA3fQ.6_9LxjXF7CT76fCl7BNd2Y87wp-xVVxszda12y_YW40';

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function testAdminUpdate() {
  console.log('\n👨‍💼 === TEST DE UPDATE CON ADMIN CLIENT ===\n');

  try {
    console.log('1️⃣  Usando Service Role Key (bypassea RLS)...\n');

    // Test con Service Role (no necesita autenticación, tiene permisos completos)
    console.log('2️⃣  Intentando UPDATE con cantidad=25...');
    const { data: test1, error: error1, status: status1 } = await supabaseAdmin
      .from('detalle_requisicion')
      .update({ cantidad: 25 })
      .eq('id', 242)
      .select();

    if (error1) {
      console.log(`   ✗ ERROR: ${error1.message}`);
    } else {
      console.log(`   Status: ${status1}, Data: ${JSON.stringify(test1)}`);
    }
    
    // Verificar
    const { data: check1 } = await supabaseAdmin
      .from('detalle_requisicion')
      .select('cantidad')
      .eq('id', 242)
      .single();
    console.log(`   Verificación: cantidad=${check1.cantidad}\n`);

    if (check1.cantidad === 25) {
      console.log('✅ ÉXITO: El UPDATE funcionó con Service Role Key');
      
      // Revertir
      await supabaseAdmin
        .from('detalle_requisicion')
        .update({ cantidad: 3 })
        .eq('id', 242);
    } else {
      console.log('❌ FALLO: Ni siquiera con Service Role Key funciona');
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

testAdminUpdate();
