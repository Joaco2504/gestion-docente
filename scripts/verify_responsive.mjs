import { chromium } from 'file:///C:/Users/emili/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';
import fs from 'fs';
import path from 'path';

const SCREENSHOTS_DIR = path.resolve('screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

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

async function run() {
  console.log('--- Iniciando suite de pruebas Playwright en http://localhost:4173 ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  // Inyectar estado de autenticación Demo antes de la carga de cualquier script en la página
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
    window.localStorage.setItem(`korum_onboarding_completed_${demoUser.id}`, 'true');
    window.localStorage.setItem('korum_onboarding_v1', 'completed');
  });

  const page = await context.newPage();

  // Cargar primero dashboard para verificar inicialización de datos
  await page.goto('http://localhost:4173/dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const catId = await page.evaluate(() => {
    try {
      const stored = localStorage.getItem('demo_catedras');
      if (stored) {
        const list = JSON.parse(stored);
        if (list[0]?.id) return list[0].id;
      }
    } catch (_) {}
    return 'cat-1';
  });

  console.log(`Cátedra activa de prueba: ${catId}`);

  for (const vp of VIEWPORTS) {
    console.log(`\n========================================`);
    console.log(`PROBANDO VIEWPORT: ${vp.width}x${vp.height} (${vp.label})`);
    console.log(`========================================`);

    await page.setViewportSize({ width: vp.width, height: vp.height });

    // 1. Dashboard Page
    await page.goto('http://localhost:4173/dashboard', { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);

    const dashboardData = await page.evaluate((width) => {
      const doc = document.documentElement;
      const bottomNav = document.querySelector('nav[aria-label="Navegación principal inferior"]');
      const quickDock = document.querySelector('button[aria-label*="atajos de aula"]');
      const isMobile = width < 1024;

      const bottomNavVisible = bottomNav ? (window.getComputedStyle(bottomNav).display !== 'none' && bottomNav.getBoundingClientRect().height > 0) : false;
      let quickDockVisible = false;
      if (quickDock) {
        const r = quickDock.getBoundingClientRect();
        const style = window.getComputedStyle(quickDock);
        const parentStyle = quickDock.parentElement ? window.getComputedStyle(quickDock.parentElement) : null;
        quickDockVisible = r.width > 0 && r.height > 0 && style.display !== 'none' && parentStyle?.display !== 'none';
      }

      return {
        hasOverflow: doc.scrollWidth > window.innerWidth,
        scrollWidth: doc.scrollWidth,
        innerWidth: window.innerWidth,
        bottomNavCorrect: isMobile ? bottomNavVisible : !bottomNavVisible,
        quickDockCorrect: isMobile ? quickDockVisible : !quickDockVisible
      };
    }, vp.width);

    // Screenshots Dashboard (Light & Dark)
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `dashboard-${vp.label}-light.png`) });
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.waitForTimeout(100);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `dashboard-${vp.label}-dark.png`) });
    await page.evaluate(() => document.documentElement.classList.remove('dark'));

    // 2. Catedra Detail Page (Alumnos tab)
    await page.goto(`http://localhost:4173/catedra/${catId}?tab=alumnos`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);

    const catedraData = await page.evaluate((width) => {
      const doc = document.documentElement;
      const isMobile = width < 1024;
      const mobileWrap = document.querySelector('.lg\\:hidden.space-y-3');
      const desktopWrap = document.querySelector('.hidden.lg\\:block');

      const mobileVisible = mobileWrap ? window.getComputedStyle(mobileWrap).display !== 'none' : false;
      const desktopVisible = desktopWrap ? window.getComputedStyle(desktopWrap).display !== 'none' : false;

      // Check touch targets (only visible within active viewport, not offscreen drawers)
      const interactiveElements = document.querySelectorAll('button, a, input, select');
      let touchFailures = 0;
      if (isMobile) {
        for (const el of interactiveElements) {
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue;
          if (rect.right < 0 || rect.left > window.innerWidth) continue;
          const style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden') continue;
          if (rect.height < 36 && rect.width < 36) {
            touchFailures++;
          }
        }
      }

      return {
        hasOverflow: doc.scrollWidth > window.innerWidth,
        scrollWidth: doc.scrollWidth,
        innerWidth: window.innerWidth,
        forkCorrect: isMobile ? (mobileVisible && !desktopVisible) : (desktopVisible && !mobileVisible),
        touchTargetsPass: touchFailures === 0
      };
    }, vp.width);

    // Screenshots Catedra Alumnos (Light & Dark)
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `alumnos-${vp.label}-light.png`) });
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.waitForTimeout(100);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `alumnos-${vp.label}-dark.png`) });
    await page.evaluate(() => document.documentElement.classList.remove('dark'));

    const result = {
      viewport: vp.label,
      width: vp.width,
      dashboardNoOverflow: !dashboardData.hasOverflow,
      catedraNoOverflow: !catedraData.hasOverflow,
      bottomNavCorrect: dashboardData.bottomNavCorrect,
      quickDockCorrect: dashboardData.quickDockCorrect,
      designForkCorrect: catedraData.forkCorrect,
      touchTargetsPass: catedraData.touchTargetsPass
    };

    results.push(result);
    console.log(`Resultado ${vp.label}:`, JSON.stringify(result, null, 2));
  }

  await browser.close();

  console.log('\n========================================');
  console.log('RESUMEN GENERAL DE VERIFICACIÓN:');
  console.log('========================================');
  console.table(results);
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
