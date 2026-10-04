import { chromium } from 'file:///C:/Users/emili/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const SCREENSHOTS_DIR = path.resolve('screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// Start preview server
console.log('--- Iniciando servidor preview de Vite en puerto 4173 ---');
const previewProcess = spawn('npx.cmd', ['vite', 'preview', '--port', '4173'], {
  stdio: 'pipe',
  shell: true
});

let serverReady = false;

previewProcess.stdout.on('data', (data) => {
  const str = data.toString();
  if (str.includes('http://localhost:4173') || str.includes('Local:')) {
    serverReady = true;
  }
});

// Wait up to 10s for server
for (let i = 0; i < 20; i++) {
  if (serverReady) break;
  await new Promise(r => setTimeout(r, 500));
}

console.log('Servidor listo o timeout alcanzado, iniciando pruebas con Playwright...');

const VIEWPORTS = [
  { width: 320, height: 640, label: '320px-se-compact' },
  { width: 360, height: 740, label: '360px-android-standard' },
  { width: 390, height: 844, label: '390px-iphone-13-14' },
  { width: 414, height: 896, label: '414px-iphone-plus' },
  { width: 768, height: 1024, label: '768px-ipad-portrait' },
  { width: 820, height: 1180, label: '820px-ipad-air' },
  { width: 1024, height: 768, label: '1024px-desktop' }
];

const results = [];

try {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Seed demo auth in localStorage
  await page.goto('http://localhost:4173/login');
  await page.evaluate(() => {
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
    localStorage.setItem('docentepro_demo_user', JSON.stringify(demoUser));
    localStorage.setItem('docentepro_demo_perfil', JSON.stringify(demoPerfil));
  });

  // Verify viewports
  for (const vp of VIEWPORTS) {
    console.log(`\n========================================`);
    console.log(`PROBANDO VIEWPORT: ${vp.width}x${vp.height} (${vp.label})`);
    console.log(`========================================`);

    await page.setViewportSize({ width: vp.width, height: vp.height });

    // 1. Dashboard Page
    await page.goto('http://localhost:4173/dashboard', { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    // Overflow check
    const dashboardOverflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return {
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
        innerWidth: window.innerWidth,
        hasHorizontalOverflow: doc.scrollWidth > window.innerWidth
      };
    });

    // Check BottomNav & QuickDock visibility
    const navChecks = await page.evaluate((width) => {
      const bottomNav = document.querySelector('nav[aria-label="Navegación principal inferior"]');
      const quickDock = document.querySelector('button[aria-label*="atajos de aula"]');
      const isMobile = width < 1024;
      
      const bottomNavVisible = bottomNav ? window.getComputedStyle(bottomNav).display !== 'none' : false;
      const quickDockVisible = quickDock ? window.getComputedStyle(quickDock).display !== 'none' : false;

      return {
        bottomNavVisible,
        quickDockVisible,
        bottomNavCorrect: isMobile ? bottomNavVisible : !bottomNavVisible,
        quickDockCorrect: isMobile ? quickDockVisible : !quickDockVisible
      };
    }, vp.width);

    // Screenshot Dashboard Light
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `dashboard-${vp.label}-light.png`), fullPage: false });

    // Dark Mode Dashboard
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `dashboard-${vp.label}-dark.png`), fullPage: false });
    await page.evaluate(() => document.documentElement.classList.remove('dark'));

    // 2. Catedra Detail Page (Alumnos tab)
    await page.goto('http://localhost:4173/catedra/cat-1?tab=alumnos', { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);

    const catedraOverflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return {
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
        innerWidth: window.innerWidth,
        hasHorizontalOverflow: doc.scrollWidth > window.innerWidth
      };
    });

    // Design Fork check: Cards on <1024px vs Table on >=1024px
    const forkCheck = await page.evaluate((width) => {
      const isMobile = width < 1024;
      // Check for mobile student cards
      const mobileCardSelector = document.querySelectorAll('[role="button"][aria-label*="ficha académica"]');
      const desktopTable = document.querySelector('.tbl');

      const cardsVisible = mobileCardSelector.length > 0;
      const tableVisible = desktopTable ? window.getComputedStyle(desktopTable).display !== 'none' : false;

      return {
        cardsCount: mobileCardSelector.length,
        hasTable: !!desktopTable,
        forkCorrect: isMobile ? (cardsVisible) : (tableVisible)
      };
    }, vp.width);

    // Touch targets check on mobile (<1024px)
    const touchTargetCheck = await page.evaluate((width) => {
      if (width >= 1024) return { pass: true, failures: [] };
      const interactiveElements = document.querySelectorAll('button, a, input, select');
      const failures = [];
      for (const el of interactiveElements) {
        // Skip hidden elements or tiny helper spans
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') continue;

        // Check target area: target should be at least 40px in smallest dimension or inside a touch target wrapper
        if (rect.height < 36 && rect.width < 36) {
          failures.push({
            tag: el.tagName,
            text: el.innerText?.slice(0, 20),
            height: Math.round(rect.height),
            width: Math.round(rect.width)
          });
        }
      }
      return {
        pass: failures.length === 0,
        failures: failures.slice(0, 5)
      };
    }, vp.width);

    // Screenshots Catedra Alumnos (Light & Dark)
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `alumnos-${vp.label}-light.png`), fullPage: false });
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `alumnos-${vp.label}-dark.png`), fullPage: false });
    await page.evaluate(() => document.documentElement.classList.remove('dark'));

    const result = {
      viewport: vp.label,
      width: vp.width,
      dashboardHorizontalOverflow: dashboardOverflow.hasHorizontalOverflow,
      catedraHorizontalOverflow: catedraOverflow.hasHorizontalOverflow,
      bottomNavCorrect: navChecks.bottomNavCorrect,
      quickDockCorrect: navChecks.quickDockCorrect,
      designForkCorrect: forkCheck.forkCorrect,
      touchTargetsPass: touchTargetCheck.pass
    };

    results.push(result);
    console.log(`Resultado para ${vp.label}:`, JSON.stringify(result, null, 2));
  }

  await browser.close();
} catch (err) {
  console.error('Error durante la verificación:', err);
} finally {
  previewProcess.kill();
}

console.log('\n========================================');
console.log('RESUMEN GENERAL DE VERIFICACIÓN:');
console.log('========================================');
console.table(results);
