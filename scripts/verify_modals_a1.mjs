import { chromium } from 'file:///C:/Users/emili/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';
import { spawn } from 'child_process';

const PORT = 4178;
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
    setTimeout(() => resolve(serverProcess), 4000);
  });
}

async function runTests() {
  console.log('========================================================================');
  console.log('  VERIFICACIÓN AUTOMATIZADA BLOQUE A1: CIERRE DE MODALES ([X], ESC, FONDO)');
  console.log('========================================================================\n');

  let server;
  let browser;
  const testResults = [];

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

    const dialog = page.locator('[role="dialog"]');

    // Helper genérico para probar las 3 vías de cierre de un modal
    async function testModalCloseMechanisms(modalName, openActionFn) {
      console.log(`>>> Probando Modal: "${modalName}"`);
      const result = { name: modalName, closeBtn: false, escape: false, backdrop: false };

      // 1. Probar Cierre con Botón [X] (clic real de mouse)
      await openActionFn();
      await page.waitForTimeout(400);
      if (!await dialog.isVisible()) {
        throw new Error(`No se pudo abrir el modal "${modalName}" para la prueba de [X]`);
      }
      const closeBtn = dialog.locator('button[aria-label="Cerrar ventana"], button[aria-label="Cerrar"], button[title*="Cerrar"]').first();
      await closeBtn.click();
      await page.waitForTimeout(400);
      result.closeBtn = !(await dialog.isVisible());

      // 2. Probar Cierre con Escape
      await openActionFn();
      await page.waitForTimeout(400);
      if (!await dialog.isVisible()) {
        throw new Error(`No se pudo abrir el modal "${modalName}" para la prueba de Escape`);
      }
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
      result.escape = !(await dialog.isVisible());

      // 3. Probar Cierre con Clic en Backdrop (Fondo)
      await openActionFn();
      await page.waitForTimeout(400);
      if (!await dialog.isVisible()) {
        throw new Error(`No se pudo abrir el modal "${modalName}" para la prueba de Backdrop`);
      }
      // Clic fuera del diálogo (coordenadas 15, 15)
      await page.mouse.click(15, 15);
      await page.waitForTimeout(400);
      result.backdrop = !(await dialog.isVisible());

      console.log(`  - Cierre por Botón [X]: ${result.closeBtn ? 'PASS (Cierra OK)' : 'FAIL'}`);
      console.log(`  - Cierre por Escape:    ${result.escape ? 'PASS (Cierra OK)' : 'FAIL'}`);
      console.log(`  - Cierre por Fondo:     ${result.backdrop ? 'PASS (Cierra OK)' : 'FAIL'}`);
      testResults.push(result);
    }

    // TEST 1: Modal "Editar Evaluación" (GradesTab)
    await page.goto(`${BASE_URL}/catedra/${catedraId}?tab=calificaciones`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await testModalCloseMechanisms('Editar Evaluación (GradesTab)', async () => {
      const btn = page.locator('th button[title*="Editar datos"]').first();
      await btn.click();
    });

    // TEST 2: Modal "Editar Clase" (LibroTemasTab)
    await page.goto(`${BASE_URL}/catedra/${catedraId}?tab=libro-temas`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await testModalCloseMechanisms('Editar Clase (LibroTemasTab)', async () => {
      const btn = page.locator('button[title*="Editar contenido de la clase"]').first();
      await btn.click();
    });

    // TEST 3: Modal "Editar Tema / EditClassModal" (AttendanceTab)
    await page.goto(`${BASE_URL}/catedra/${catedraId}?tab=asistencias`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const editTemaBtn = page.locator('button[title*="Editar fecha, tema"]').first();
    if (await editTemaBtn.isVisible()) {
      await testModalCloseMechanisms('EditClassModal (AttendanceTab)', async () => {
        await editTemaBtn.click();
      });
    }

    // TEST 4: Modal "Editar Cátedra" (EditarCatedraModal)
    await page.goto(`${BASE_URL}/catedra/${catedraId}?tab=calificaciones`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    await testModalCloseMechanisms('Editar Cátedra (EditarCatedraModal)', async () => {
      const accionesBtn = page.locator('button:has-text("Acciones")').first();
      await accionesBtn.click();
      await page.waitForTimeout(200);
      const editCatBtn = page.locator('button:has-text("Editar Cátedra")').first();
      await editCatBtn.click();
    });

    // TEST 5: Modal "Legajo / Detalle de Alumno" (EstudianteDetailModal en StudentsTab)
    await page.goto(`${BASE_URL}/catedra/${catedraId}?tab=alumnos`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await testModalCloseMechanisms('Legajo / Detalle de Alumno (StudentsTab)', async () => {
      const btn = page.locator('button[title*="Ver ficha del estudiante"]').first();
      await btn.click();
    });

    // TEST 6: Modal "Editar Alumno" (EditStudentModal en StudentsTab)
    await testModalCloseMechanisms('Editar Alumno (StudentsTab)', async () => {
      const btn = page.locator('button[title*="Editar datos del alumno"]').first();
      await btn.click();
    });

    // TEST 7: Modal "Editar Recurso" (EditarRecursoModal en ResourcesTab)
    await page.goto(`${BASE_URL}/catedra/${catedraId}?tab=recursos`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const editRecursoBtn = page.locator('button[title*="Editar recurso"]').first();
    if (await editRecursoBtn.isVisible()) {
      await testModalCloseMechanisms('Editar Recurso (ResourcesTab)', async () => {
        await editRecursoBtn.click();
      });
    }

    // TEST 8: Modal "Registrar Falta Docente" (RegistrarFaltaDocenteModal en AttendanceTab)
    await page.goto(`${BASE_URL}/catedra/${catedraId}?tab=asistencias`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const registrarFaltaBtn = page.locator('button:has-text("Registrar Falta")').first();
    if (await registrarFaltaBtn.isVisible()) {
      await testModalCloseMechanisms('Registrar Falta Docente (AttendanceTab)', async () => {
        await registrarFaltaBtn.click();
      });
    }

    // TEST 9: Modal "Crear Cátedra" (CreateCatedraModal en Dashboard)
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const nuevaCatedraBtn = page.locator('button:has-text("Nueva Cátedra")').first();
    if (await nuevaCatedraBtn.isVisible()) {
      await testModalCloseMechanisms('Crear Cátedra (Dashboard)', async () => {
        await nuevaCatedraBtn.click();
      });
    }

    // RESUMEN FINAL
    console.log('\n========================================================================');
    console.log('                    RESUMEN DE RESULTADOS BLOQUE A1                   ');
    console.log('========================================================================');
    let allPassed = true;
    for (const r of testResults) {
      const pass = r.closeBtn && r.escape && r.backdrop;
      if (!pass) allPassed = false;
      console.log(`${pass ? '✅ PASS' : '❌ FAIL'}: ${r.name.padEnd(42)} -> [X]: ${r.closeBtn}, ESC: ${r.escape}, Fondo: ${r.backdrop}`);
    }

    if (allPassed) {
      console.log('\n🎉 TODOS LOS MODALES PROBADOS CERRARON EXITOSAMENTE CON [X], ESCAPE Y FONDO.');
    } else {
      console.error('\n⚠️ HUBO FALLAS EN ALGUNOS MODALES.');
      process.exitCode = 1;
    }

  } catch (err) {
    console.error('Error durante ejecución de pruebas:', err);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    if (server) server.kill('SIGTERM');
  }
}

runTests();
