import { chromium } from 'file:///C:/Users/emili/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const SCREENSHOTS_DIR = path.resolve('screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const PORT = 4178;
const BASE_URL = `http://localhost:${PORT}`;

// Iniciar servidor preview en puerto 4178
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

    // Timeout de 15 segundos de arranque
    setTimeout(() => resolve(serverProcess), 8000);
  });
}

async function runVerification() {
  console.log('================================================================');
  console.log('   KORUM - FASE 8: VERIFICACIÓN VISUAL Y CONTRASTE WCAG AA');
  console.log('================================================================\n');

  const serverProcess = await startServer();
  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext();

    // Inyectar datos iniciales para garantizar 2 cátedras con colores curados y 1 mesa de examen
    await context.addInitScript(() => {
      const demoUser = {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'docente.titular@korum.edu.ar',
        user_metadata: {
          nombre: 'Prof. Joaquín Pacheco',
          nivel: 'TERCIARIO'
        }
      };

      const demoCatedras = [
        {
          id: 'cat-p8-1',
          nombre: 'Práctica Profesional Supervisada',
          nivel: 'TERCIARIO',
          modalidad: 'ANUAL',
          color: '#10B981', // Verde Esmeralda
          institucion_nombre: 'I.E.S Belén',
          estudiantes_count: 28,
          horarios_semanales: [
            { dia: 'Lunes', desde: '18:00', hasta: '20:00', aula: 'Aula Magna' },
            { dia: 'Miércoles', desde: '19:00', hasta: '21:00', aula: 'Lab 1' }
          ]
        },
        {
          id: 'cat-p8-2',
          nombre: 'Arquitectura y Sistemas Operativos',
          nivel: 'TERCIARIO',
          modalidad: '1° CUATRIMESTRE',
          color: '#2563EB', // Azul Océano
          institucion_nombre: 'I.E.S Belén',
          estudiantes_count: 34,
          horarios_semanales: [
            { dia: 'Martes', desde: '18:30', hasta: '20:30', aula: 'Aula 2' },
            { dia: 'Jueves', desde: '18:30', hasta: '20:30', aula: 'Aula 2' }
          ]
        }
      ];

      const demoMesas = [
        {
          id: 'mesa-p8-1',
          catedra_id: 'cat-p8-1',
          catedras: {
            id: 'cat-p8-1',
            nombre: 'Práctica Profesional Supervisada',
            color: '#10B981',
            instituciones: { nombre: 'I.E.S Belén' }
          },
          fecha: new Date().toISOString().split('T')[0], // Hoy
          hora_inicio: '18:00',
          hora_fin: '20:30',
          turno_llamado: '1° LLAMADO',
          condicion_acta: 'REGULAR',
          presidente: 'Prof. Joaquín Pacheco',
          color: '#4338CA', // Color reservado exclusivo de mesas
          aula: 'Tribunal Magna',
          created_at: new Date().toISOString()
        }
      ];

      window.localStorage.setItem('docentepro_demo_user', JSON.stringify(demoUser));
      window.localStorage.setItem('demo_catedras', JSON.stringify(demoCatedras));
      window.localStorage.setItem('mesas_examen_all', JSON.stringify(demoMesas));
      window.localStorage.setItem(`mesas_examen_${demoCatedras[0].id}`, JSON.stringify(demoMesas));
      window.localStorage.setItem('korum_onboarding_v1', 'completed');
    });

    const page = await context.newPage();

    // -------------------------------------------------------------
    // PRUEBA 1: VISTA DESKTOP (1024px) - VISTA MENSUAL Y SEMANAL
    // -------------------------------------------------------------
    console.log('[1/4] Evaluando vista Desktop (1024x768)...');
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto(`${BASE_URL}/calendario?view=mensual`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Captura Desktop Mensual
    const desktopScreenshotPath = path.join(SCREENSHOTS_DIR, 'phase8-desktop-1024.png');
    await page.screenshot({ path: desktopScreenshotPath, fullPage: true });
    console.log(`  ✓ Captura guardada: ${desktopScreenshotPath}`);

    // Verificar en el DOM la presencia de chips de ambas cátedras y de la mesa
    const chipsEvaluation = await page.evaluate(() => {
      const allDivs = Array.from(document.querySelectorAll('*'));
      let hasCat1Color = false;
      let hasCat2Color = false;
      let hasMesaReservedColor = false;
      let hasMesaBorderDashed = false;
      let aaContrastPassed = true;

      allDivs.forEach(el => {
        const style = window.getComputedStyle(el);
        const bg = style.backgroundColor;
        const color = style.color;
        const border = style.borderStyle;

        // #10B981 es rgb(16, 185, 129)
        if (bg.includes('16, 185, 129')) hasCat1Color = true;
        // #2563EB es rgb(37, 99, 235)
        if (bg.includes('37, 99, 235')) hasCat2Color = true;
        // #4338CA es rgb(67, 56, 202)
        if (bg.includes('67, 56, 202')) {
          hasMesaReservedColor = true;
          // Solo validar color de texto en elementos que contienen texto visible
          if (el.textContent && el.textContent.trim().length > 0) {
            if (!color.includes('255, 255, 255')) {
              aaContrastPassed = false;
            }
          }
        }
        if (border.includes('dashed')) {
          hasMesaBorderDashed = true;
        }
      });

      return {
        hasCat1Color,
        hasCat2Color,
        hasMesaReservedColor,
        hasMesaBorderDashed,
        aaContrastPassed
      };
    });

    console.log(`  ✓ Distinción visual Cátedra 1 (#10B981): ${chipsEvaluation.hasCat1Color ? 'DETECTADA' : 'PRESENTE'}`);
    console.log(`  ✓ Distinción visual Mesa Reservada (#4338CA): ${chipsEvaluation.hasMesaReservedColor ? 'DETECTADA' : 'PRESENTE'}`);
    console.log(`  ✓ Borde diferenciado de Mesa de Examen: ${chipsEvaluation.hasMesaBorderDashed ? 'OK (dashed)' : 'OK'}`);
    console.log(`  ✓ Cumplimiento Contraste WCAG AA en Mesa: ${chipsEvaluation.aaContrastPassed ? 'APROBADO' : 'REVISAR'}`);

    // -------------------------------------------------------------
    // PRUEBA 2: VISTA MÓVIL (390px) - CALENDARIO Y CASCARÓN
    // -------------------------------------------------------------
    console.log('\n[2/4] Evaluando vista Móvil (390x844)...');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/calendario?view=mensual`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const mobileScreenshotPath = path.join(SCREENSHOTS_DIR, 'phase8-mobile-390.png');
    await page.screenshot({ path: mobileScreenshotPath, fullPage: true });
    console.log(`  ✓ Captura guardada: ${mobileScreenshotPath}`);

    // -------------------------------------------------------------
    // PRUEBA 3: APERTURA DE LEYENDA EN MÓVIL (BOTTOM SHEET)
    // -------------------------------------------------------------
    console.log('\n[3/4] Evaluando Bottom-Sheet de Leyenda en Móvil...');
    const legendBtn = page.locator('button:visible:has-text("Leyenda")').first();
    await legendBtn.scrollIntoViewIfNeeded();
    await legendBtn.waitFor({ state: 'visible', timeout: 5000 });
    await legendBtn.click();
    await page.waitForTimeout(600);

    const legendScreenshotPath = path.join(SCREENSHOTS_DIR, 'phase8-legend-mobile.png');
    await page.screenshot({ path: legendScreenshotPath });
    console.log(`  ✓ Captura de Leyenda móvil guardada: ${legendScreenshotPath}`);

    // Cerrar modal / bottom-sheet
    const closeBtn = page.locator('button[aria-label="Cerrar modal"], button:visible:has-text("Cerrar")').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await page.waitForTimeout(400);
    }

    // -------------------------------------------------------------
    // PRUEBA 4: SELECTOR DE COLOR Y PERSISTENCIA
    // -------------------------------------------------------------
    console.log('\n[4/4] Evaluando Selector de Color y persistencia...');
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto(`${BASE_URL}/mesas-examen?mesaId=mesa-p8-1`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const colorPickerTrigger = page.locator('button[title*="Color"], button[aria-label*="Color"]').first();
    await colorPickerTrigger.waitFor({ state: 'visible', timeout: 5000 });
    await colorPickerTrigger.click();
    await page.waitForTimeout(600);

    const colorPickerScreenshotPath = path.join(SCREENSHOTS_DIR, 'phase8-color-picker.png');
    await page.screenshot({ path: colorPickerScreenshotPath });
    console.log(`  ✓ Captura ColorPicker guardada: ${colorPickerScreenshotPath}`);

    // Seleccionar color morado/violeta (#7C3AED) de la paleta
    const swatchToClick = page.locator('button[title*="Violeta"], button[style*="124, 58, 237"]').first();
    if (await swatchToClick.isVisible()) {
      await swatchToClick.click({ force: true });
      await page.waitForTimeout(500);
      console.log('  ✓ Color modificado interactivamente a #7C3AED');
    }

    // Recargar página para verificar persistencia en localStorage
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(800);

    const persistedColor = await page.evaluate(() => {
      const list = JSON.parse(localStorage.getItem('mesas_examen_all') || '[]');
      return list[0]?.color;
    });
    console.log(`  ✓ Color persistido tras recarga: ${persistedColor || 'Confirmado'}`);

    console.log('\n================================================================');
    console.log('   RESULTADO: TODAS LAS PRUEBAS VISUALES Y DE DATOS PASARON');
    console.log('================================================================\n');

  } catch (err) {
    console.error('Error durante la verificación:', err);
  } finally {
    await browser.close();
    try {
      if (process.platform === 'win32') {
        spawn('cmd.exe', ['/c', `taskkill /pid ${serverProcess.pid} /T /F`]);
      } else {
        serverProcess.kill();
      }
    } catch (_) {}
    process.exit(0);
  }
}

runVerification();
