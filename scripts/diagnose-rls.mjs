import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://fkxecvvyyvxqbhzbvhsx.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreGVjdnZ5eXZ4cWJoemJ2aHN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDk4Mjc5MjcsImV4cCI6MjAyNTQwNzkyN30.DZNq6oKOKK5H55KGGgkHdvHEgUhSEbCgA3VPiNGq8tg";

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
  console.log("🔍 DIAGNÓSTICO DE RLS POLICIES\n");

  try {
    // Try to insert a test record to usuarios
    console.log("1️⃣ Intentando INSERT en usuarios...");
    
    const { data, error } = await supabase
      .from("usuarios")
      .insert({
        id: crypto.randomUUID(),
        email: "test-sync@telval.com",
        nombre_completo: "Test User",
        rol: "almacen",
      })
      .select();

    if (error) {
      console.error("❌ Error en INSERT:", error.message);
      console.error("   Código:", error.code);
      console.error("   Hint:", error.hint);
    } else {
      console.log("✅ INSERT exitoso:", data);
    }

    // Try to read usuarios
    console.log("\n2️⃣ Intentando SELECT de usuarios...");
    const { data: readData, error: readError } = await supabase
      .from("usuarios")
      .select("id, email, rol")
      .limit(5);

    if (readError) {
      console.error("❌ Error en SELECT:", readError.message);
    } else {
      console.log(`✅ SELECT exitoso: ${readData?.length || 0} registros`);
    }

    // Try to call a function
    console.log("\n3️⃣ Intentando RPC test...");
    const { data: rpcData, error: rpcError } = await supabase.rpc("test_function", {});
    if (rpcError) {
      console.error("❌ Error en RPC:", rpcError.message);
    } else {
      console.log("✅ RPC exitoso");
    }
  } catch (e) {
    console.error("Error general:", (e as Error).message);
  }
}

diagnose();
