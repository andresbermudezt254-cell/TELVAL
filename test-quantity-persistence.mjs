import { chromium } from 'playwright';

const TELVAL_URL = 'http://localhost:5173';
const TEST_EMAIL = 'andresbermudezt254@gmail.com';
const TEST_PASSWORD = 'Andres22*';
const REQUISITION_ID = 70;

async function runFunctionalTest() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Capturar console logs de la página web
  page.on('console', (msg) => {
    const type = msg.type();
    if (type === 'log') console.log(`   [PAGE LOG] ${msg.text()}`);
    else if (type === 'error') console.error(`   [PAGE ERROR] ${msg.text()}`);
    else if (type === 'warn') console.warn(`   [PAGE WARN] ${msg.text()}`);
  });

  try {
    console.log('\n📋 === INICIO DE PRUEBA DE CANTIDAD ===\n');

    // 1. Login
    console.log('1️⃣  Navegando a login...');
    await page.goto(`${TELVAL_URL}/login`);
    await page.waitForLoadState('domcontentloaded');

    console.log('2️⃣  Completando credenciales...');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    
    console.log('3️⃣  Enviando login...');
    await page.click('button[type="submit"]');

    // Esperar redirección
    await page.waitForURL(/requisiciones|dashboard/, { timeout: 15000 });
    console.log('✅ Login exitoso\n');

    // 2. Navegar a requisición
    console.log(`4️⃣  Navegando a requisición ${REQUISITION_ID}...`);
    await page.goto(`${TELVAL_URL}/admin/requisiciones/${REQUISITION_ID}`);
    await page.waitForLoadState('domcontentloaded');
    console.log('📄 Página de requisición cargada\n');

    // 3. Buscar inputs de cantidad
    console.log('5️⃣  Buscando inputs de cantidad...');
    await page.waitForSelector('input[type="number"]', { timeout: 5000 });
    const quantityInputs = await page.locator('input[type="number"]').all();
    console.log(`🔢 Encontrados ${quantityInputs.length} inputs\n`);

    if (quantityInputs.length > 0) {
      const firstInput = quantityInputs[0];
      
      // Obtener valor actual
      const currentValue = await firstInput.inputValue();
      console.log(`📌 Valor inicial: ${currentValue}`);

      // Cambiar cantidad
      const newValue = '15';
      console.log(`\n6️⃣  Cambiando cantidad a ${newValue}...`);
      await firstInput.clear();
      await firstInput.fill(newValue);
      
      // Disparar blur event para triggear el persistCantidad
      console.log('✏️  Disparando blur event...');
      await firstInput.blur();

      // Esperar a que React Query actualice
      console.log('\n7️⃣  Esperando actualización (3 segundos)...');
      await page.waitForTimeout(3000);

      // Verificar valor
      const verifiedValue = await firstInput.inputValue();
      console.log(`\n🔍 Verificación 1 - Valor después de 3s: ${verifiedValue}`);

      // Esperar más
      console.log('8️⃣  Esperando 5 segundos más...');
      await page.waitForTimeout(5000);

      // Verificar nuevamente
      const finalValue = await firstInput.inputValue();
      console.log(`🔍 Verificación 2 - Valor después de 8s: ${finalValue}`);

      // Verificar que el total se actualizó
      console.log('\n9️⃣  Verificando total estimado...');
      const totalElement = await page.locator('text=Total estimado').first();
      if (totalElement) {
        const totalText = await totalElement.textContent();
        console.log(`💰 Total: ${totalText}`);
      }

      // Navegar away y back para confirmar persistencia
      console.log('\n🔄 Navegando a otra página y volviendo...');
      await page.goto(`${TELVAL_URL}/admin/requisiciones`);
      await page.waitForTimeout(2000);
      await page.goto(`${TELVAL_URL}/admin/requisiciones/${REQUISITION_ID}`);
      await page.waitForLoadState('domcontentloaded');
      
      // Esperar a que el refetch sea completado
      console.log('⏳ Esperando refetch del componente...');
      await page.waitForTimeout(3000);

      const afterNavigationValue = await firstInput.inputValue();
      console.log(`🔍 Verificación 3 - Después de navegar: ${afterNavigationValue}`);

      // Resultado final
      console.log('\n' + '='.repeat(50));
      if (finalValue === newValue && afterNavigationValue === newValue) {
        console.log('✅ PRUEBA EXITOSA: La cantidad persistió correctamente!');
        console.log(`   Inicial: ${currentValue} → Final: ${finalValue}`);
        console.log('   El bug fue CORREGIDO ✓');
      } else {
        console.log('❌ PRUEBA FALLIDA: La cantidad fue revertida');
        console.log(`   Inicial: ${currentValue} → Final: ${finalValue}`);
      }
      console.log('='.repeat(50) + '\n');

      return finalValue === newValue && afterNavigationValue === newValue;
    } else {
      console.log('❌ No se encontraron inputs de cantidad');
      return false;
    }
  } catch (error) {
    console.error('\n❌ Error durante la prueba:', error.message);
    return false;
  } finally {
    // NO cerrar el navegador - dejar abierto para inspección
    console.log('🔍 Navegador dejado abierto para inspección manual...');
    // await browser.close();
  }
}

// Ejecutar prueba
runFunctionalTest().then(success => {
  process.exit(success ? 0 : 1);
});
