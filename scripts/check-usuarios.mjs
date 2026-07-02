import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://fkxecvvyyvxqbhzbvhsx.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreGVjdnZ5eXZ4cWJoemJ2aHN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDk4Mjc5MjcsImV4cCI6MjAyNTQwNzkyN30.DZNq6oKOKK5H55KGGgkHdvHEgUhSEbCgA3VPiNGq8tg";

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  try {
    // Check how many users
    const { count, error } = await supabase
      .from("usuarios")
      .select("*", { count: "exact", head: true });

    console.log("✅ Usuarios en tabla:", count || 0);

    if (count && count > 0) {
      // Show them
      const { data } = await supabase
        .from("usuarios")
        .select("id, email, rol, nombre_completo")
        .limit(5);
      
      console.log("\n👥 Primeros usuarios:");
      data?.forEach(u => console.log(`  - ${u.email} (${u.rol})`));
    } else {
      console.log("❌ NO HAY USUARIOS EN LA TABLA - FALTA SINCRONIZACIÓN");
    }
  } catch (e) {
    console.error("Error:", e.message);
  }
}

check();
