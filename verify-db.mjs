import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fkxecvvyyvxqbhzbvhsx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreGVjdnZ5eXZ4cWJoemJ2aHN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMDkxMDcsImV4cCI6MjA5NDg4NTEwN30.aRsUSEoLbdVnoQdCOwq5wdLK0eIifQE02tRqAfNoROI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  console.log('\n📊 === VERIFICACIÓN DE BASE DE DATOS ===\n');

  try {
    // 1. Login con la cuenta de admin
    console.log('1️⃣  Autenticando como admin...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'andresbermudezt254@gmail.com',
      password: 'Andres22*'
    });

    if (authError) {
      console.log('   ⚠️  Login fallido:', authError.message);
      console.log('   Intentando sin autenticación...\n');
    } else {
      console.log('   ✓ Login exitoso\n');
    }

    // 2. Obtener todas las requisiciones
    console.log('2️⃣  Obteniendo requisiciones...');
    const { data: reqs, error: reqsError } = await supabase
      .from('requisiciones')
      .select('id, codigo, estado, total_estimado')
      .order('id', { ascending: false })
      .limit(10);

    if (reqsError) throw reqsError;
    console.log(`   ✓ Total requisiciones encontradas: ${reqs?.length || 0}\n`);

    if (reqs && reqs.length > 0) {
      console.log('   Últimas requisiciones:');
      reqs.forEach((r) => {
        console.log(`   [ID ${r.id}] ${r.codigo} - Estado: ${r.estado} - Total: $${r.total_estimado}`);
      });

      // 3. Usar la primera requisición disponible
      const targetReqId = reqs[0].id;
      console.log(`\n3️⃣  Verificando detalles de requisición ID=${targetReqId}...\n`);

      // 4. Obtener los detalles de la requisición
      const { data: detalles, error: detallesError } = await supabase
        .from('detalle_requisicion')
        .select('id, cantidad, precio_unitario, total_linea')
        .eq('requisicion_id', targetReqId);

      if (detallesError) throw detallesError;
      console.log(`   ✓ Total detalles: ${detalles?.length || 0}\n`);

      if (detalles && detalles.length > 0) {
        console.log('   Cantidades actuales:');
        detalles.forEach((d, idx) => {
          console.log(`   [${idx}] ID=${d.id}: Cantidad=${d.cantidad}, Precio=${d.precio_unitario}, Total=${d.total_linea}`);
        });
      }
    } else {
      console.log('   ✗ No hay requisiciones disponibles');
    }

    // 5. Buscar cualquier detalle con cantidad = 15
    console.log('\n4️⃣  Buscando detalles con cantidad = 15 en toda la BD...');
    const { data: detallesConQuince } = await supabase
      .from('detalle_requisicion')
      .select('id, requisicion_id, cantidad, precio_unitario, total_linea')
      .eq('cantidad', 15);

    if (detallesConQuince && detallesConQuince.length > 0) {
      console.log('   ✓ Encontrados detalles con cantidad 15:');
      detallesConQuince.forEach(d => {
        console.log(`   [REQ ${d.requisicion_id}] ID=${d.id}: Cantidad=${d.cantidad}`);
      });
    } else {
      console.log('   ✗ No hay detalles con cantidad 15 en toda la BD');
    }

    console.log('\n✅ Verificación completada\n');
  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

checkDatabase();
