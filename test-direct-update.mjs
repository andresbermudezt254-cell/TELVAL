import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fkxecvvyyvxqbhzbvhsx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreGVjdnZ5eXZ4cWJoemJ2aHN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMDkxMDcsImV4cCI6MjA5NDg4NTEwN30.aRsUSEoLbdVnoQdCOwq5wdLK0eIifQE02tRqAfNoROI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDirectUpdate() {
  console.log('\n🧪 === TEST DE UPDATE DIRECTO ===\n');

  try {
    // 1. Login
    console.log('1️⃣  Autenticando...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'andresbermudezt254@gmail.com',
      password: 'Andres22*'
    });

    if (authError) throw authError;
    console.log('   ✓ Login exitoso\n');

    // 2. Obtener un detalle para actualizar
    console.log('2️⃣  Obteniendo detalle 242 (REQ 70)...');
    const { data: item, error: itemError } = await supabase
      .from('detalle_requisicion')
      .select('id, requisicion_id, cantidad, precio_unitario, total_linea')
      .eq('id', 242)
      .single();

    if (itemError) throw itemError;
    console.log(`   ✓ Encontrado:cantidad=${item.cantidad}, precio=${item.precio_unitario}\n`);

    // 3. Intentar UPDATE
    console.log('3️⃣  Intentando UPDATE con nueva cantidad (99)...');
    const newCantidad = 99;
    const newTotalLinea = (Number(item.precio_unitario) || 0) * newCantidad;
    
    console.log(`   Enviando: cantidad=${newCantidad}, total_linea=${newTotalLinea}`);
    
    // Intentar con .select() al final
    const { data: updateResult, error: updateError, status } = await supabase
      .from('detalle_requisicion')
      .update({ cantidad: newCantidad, total_linea: newTotalLinea })
      .eq('id', 242)
      .select();

    console.log(`   Status HTTP: ${status}`);
    console.log(`   Data returned: ${JSON.stringify(updateResult)}`);

    if (updateError) {
      console.log(`   ✗ ERROR en UPDATE: ${updateError.message}`);
      console.log(`   Detalles: ${JSON.stringify(updateError)}\n`);
      throw updateError;
    }

    console.log('   ✓ UPDATE ejecutado\n');

    // 4. Verificar cambio
    console.log('4️⃣  Verificando si el cambio se guardó...');
    await new Promise(r => setTimeout(r, 2000)); // Esperar 2 segundos

    const { data: verified, error: verifyError } = await supabase
      .from('detalle_requisicion')
      .select('id, cantidad, total_linea')
      .eq('id', 242)
      .single();

    if (verifyError) throw verifyError;

    console.log(`   Cantidad actual: ${verified.cantidad}`);
    console.log(`   Total línea: ${verified.total_linea}\n`);

    if (verified.cantidad === newCantidad) {
      console.log('✅ ÉXITO: El UPDATE se guardó correctamente');
    } else {
      console.log(`❌ FALLO: El cambio NO se guardó (esperaba ${newCantidad}, encontró ${verified.cantidad})`);
    }

    // 5. Revertir cambio
    console.log('\n5️⃣  Revirtiendo cambio...');
    const { error: revertError } = await supabase
      .from('detalle_requisicion')
      .update({ cantidad: item.cantidad, total_linea: item.total_linea })
      .eq('id', 242);

    if (!revertError) {
      console.log('   ✓ Cambio revertido');
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

testDirectUpdate();
