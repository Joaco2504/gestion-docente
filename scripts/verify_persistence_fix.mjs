import { chromium } from 'file:///C:/Users/emili/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';
import { spawn } from 'child_process';
import path from 'path';

const PORT = 4173;
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

async function runTest() {
  console.log('================================================================');
  console.log('  VERIFICACIÓN PLAYWRIGHT: PERSISTENCIA N/E TRAS RECARGA (F5)');
  console.log('================================================================\n');

  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  // Inject demo user and state
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
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });

  const catedraId = await page.evaluate(() => {
    const stored = localStorage.getItem('demo_catedras');
    return stored ? JSON.parse(stored)[0]?.id : null;
  });

  if (!catedraId) {
    throw new Error('No se encontró cátedra para testear');
  }

  console.log(`Accediendo a cátedra: ${catedraId} tab=calificaciones...`);
  await page.goto(`${BASE_URL}/catedra/${catedraId}?tab=calificaciones`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // 1. Obtener primera celda de TP
  const gradeButtons = await page.locator('button[title*="Editar calificación"]').all();
  console.log(`Total de celdas encontradas: ${gradeButtons.length}`);
  if (gradeButtons.length === 0) throw new Error('No se encontraron celdas de calificación');

  const firstBtn = gradeButtons[0];
  const initialText = (await firstBtn.innerText()).trim();
  console.log(`Valor original de la celda: "${initialText}"`);

  // 2. Abrir modal y seleccionar "No entregó"
  await firstBtn.click();
  await page.waitForTimeout(1000);

  const noEntregoBtn = page.locator('button:has-text("Marcar como \\"No entregó\\"")').first();
  const visible = await noEntregoBtn.isVisible();
  if (!visible) throw new Error('Botón "No entregó" no visible en modal');

  await noEntregoBtn.click();
  await page.waitForTimeout(500);

  // 3. Guardar
  console.log('Guardando "No entregó"...');
  const submitBtn = page.locator('button[type="submit"]:has-text("Guardar")').first();
  await submitBtn.click();
  await page.waitForTimeout(1500);

  const afterSaveText = (await firstBtn.innerText()).trim();
  console.log(`Texto en celda tras guardar: "${afterSaveText}"`);
  if (afterSaveText !== 'N/E') {
    throw new Error(`La celda debió mostrar "N/E", pero muestra "${afterSaveText}"`);
  }

  // Verificar estado en localStorage
  const storedNotas = await page.evaluate((cid) => {
    return JSON.parse(localStorage.getItem(`notas_${cid}`) || '[]');
  }, catedraId);
  const updatedItem = storedNotas.find(n => n.evaluacion_id === 'eval-1' && n.estudiante_id === 'est-1');
  console.log('Registro guardado en localStorage:', updatedItem);
  if (updatedItem.valor !== null || updatedItem.estado !== 'NO_ENTREGO') {
    throw new Error(`Registro en localStorage inválido: valor=${updatedItem.valor}, estado=${updatedItem.estado}`);
  }

  // 4. RECARGA TOTAL (F5)
  console.log('\n--- SIMULANDO RECARGA DE PÁGINA (F5) ---');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  const firstBtnAfterReload = page.locator('button[title*="Editar calificación"]').first();
  const afterReloadText = (await firstBtnAfterReload.innerText()).trim();
  console.log(`Texto en celda TRAS RECARGAR (F5): "${afterReloadText}"`);

  if (afterReloadText === '1') {
    throw new Error('FALLO CRÍTICO: La celda se convirtió en "1" tras F5 en lugar de persistir como "N/E"!');
  }
  if (afterReloadText !== 'N/E') {
    throw new Error(`La celda muestra "${afterReloadText}" en lugar de "N/E" tras F5!`);
  }

  console.log('✔ EXCLUSIVO: La celda persiste correctamente como "N/E" tras F5.');

  // 5. Testear re-edición a calificación numérica estándar (ej. 8)
  console.log('\n--- TESTEANDO RE-EDICIÓN A CALIFICACIÓN NUMÉRICA (8) ---');
  await firstBtnAfterReload.click();
  await page.waitForTimeout(1000);

  // El input dentro del form modal
  const gradeInput = page.locator('form input').first();
  await gradeInput.fill('8');
  await page.waitForTimeout(500);

  const saveNumericBtn = page.locator('button[type="submit"]:has-text("Guardar")').first();
  await saveNumericBtn.click();
  await page.waitForTimeout(1500);

  const numericText = (await firstBtnAfterReload.innerText()).trim();
  console.log(`Texto tras guardar nota 8: "${numericText}"`);
  if (numericText !== '8') {
    throw new Error(`Esperado "8", obtenido "${numericText}"`);
  }

  // F5 tras número
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const numericAfterF5 = (await page.locator('button[title*="Editar calificación"]').first().innerText()).trim();
  console.log(`Texto nota numérica tras F5: "${numericAfterF5}"`);
  if (numericAfterF5 !== '8') {
    throw new Error(`Esperado "8" tras F5, obtenido "${numericAfterF5}"`);
  }
  console.log('✔ NOTA NUMÉRICA PERSISTE CORRECTAMENTE TRAS F5.');

  // 6. Testear "No entregó" nuevamente para asegurar idempotencia
  console.log('\n--- RETESTEANDO "NO ENTREGÓ" PARA COMPROBAR IDEMPOTENCIA ---');
  const btnFinal = page.locator('button[title*="Editar calificación"]').first();
  await btnFinal.click();
  await page.waitForTimeout(1000);
  await page.locator('button:has-text("Marcar como \\"No entregó\\"")').first().click();
  await page.waitForTimeout(500);
  await page.locator('button[type="submit"]:has-text("Guardar")').first().click();
  await page.waitForTimeout(1500);

  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const finalReloadText = (await page.locator('button[title*="Editar calificación"]').first().innerText()).trim();
  console.log(`Texto final verificado tras F5: "${finalReloadText}"`);
  if (finalReloadText !== 'N/E') {
    throw new Error(`Esperado "N/E" tras F5, obtenido "${finalReloadText}"`);
  }
  console.log('✔ VERIFICACIÓN EXITOSA: PERSISTENCIA COMPLETA COMPROBADA.');

  await browser.close();
  server.kill();
  console.log('\n================================================================');
  console.log('  TODAS LAS PRUEBAS DE PERSISTENCIA PASARON EXITOSAMENTE');
  console.log('================================================================');
  process.exit(0);
}

runTest().catch(err => {
  console.error('\n❌ ERROR EN VERIFICACIÓN:', err.message);
  process.exit(1);
});
