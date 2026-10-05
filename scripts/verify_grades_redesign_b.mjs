import { chromium } from 'file:///C:/Users/emili/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const PORT = 4182;
const BASE_URL = `http://localhost:${PORT}`;
const SCREENSHOTS_DIR = path.resolve('screenshots/bloque-b');

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

// Generador de datos sintéticos reglamentarios: 12 evaluaciones y 40 alumnos
function generateDataset(catedraId) {
  // 12 Evaluaciones: 6 TPs y 6 Parciales
  const evaluaciones = [
    { id: 'eval-tp-1', catedra_id: catedraId, titulo: 'Trabajo Práctico N° 1', tipo: 'TP', fecha: '2026-03-20', fecha_entrega: '2026-03-20' },
    { id: 'eval-tp-2', catedra_id: catedraId, titulo: 'Trabajo Práctico N° 2', tipo: 'TP', fecha: '2026-04-10', fecha_entrega: '2026-04-10' },
    { id: 'eval-tp-3', catedra_id: catedraId, titulo: 'Trabajo Práctico N° 3', tipo: 'TP', fecha: '2026-05-02', fecha_entrega: '2026-05-02' },
    { id: 'eval-tp-4', catedra_id: catedraId, titulo: 'Trabajo Práctico N° 4', tipo: 'TP', fecha: '2026-05-25', fecha_entrega: '2026-05-25' },
    { id: 'eval-tp-5', catedra_id: catedraId, titulo: 'Trabajo Práctico N° 5', tipo: 'TP', fecha: '2026-06-15', fecha_entrega: '2026-06-15' },
    { id: 'eval-tp-6', catedra_id: catedraId, titulo: 'Trabajo Práctico N° 6', tipo: 'TP', fecha: '2026-07-01', fecha_entrega: '2026-07-01' },
    { id: 'eval-parc-1', catedra_id: catedraId, titulo: 'Primer Parcial Teórico-Práctico', tipo: 'PARCIAL', fecha: '2026-04-28', fecha_entrega: '2026-04-28' },
    { id: 'eval-recup-1', catedra_id: catedraId, titulo: 'Recuperatorio Primer Parcial', tipo: 'RECUPERATORIO', evaluacion_origen_id: 'eval-parc-1', fecha: '2026-05-12', fecha_entrega: '2026-05-12' },
    { id: 'eval-parc-2', catedra_id: catedraId, titulo: 'Segundo Parcial', tipo: 'PARCIAL', fecha: '2026-06-05', fecha_entrega: '2026-06-05' },
    { id: 'eval-recup-2', catedra_id: catedraId, titulo: 'Recuperatorio Segundo Parcial', tipo: 'RECUPERATORIO', evaluacion_origen_id: 'eval-parc-2', fecha: '2026-06-20', fecha_entrega: '2026-06-20' },
    { id: 'eval-parc-3', catedra_id: catedraId, titulo: 'Tercer Parcial Integrador', tipo: 'PARCIAL', fecha: '2026-08-15', fecha_entrega: '2026-08-15' },
    { id: 'eval-parc-4', catedra_id: catedraId, titulo: 'Parcial 4 Práctico', tipo: 'PARCIAL', fecha: '2026-09-10', fecha_entrega: '2026-09-10' },
    { id: 'eval-parc-5', catedra_id: catedraId, titulo: 'Parcial 5 Laboratorio', tipo: 'PARCIAL', fecha: '2026-10-05', fecha_entrega: '2026-10-05' },
    { id: 'eval-parc-6', catedra_id: catedraId, titulo: 'Parcial 6 Coloquio Final', tipo: 'PARCIAL', fecha: '2026-11-12', fecha_entrega: '2026-11-12' }
  ];

  // 40 Estudiantes con diversidad de casos
  const apellidos = [
    'González', 'Rodríguez', 'Gómez', 'Fernández', 'López', 'Díaz', 'Martínez', 'Pérez', 'García', 'Sánchez',
    'Romero', 'Sosa', 'Álvarez', 'Torres', 'Ruiz', 'Ramírez', 'Flores', 'Benítez', 'Acosta', 'Medina',
    'Herrera', 'Aguirre', 'Pereyra', 'Gutiérrez', 'Giménez', 'Molina', 'Silva', 'Castro', 'Rojas', 'Ortiz',
    'Núñez', 'Luna', 'Juárez', 'Cabrera', 'Ríos', 'Morales', 'Godoy', 'Moreno', 'Ferreyra', 'Domínguez'
  ];
  const nombres = [
    'Agustín', 'Camila', 'Mateo', 'Valentina', 'Santiago', 'Sofía', 'Lucas', 'Martina', 'Benjamín', 'Lucía',
    'Thiago', 'Emma', 'Joaquín', 'Catalina', 'Nicolás', 'Delfina', 'Tomás', 'Julieta', 'Felipe', 'Paula',
    'Facundo', 'Zoe', 'Bautista', 'Mía', 'Lautaro', 'Elena', 'Ignacio', 'Victoria', 'Juan', 'Abril',
    'Emiliano', 'Clara', 'Manuel', 'Guadalupe', 'Patricio', 'Florencia', 'Bruno', 'Renata', 'Julián', 'Isabella'
  ];

  const estudiantes = [];
  const notas = [];

  for (let i = 0; i < 40; i++) {
    const estId = `est-batch-${i + 1}`;
    const isEquiv = i === 38;
    const isTrabajo = i === 15 || i === 25;

    estudiantes.push({
      id: estId,
      catedra_id: catedraId,
      apellido: apellidos[i],
      nombre: nombres[i],
      dni: `${38000000 + i * 111}`,
      email: `${nombres[i].toLowerCase()}.${apellidos[i].toLowerCase()}@estudiante.edu.ar`,
      es_equivalencia: isEquiv,
      tiene_certificado_trabajo: isTrabajo,
      activo: true
    });

    // Calificaciones variadas para cada alumno
    evaluaciones.forEach((ev, evIdx) => {
      if (ev.tipo === 'RECUPERATORIO') return; // Se añaden condicionalmente

      let notaVal = null;
      let estado = 'CALIFICADO';

      // Simular perfiles académicos
      if (i < 15) {
        // Promoción alta
        notaVal = Math.min(10, 7 + ((i + evIdx) % 4));
      } else if (i < 28) {
        // Regular
        notaVal = 4 + ((i + evIdx) % 3);
      } else if (i < 35) {
        // En riesgo / desaprobados
        notaVal = 2 + ((i + evIdx) % 3);
        if (evIdx % 3 === 0 && ev.tipo === 'PARCIAL') {
          // Recuperatorio
          const recupEv = evaluaciones.find(r => r.evaluacion_origen_id === ev.id);
          if (recupEv) {
            notas.push({
              evaluacion_id: recupEv.id,
              estudiante_id: estId,
              valor: 6,
              nota: 6,
              estado: 'CALIFICADO'
            });
          }
        }
      } else if (i === 35) {
        // Ausente a parcial
        estado = 'AUSENTE';
      } else if (i === 36) {
        // No entregó TP
        estado = 'NO_ENTREGO';
      } else if (i === 37) {
        // Sin nota aún
        notaVal = null;
        estado = null;
      } else {
        notaVal = 8;
      }

      if (estado || notaVal !== null) {
        notas.push({
          evaluacion_id: ev.id,
          estudiante_id: estId,
          valor: notaVal,
          nota: notaVal,
          estado: estado
        });
      }
    });
  }

  // 10 Clases y asistencias para calcular porcentajes realistas
  const clases = [];
  const asistencias = [];
  for (let c = 1; c <= 10; c++) {
    const claseId = `clase-batch-${c}`;
    clases.push({
      id: claseId,
      catedra_id: catedraId,
      fecha: `2026-03-${10 + c}`,
      tema: `Clase magistral ${c}`
    });

    estudiantes.forEach((est, idx) => {
      // 85% de asistencia general, algunos libres por inasistencia
      const presente = idx === 32 ? (c <= 3) : (idx % 5 !== 0 || c > 2);
      asistencias.push({
        clase_id: claseId,
        estudiante_id: est.id,
        estado: presente ? 'PRESENTE' : 'AUSENTE'
      });
    });
  }

  return { evaluaciones, estudiantes, notas, clases, asistencias };
}

async function runTests() {
  console.log('========================================================================');
  console.log('  VERIFICACIÓN AUTOMATIZADA BLOQUE B: REDISEÑO DE SÁBANA DE CALIFICACIONES');
  console.log('========================================================================\n');

  let server;
  let browser;
  let allPassed = false;
  const results = [];

  try {
    server = await startServer();
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();

    const testCatedraId = 'cat-bloque-b-test';
    const dataset = generateDataset(testCatedraId);

    // Inyectar datos en sessionStorage / localStorage
    await context.addInitScript(({ catedraId, dataset }) => {
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
      const catedrasList = [{
        id: catedraId,
        nombre: 'Arquitectura de Software y Sistemas Distribuidos',
        nivel: 'TERCIARIO',
        modalidad: 'ANUAL',
        anio: 2026
      }];

      window.localStorage.setItem('docentepro_demo_user', JSON.stringify(demoUser));
      window.localStorage.setItem('docentepro_demo_perfil', JSON.stringify(demoPerfil));
      window.localStorage.setItem('demo_catedras', JSON.stringify(catedrasList));
      window.localStorage.setItem('korum_onboarding_v1', 'completed');
      window.localStorage.setItem(`evaluaciones_${catedraId}`, JSON.stringify(dataset.evaluaciones));
      window.localStorage.setItem(`estudiantes_${catedraId}`, JSON.stringify(dataset.estudiantes));
      window.localStorage.setItem(`notas_${catedraId}`, JSON.stringify(dataset.notas));
      window.localStorage.setItem(`clases_${catedraId}`, JSON.stringify(dataset.clases));
      window.localStorage.setItem(`asistencias_${catedraId}`, JSON.stringify(dataset.asistencias));
    }, { catedraId: testCatedraId, dataset });

    const page = await context.newPage();

    // -------------------------------------------------------------------------
    // TEST 1: Viewports y Comprobación de Encabezado Compacto (≤ 56px) en Desktop
    // -------------------------------------------------------------------------
    console.log('>>> [TEST 1] Verificación en 1440px Desktop:');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/catedra/${testCatedraId}?tab=calificaciones`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Medición de altura de encabezado de evaluación
    const evalHeaderTh = page.locator('thead th:has(button[aria-label*="Acciones para"])').first();
    const thBox = await evalHeaderTh.boundingBox();
    console.log(`  - Altura de columna de evaluación en thead: ${thBox ? thBox.height.toFixed(1) : 'N/A'} px (Límite: ≤ 56 px)`);
    const isHeightValid = thBox && thBox.height <= 56;
    results.push({ name: 'Encabezado de evaluación compacto (≤ 56px)', pass: isHeightValid, val: `${thBox?.height.toFixed(1)} px` });

    // Medición del contenedor de la tabla
    const tableContainer = page.locator('div:has(> table[aria-label="Sábana de Calificaciones"])').first();
    const tableEl = page.locator('table[aria-label="Sábana de Calificaciones"]');
    const isTableVisible = await tableEl.isVisible();
    results.push({ name: 'Tabla panorámica visible en 1440px', pass: isTableVisible });

    // Captura Desktop 1440px Claro
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'grades_1440px_light.png'), fullPage: false });
    console.log('  - Captura guardada: screenshots/bloque-b/grades_1440px_light.png');

    // Tema Oscuro en 1440px
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'grades_1440px_dark.png'), fullPage: false });
    console.log('  - Captura guardada: screenshots/bloque-b/grades_1440px_dark.png');
    await page.evaluate(() => document.documentElement.classList.remove('dark'));

    // -------------------------------------------------------------------------
    // TEST 2: Dual Sticky Columns (Izquierda y Derecha)
    // -------------------------------------------------------------------------
    console.log('\n>>> [TEST 2] Verificación de Columnas Dual-Sticky:');
    const leftStickyTh = page.locator('thead th:has-text("Estudiante / DNI")');
    const rightStickyTh = page.locator('thead th:has-text("Condición Final")');

    const leftStickyClass = await leftStickyTh.getAttribute('class');
    const rightStickyClass = await rightStickyTh.getAttribute('class');

    const hasLeftSticky = leftStickyClass?.includes('sticky') && leftStickyClass?.includes('left-0');
    const hasRightSticky = rightStickyClass?.includes('sticky') && rightStickyClass?.includes('right-0');

    console.log(`  - Columna Estudiante fija a la izquierda: ${hasLeftSticky ? 'SÍ' : 'NO'}`);
    console.log(`  - Columna Condición Final fija a la derecha: ${hasRightSticky ? 'SÍ' : 'NO'}`);
    results.push({ name: 'Sticky Columna Estudiante (left-0)', pass: !!hasLeftSticky });
    results.push({ name: 'Sticky Columna Condición (right-0)', pass: !!hasRightSticky });

    // -------------------------------------------------------------------------
    // TEST 3: Condición Final sin Desbordes (nowrap, clamp-2, tooltip)
    // -------------------------------------------------------------------------
    console.log('\n>>> [TEST 3] Verificación de Badges y Celdas de Condición Final:');
    const conditionBadges = page.locator('table[aria-label="Sábana de Calificaciones"] td.sticky.right-0 span.whitespace-nowrap');
    const badgeCount = await conditionBadges.count();
    console.log(`  - Badges de condición final renderizados con nowrap: ${badgeCount}`);
    results.push({ name: 'Badges con whitespace-nowrap y shrink-0', pass: badgeCount >= 30 });

    // Comprobar que ningún texto desborda la celda de condición final
    const conditionOverflow = await page.evaluate(() => {
      const conditionCells = document.querySelectorAll('td.sticky.right-0');
      let overflows = 0;
      conditionCells.forEach(td => {
        if (td.scrollWidth > td.clientWidth + 2) {
          overflows++;
        }
      });
      return overflows;
    });
    console.log(`  - Celdas de condición final con desborde horizontal: ${conditionOverflow}`);
    results.push({ name: 'Sin desbordes en celdas de condición final', pass: conditionOverflow === 0 });

    // -------------------------------------------------------------------------
    // TEST 4: Densidad Cómoda vs Compacta (Selector y Persistencia)
    // -------------------------------------------------------------------------
    console.log('\n>>> [TEST 4] Selector de Densidad (Cómoda / Compacta):');
    const densityBtnCompact = page.locator('button[title*="compacta"]');
    if (await densityBtnCompact.isVisible()) {
      await densityBtnCompact.click();
      await page.waitForTimeout(500);

      const storedDensity = await page.evaluate(() => localStorage.getItem('korum_grades_density'));
      console.log(`  - Densidad persistida en localStorage tras clic: "${storedDensity}"`);
      results.push({ name: 'Persistencia de densidad en localStorage', pass: storedDensity === 'compact' });

      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'grades_compact_density.png') });
      console.log('  - Captura guardada: screenshots/bloque-b/grades_compact_density.png');

      // Volver a cómoda
      const densityBtnComfort = page.locator('button[title*="cómoda"]');
      await densityBtnComfort.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'grades_comfortable_density.png') });
    } else {
      results.push({ name: 'Selector de densidad visible', pass: false });
    }

    // -------------------------------------------------------------------------
    // TEST 5: Navegación de Celdas por Teclado (Flechas y Enter)
    // -------------------------------------------------------------------------
    console.log('\n>>> [TEST 5] Navegación por Teclado en Celdas de Nota:');
    const firstGradeBtn = page.locator('button[data-grade-cell="true"][data-row="0"][data-col="0"]');
    if (await firstGradeBtn.isVisible()) {
      await firstGradeBtn.focus();
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(200);

      const activeCellCol = await page.evaluate(() => {
        const el = document.activeElement;
        return el ? el.getAttribute('data-col') : null;
      });
      console.log(`  - Tras ArrowRight, celda enfocada columna: ${activeCellCol}`);
      results.push({ name: 'Navegación horizontal por teclado en celdas', pass: activeCellCol !== null && activeCellCol !== '0' });

      // ArrowDown
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(200);
      const activeCellRow = await page.evaluate(() => {
        const el = document.activeElement;
        return el ? el.getAttribute('data-row') : null;
      });
      console.log(`  - Tras ArrowDown, celda enfocada fila: ${activeCellRow}`);
      results.push({ name: 'Navegación vertical por teclado en celdas', pass: activeCellRow === '1' });
    } else {
      results.push({ name: 'Atributos de celda data-grade-cell presentes', pass: false });
    }

    // -------------------------------------------------------------------------
    // TEST 6: Menú "⋯" de Columna y Confirmación de Eliminación
    // -------------------------------------------------------------------------
    console.log('\n>>> [TEST 6] Menú contextual "⋯" por columna y ConfirmDialog:');
    const menuBtn = page.locator('th button[aria-label*="Acciones para"]').first();
    await menuBtn.click();
    await page.waitForTimeout(500);

    const editMenuItem = page.locator('[role="menuitem"]:has-text("Editar evaluación y fecha")');
    const deleteMenuItem = page.locator('[role="menuitem"]:has-text("Eliminar evaluación...")');
    const menuItemsVisible = (await editMenuItem.isVisible()) && (await deleteMenuItem.isVisible());
    console.log(`  - Elementos de menú desplegados: ${menuItemsVisible ? 'SÍ' : 'NO'}`);
    results.push({ name: 'Menú "⋯" por columna accesible y funcional', pass: menuItemsVisible });

    // Clic en Eliminar para comprobar ConfirmDialog
    await deleteMenuItem.click();
    await page.waitForTimeout(500);

    const confirmModal = page.locator('[role="dialog"]:has-text("¿Eliminar")');
    const isConfirmModalOpen = await confirmModal.isVisible();
    console.log(`  - ConfirmDialog de eliminación desplegado: ${isConfirmModalOpen ? 'SÍ' : 'NO'}`);
    results.push({ name: 'ConfirmDialog al solicitar eliminación', pass: isConfirmModalOpen });

    // Cancelar eliminación
    const cancelConfirmBtn = confirmModal.locator('button:has-text("Cancelar")');
    await cancelConfirmBtn.click();
    await page.waitForTimeout(400);

    // -------------------------------------------------------------------------
    // TEST 7: Viewports Móviles (< 1024px) y GradesMobileView
    // -------------------------------------------------------------------------
    const mobileViewports = [
      { name: '1024px Desktop Compacto', w: 1024, h: 768, isMobile: false },
      { name: '768px Tablet', w: 768, h: 1024, isMobile: true },
      { name: '390px Móvil Estándar (iPhone 14)', w: 390, h: 844, isMobile: true },
      { name: '360px Móvil Compacto (Android)', w: 360, h: 780, isMobile: true }
    ];

    for (const vp of mobileViewports) {
      console.log(`\n>>> [TEST Viewport] ${vp.name} (${vp.w}x${vp.h}):`);
      await page.setViewportSize({ width: vp.w, height: vp.h });
      await page.waitForTimeout(1000);

      // Comprobar desborde horizontal general de la página
      const pageOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      console.log(`  - Desborde horizontal de la página completa: ${pageOverflow ? 'DESBORDE DETECTADO' : 'SIN DESBORDE (OK)'}`);
      results.push({ name: `Sin desborde horizontal en ${vp.w}px`, pass: !pageOverflow });

      if (vp.isMobile) {
        // En móvil/tablet (< 1024px), debe mostrar GradesMobileView
        const mobileSelector = page.locator('button:has-text("TP 1"), button:has-text("Parcial 1")').first();
        const hasMobileSelector = await mobileSelector.isVisible();
        console.log(`  - Selector superior de evaluación en móvil: ${hasMobileSelector ? 'PRESENTE' : 'NO'}`);
        results.push({ name: `Vista Móvil por Evaluación en ${vp.w}px`, pass: hasMobileSelector });

        // Touch target check (≥ 44px)
        const touchChip = page.locator('button.touch-target-44, button.min-h-\\[44px\\]').first();
        const touchBox = await touchChip.boundingBox();
        const isTouchTargetValid = touchBox && touchBox.height >= 43 && touchBox.width >= 43;
        console.log(`  - Touch targets de calificación: ${touchBox?.width.toFixed(0)}x${touchBox?.height.toFixed(0)} px (Límite ≥ 44px)`);
        results.push({ name: `Touch targets ≥ 44px en ${vp.w}px`, pass: !!isTouchTargetValid });
      }

      // Captura Claro
      const filenameLight = `grades_${vp.w}px_light.png`;
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, filenameLight), fullPage: false });
      console.log(`  - Captura guardada: screenshots/bloque-b/${filenameLight}`);

      // Captura Oscuro
      await page.evaluate(() => document.documentElement.classList.add('dark'));
      await page.waitForTimeout(300);
      const filenameDark = `grades_${vp.w}px_dark.png`;
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, filenameDark), fullPage: false });
      console.log(`  - Captura guardada: screenshots/bloque-b/${filenameDark}`);
      await page.evaluate(() => document.documentElement.classList.remove('dark'));
    }

    // -------------------------------------------------------------------------
    // RESUMEN FINAL
    // -------------------------------------------------------------------------
    console.log('\n========================================================================');
    console.log('  RESUMEN DE PRUEBAS AUTOMATIZADAS - BLOQUE B');
    console.log('========================================================================');

    let passedCount = 0;
    results.forEach((r, idx) => {
      const status = r.pass ? 'PASS' : 'FAIL';
      if (r.pass) passedCount++;
      console.log(`[${status}] ${idx + 1}. ${r.name} ${r.val ? `(${r.val})` : ''}`);
    });

    console.log(`\nTotal: ${passedCount} / ${results.length} pruebas pasadas.`);
    console.log(`Capturas antes/después almacenadas en: ${SCREENSHOTS_DIR}\n`);

    allPassed = passedCount === results.length;
  } catch (err) {
    console.error('Error durante la ejecución del test de Bloque B:', err);
  } finally {
    if (browser) await browser.close();
    if (server) {
      console.log('[Preview Server] Deteniendo servidor...');
      server.kill();
    }
  }

  process.exit(allPassed ? 0 : 1);
}

runTests();
