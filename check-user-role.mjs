import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fkxecvvyyvxqbhzbvhsx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreGVjdnZ5eXZ4cWJoemJ2aHN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMDkxMDcsImV4cCI6MjA5NDg4NTEwN30.aRsUSEoLbdVnoQdCOwq5wdLK0eIifQE02tRqAfNoROI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUser() {
  console.log('\n👤 === VERIFICACIÓN DE USUARIO ===\n');

  try {
    // Login con la cuenta de admin
    console.log('Autenticando...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'andresbermudezt254@gmail.com',
      password: 'Andres22*'
    });

    if (authError) throw authError;
    console.log('✓ Login exitoso\n');

    const userId = authData.user.id;
    console.log(`User ID: ${userId}`);
    console.log(`Email: ${authData.user.email}\n`);

    // Verificar el usuario en la tabla usuarios
    console.log('Obteniendo datos del usuario...');
    const { data: user, error: userError } = await supabase
      .from('usuarios')
      .select('id, email, nombre_completo, rol, especialidad, activo')
      .eq('id', userId)
      .single();

    if (userError) throw userError;
    
    console.log(`\nNombre: ${user.nombre_completo}`);
    console.log(`Email: ${user.email}`);
    console.log(`Rol: ${user.rol}`);
    console.log(`Especialidad: ${user.especialidad}`);
    console.log(`Activo: ${user.activo}`);

    // Verificar si puede hacer UPDATE a detalle_requisicion
    console.log('\n\n✅ CONCLUSIÓN:');
    if (user.rol === 'admin' || user.rol === 'almacen' || user.rol === 'superadmin') {
      console.log(`✓ El usuario TIENE permisos para hacer UPDATE (rol: ${user.rol})`);
      console.log('✓ Las políticas RLS deberían permitir la actualización');
    } else {
      console.log(`✗ El usuario NO tiene permisos para hacer UPDATE (rol: ${user.rol})`);
      console.log('✗ Necesita ser admin, almacen o superadmin');
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

checkUser();
