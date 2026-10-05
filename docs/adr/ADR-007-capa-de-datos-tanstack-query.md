# ADR-007: Implementación de Capa de Datos con TanStack Query, Tipado de Supabase y Adaptador de Caché

- **Fecha:** 2026-10-05
- **Estado:** Aceptado
- **Fase:** Fase 7 - Capa de datos con TanStack Query
- **Autor:** Antigravity Agentic Assistant

---

## 1. Contexto y Problema

En las fases anteriores, la gestión del estado del servidor en el frontend presentaba varias limitaciones:
1. **Peticiones redundantes y parpadeos en navegación:** Cada vez que el docente navegaba entre la pantalla de inicio (`DashboardPage`) y las cátedras, se disparaban solicitudes completas de red, generando estados de carga innecesarios.
2. **Caché manual frágil:** Las pestañas de `CatedraDetailPage` (`AttendanceTab`, `GradesTab`, `StudentsTab`, `LibroTemasTab`) utilizaban un módulo casero `catedraCache.js` basado en un `Map` en memoria con TTL fijo, careciendo de recolección de basura estructurada, deduplicación de consultas simultáneas, estados de carga normalizados e invalidación dirigida tras mutaciones.
3. **Ausencia de tipado estricto en el cliente Supabase:** El cliente `src/lib/supabase.js` carecía del genérico `createClient<Database>`, impidiendo que las consultas e invocaciones a RPCs se beneficiaran del autocompletado y validación de tipos generados en `src/types/database.types.ts`.

---

## 2. Decisión de Diseño

Se implementó una arquitectura declarativa de datos basada en **TanStack Query v5** (`@tanstack/react-query`), acompañada de una transición tipada en Supabase y un adaptador transparente de compatibilidad hacia atrás:

### 2.1 Adopción de `@tanstack/react-query` y Aislamiento de Bundle
- Se instaló `@tanstack/react-query` (licencia MIT, 100 % Open Source).
- Se configuró un chunk de Rollup independiente (`vendor-query`) en `vite.config.js`, aislando la librería (~46 kB sin comprimir / 14.4 kB gzipped) para no penalizar el tiempo de carga del chunk principal.
- Se configuró `queryClient` en `src/lib/queryClient.ts` con valores por defecto optimizados para el contexto docente:
  - `staleTime: 5 minutos` (evita refetches molestos al cambiar de aplicación o pestaña en clase).
  - `gcTime: 15 minutos` (mantiene los datos en memoria para navegación instantánea).
  - `refetchOnWindowFocus: false` (elimina recargas accidentales al cambiar de ventana).
  - `retry: 1`.

### 2.2 Fábrica Canónica de Claves (`queryKeys.ts`)
Se centralizó la estructura de Query Keys en `src/lib/queryKeys.ts` con tipado constante (`as const`), garantizando claves unificadas para:
- `dashboard.data(docenteId, activeCicloId)`
- `catedras.detail(catedraId)`
- `catedras.fullData(catedraId)`
- `mesas`, `instituciones`, `perfil`

### 2.3 Cliente Supabase Fuertemente Tipado (`supabase.ts`)
Se migró `src/lib/supabase.js` a TypeScript (`src/lib/supabase.ts`), instanciando `createClient<Database>(...)` con el contrato del esquema generado en `src/types/database.types.ts`.

### 2.4 Integración en `useDashboardData.js`
Se refactorizó el hook del panel docente para orquestar la carga de datos mediante `useQuery`:
- Mantiene la invocación optimizada de los RPCs `dashboard_resumen` y `dashboard_agenda` (Fase 6) con fallback automático transparente.
- Mantiene la firma pública idéntica `{ loading, catedrasList, setCatedrasList, agendaItems, setAgendaItems, fetchDashboardData }`, asegurando **0 cambios** requeridos en el componente `DashboardPage.jsx`.
- Conecta `setCatedrasList` y `setAgendaItems` directamente con `queryClient.setQueryData`, permitiendo actualizaciones optimistas instantáneas reflejadas en toda la aplicación.

### 2.5 Puente Adaptador en `catedraCache.js` y Hooks de Cátedra
Para respetar el principio de migración gradual sin riesgo de regresiones:
- `src/services/catedraCache.js` mantiene íntegra su API síncrona original (`.get()`, `.set()`, `.update()`, `.invalidate()`), permitiendo que los componentes de pestañas existentes continúen funcionando con paridad total.
- Internamente, sincroniza de forma bidireccional con TanStack Query:
  - En `.set()` y `.update()`, actualiza el caché de `queryClient.setQueryData(queryKeys.catedras.fullData(id), ...)`.
  - En `.invalidate()`, ejecuta `queryClient.invalidateQueries(...)`.
  - En `.get()`, consulta primero el `Map` y, de estar vacío, intenta resolver desde la memoria de TanStack Query.
- Se crearon hooks declarativos en `src/hooks/useCatedraQuery.js` (`useCatedraDetailQuery`, `useCatedraFullDataQuery`, `useInvalidateCatedraMutation`) para nuevas implementaciones y pantallas.

---

## 3. Pruebas y Verificación

1. **Compilación de Producción (`npm run build`):**
   - 2.088 módulos transformados en 10.65s.
   - Chunk `vendor-query` generado de forma limpia (46.29 kB / 14.40 kB gzipped).
   - 0 errores o advertencias de TypeScript.
2. **Batería de Pruebas de Base de Datos (`npm run db:test`):**
   - **8 suites, 50/50 tests passing (100 % éxito)**.
3. **Verificación de Schema Drift (`npm run db:diff`):**
   - 0 diferencias (`No schema changes found`).

---

## 4. Consecuencias

- **Positivas:**
  - Experiencia de usuario significativamente más rápida: alternar entre panel y cátedras es instantáneo gracias a la caché en memoria.
  - Cero peticiones redundantes o waterfalls de red.
  - Sincronización reactiva e invalidación dirigida de datos tras eventos de cursada o edición.
  - Tipado integral de llamadas Supabase con el esquema real de base de datos.
  - Transición progresiva: compatibilidad hacia atrás garantizada para todos los componentes existentes.
- **Negativas / Costos:**
  - Incorporación de una nueva librería (~14.4 kB gzipped), compensada por la reducción masiva de llamadas de red y eliminación de código casero de caché.
