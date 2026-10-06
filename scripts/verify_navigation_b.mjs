import { chromium } from 'file:///C:/Users/emili/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';
import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const PORT = 4192;
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
  console.log('  VERIFICACIÓN AUTOMATIZADA BLOQUE B: REDISEÑO DE HEADER Y NAVEGACIÓN');
  console.log('========================================================================\n');

  const outputDir = path.join('screenshots', 'bloque-b');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
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

  const mockStudents = [
    { id: 'est-1', nombre: 'Lucas', apellido: 'Benítez', dni: '40123456', catedra_id: 'cat-1' },
    { id: 'est-2', nombre: 'Sofía', apellido: 'Gómez', dni: '38987654', catedra_id: 'cat-1' }
  ];

  try {
    server = await startServer();
    browser = await chromium.launch({ headless: true });

    async function setupPageContext(viewport, theme = 'dark') {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();

      await page.addInitScript(({ user, perfil, themeMode, students }) => {
        window.localStorage.setItem('docentepro_demo_user', JSON.stringify(user));
        window.localStorage.setItem('docentepro_demo_perfil', JSON.stringify(perfil));
        window.localStorage.setItem('korum_onboarding_v1', 'completed');
        window.localStorage.setItem('docentepro_theme', themeMode);
        window.localStorage.setItem('estudiantes_cat-1', JSON.stringify(students));
      }, {
        user: baseDemoUser,
        perfil: baseDemoPerfil,
        themeMode: theme,
        students: mockStudents
      });

      return { context, page };
    }

    // =========================================================================
    // 1. CAPTURAS RESPONSIVAS: 360, 390, 768, 1024, 1440 px (CLARO Y OSCURO)
    // =========================================================================
    console.log('▶ [1/6] Capturas responsivas en todos los breakpoints...');
    const breakpoints = [
      { name: '360px', width: 360, height: 740 },
      { name: '390px', width: 390, height: 844 },
      { name: '768px', width: 768, height: 1024 },
      { name: '1024px', width: 1024, height: 768 },
      { name: '1440px', width: 1440, height: 900 }
    ];

    for (const bp of breakpoints) {
      for (const theme of ['dark', 'light']) {
        const { context, page } = await setupPageContext({ width: bp.width, height: bp.height }, theme);
        await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(800);

        const fileName = `nav_${bp.name}_${theme}.png`;
        await page.screenshot({ path: path.join(outputDir, fileName), fullPage: false });

        // Verificar que no haya desborde horizontal
        const overflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth + 2;
        });

        console.log(`  -> Breakpoint ${bp.name} (${theme}): Captura guardada. Desborde horizontal: ${overflow ? 'SÍ (ERROR)' : 'NO (OK)'}`);
        if (overflow) allPassed = false;
        await context.close();
      }
    }

    // =========================================================================
    // 2. NAVEGACIÓN DESDE EL RIEL LATERAL (ESCRITORIO 1280px)
    // =========================================================================
    console.log('\n▶ [2/6] Probando navegación desde el riel lateral (Escritorio)...');
    {
      const { context, page } = await setupPageContext({ width: 1280, height: 800 }, 'dark');
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(800);

      const navDestinations = [
        { label: 'Calendario', targetUrl: '/calendario' },
        { label: 'Mesas de Examen', targetUrl: '/mesas-examen' },
        { label: 'Instituciones', targetUrl: '/instituciones' },
        { label: 'Configuración', targetUrl: '/configuracion' },
        { label: 'Inicio', targetUrl: '/dashboard' }
      ];

      let navSuccess = true;
      for (const dest of navDestinations) {
        const link = page.locator(`aside nav a:has-text("${dest.label}")`).first();
        await link.click();
        await page.waitForTimeout(600);
        const currentUrl = page.url();
        const matches = currentUrl.includes(dest.targetUrl);
        console.log(`  -> Clic en "${dest.label}": Redirigido a ${currentUrl} [${matches ? 'OK' : 'FAIL'}]`);
        if (!matches) navSuccess = false;
      }

      testResults.push({ name: 'Navegación completa desde riel', passed: navSuccess });
      if (!navSuccess) allPassed = false;
      await context.close();
    }

    // =========================================================================
    // 3. COLAPSO Y EXPANSIÓN DEL RIEL CON PERSISTENCIA
    // =========================================================================
    console.log('\n▶ [3/6] Probando colapso y expansión del riel con persistencia...');
    {
      const { context, page } = await setupPageContext({ width: 1280, height: 800 }, 'dark');
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(800);

      // Estado inicial (expandido = ~232px)
      const initialWidth = await page.evaluate(() => {
        return document.querySelector('aside')?.offsetWidth || 0;
      });
      console.log(`  -> Ancho inicial del sidebar: ${initialWidth}px`);

      // Clic en botón colapsar
      const collapseBtn = page.locator('aside button[title*="Colapsar"]').first();
      await collapseBtn.click();
      await page.waitForTimeout(300);

      const collapsedWidth = await page.evaluate(() => {
        return document.querySelector('aside')?.offsetWidth || 0;
      });
      console.log(`  -> Ancho tras colapsar: ${collapsedWidth}px (esperado ~72px)`);

      // Recargar página (F5) para verificar persistencia en localStorage
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(600);

      const persistedWidth = await page.evaluate(() => {
        const width = document.querySelector('aside')?.offsetWidth || 0;
        const stored = localStorage.getItem('korum_sidebar_collapsed');
        return { width, stored };
      });
      console.log(`  -> Tras recarga (F5): Ancho = ${persistedWidth.width}px, localStorage = "${persistedWidth.stored}"`);

      // Expandir nuevamente con Ctrl+B
      await page.keyboard.press('Control+b');
      await page.waitForTimeout(300);

      const reExpandedWidth = await page.evaluate(() => {
        return document.querySelector('aside')?.offsetWidth || 0;
      });
      console.log(`  -> Tras atajo Ctrl+B: Ancho = ${reExpandedWidth}px (esperado ~232px)`);

      const collapsePassed = collapsedWidth <= 80 && persistedWidth.width <= 80 && reExpandedWidth > 200;
      testResults.push({ name: 'Colapso y persistencia de sidebar', passed: collapsePassed });
      if (!collapsePassed) allPassed = false;
      await context.close();
    }

    // =========================================================================
    // 4. PALETA DE COMANDOS ⌘K / Ctrl+K Y BÚSQUEDA POR DNI
    // =========================================================================
    console.log('\n▶ [4/6] Probando Paleta de Comandos ⌘K y búsqueda por DNI...');
    {
      const { context, page } = await setupPageContext({ width: 1280, height: 800 }, 'dark');
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(800);

      // Abrir con Ctrl+K
      await page.keyboard.press('Control+k');
      await page.waitForTimeout(400);

      const isDialogVisible = await page.evaluate(() => {
        return document.querySelector('[role="dialog"]') !== null;
      });
      console.log(`  -> Presionando Ctrl+K: Modal abierto = ${isDialogVisible ? 'SÍ' : 'NO'}`);

      // Escribir DNI "40123456"
      const searchInput = page.locator('input[placeholder*="Buscar estudiantes"]').first();
      await searchInput.fill('40123456');
      await page.waitForTimeout(600);

      const foundStudent = await page.evaluate(() => {
        return document.body.innerText.includes('Benítez') || document.body.innerText.includes('40123456');
      });
      console.log(`  -> Búsqueda de DNI "40123456": Estudiante encontrado = ${foundStudent ? 'SÍ' : 'NO'}`);

      // Navegar con teclado (ArrowDown y Enter)
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(100);

      // Cerrar con Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      const isDialogClosed = await page.evaluate(() => {
        return document.querySelector('[role="dialog"]') === null;
      });
      console.log(`  -> Presionando Escape: Modal cerrado = ${isDialogClosed ? 'SÍ' : 'NO'}`);

      const palettePassed = isDialogVisible && foundStudent && isDialogClosed;
      testResults.push({ name: 'Paleta de Comandos ⌘K y búsqueda', passed: palettePassed });
      if (!palettePassed) allPassed = false;
      await context.close();
    }

    // =========================================================================
    // 5. MENÚ DE USUARIO Y PANEL DE NOTIFICACIONES (CLICK / ESC / AFUERA)
    // =========================================================================
    console.log('\n▶ [5/6] Probando Menú de Usuario y Notificaciones...');
    {
      const { context, page } = await setupPageContext({ width: 1280, height: 800 }, 'dark');
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(800);

      // 5.1 Menú de usuario (Avatar)
      const avatarBtn = page.locator('button[aria-label="Abrir menú de usuario"]').first();
      await avatarBtn.click();
      await page.waitForTimeout(300);

      const isUserMenuOpen = await page.evaluate(() => {
        const text = document.body.innerText;
        return (text.includes('Docente Titular') || text.includes('Superadministrador')) && text.includes('Cerrar Sesión');
      });
      console.log(`  -> Clic en Avatar: Menú de usuario abierto = ${isUserMenuOpen ? 'SÍ' : 'NO'}`);

      // Cerrar con Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      const isUserMenuClosed = await page.evaluate(() => {
        return !document.body.innerText.includes('Cerrar Sesión');
      });
      console.log(`  -> Escape: Menú de usuario cerrado = ${isUserMenuClosed ? 'SÍ' : 'NO'}`);

      // 5.2 Panel de Notificaciones
      const notifBtn = page.locator('button[aria-label="Abrir notificaciones"]').first();
      await notifBtn.click();
      await page.waitForTimeout(300);

      const isNotifPanelOpen = await page.evaluate(() => {
        return document.body.innerText.includes('Notificaciones & Agenda');
      });
      console.log(`  -> Clic en Campana: Panel de notificaciones abierto = ${isNotifPanelOpen ? 'SÍ' : 'NO'}`);

      // Cerrar haciendo clic en el área principal
      await page.mouse.click(600, 300);
      await page.waitForTimeout(300);

      const isNotifPanelClosed = await page.evaluate(() => {
        return !document.body.innerText.includes('Notificaciones & Agenda');
      });
      console.log(`  -> Clic afuera: Panel cerrado = ${isNotifPanelClosed ? 'SÍ' : 'NO'}`);

      const flyoutsPassed = isUserMenuOpen && isUserMenuClosed && isNotifPanelOpen && isNotifPanelClosed;
      testResults.push({ name: 'Menú de usuario y panel de notificaciones', passed: flyoutsPassed });
      if (!flyoutsPassed) allPassed = false;
      await context.close();
    }

    // =========================================================================
    // 6. NAVEGACIÓN MÓVIL (390px): BARRA INFERIOR + PANEL 'MÁS'
    // =========================================================================
    console.log('\n▶ [6/6] Probando navegación móvil (BottomNav + Más)...');
    {
      const { context, page } = await setupPageContext({ width: 390, height: 844 }, 'dark');
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(800);

      // Clic en Calendario en BottomNav
      const calNavBtn = page.locator('nav[aria-label="Navegación móvil inferior"] a:has-text("Calendario")').first();
      await calNavBtn.click();
      await page.waitForTimeout(800);
      const isCalUrl = page.url().includes('/calendario');
      console.log(`  -> BottomNav: Clic a "Calendario" -> URL: ${page.url()} [${isCalUrl ? 'OK' : 'FAIL'}]`);

      // Clic en 'Más'
      const moreBtn = page.locator('nav[aria-label="Navegación móvil inferior"] button:has-text("Más")').first();
      await moreBtn.click();
      await page.waitForTimeout(400);

      const isSheetOpen = await page.evaluate(() => {
        return document.body.innerText.includes('Más Opciones y Destinos');
      });
      console.log(`  -> Clic en "Más": Bottom Sheet abierto = ${isSheetOpen ? 'SÍ' : 'NO'}`);

      // Clic en Mesas de Examen dentro de la Sheet
      const mesasBtn = page.locator('button:has-text("Mesas de Examen")').first();
      await mesasBtn.click();
      await page.waitForTimeout(800);
      const isMesasUrl = page.url().includes('/mesas-examen');
      console.log(`  -> Sheet: Clic a "Mesas de Examen" -> URL: ${page.url()} [${isMesasUrl ? 'OK' : 'FAIL'}]`);

      const mobilePassed = isCalUrl && isSheetOpen && isMesasUrl;
      testResults.push({ name: 'Navegación móvil (BottomNav + Más)', passed: mobilePassed });
      if (!mobilePassed) allPassed = false;
      await context.close();
    }

    console.log('\n========================================================================');
    console.log('  RESUMEN FINAL DE PRUEBAS BLOQUE B');
    console.log('========================================================================');
    for (const r of testResults) {
      console.log(`${r.passed ? '✅' : '❌'} ${r.name}`);
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

  console.log(`\n[ESTADO FINAL BLOQUE B]: ${allPassed ? 'TODAS LAS PRUEBAS PASARON EXITOSAMENTE 🎉' : 'FALLARON ALGUNAS PRUEBAS ❌'}`);
  process.exit(allPassed ? 0 : 1);
}

runTests();
