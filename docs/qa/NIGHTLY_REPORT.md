# Reporte de Auditoría Nocturna - Korum 2.0

- **Fecha de ejecución**: 2026-10-14 11:34:00 (America/Argentina/Buenos_Aires)
- **Modo**: Auditoría no destructiva programada (CI / QA Local)
- **Repositorio**: `C:/Users/emili/Documents/docente`

---

## 1. Verificación de Compilación y Tests

| Check | Comando | Resultado | Detalle |
| :--- | :--- | :---: | :--- |
| **Tests Unitarios Vitest** | `npx.cmd vitest run` | **PASÓ (100%)** | 2 archivos de test, 19 tests ejecutados y aprobados (RAM 70%, Régimen Laboral 60%, Equivalencias, N/E y Aus.) |
| **Compilación de Producción** | `npm.cmd run build` | **PASÓ (0 errores)** | Build de Vite completado en 16.84s con 3701 módulos transformados sin errores de imports ni referencias |

### Desglose de Tests Unitarios:
- `src/utils/__tests__/academicLogic.test.js` (13 tests) - **PASSED**
- `src/utils/__tests__/earlyWarningLogic.test.js` (6 tests) - **PASSED**

---

## 2. Auditoría de Seguridad y Deuda Técnica

| Métrica Auditada | Hallazgos | Estado | Observación |
| :--- | :---: | :---: | :--- |
| `console.log` en `src/` | 0 | **Limpio** | No se encontraron logs de consola olvidados en el código de producción. |
| Botones con doble signo `+ +` | 0 | **Limpio** | No se detectaron anomalías en la sintaxis de botones. |
| Consultas `select('*')` en `src/` | 45 | **Requiere Atención** | Deuda técnica persistente; se recomienda proyectar columnas específicas para optimizar egress de Supabase. |
| Políticas RLS con `USING (true)` | 6 | **Requiere Atención** | Políticas permisivas identificadas en archivos de migración SQL. |
| Componentes > 800 líneas | 8 | **Requiere Modularización** | Componentes monolíticos que superan el límite recomendado. |

---

## 3. Detalle de Archivos que Requieren Atención

### A. Políticas SQL Permisivas (`USING (true)`)
1. `supabase/legacy/migration_v25_calendario_colores_y_recordatorios.sql` (Línea 83)
2. `supabase/legacy/migration_v5_superadmin_config.sql` (Línea 78)
3. `supabase/migrations/20261004220000_baseline.sql` (Líneas 1262, 1371, 1514)
4. `supabase/migrations/20261004230000_fase2_seguridad_rls.sql` (Línea 129)

### B. Componentes Monolíticos (> 800 líneas)
1. `src/components/admin/SupportHubModal.jsx` (1,798 líneas)
2. `src/components/catedra/StudentsTab.jsx` (1,909 líneas)
3. `src/components/catedra/MesasExamenTab.jsx` (1,565 líneas)
4. `src/components/catedra/LibroTemasTab.jsx` (1,315 líneas)
5. `src/components/catedra/ResourcesTab.jsx` (1,099 líneas)
6. `src/components/catedra/SettingsTab.jsx` (1,074 líneas)
7. `src/components/common/PrintPreviewModal.jsx` (1,035 líneas)
8. `src/components/mesas/MesaDetalleView.jsx` (1,011 líneas)

### C. Muestreo de Archivos con `select('*')` a Optimizar
- `src/components/admin/TeachersDirectory.jsx` (Línea 124)
- `src/components/catedra/CatedraStatsModal.jsx` (Líneas 80, 89, 99, 108, 118, 125)
- `src/components/catedra/EarlyWarningCard.jsx` (Líneas 84, 94, 102)
- `src/components/catedra/LibroTemasTab.jsx` (Líneas 161, 166)
- `src/components/catedra/MesasExamenTab.jsx` (Líneas 123, 124, 143, 231)
- `src/components/catedra/SettingsTab.jsx` (Líneas 142, 160)
- `src/components/catedra/UnidadesTab.jsx` (Líneas 64, 81)
- `src/hooks/useAttendanceManager.js` (Líneas 34, 35, 36)
- `src/hooks/useGradesData.js` (Líneas 59, 72, 73)
- `src/hooks/useCalendarEvents.js` (Líneas 179, 188, 196)

---

## 4. Estado de Publicación / Commits
- **Tests**: 100% aprobados.
- **Build**: Satisfactorio.
- **Acción**: Auditoría completada de forma no destructiva sin alterar el historial de git.
