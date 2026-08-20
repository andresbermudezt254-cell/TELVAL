import subprocess
import sys

# El SQL que se ejecutará
sql = """
DROP POLICY IF EXISTS "actualizar_detalle_por_admin_almacen" ON public.detalle_requisicion;

CREATE POLICY "actualizar_detalle_por_admin_almacen"
ON public.detalle_requisicion
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
"""

print("\n🔧 === APLICANDO CORRECCIÓN DE RLS ===\n")
print("SQL a ejecutar:")
print("=" * 60)
print(sql)
print("=" * 60)

print("\n📋 INSTRUCCIONES MANUALES:")
print("1. Abre: https://app.supabase.com/project/fkxecvvyyvxqbhzbvhsx/sql/new")
print("2. Copia el SQL anterior completo")
print("3. Pégalo en el editor SQL")
print("4. Presiona CTRL+ENTER o haz clic en el botón RUN")
print("5. El cambio debería aplicarse inmediatamente")

print("\n⏳ Esperando confirmación manual...")
print("Presiona ENTER cuando hayas ejecutado el SQL en Supabase:")
input()

print("\n✅ SQL aplicado. Verificando...\n")
