# System Patterns — Korum

## Arquitectura Frontend
- **SPA Modular en React 18 + Vite:** Rutas protegidas por rol (`ProtectedRoute`, `SuperAdminRoute`) y rutas públicas (`/login`, `/consulta`).
- **Servicios de Dominio (`src/services/`):** Encapsulan consultas a Supabase y lógica transaccional (`licenciasService.js`, `catedrasService.js`).
- **Hooks de Estado de Negocio (`src/hooks/`):**
  - `useAttendanceManager.js`: Orquesta clases, asistencias, feriados y licencias en tiempo real.
- **Utilidades Puras (`src/utils/`):**
  - `licenciasHelper.js`: Catálogo `FERIADOS_OFICIALES_2026`, cálculo de fechas, verificación de días de cursada (`catedraHasClassOnDate`) y feriados (`isFeriadoDate`).
  - `scheduledClassesHelper.js`: Sincronización e inserción estricta de clases programadas (`ensureScheduledClassesToDate`).
  - `decreto1092Catalog.js`: Catálogo normativo del Decreto Acuerdo N° 1092.
