import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://fkxecvvyyvxqbhzbvhsx.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreGVjdnZ5eXZ4cWJoemJ2aHN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDk4Mjc5MjcsImV4cCI6MjAyNTQwNzkyN30.DZNq6oKOKK5H55KGGgkHdvHEgUhSEbCgA3VPiNGq8tg";

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
  console.log("🔍 Verificando estado de migraciones...\n");

  // 1. Contar usuarios en auth y en tabla usuarios
  try {
    const { data: authUsers, error: authErr } = await supabase
      .from("usuarios")
      .select("*", { count: "exact", head: true });

    console.log(`📊 Usuarios en tabla 'usuarios': ${authUsers?.length || 0}`);
    if (authErr) console.error("Error:", authErr.message);
  } catch (e) {
    console.error("Error verificando usuarios:", e.message);
  }

  // 2. Verificar estructura de la tabla detalle_requisicion
  try {
    const { data, error } = await supabase.rpc("get_table_info", {
      table_name: "detalle_requisicion",
    });
    if (data) {
      console.log("\n📋 Estructura de detalle_requisicion:", JSON.stringify(data, null, 2));
    }
  } catch (e) {
    console.log("(RPC no disponible, continuando...)");
  }

  // 3. Contar requisiciones parciales
  try {
    const { data: parciales, error } = await supabase
      .from("requisiciones")
      .select("id, estado", { count: "exact" })
      .eq("estado", "PARCIAL");

    console.log(`\n📦 Requisiciones en estado PARCIAL: ${parciales?.length || 0}`);
  } catch (e) {
    console.error("Error:", e.message);
  }

  // 4. Verificar RLS policies
  try {
    const { data, error } = await supabase.rpc("get_policies", {});
    if (data) {
      console.log("\n🔐 RLS Policies:", JSON.stringify(data, null, 2));
    }
  } catch (e) {
    console.log("(RPC de policies no disponible)");
  }

  // 5. Intentar UPDATE de prueba sin autenticación
  try {
    const { data, error } = await supabase
      .from("detalle_requisicion")
      .update({ completado: false })
      .eq("id", 139)
      .select();

    if (error) {
      console.log(`\n⚠️  UPDATE test (sin auth): ${error.message}`);
    } else {
      console.log(`\n✅ UPDATE test (sin auth): ${data.length} filas`);
    }
  } catch (e) {
    console.error("Error en UPDATE test:", e.message);
  }
}

verify();
