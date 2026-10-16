# Reporte de Auditoría Nocturna - Korum 2.0

- **Fecha de ejecución**: 2026-10-16 03:16:00 (America/Argentina/Buenos_Aires)
- **Modo**: Auditoría no destructiva programada (CI / QA Local)
- **Repositorio**: `C:/Users/emili/Documents/docente`

---

## 1. Verificación de Compilación y Tests

| Check | Comando | Resultado | Detalle |
| :--- | :--- | :---: | :--- |
| **Tests Unitarios Vitest** | `npx.cmd vitest run` | **PASÓ (100%)** | 4 archivos de test, 40 tests ejecutados y aprobados (Lógica Académica, Licencias Docentes Decreto 1092, Clases Programadas y Alerta Temprana) |
| **Compilación de Producción** | `npm.cmd run build` | **PASÓ (0 errores)** | Build de Vite v6.4.3 completado en 17.09s con 3709 módulos transformados sin errores de imports ni referencias; PWA service worker generado con 67 entradas de precaché |

### Desglose de Tests Unitarios:
- `src/utils/__tests__/academicLogic.test.js` (18 tests) - **PASSED**
- `src/services/__tests__/licenciasService.test.js` (8 tests) - **PASSED**
- `src/utils/__tests__/scheduledClasses.test.js` (8 tests) - **PASSED**
- `src/utils/__tests__/earlyWarningLogic.test.js` (6 tests) - **PASSED**

---

## 2. Auditoría de Seguridad y Deuda Técnica

| Métrica Auditada | Hallazgos | Estado | Observación |
| :--- | :---: | :---: | :--- |
| `console.log` en `src/` | 0 | **Limpio** | No se encontraron logs de consola en el código fuente. |
| Botones con doble signo `+ +` | 0 | **Limpio** | Sintaxis JSX y etiquetas de botones limpias sin duplicación de operadores. |
| Consultas `select('*')` en `src/` | 46 | **Requiere Atención** | Deuda técnica existente (45 previas + 1 en nuevo `licenciasService.js`); proyectar columnas específicas para optimizar egress de Supabase. |
| Políticas RLS con `USING (true)` | 6 | **Requiere Atención** | Políticas permisivas en migraciones SQL históricas/baseline. La nueva migración de licencias `20261015220000_licencias_docentes.sql` cuenta con RLS estricto (`docente_id = auth.uid()`). |
| Componentes > 800 líneas | 9 | **Requiere Modularización** | 8 componentes históricos (varios con reducción de líneas por modularización continua) + 1 nuevo componente modal (`LicenciasDocenteModal.jsx`, 866 líneas). |
| Vulnerabilidades npm (`npm audit`) | 10 | **Monitoreo** | 4 moderadas, 6 altas en dependencias de compilación/transitivas (`tailwindcss` v3 / `chokidar` / `braces`, `source-map-js`, `react-router`). Sin impacto de ejecución en runtime productivo. |

---

## 3. Detalle de Archivos que Requieren Atención

### A. Políticas SQL Permisivas (`USING (true)`)
1. `supabase/legacy/migration_v25_calendario_colores_y_recordatorios.sql` (Línea 83)
2. `supabase/legacy/migration_v5_superadmin_config.sql` (Línea 78)
3. `supabase/migrations/20261004220000_baseline.sql` (Líneas 1262, 1371, 1514)
4. `supabase/migrations/20261004230000_fase2_seguridad_rls.sql` (Línea 129)

### B. Componentes Monolíticos (> 800 líneas)
1. `src/components/catedra/StudentsTab.jsx` (1,758 líneas - optimizado desde 1,909)
2. `src/components/admin/SupportHubModal.jsx` (1,663 líneas - optimizado desde 1,798)
3. `src/components/catedra/MesasExamenTab.jsx` (1,451 líneas - optimizado desde 1,565)
4. `src/components/catedra/LibroTemasTab.jsx` (1,219 líneas - optimizado desde 1,315)
5. `src/components/catedra/ResourcesTab.jsx` (1,026 líneas - optimizado desde 1,099)
6. `src/components/catedra/SettingsTab.jsx` (1,001 líneas - optimizado desde 1,074)
7. `src/components/common/PrintPreviewModal.jsx` (963 líneas - optimizado desde 1,035)
8. `src/components/mesas/MesaDetalleView.jsx` (916 líneas - optimizado desde 1,011)
9. `src/components/common/LicenciasDocenteModal.jsx` (866 líneas - nuevo módulo de licencias)

### C. Muestreo de Archivos con `select('*')` a Optimizar
- `src/components/admin/TeachersDirectory.jsx` (Línea 124)
- `src/components/catedra/CatedraStatsModal.jsx` (Líneas 80, 89, 99, 108, 118, 125)
- `src/components/catedra/EarlyWarningCard.jsx` (Líneas 84, 94, 102)
- `src/components/catedra/LibroTemasTab.jsx` (Líneas 161, 166)
- `src/components/catedra/MesasExamenTab.jsx` (Líneas 123, 124, 143, 231)
- `src/components/catedra/SettingsTab.jsx` (Líneas 142, 160)
- `src/components/catedra/UnidadesTab.jsx` (Líneas 64, 81)
- `src/hooks/useAttendanceManager.js` (Líneas 45, 50, 55)
- `src/hooks/useGradesData.js` (Líneas 59, 72, 73)
- `src/hooks/useCalendarEvents.js` (Líneas 179, 188, 196)
- `src/services/licenciasService.js` (Línea 181)

---

## 4. Estado del Árbol de Trabajo y Control de Cambios
- **Rama**: `main` (sincronizada con `origin/main`).
- **Modificaciones locales detectadas**:
  - Archivos modificados (7): `AttendanceTab.jsx`, `AttendanceClassTopicBar.jsx`, `AttendanceQuickActions.jsx`, `JustificarDecreto1092Modal.jsx`, `Modal.jsx`, `DashboardActionCards.jsx`, `DashboardPage.jsx`.
  - Archivos sin seguimiento (4): `LicenciasDocenteModal.jsx`, `licenciasService.js`, `licenciasService.test.js`, migración `20261015220000_licencias_docentes.sql`.
- **Integridad**: Auditoría 100% no destructiva. No se descartaron ni forzaron commits sobre las modificaciones en curso del docente.
