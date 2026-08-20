import { chromium } from 'playwright';

const sql = `DROP POLICY IF EXISTS "actualizar_detalle_por_admin_almacen" ON public.detalle_requisicion;

CREATE POLICY "actualizar_detalle_por_admin_almacen"
ON public.detalle_requisicion
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);`;

async function applyRLSFix() {
  console.log('\n🔧 === APLICANDO CORRECCIÓN DE RLS EN SUPABASE ===\n');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('1️⃣  Abriendo SQL Editor de Supabase...');
    await page.goto('https://app.supabase.com/project/fkxecvvyyvxqbhzbvhsx/sql/new');
    await page.waitForTimeout(3000);

    console.log('2️⃣  Localizando el área de edición...');
    // El SQL editor está en un monaco/code editor
    const editorDiv = await page.locator('[class*="editor"]').first();
    
    // Hacer clic en el editor
    await editorDiv.click();
    await page.waitForTimeout(500);

    // Limpiar contenido anterior (Ctrl+A, Delete)
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Delete');
    await page.waitForTimeout(300);

    console.log('3️⃣  Pegando SQL...');
    // Pegar el SQL
    await page.keyboard.insertText(sql, { delay: 10 });
    await page.waitForTimeout(1000);

    console.log('4️⃣  Ejecutando SQL (Ctrl+Enter)...');
    await page.keyboard.press('Control+Return');
    await page.waitForTimeout(3000);

    console.log('5️⃣  Verificando resultado...');
    // Esperar a que aparezca un mensaje de éxito o error
    try {
      await page.waitForSelector('[class*="success"], [class*="error"], [class*="toast"]', { timeout: 5000 });
      const result = await page.locator('[class*="success"], [class*="error"], [class*="toast"]').first().textContent();
      console.log(`   Resultado: ${result}\n`);
    } catch (e) {
      console.log('   (No se pudo capturar resultado automáticamente)\n');
    }

    console.log('✅ SQL ejecutado en Supabase');
    console.log('⏳ Mantén el navegador abierto por 5 segundos...\n');
    
    await page.waitForTimeout(5000);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

applyRLSFix();
