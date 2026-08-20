import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fkxecvvyyvxqbhzbvhsx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreGVjdnZ5eXZ4cWJoemJ2aHN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMDkxMDcsImV4cCI6MjA5NDg4NTEwN30.aRsUSEoLbdVnoQdCOwq5wdLK0eIifQE02tRqAfNoROI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSimpleUpdate() {
  console.log('\n🔧 === TEST DE UPDATE SIMPLE ===\n');

  try {
    // Login
    console.log('1️⃣  Autenticando...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'andresbermudezt254@gmail.com',
      password: 'Andres22*'
    });

    if (authError) throw authError;
    console.log('   ✓ Login exitoso\n');

    // Test 1: Update solo con cantidad
    console.log('2️⃣  Test 1: Actualizar SOLO la cantidad a 5...');
    const { data: test1, error: error1, status: status1 } = await supabase
      .from('detalle_requisicion')
      .update({ cantidad: 5 })
      .eq('id', 242)
      .select();

    console.log(`   Status: ${status1}, Data: ${JSON.stringify(test1)}`);
    
    // Verificar
    const { data: check1 } = await supabase
      .from('detalle_requisicion')
      .select('cantidad')
      .eq('id', 242)
      .single();
    console.log(`   Verificación: cantidad=${check1.cantidad}\n`);

    // Test 2: Update solo con total_linea
    console.log('3️⃣  Test 2: Actualizar SOLO total_linea a 999999...');
    const { data: test2, error: error2, status: status2 } = await supabase
      .from('detalle_requisicion')
      .update({ total_linea: 999999 })
      .eq('id', 242)
      .select();

    console.log(`   Status: ${status2}, Data: ${JSON.stringify(test2)}`);
    
    // Verificar
    const { data: check2 } = await supabase
      .from('detalle_requisicion')
      .select('total_linea')
      .eq('id', 242)
      .single();
    console.log(`   Verificación: total_linea=${check2.total_linea}\n`);

    // Test 3: Update con un campo que no sea números
    console.log('4️⃣  Test 3: Actualizar notas...');
    const { data: test3, error: error3, status: status3 } = await supabase
      .from('detalle_requisicion')
      .update({ notas: 'TEST UPDATE' })
      .eq('id', 242)
      .select();

    console.log(`   Status: ${status3}, Data: ${JSON.stringify(test3)}`);
    
    // Verificar
    const { data: check3 } = await supabase
      .from('detalle_requisicion')
      .select('notas')
      .eq('id', 242)
      .single();
    console.log(`   Verificación: notas=${check3.notas}\n`);

    // Limpiar
    console.log('5️⃣  Limpiando...');
    await supabase
      .from('detalle_requisicion')
      .update({ cantidad: 3, total_linea: 533916, notas: null })
      .eq('id', 242);

  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

testSimpleUpdate();
