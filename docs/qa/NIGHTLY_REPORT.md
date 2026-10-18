# Reporte de Auditoría Nocturna - Korum 2.0

- **Fecha de ejecución**: 2026-10-18 03:15:00 (America/Argentina/Buenos_Aires)
- **Modo**: Auditoría no destructiva programada (CI / QA Local)
- **Repositorio**: `C:/Users/emili/Documents/docente`

---

## 1. Verificación de Compilación y Tests

| Check | Comando | Resultado | Detalle |
| :--- | :--- | :---: | :--- |
| **Tests Unitarios Vitest** | `npm.cmd run test` | **PASÓ (100%)** | 4 archivos de test, 53 tests ejecutados y aprobados (100% passed en 15.11s; cobertura completa en Lógica Académica, Licencias Docentes Decreto 1092 multi-día/cátedras, Clases Programadas y Alerta Temprana) |
| **Tests Base de Datos Supabase (pgTAP)** | `npm.cmd run db:test` | **PASÓ (100%)** | 8 suites de test pgTAP, 50 tests ejecutados y aprobados (Aislamiento RLS, Integridad de Notas, Evaluaciones, Recursos, Inscripciones, Criterios, Dominios ENUM/CHECK y RPCs Dashboard) |
| **Compilación de Producción** | `npm.cmd run build` | **PASÓ (0 errores)** | Build de Vite v6.4.3 completado en 17.58s con 3,710 módulos transformados sin errores; PWA service worker generado con 68 entradas de precaché (7,150.42 KiB) |

### Desglose de Tests Unitarios:
- `src/utils/__tests__/academicLogic.test.js` (18 tests) - **PASSED**
- `src/utils/__tests__/scheduledClasses.test.js` (8 tests) - **PASSED**
- `src/services/__tests__/licenciasService.test.js` (21 tests) - **PASSED** (soporte multi-fechas, validación de certificados y consistencia Decreto 1092)
- `src/utils/__tests__/earlyWarningLogic.test.js` (6 tests) - **PASSED**

### Desglose de Tests de Base de Datos pgTAP:
- `supabase/tests/01_rls_isolation.sql` - **PASSED**
- `supabase/tests/02_fase3_notas_integrity.sql` - **PASSED**
- `supabase/tests/03_fase3_evaluaciones_integrity.sql` - **PASSED**
- `supabase/tests/04_fase3_recursos_integrity.sql` - **PASSED**
- `supabase/tests/05_fase3_inscripciones_integrity.sql` - **PASSED**
- `supabase/tests/06_fase3_criterios_integrity.sql` - **PASSED**
- `supabase/tests/07_fase4_dominios_integrity.sql` - **PASSED**
- `supabase/tests/08_fase6_rpc_dashboard.sql` - **PASSED**

---

## 2. Auditoría de Seguridad y Deuda Técnica

| Métrica Auditada | Hallazgos | Estado | Observación |
| :--- | :---: | :---: | :--- |
| `console.log` en `src/` | 0 | **Limpio** | No se encontraron logs de depuración activos en el código fuente de producción. |
| Botones con doble signo `+ +` | 0 | **Limpio** | Sintaxis JSX y etiquetas limpias (45 operadores `++` legítimos en contadores y bucles). |
| Consultas `select('*')` en `src/` | 60 | **Requiere Atención** | Deuda técnica identificada (8 llamadas `head/count` sin payload y 52 proyecciones abiertas); se recomienda proyectar columnas explícitas para optimizar el egress de Supabase. |
| Políticas RLS con `USING (true)` | 6 | **Requiere Atención** | Políticas permisivas en migraciones SQL históricas/baseline. Las migraciones recientes de licencias cuentan con aislamiento RLS estricto (`docente_id = auth.uid()`). |
| Componentes > 800 líneas | 9 | **Requiere Modularización** | 8 componentes históricos + `LicenciasDocenteModal.jsx` (1,229 líneas, ampliado para soporte multi-días y selección de cátedras). |
| Hardcoded Secrets / Tokens | 0 | **Limpio** | No se encontraron API keys ni service role keys expuestas en `src/`. El archivo `.env` se encuentra correctamente excluido en `.gitignore`. |
| Vulnerabilidades npm (`npm audit`) | 10 | **Monitoreo** | 4 moderadas, 6 altas en dependencias de compilación y empaquetado (`tailwindcss` v3 / `chokidar` / `braces`, `source-map-js`, `react-router`). Sin impacto de ejecución en runtime productivo. |

---

## 3. Detalle de Archivos que Requieren Atención

### A. Políticas SQL Permisivas (`USING (true)`)
1. `supabase/legacy/migration_v25_calendario_colores_y_recordatorios.sql` (Línea 83)
2. `supabase/legacy/migration_v5_superadmin_config.sql` (Línea 78)
3. `supabase/migrations/20261004220000_baseline.sql` (Líneas 1262, 1371, 1514)
4. `supabase/migrations/20261004230000_fase2_seguridad_rls.sql` (Línea 129)

### B. Componentes Monolíticos (> 800 líneas)
1. `src/components/catedra/StudentsTab.jsx` (1,758 líneas)
2. `src/components/admin/SupportHubModal.jsx` (1,663 líneas)
3. `src/components/catedra/MesasExamenTab.jsx` (1,451 líneas)
4. `src/components/common/LicenciasDocenteModal.jsx` (1,229 líneas)
5. `src/components/catedra/LibroTemasTab.jsx` (1,219 líneas)
6. `src/components/catedra/ResourcesTab.jsx` (1,026 líneas)
7. `src/components/catedra/SettingsTab.jsx` (1,001 líneas)
8. `src/components/common/PrintPreviewModal.jsx` (963 líneas)
9. `src/components/mesas/MesaDetalleView.jsx` (916 líneas)

*Archivos auxiliares extensos:*
- `src/constants/decreto1092.js` (865 líneas - catálogo normativo estático)
- `src/hooks/useCalendarEvents.js` (821 líneas - hook gestor de agenda y eventos)

### C. Muestreo de Archivos con `select('*')` a Optimizar
- `src/components/admin/TeachersDirectory.jsx` (Línea 124)
- `src/components/catedra/CatedraStatsModal.jsx` (Líneas 80, 89, 99, 108, 118, 125)
- `src/components/catedra/EarlyWarningCard.jsx` (Líneas 84, 94, 102)
- `src/components/catedra/LibroTemasTab.jsx` (Líneas 161, 166)
- `src/components/catedra/MesasExamenTab.jsx` (Líneas 123, 124, 143, 231)
- `src/components/catedra/SettingsTab.jsx` (Líneas 142, 160)
- `src/components/catedra/UnidadesTab.jsx` (Líneas 64, 81)
- `src/components/mesas/MesaDetalleView.jsx` (Líneas 107, 116)
- `src/hooks/useAttendanceManager.js` (Líneas 49, 54, 59, 113)
- `src/hooks/useCalendarEvents.js` (Líneas 204, 213, 225, 240)
- `src/hooks/useGradesData.js` (Líneas 59, 72)
- `src/services/licenciasService.js` (Líneas 206, 267)

---

## 4. Estado del Árbol de Trabajo y Control de Cambios

- **Rama**: `main` (sincronizada con `origin/main` en commit `2b73f88` *"licencias 3.0"*).
- **Consolidación**: El repositorio se encuentra en un estado limpio y consistente.
- **Modificaciones locales detectadas**:
  - Submódulo/recurso de agente: `.agent/skills/everything-claude-code` (sin impacto en el código productivo).
  - 0 modificaciones sucias en archivos de producción (`src/`, `supabase/`, `public/`).
- **Integridad**: Auditoría 100% no destructiva. No se ejecutaron reversiones, mutaciones ni eliminaciones sobre el código.
