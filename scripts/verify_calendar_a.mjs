import { chromium } from 'file:///C:/Users/emili/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';
import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const PORT = 4189;
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
  console.log('  VERIFICACIÓN AUTOMATIZADA BLOQUE A: DIAGNÓSTICO Y SOLUCIÓN PANTALLA NEGRA');
  console.log('========================================================================\n');

  if (!fs.existsSync('screenshots')) {
    fs.mkdirSync('screenshots', { recursive: true });
  }

  let server;
  let browser;
  let allPassed = true;
  const testResults = [];

  const baseDemoUser = {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'profesor.demo@docentepro.edu.ar',
    user_metadata: {
      nombre_completo: 'Prof. Emilio Martínez',
      nombre: 'Prof. Emilio Martínez',
      nivel: 'TERCIARIO'
    }
  };

  const baseDemoPerfil = {
    id: baseDemoUser.id,
    nombre: 'Prof. Emilio Martínez',
    email: baseDemoUser.email,
    rol: 'superadmin',
    created_at: new Date().toISOString()
  };

  try {
    server = await startServer();
    browser = await chromium.launch({ headless: true });

    // Helper para ejecutar una prueba individual
    async function testScenario({ name, viewport, theme, setupStorage, navigateUrl, verifyFn, screenshotFile }) {
      console.log(`\n▶ Corriendo escenario: ${name}...`);
      const context = await browser.newContext({
        viewport: viewport || { width: 1280, height: 800 }
      });

      const consoleErrors = [];
      const pageErrors = [];

      const page = await context.newPage();
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      page.on('pageerror', err => {
        pageErrors.push(err.message);
      });

      await page.addInitScript(({ user, perfil, themeMode, customSetup }) => {
        window.localStorage.setItem('docentepro_demo_user', JSON.stringify(user));
        window.localStorage.setItem('docentepro_demo_perfil', JSON.stringify(perfil));
        window.localStorage.setItem('korum_onboarding_v1', 'completed');
        window.localStorage.setItem('docentepro_theme', themeMode || 'dark');

        if (customSetup?.empty) {
          window.localStorage.setItem('demo_catedras', JSON.stringify([]));
          window.localStorage.setItem('mesas_examen_all', JSON.stringify([]));
        } else if (customSetup?.nullDate) {
          window.localStorage.setItem('mesas_examen_all', JSON.stringify([
            {
              id: 'mesa-null-date',
              catedra_id: 'cat-1',
              fecha: null,
              hora_inicio: null,
              hora_fin: null,
              titulo: 'Mesa Sin Fecha'
            }
          ]));
        } else if (customSetup?.nullColor) {
          window.localStorage.setItem('demo_catedras', JSON.stringify([
            {
              id: 'cat-null-color',
              nombre: 'Cátedra Sin Color',
              color: null,
              institucion_id: 'inst-1',
              institucion_nombre: 'Instituto Demo'
            }
          ]));
        }
      }, {
        user: baseDemoUser,
        perfil: baseDemoPerfil,
        themeMode: theme,
        customSetup: setupStorage
      });

      const targetUrl = navigateUrl || `${BASE_URL}/calendario`;
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1200);

      // Evaluar estado del DOM
      const domState = await page.evaluate(() => {
        const root = document.getElementById('root');
        const childrenCount = root ? root.children.length : 0;
        const innerTextLength = root ? (root.innerText || '').trim().length : 0;
        const hasBlackScreen = childrenCount === 0 || innerTextLength === 0;
        const htmlClasses = document.documentElement.className;
        return {
          rootExists: Boolean(root),
          childrenCount,
          innerTextLength,
          hasBlackScreen,
          htmlClasses
        };
      });

      if (screenshotFile) {
        await page.screenshot({ path: path.join('screenshots', screenshotFile), fullPage: false });
      }

      const customCheck = verifyFn ? await verifyFn(page, { consoleErrors, pageErrors, domState }) : true;
      const passed = !domState.hasBlackScreen && customCheck;

      const result = {
        name,
        passed,
        domState,
        consoleErrorsCount: consoleErrors.length,
        pageErrorsCount: pageErrors.length,
        screenshot: screenshotFile
      };

      testResults.push(result);
      if (!passed) allPassed = false;

      console.log(`  [Resultado]: ${passed ? '✅ APROBADO' : '❌ FALLÓ'}`);
      console.log(`  #root hijos: ${domState.childrenCount}, Texto: ${domState.innerTextLength} chars, Pantalla negra: ${domState.hasBlackScreen ? 'SÍ' : 'NO'}`);
      if (consoleErrors.length > 0) {
        console.log(`  Errores consola (${consoleErrors.length}): ${consoleErrors.slice(0, 3).join(' | ')}`);
      }
      if (pageErrors.length > 0) {
        console.log(`  Excepciones JS (${pageErrors.length}): ${pageErrors.slice(0, 3).join(' | ')}`);
      }

      await context.close();
      return result;
    }

    // =========================================================================
    // 1. CONDICIÓN NORMAL: 1280px Modo Oscuro
    // =========================================================================
    await testScenario({
      name: '1. Datos Normales - 1280px Modo Oscuro',
      viewport: { width: 1280, height: 800 },
      theme: 'dark',
      screenshotFile: 'calendar_normal_1280_dark.png',
      verifyFn: async (page, { consoleErrors, pageErrors, domState }) => {
        const titleVisible = await page.evaluate(() => document.body.innerText.includes('Calendario'));
        return titleVisible && pageErrors.length === 0;
      }
    });

    // =========================================================================
    // 2. CONDICIÓN NORMAL: 1280px Modo Claro
    // =========================================================================
    await testScenario({
      name: '2. Datos Normales - 1280px Modo Claro',
      viewport: { width: 1280, height: 800 },
      theme: 'light',
      screenshotFile: 'calendar_normal_1280_light.png',
      verifyFn: async (page, { pageErrors }) => {
        return pageErrors.length === 0;
      }
    });

    // =========================================================================
    // 3. CONDICIÓN NORMAL: 390px (Mobile) Modo Oscuro
    // =========================================================================
    await testScenario({
      name: '3. Datos Normales - 390px Mobile Modo Oscuro',
      viewport: { width: 390, height: 844 },
      theme: 'dark',
      screenshotFile: 'calendar_normal_390_dark.png',
      verifyFn: async (page, { pageErrors }) => {
        return pageErrors.length === 0;
      }
    });

    // =========================================================================
    // 4. CONDICIÓN NORMAL: 390px (Mobile) Modo Claro
    // =========================================================================
    await testScenario({
      name: '4. Datos Normales - 390px Mobile Modo Claro',
      viewport: { width: 390, height: 844 },
      theme: 'light',
      screenshotFile: 'calendar_normal_390_light.png',
      verifyFn: async (page, { pageErrors }) => {
        return pageErrors.length === 0;
      }
    });

    // =========================================================================
    // 5. CONDICIÓN VACÍA: 0 eventos, 0 cátedras
    // =========================================================================
    await testScenario({
      name: '5. Calendario Vacío (0 eventos, 0 cátedras)',
      viewport: { width: 1280, height: 800 },
      theme: 'dark',
      setupStorage: { empty: true },
      screenshotFile: 'calendar_empty_1280.png',
      verifyFn: async (page, { pageErrors }) => {
        return pageErrors.length === 0;
      }
    });

    // =========================================================================
    // 6. CONDICIÓN FECHA NULA / CORRUPTA
    // =========================================================================
    await testScenario({
      name: '6. Evento con fecha nula o corrupta (sin RangeError)',
      viewport: { width: 1280, height: 800 },
      theme: 'dark',
      setupStorage: { nullDate: true },
      screenshotFile: 'calendar_null_date_1280.png',
      verifyFn: async (page, { pageErrors }) => {
        const hasRangeError = pageErrors.some(e => e.includes('Invalid time value'));
        return !hasRangeError && pageErrors.length === 0;
      }
    });

    // =========================================================================
    // 7. CONDICIÓN CÁTEDRA SIN COLOR
    // =========================================================================
    await testScenario({
      name: '7. Cátedra sin color (color: null / fallback)',
      viewport: { width: 1280, height: 800 },
      theme: 'dark',
      setupStorage: { nullColor: true },
      screenshotFile: 'calendar_null_color_1280.png',
      verifyFn: async (page, { pageErrors }) => {
        return pageErrors.length === 0;
      }
    });

    // =========================================================================
    // 8. SIMULACIÓN DE EXCEPCIÓN FORZADA (ERROR BOUNDARY)
    // =========================================================================
    await testScenario({
      name: '8. Excepción forzada: ErrorBoundary visible y app usable',
      viewport: { width: 1280, height: 800 },
      theme: 'dark',
      navigateUrl: `${BASE_URL}/calendario?crash=true`,
      screenshotFile: 'calendar_error_boundary_1280.png',
      verifyFn: async (page, { domState }) => {
        const errorBoundaryInfo = await page.evaluate(() => {
          const text = document.body.innerText;
          const hasTitle = text.includes('Error en el Calendario') || text.includes('Error al cargar este módulo');
          const hasRetry = text.includes('Reintentar');
          const hasHome = text.includes('Volver al inicio');
          const hasNavbar = document.querySelector('header') !== null || document.querySelector('nav') !== null;
          return { hasTitle, hasRetry, hasHome, hasNavbar };
        });

        console.log(`    -> ErrorBoundary detectado: ${errorBoundaryInfo.hasTitle}, Botón Reintentar: ${errorBoundaryInfo.hasRetry}, Volver: ${errorBoundaryInfo.hasHome}, Shell Navegación vivo: ${errorBoundaryInfo.hasNavbar}`);
        return errorBoundaryInfo.hasTitle && errorBoundaryInfo.hasRetry && errorBoundaryInfo.hasHome && errorBoundaryInfo.hasNavbar;
      }
    });

    console.log('\n========================================================================');
    console.log('  RESUMEN DE PRUEBAS DE VERIFICACIÓN');
    console.log('========================================================================');
    for (const res of testResults) {
      console.log(`- ${res.passed ? '✅' : '❌'} ${res.name}: #root hijos=${res.domState.childrenCount}, pantallaNegra=${res.domState.hasBlackScreen ? 'SÍ' : 'NO'}`);
    }

  } catch (err) {
    console.error('Error durante la verificación:', err);
    allPassed = false;
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (server && server.pid) {
      console.log('[Preview Server] Deteniendo servidor de forma sincrónica...');
      try {
        execSync(`taskkill /pid ${server.pid} /f /t`, { stdio: 'ignore' });
      } catch (_) {}
    }
  }

  console.log(`\n[ESTADO FINAL]: ${allPassed ? 'TODAS LAS PRUEBAS PASARON EXITOSAMENTE 🎉' : 'FALLARON ALGUNAS PRUEBAS ❌'}`);
  process.exit(allPassed ? 0 : 1);
}

runTests();
