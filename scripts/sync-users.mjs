import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://fkxecvvyyvxqbhzbvhsx.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreGVjdnZ5eXZ4cWJoemJ2aHN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDk4Mjc5MjcsImV4cCI6MjAyNTQwNzkyN30.DZNq6oKOKK5H55KGGgkHdvHEgUhSEbCgA3VPiNGq8tg";

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncUsers() {
  console.log("🔄 Iniciando sincronización de usuarios...\n");

  try {
    // 1. Obtener todos los usuarios de auth.users (esto solo funciona con service role)
    // Como no tenemos service role, vamos a obtener solo los que podemos consultar

    // 2. Insertar usuarios desde auth.users a public.usuarios
    const { data, error } = await supabase.rpc("sync_auth_users_to_usuarios", {});

    if (error) {
      console.log(`⚠️ Error ejecutando RPC: ${error.message}`);
      console.log("Intentando INSERT directo...\n");

      // Si el RPC falla, intentamos un INSERT directo (esto probablemente falle por RLS)
      // const { data: inserted, error: insertError } = await supabase
      //   .from("usuarios")
      //   .insert([
      //     {
      //       email: "admin@telval.com",
      //       nombre_completo: "Administrador TELVAL",
      //       rol: "admin",
      //     },
      //   ]);
      // if (insertError) console.error("INSERT Error:", insertError.message);
    } else {
      console.log(`✅ Sincronización completada:`, data);
    }

    // 3. Verificar cuántos usuarios hay ahora
    const { count, error: countError } = await supabase
      .from("usuarios")
      .select("*", { count: "exact", head: true });

    console.log(`\n📊 Total de usuarios en tabla 'usuarios': ${count}`);

    if (count > 0) {
      // Mostrar últimos 5 usuarios
      const { data: users, error: usersError } = await supabase
        .from("usuarios")
        .select("id, email, nombre_completo, rol")
        .limit(5)
        .order("created_at", { ascending: false });

      if (!usersError) {
        console.log("\n👥 Últimos usuarios sincronizados:");
        users.forEach((u) => {
          console.log(`  - ${u.email} (${u.rol})`);
        });
      }
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
}

syncUsers();
