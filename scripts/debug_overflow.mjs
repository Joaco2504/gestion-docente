import { chromium } from 'file:///C:/Users/emili/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';

async function debug() {
  const browser = await chromium.launch({ headless: true });
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
  });

  const page = await context.newPage();
  for (const w of [320, 360, 768, 1024]) {
    await page.setViewportSize({ width: w, height: 800 });
    await page.goto('http://localhost:4173/catedra/cat-1?tab=alumnos', { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);

    const overflowReport = await page.evaluate((width) => {
      const innerW = window.innerWidth;
      const offenders = [];
      const all = document.querySelectorAll('*');
      for (const el of all) {
        const rect = el.getBoundingClientRect();
        if (rect.right > innerW + 1) {
          offenders.push({
            tag: el.tagName,
            className: el.className?.toString?.().slice(0, 80),
            right: Math.round(rect.right),
            width: Math.round(rect.width),
            overflow: Math.round(rect.right - innerW)
          });
        }
      }

      // Check touch targets (only in viewport)
      const touchFailures = [];
      const interactive = document.querySelectorAll('button, a, input, select');
      for (const el of interactive) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        if (rect.right < 0 || rect.left > innerW) continue;
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') continue;
        if (rect.height < 36 && rect.width < 36) {
          touchFailures.push({
            tag: el.tagName,
            text: el.innerText?.slice(0, 25).trim() || el.getAttribute('aria-label') || el.title,
            height: Math.round(rect.height),
            width: Math.round(rect.width),
            className: el.className?.toString?.().slice(0, 60)
          });
        }
      }

      return {
        width,
        docScrollW: document.documentElement.scrollWidth,
        bodyScrollW: document.body.scrollWidth,
        hasOverflow: document.documentElement.scrollWidth > innerW,
        topOffenders: offenders.slice(0, 5),
        touchFailures: touchFailures.slice(0, 5)
      };
    }, w);

    console.log(`\n=== REPORTE EN ${w}PX ===`);
    console.log(JSON.stringify(overflowReport, null, 2));
  }

  await browser.close();
}

debug().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
