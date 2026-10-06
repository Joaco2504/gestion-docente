import { chromium } from 'file:///C:/Users/emili/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const PORT = 4183;
const BASE_URL = `http://localhost:${PORT}`;
const SCREENSHOTS_DIR = path.resolve('screenshots/bloque-c');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

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

async function runVisualVerification() {
  let serverProcess;
  let browser;

  try {
    serverProcess = await startServer();
    browser = await chromium.launch({ headless: true });

    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1
    });

    const page = await context.newPage();

    // Iniciar con demo user
    await page.goto(BASE_URL);
    await page.evaluate(() => {
      localStorage.setItem('korum_demo_mode', 'true');
      localStorage.setItem('korum_auth_user', JSON.stringify({
        id: 'demo-docente-001',
        email: 'docente@korum.edu.ar',
        user_metadata: { nombre_completo: 'Prof. Joaquín Pacheco' }
      }));
    });

    const pagesToCapture = [
      { name: '01_dashboard', path: '/dashboard' },
      { name: '02_catedra_alumnos', path: '/catedra/cat-1?tab=alumnos' },
      { name: '03_catedra_asistencias', path: '/catedra/cat-1?tab=asistencias' },
      { name: '04_catedra_libro_temas', path: '/catedra/cat-1?tab=unidades' },
      { name: '05_catedra_calificaciones', path: '/catedra/cat-1?tab=calificaciones' },
      { name: '06_mesas_examen', path: '/mesas-examen' },
      { name: '07_calendario', path: '/calendario' },
      { name: '08_instituciones', path: '/instituciones' },
      { name: '09_configuracion', path: '/configuracion' }
    ];

    console.log('\n--- CAPTURANDO PANTALLAS EN MODO CLARO (DESKTOP 1440px) ---');
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('docentepro_theme', 'light');
    });

    for (const item of pagesToCapture) {
      await page.goto(`${BASE_URL}${item.path}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);
      const outPath = path.join(SCREENSHOTS_DIR, `${item.name}_light_desktop.png`);
      await page.screenshot({ path: outPath, fullPage: false });
      console.log(`✓ Capturado: ${item.name}_light_desktop.png`);
    }

    console.log('\n--- CAPTURANDO PANTALLAS EN MODO OSCURO (DESKTOP 1440px) ---');
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
      localStorage.setItem('docentepro_theme', 'dark');
    });

    for (const item of pagesToCapture) {
      await page.goto(`${BASE_URL}${item.path}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);
      const outPath = path.join(SCREENSHOTS_DIR, `${item.name}_dark_desktop.png`);
      await page.screenshot({ path: outPath, fullPage: false });
      console.log(`✓ Capturado: ${item.name}_dark_desktop.png`);
    }

    console.log('\n--- CAPTURANDO PANTALLAS EN MÓVIL (390px) ---');
    await page.setViewportSize({ width: 390, height: 844 });

    for (const item of [pagesToCapture[0], pagesToCapture[1], pagesToCapture[4], pagesToCapture[6]]) {
      await page.goto(`${BASE_URL}${item.path}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);
      const outPath = path.join(SCREENSHOTS_DIR, `${item.name}_dark_mobile.png`);
      await page.screenshot({ path: outPath, fullPage: false });
      console.log(`✓ Capturado: ${item.name}_dark_mobile.png`);
    }

    console.log('\n🎉 [Bloque C2] Todas las capturas generadas con éxito en screenshots/bloque-c/');

  } catch (err) {
    console.error('Error durante la verificación visual:', err);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    if (serverProcess) {
      serverProcess.kill();
      try {
        spawn('cmd.exe', ['/c', `for /f "tokens=5" %a in ('netstat -aon ^| find ":${PORT}" ^| find "LISTENING"') do taskkill /f /pid %a`], { shell: true });
      } catch (_) {}
    }
  }
}

runVisualVerification();
