import { chromium } from 'file:///C:/Users/emili/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';
import { spawn } from 'child_process';

const PORT = 4180;
const BASE_URL = `http://localhost:${PORT}`;

function startServer() {
  return new Promise((resolve, reject) => {
    console.log(`[Preview Server] Iniciando vite preview en puerto ${PORT}...`);
    const serverProcess = spawn('cmd.exe', ['/c', `npx vite preview --port ${PORT} --strictPort`], {
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    serverProcess.stdout.on('data', (data) => {
      const msg = data.toString();
      if (msg.includes('Local:') || msg.includes('localhost')) {
        console.log(`[Preview Server] Servidor listo: ${msg.trim()}`);
        resolve(serverProcess);
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.warn(`[Preview Server STDERR]: ${data.toString().trim()}`);
    });

    serverProcess.on('error', reject);
    setTimeout(() => resolve(serverProcess), 5000);
  });
}

async function runTests() {
  console.log('========================================================================');
  console.log('  VERIFICACIÓN AUTOMATIZADA BLOQUE A2: PERSISTENCIA DE FECHAS TRAS F5');
  console.log('========================================================================\n');

  let server;
  let browser;
  let allPassed = false;
  const results = [];

  try {
    server = await startServer();
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();

    await context.addInitScript(() => {
      const demoUser = {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'profesor.demo@docentepro.edu.ar',
        user_metadata: {
          nombre: 'Prof. Emilio Martínez',
          nivel: 'TERCIARIO'
        }
      };
      const demoPerfil = {
        id: demoUser.id,
        nombre: 'Prof. Emilio Martínez',
        email: demoUser.email,
        rol: 'superadmin',
        created_at: new Date().toISOString()
      };
      window.localStorage.setItem('docentepro_demo_user', JSON.stringify(demoUser));
      window.localStorage.setItem('docentepro_demo_perfil', JSON.stringify(demoPerfil));
      window.localStorage.setItem('korum_onboarding_v1', 'completed');
    });

    const page = await context.newPage();
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const catedraId = await page.evaluate(() => {
      const stored = localStorage.getItem('demo_catedras');
      return stored ? JSON.parse(stored)[0]?.id : 'cat-1';
    });
    console.log(`Cátedra activa para pruebas: ${catedraId}\n`);

    await page.goto(`${BASE_URL}/catedra/${catedraId}?tab=calificaciones`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    // -------------------------------------------------------------------------
    // TEST CASE 1: Evaluación SIN FECHA PREVIA -> Asignar fecha -> F5 -> Persiste
    // -------------------------------------------------------------------------
    console.log('>>> [TEST 1] Evaluación sin fecha previa:');
    
    // Localizar primera columna de evaluación
    const thCols = page.locator('th[scope="col"]');
    const firstEvalTh = page.locator('th:has(button[title*="Editar datos de"])').first();
    const evalTitle = (await firstEvalTh.locator('.font-semibold').innerText()).trim();
    const dateLabelBefore = (await firstEvalTh.locator('.text-xs').innerText()).trim();
    console.log(`  - Evaluación seleccionada: "${evalTitle}"`);
    console.log(`  - Estado inicial de cabecera: "${dateLabelBefore}"`);

    // Abrir modal de edición
    const editBtn = firstEvalTh.locator('button[title*="Editar datos de"]');
    await editBtn.click();
    await page.waitForTimeout(500);

    const dialog = page.locator('[role="dialog"]');
    const dateInput = dialog.locator('input[type="date"]');
    const inputValBefore = await dateInput.inputValue();
    console.log(`  - Valor inicial en modal: "${inputValBefore || '(vacío)'}"`);

    // Ingresar fecha 2026-10-25
    const testDate1 = '2026-10-25';
    await dateInput.fill(testDate1);
    await page.waitForTimeout(300);

    // Guardar cambios
    const saveBtn = dialog.locator('button[type="submit"]:has-text("Guardar")');
    await saveBtn.click();
    await page.waitForTimeout(1000);

    // Verificar en cabecera antes de F5
    const dateLabelAfterSave = (await firstEvalTh.locator('.text-xs').innerText()).trim();
    console.log(`  - Cabecera tras Guardar: "${dateLabelAfterSave}"`);
    const immediateMatch = dateLabelAfterSave.includes('25-10-2026');

    // RECARGA TOTAL (F5)
    console.log('  - Ejecutando recarga de página (F5)...');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Verificar en cabecera TRAS F5
    const firstEvalThAfterF5 = page.locator('th:has(button[title*="Editar datos de"])').first();
    const dateLabelAfterF5 = (await firstEvalThAfterF5.locator('.text-xs').innerText()).trim();
    console.log(`  - Cabecera TRAS F5: "${dateLabelAfterF5}"`);
    const f5HeaderMatch = dateLabelAfterF5.includes('25-10-2026');

    // Reabrir modal tras F5 para comprobar el campo input
    const editBtnAfterF5 = firstEvalThAfterF5.locator('button[title*="Editar datos de"]');
    await editBtnAfterF5.click();
    await page.waitForTimeout(500);

    const dialogAfterF5 = page.locator('[role="dialog"]');
    const dateInputAfterF5 = dialogAfterF5.locator('input[type="date"]');
    const inputValAfterF5 = await dateInputAfterF5.inputValue();
    console.log(`  - Valor en input de modal TRAS F5: "${inputValAfterF5}"`);
    const f5ModalMatch = inputValAfterF5 === testDate1;

    // Cerrar modal
    await dialogAfterF5.locator('button[type="button"]:has-text("Cancelar")').click();
    await page.waitForTimeout(500);

    const test1Passed = immediateMatch && f5HeaderMatch && f5ModalMatch;
    console.log(`  => RESULTADO TEST 1: ${test1Passed ? 'PASS (Fecha persiste intacta tras F5)' : 'FAIL'}\n`);
    results.push({ test: 'Evaluación sin fecha previa -> Cargar -> F5', pass: test1Passed });

    // -------------------------------------------------------------------------
    // TEST CASE 2: Evaluación CON FECHA -> Modificar fecha -> F5 -> Persiste
    // -------------------------------------------------------------------------
    console.log('>>> [TEST 2] Evaluación con fecha previa (Re-edición):');

    // Reabrir modal
    await editBtnAfterF5.click();
    await page.waitForTimeout(500);

    const dialog2 = page.locator('[role="dialog"]');
    const dateInput2 = dialog2.locator('input[type="date"]');
    
    // Cambiar fecha a 2026-11-15
    const testDate2 = '2026-11-15';
    await dateInput2.fill(testDate2);
    await page.waitForTimeout(300);

    // Guardar cambios
    await dialog2.locator('button[type="submit"]:has-text("Guardar")').click();
    await page.waitForTimeout(1000);

    const dateLabelEdited = (await firstEvalThAfterF5.locator('.text-xs').innerText()).trim();
    console.log(`  - Cabecera tras Guardar nueva fecha: "${dateLabelEdited}"`);

    // RECARGA TOTAL (F5)
    console.log('  - Ejecutando recarga de página (F5)...');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Verificar en cabecera TRAS segundo F5
    const firstEvalThAfterF5_2 = page.locator('th:has(button[title*="Editar datos de"])').first();
    const dateLabelAfterF5_2 = (await firstEvalThAfterF5_2.locator('.text-xs').innerText()).trim();
    console.log(`  - Cabecera TRAS segundo F5: "${dateLabelAfterF5_2}"`);
    const f5HeaderMatch2 = dateLabelAfterF5_2.includes('15-11-2026');

    // Reabrir modal tras F5 para comprobar el campo input
    await firstEvalThAfterF5_2.locator('button[title*="Editar datos de"]').click();
    await page.waitForTimeout(500);

    const dialogAfterF5_2 = page.locator('[role="dialog"]');
    const dateInputAfterF5_2 = dialogAfterF5_2.locator('input[type="date"]');
    const inputValAfterF5_2 = await dateInputAfterF5_2.inputValue();
    console.log(`  - Valor en input de modal TRAS segundo F5: "${inputValAfterF5_2}"`);
    const f5ModalMatch2 = inputValAfterF5_2 === testDate2;

    await dialogAfterF5_2.locator('button[type="button"]:has-text("Cancelar")').click();
    await page.waitForTimeout(500);

    const test2Passed = f5HeaderMatch2 && f5ModalMatch2;
    console.log(`  => RESULTADO TEST 2: ${test2Passed ? 'PASS (Fecha editada persiste intacta tras F5)' : 'FAIL'}\n`);
    results.push({ test: 'Evaluación con fecha previa -> Modificar -> F5', pass: test2Passed });

    // -------------------------------------------------------------------------
    // REGISTRO DE FILA Y CONSULTA SQL
    // -------------------------------------------------------------------------
    console.log('>>> [VERIFICACIÓN SQL / REGISTRO]');
    const rowInStorage = await page.evaluate((cId) => {
      const stored = localStorage.getItem(`evaluaciones_${cId}`);
      if (!stored) return null;
      const list = JSON.parse(stored);
      return list[0];
    }, catedraId);

    console.log('Estado final del registro persistido:');
    console.log(JSON.stringify(rowInStorage, null, 2));

    console.log('\nConsulta SQL equivalente en PostgreSQL/Supabase:');
    console.log(`SELECT id, catedra_id, titulo, tipo, fecha, fecha_entrega, updated_at`);
    console.log(`FROM public.evaluaciones`);
    console.log(`WHERE id = '${rowInStorage?.id}';\n`);

    console.log('Fila devuelta esperada en PostgreSQL:');
    console.table([{
      id: rowInStorage?.id,
      catedra_id: rowInStorage?.catedra_id,
      titulo: rowInStorage?.titulo,
      tipo: rowInStorage?.tipo,
      fecha: rowInStorage?.fecha,
      fecha_entrega: rowInStorage?.fecha_entrega
    }]);

    console.log('========================================================================');
    console.log('  RESUMEN FINAL VERIFICACIÓN BLOQUE A2:');
    results.forEach(r => {
      console.log(`  - [${r.pass ? 'PASS' : 'FAIL'}] ${r.test}`);
    });
    console.log('========================================================================\n');

    allPassed = results.every(r => r.pass);
    if (!allPassed) {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('Error durante la verificación Playwright:', err);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    if (server) {
      try {
        server.kill();
        process.kill(server.pid);
      } catch (_) {}
    }
    process.exit(allPassed ? 0 : 1);
  }
}

runTests();
