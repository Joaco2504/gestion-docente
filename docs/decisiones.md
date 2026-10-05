# Registro de Decisiones de Arquitectura y Refactorización (ADR) - Korum

Este documento registra las decisiones técnicas tomadas a lo largo de las distintas fases de refactorización de Korum, sus fundamentos y contexto.

---

## Índice de Decisiones
- [ADR-001: Línea Base Consolidada y Adopción de Migraciones Versionadas con Timestamp](#adr-001-línea-base-consolidada-y-adopción-de-migraciones-versionadas-con-timestamp)
- [ADR-002: Endurecimiento RLS de Storage, search_path Explícito y Desacoplamiento de Canal Discord](#adr-002-endurecimiento-rls-de-storage-search_path-explícito-y-desacoplamiento-de-canal-discord)
- [ADR-003: Deprecación y Eliminación de la Tabla Huérfana public.docentes en favor de public.perfiles](#adr-003-deprecación-y-eliminación-de-la-tabla-huérfana-publicdocentes-en-favor-de-publicperfiles)
- [ADR-004: Estrategia de Integridad de Dominios mediante CHECK Constraints, Triggers Auto-Normalizadores y Enums TypeScript](#adr-004-estrategia-de-integridad-de-dominios-mediante-check-constraints-triggers-auto-normalizadores-y-enums-typescript)
- [ADR-005: Modularización Arquitectónica de DashboardPage.jsx sin Alteración Visual](#adr-005-modularización-arquitectónica-de-dashboardpagejsx-sin-alteración-visual)
- [ADR-006: Consolidación de Métricas de Dashboard en RPCs PostgreSQL (dashboard_resumen y dashboard_agenda)](#adr-006-consolidación-de-métricas-de-dashboard-en-rpcs-postgresql-dashboard_resumen-y-dashboard_agenda)
- [ADR-007: Implementación de Capa de Datos con TanStack Query, Tipado de Supabase y Adaptador de Caché](#adr-007-implementación-de-capa-de-datos-con-tanstack-query-tipado-de-supabase-y-adaptador-de-caché)
- [ADR-008: Rediseño Integral del Dashboard con Jerarquía Orientada al Día (Hoy), Alerta Temprana, Tarjetas Unificadas y Accesibilidad AA](#adr-008-rediseño-integral-del-dashboard-con-jerarquía-orientada-al-día-hoy-alerta-temprana-tarjetas-unificadas-y-accesibilidad-aa)
- [ADR-009: Visualización de Datos Accesible con Recharts, Tokens de Diseño y Aislamiento de Bundle](#adr-009-visualización-de-datos-accesible-con-recharts-tokens-de-diseño-y-aislamiento-de-bundle)
- [ADR-010: Reemplazo Seguro de Excel, Saneamiento de Vulnerabilidades y Mitigación de Archivos No Confiables](#adr-010-reemplazo-seguro-de-excel-saneamiento-de-vulnerabilidades-y-mitigación-de-archivos-no-confiables)
- [ADR-011: Estandarización de Formularios con React Hook Form, Validación Tipada Zod y Accesibilidad ARIA](#adr-011-estandarización-de-formularios-con-react-hook-form-validación-tipada-zod-y-accesibilidad-aria)
- [ADR-012: Estandarización del Manejo de Fechas con date-fns, Localización en Español y Aislamiento de Bundle](#adr-012-estandarización-del-manejo-de-fechas-con-date-fns-localización-en-español-y-aislamiento-de-bundle)

---

### ADR-001: Línea Base Consolidada y Adopción de Migraciones Versionadas con Timestamp

- **Fecha:** 2026-10-04
- **Estado:** Aceptado
- **Fase:** Fase 1

#### Contexto
El repositorio presentaba un severo *schema drift*:
- El archivo `schema.sql` y más de 30 migraciones sueltas (`v2` a `v26`, `fix_*.sql`) no representaban con fidelidad la base de datos real en Supabase Cloud.
- Migraciones en el repositorio creaban índices sobre columnas inexistentes (`asistencias.catedra_id` y `asistencias.fecha` en `migration_v15`).
- Varias migraciones recientes (`v20`, `v22`, `v23`, `v25`) no habían sido ejecutadas en producción, mientras que en producción existían tablas (`actas_examen_detalle`, `actas_examen_estudiantes`) y decenas de columnas agregadas manualmente o fuera de control de versiones.
- Las consultas en el frontend (`DashboardPage.jsx`) fallaban con HTTP 400 intentando leer `inscripciones.estado_ram`.

#### Decisión
1. Extraer los metadatos exactos de la base real de producción desde el catálogo PostgreSQL de Supabase Cloud.
2. Archivar todas las migraciones previas en `supabase/legacy/` como registro histórico inmutable.
3. Consolidar el estado completo y verificado en una única migración baseline: `supabase/migrations/20261004220000_baseline.sql`.
4. Adoptar el flujo estándar de Supabase con migraciones timestamped (`<timestamp>_<nombre>.sql`), verificado localmente con Docker y `npx supabase db reset`.
5. Incorporar scripts npm `db:types` (generador de `src/types/database.types.ts`) y `db:diff` (verificación de cambios en el esquema local con 0 diff).
6. Instalar `supabase` en `devDependencies` para garantizar portabilidad en Windows y entornos de CI.

#### Consecuencias
- **Positivas:**
  - Paridad 100% garantizada entre base de datos y repositorio.
  - Reproducción instantánea del entorno en Docker local sin fallas de constraints.
  - Tipado automático de TypeScript para Supabase en `src/types/database.types.ts`.
  - Cero riesgo de aplicar índices o migraciones sobre columnas no existentes.
- **Negativas / Costos:**
  - Se debe conciliar gradualmente en las fases siguientes el código que dependía de columnas no aplicadas o nombres divergentes (`vocal_1`/`vocal1`, `estado_ram`/`estado_academico`).

---

### ADR-002: Endurecimiento RLS de Storage, search_path Explícito y Desacoplamiento de Canal Discord

- **Fecha:** 2026-10-04
- **Estado:** Aceptado
- **Fase:** Fase 2

#### Contexto
1. El bucket de Supabase Storage `archivos-docentes` contaba con políticas globales (`Allow all uploads / deletes`) que permitían que cualquier usuario autenticado pisara o borrara archivos ajenos.
2. El canal de Discord estaba hardcodeado como un `DEFAULT` en la base de datos y en plantillas de n8n.
3. La tabla `recordatorios_enviados` usaba un campo `evento_id TEXT` sin soporte para referencias tipadas o índices polimórficos.
4. Múltiples funciones `SECURITY DEFINER` carecían de `search_path` explícito, representando un vector de escalada de privilegios según las guías de seguridad de PostgreSQL y Supabase.

#### Decisión
1. **Storage RLS:**
   - Mantener el bucket público para lectura (`SELECT`) preservando la compatibilidad de descarga directa en `recursos` y el portal de alumnos sin necesidad de regenerar URLs firmadas.
   - Restringir `INSERT`, `UPDATE` y `DELETE` en `storage.objects` a la regla estricta: `(storage.foldername(name))[1] = auth.uid()::text OR public.es_superadmin()`.
   - Normalizar la subida en el helper del cliente `src/lib/supabase.js` para exigir sesión autenticada y anteponer `{userId}/{catedraId}/`.
2. **Discord:**
   - Crear la columna `discord_canal_recordatorios` en `configuracion_sistema`, inicializada en `1556366651296055357`.
   - Crear la tabla `recordatorios_enviados` con `evento_origen TEXT` y `evento_uuid UUID` indexados, manteniendo `evento_id TEXT` para soportar resúmenes sintéticos diarios.
   - Adaptar `discord_reminders_worker.mjs` y `korum_discord_reminders.json` para resolver el canal desde la base o variable de entorno.
3. **Funciones `SECURITY DEFINER`:**
   - Reemplazar todas las funciones `SECURITY DEFINER` fijando explícitamente `SET search_path = public, extensions, pg_temp;`.
4. **Verificación de Aislamiento:**
   - Crear suite de pruebas de aislamiento con pgTAP (`supabase/tests/01_rls_isolation.sql`) ejecutada automáticamente con `npm run db:test`.

#### Consecuencias
- **Positivas:**
  - Aislamiento total entre docentes demostrado empíricamente mediante pruebas automatizadas pgTAP.
  - Blindaje contra secuestro de `search_path` en todas las funciones privilegiadas.
  - El canal de Discord puede modificarse dinámicamente desde configuración o variables de entorno sin migraciones de esquema.
- **Negativas / Costos:**
  - Los scripts de backend externos que requieran escribir en `recordatorios_enviados` deben correr como `service_role` o superadmin.

---

### ADR-003: Deprecación y Eliminación de la Tabla Huérfana `public.docentes` en favor de `public.perfiles`

- **Fecha:** 2026-10-05
- **Estado:** Aceptado (Aprobación Go otorgada)
- **Fase:** Fase 3 (Sub-paso 3b)

#### Contexto
Durante la auditoría del esquema de base de datos se detectó la coexistencia de `public.perfiles` y `public.docentes`. La investigación técnica determinó:
1. **Foreign Keys:** Cero tablas en PostgreSQL tienen FK apuntando a `public.docentes` ni a `public.perfiles` (todas las relaciones maestras usan `docente_id REFERENCES auth.users(id)`).
2. **Triggers:** El trigger `handle_new_user()` tras el registro en `auth.users` inserta exclusivamente en `public.perfiles`. Nunca alimenta a `public.docentes`.
3. **Frontend:** 8 consultas activas a `public.perfiles` en componentes críticos, y **0 consultas** a `public.docentes`.
4. **Datos:** `public.docentes` contiene 0 registros tanto en local como en producción.

#### Decisión Propuesta
1. Establecer `public.perfiles` como entidad única y canónica de perfiles de usuario.
2. Deprecar formalmente `public.docentes` sin añadir sincronización innecesaria.
3. Solicitar aprobación Go / No-Go para su eliminación definitiva en la fase de contratos.

#### Consecuencias
- **Positivas:**
  - Cero riesgo de regresión o rotura de funcionalidad.
  - Eliminación de ambigüedad y código muerto en base de datos.
  - Mantenimiento enfocado en una única tabla de perfiles.
- **Negativas / Costos:**
  - Ninguna identificada.

---

### ADR-004: Estrategia de Integridad de Dominios mediante CHECK Constraints, Triggers Auto-Normalizadores y Enums TypeScript

- **Fecha:** 2026-10-05
- **Estado:** Aceptado
- **Fase:** Fase 4

#### Contexto
Inconsistencias históricas en strings de dominio (`evaluaciones.tipo`, `periodos_academicos.tipo`, `asistencias.estado`, `inscripciones.estado_academico`, `recursos.categoria` y `tipo_origen`) ponían en riesgo la integridad referencial y producían fallas en componentes frontend ante strings libres ("strings mágicos").
Se analizó la opción de usar `CREATE TYPE ... AS ENUM` nativo en PostgreSQL, pero PostgreSQL restringe `ALTER TYPE ... ADD VALUE` fuera de transacciones, bloqueando las suites de prueba pgTAP transaccionales y los rollbacks atómicos.

#### Decisión
1. Adoptar **CHECK constraints** con listas canónicas sobre columnas `TEXT`.
2. Implementar triggers defensivos `BEFORE INSERT OR UPDATE` (`trg_normalize_*`) que transforman y sanean variantes descriptivas históricas hacia el valor canónico antes de evaluar el constraint.
3. Centralizar todos los dominios del sistema en `src/lib/enums.ts` mediante constantes `as const`, tipos TypeScript, labels y funciones de normalización pura.
4. Refactorizar modales y componentes (`NuevaEvaluacionModal`, `GradesTab`, `SettingsTab`, `EditarRecursoModal`, `ResourcesTab`, `AttendanceTab`, `StudentsTab`) eliminando strings mágicos.

#### Consecuencias
- **Positivas:**
  - 100% transaccionalidad y compatibilidad con pgTAP y rollbacks.
  - Tolerancia a fallos: clientes antiguos o respuestas cacheadas se auto-sanean en el motor sin arrojar errores al usuario.
  - Tipado de extremo a extremo y autocompletado en frontend.
  - Cero schema drift verificado con Supabase CLI.
- **Negativas / Costos:**
  - Requiere sincronización disciplinada entre `src/lib/enums.ts` y las migraciones de PostgreSQL cuando se introduzcan nuevos valores al dominio.

---

### ADR-005: Modularización Arquitectónica de DashboardPage.jsx sin Alteración Visual

- **Fecha:** 2026-10-05
- **Estado:** Aceptado
- **Fase:** Fase 5

#### Contexto
El componente `DashboardPage.jsx` contenía 1.968 líneas en un solo archivo monolítico, acoplando carga de datos de Supabase, simulación demo, algoritmos de cálculo de horarios y métricas, 3 modales de formulario y el renderizado integral del Bento Grid.

#### Decisión
1. Descomponer el panel en módulos cohesivos dentro de `src/features/dashboard/`:
   - `hooks/useDashboardData.js`: Carga en paralelo desde Supabase, fallback demo y estado principal.
   - `utils/dashboardHelpers.js`: Algoritmos puros de búsqueda, cálculo de próxima clase, agenda y métricas.
   - `components/DashboardActionCards.jsx`: Barra superior de 4 acciones rápidas.
   - `components/UpcomingClassCard.jsx`: Bento Box 1 (Próxima clase inminente).
   - `components/QuickMetricsCard.jsx`: Bento Box 2 (Donut SVG interactivo y contadores animados).
   - `components/CatedrasSection.jsx` y `components/CatedraCard.jsx`: Grilla de materias con menú contextual y módulo de última clase dictada.
   - `components/DashboardAgendaSection.jsx`: Grilla de compromisos y agenda de 15 días.
   - Modales independientes en `components/modals/` (`NuevaCatedraModal`, `QuickClassModal`, `QuickEventModal`).
2. Mantener `src/pages/DashboardPage.jsx` como orquestador liviano de 179 líneas (< 200 líneas).
3. Preservar 100% la paridad visual, tokens Tailwind y comportamiento en todos los breakpoints.

#### Consecuencias
- **Positivas:**
  - Cumplimiento de límites de complejidad: orquestador con 179 líneas (< 200) y todos los subcomponentes con menos de 260 líneas (< 300).
  - Aislamiento limpio para la Fase 6 (RPC `dashboard_resumen`) y Fase 7 (TanStack Query).
  - Cero dependencias adicionales añadidas.
- **Negativas / Costos:**
  - Mayor cantidad de archivos individuales a mantener en `src/features/dashboard/`.

---

### ADR-006: Consolidación de Métricas de Dashboard en RPCs PostgreSQL (`dashboard_resumen` y `dashboard_agenda`)

- **Fecha:** 2026-10-05
- **Estado:** Aceptado
- **Fase:** Fase 6

#### Contexto
En el flujo previo, para computar métricas de cátedras (alumnos inscriptos, clases, asistencia promedio general y por cátedra, y última clase dictada con conteo de presentes), el frontend realizaba múltiples consultas a la base de datos descargando miles de registros detallados de asistencias y clases para reducirlos en memoria del navegador, incurriendo en sobre-descarga de red y problemas de N+1. La agenda docente realizaba descargas completas de calendarios y períodos académicos para filtrarlos en el cliente.

#### Decisión
1. **RPC `public.dashboard_resumen(p_docente_id UUID)`:**
   - Función `SECURITY DEFINER` con `SET search_path = public` explícito.
   - Validación defensiva de aislamiento multi-inquilino (`auth.uid() = p_docente_id` o `public.es_superadmin()`).
   - CTEs de alto rendimiento (`cte_catedras`, `cte_inscriptos`, `cte_clases`, `cte_asistencias_catedra`, `cte_ultima_clase`) para calcular en un único escaneo métricas globales, métricas por cátedra y última clase dictada con presentes.
   - Retorno en formato estructurado `JSONB` compacto (< 5 KB).
2. **RPC `public.dashboard_agenda(p_docente_id UUID, p_dias INT DEFAULT 15)`:**
   - Función `SECURITY DEFINER` con `SET search_path = public`.
   - Agregación unificada cronológica de `eventos_calendario` y `periodos_academicos` en ventana de `p_dias`.
3. **Frontend con Fallback Transparente:**
   - Invocación en paralelo en `src/features/dashboard/hooks/useDashboardData.js`.
   - Manejo de excepciones y fallback automático transparente hacia queries tradicionales de cliente si los RPCs fallan o no están disponibles.
4. **Verificación y Cobertura:**
   - Suite pgTAP `08_fase6_rpc_dashboard.sql` con 9 asserts dedicados (50/50 tests globales pasando al 100%).
   - Script de rollback atómico en `supabase/rollbacks/20261005080000_fase6_rpc_dashboard_rollback.sql`.

#### Consecuencias
- **Positivas:**
  - Eliminación del patrón N+1 y sobre-descarga de datos en red (de cientos/miles de registros a un payload < 5 KB).
  - Reducción sustancial del tiempo de carga inicial y menor consumo en dispositivos móviles.
  - Computación consistente e idéntica de métricas docentes en base de datos.
  - Fallback transparente que garantiza alta resiliencia y disponibilidad continua.
- **Negativas / Costos:**
  - Las reglas de agregación de métricas de cátedras ahora residen en PostgreSQL y deben mantenerse sincronizadas con el esquema.

---

### ADR-007: Implementación de Capa de Datos con TanStack Query, Tipado de Supabase y Adaptador de Caché

- **Fecha:** 2026-10-05
- **Estado:** Aceptado
- **Fase:** Fase 7

#### Contexto
El panel de inicio y las pestañas de cátedras presentaban parpadeos de recarga y solicitudes redundantes al navegar entre vistas. La memoria temporal en cliente dependía de un `Map` en `catedraCache.js` con TTL fijo pero sin recolección de basura estructurada ni invalidación dirigida ante mutaciones, y el cliente Supabase no contaba con el contrato de tipos de `Database`.

#### Decisión
1. **Adopción de TanStack Query v5:**
   - Instalación de `@tanstack/react-query` y configuración de `QueryClientProvider` en `src/main.jsx`.
   - Aislamiento en un chunk dedicado `vendor-query` en `vite.config.js` (~14.4 kB gzipped).
   - Configuración de `staleTime: 5 min` y `gcTime: 15 min` en `src/lib/queryClient.ts`.
2. **Fábrica de Claves Canónica:**
   - Creación de `src/lib/queryKeys.ts` con tipado constante (`as const`) para dashboard, cátedras, instituciones y mesas.
3. **Cliente Supabase Fuertemente Tipado:**
   - Migración de `src/lib/supabase.js` a `src/lib/supabase.ts` con `createClient<Database>`.
4. **Hook de Dashboard Declarativo (`useDashboardData.js`):**
   - Integración de `useQuery` manteniendo 100% de paridad con la interfaz previa del hook.
   - Sincronización de mutaciones optimistas con `queryClient.setQueryData`.
5. **Puente de Compatibilidad en `catedraCache.js` y Hooks Nuevos:**
   - Conservación íntegra de la API síncrona original de `catedraCache` con sincronización bidireccional automática hacia `queryClient`.
   - Creación de hooks nativos en `src/hooks/useCatedraQuery.js`.
   - Invalidación reactiva de consultas en el ciclo de vida de cursada en `CatedraDetailPage.jsx`.

#### Consecuencias
- **Positivas:**
  - Navegación instantánea y fluida sin parpadeos ni waterfalls de red.
  - Recolección de basura controlada y tipado end-to-end de consultas.
  - Cero breaking changes: los componentes existentes siguen funcionando con total normalidad.
- **Negativas / Costos:**
  - Añade la dependencia `@tanstack/react-query` (~14.4 kB gzipped en chunk aislado).

---

### ADR-008: Rediseño Integral del Dashboard con Jerarquía Orientada al Día (Hoy), Alerta Temprana, Tarjetas Unificadas y Accesibilidad AA

- **Fecha:** 2026-10-05
- **Estado:** Aceptado
- **Fase:** Fase 8

#### Contexto
El panel principal carecía de un foco operativo inmediato para la jornada del día, las alertas de asistencia crítica o materias sin clases requerían navegación manual por cátedra, existía heterogeneidad en el estilado de contenedores y algunos objetivos táctiles en móviles pequeños (320px–480px) no alcanzaban las pautas WCAG 2.1 AA.

#### Decisión
1. **Jerarquía Orientada al Día ("Hoy"):**
   - Incorporación de `DashboardTodayFocus.jsx` con saludo contextual, fecha en español, indicador de ciclo lectivo y estado en vivo de clases programadas para el día.
2. **Motor de Alerta Temprana:**
   - Detección en memoria de materias con asistencia crítica (< 75%), cátedras sin clases registradas y eventos en las próximas 48 horas, con banner desplegable y acciones directas.
3. **Unificación Estricta en `Card.jsx`:**
   - Estandarización de `UpcomingClassCard`, `QuickMetricsCard`, `CatedraCard`, `DashboardAgendaSection` y `DashboardTodayFocus` sobre el componente canónico `Card.jsx`.
4. **Ergonomía y Accesibilidad WCAG 2.1 AA:**
   - Objetivos táctiles mínimos de 44x44 px (y 52 px en acciones rápidas), contrastes simétricos claro/oscuro y soporte sin desbordes para 320px–1024px+.
5. **Control de Límites de Código:**
   - Orquestador `DashboardPage.jsx` conservado en 189 líneas (< 200) y submódulos < 280 líneas (< 300).

#### Consecuencias
- **Positivas:**
  - Mayor agilidad operativa para el docente al comenzar su jornada.
  - Detección preventiva de riesgos de regularidad de alumnos.
  - Estética Bento Grid consistente y 100% accesible en cualquier dispositivo móvil o de escritorio.
- **Negativas / Costos:**
  - Ninguna identificada.

---

### ADR-009: Visualización de Datos Accesible con Recharts, Tokens de Diseño y Aislamiento de Bundle

- **Fecha:** 2026-10-05
- **Estado:** Aceptado
- **Fase:** Fase 9

#### Contexto
La visualización de métricas académicas (distribución de calificaciones, condición de alumnos, estadísticas de cátedra y asistencia docente) dependía de implementaciones manuales de SVG inline sin roles semánticos, tooltips para lectores de pantalla ni descripciones estructuradas para personas con discapacidad visual. Además, los cálculos manuales de arcos y circunferencias resultaban frágiles ante cambios de datos.

#### Decisión
1. Adoptar **Recharts v3** (`recharts@^3.10.1`, licencia MIT) como biblioteca de visualización de datos accesible.
2. Aislar la dependencia en un chunk dedicado de Rollup en `vite.config.js` (`vendor-charts`), evitando sobrecargar el bundle principal de la aplicación.
3. Centralizar tokens de color semánticos en `src/components/charts/chartTokens.ts` para condiciones académicas (promoción, regular, recuperatorio, libre) con contraste accesible WCAG 2.1 AA.
4. Refactorizar `InteractiveBarChart.jsx` y `InteractiveDonutChart.jsx` incorporando roles semánticos (`role="img"`), `aria-label` detallados con métricas cuantitativas y tooltips accesibles con desenfoque de fondo.
5. Crear `AttendanceGaugeChart.jsx` e integrarlo en `QuickMetricsCard.jsx`, eliminando el último SVG de gráficos embebido a mano.

#### Consecuencias
- **Positivas:**
  - Plena conformidad con accesibilidad WCAG 2.1 AA para visualización de datos numéricos.
  - Gráficos fluidos, responsivos y con animaciones de entrada suaves.
  - Cero breaking changes en componentes consumidores (`CatedraStatsModal`, `GlobalMetricsSection`, `QuickMetricsCard`).
  - Aislamiento de código que garantiza carga ultrarrápida del resto de la aplicación.
- **Negativas / Costos:**
  - Incorporación de `recharts` al proyecto, mitigada mediante el chunk Rollup dedicado (`vendor-charts`).

---

### ADR-010: Reemplazo Seguro de Excel, Saneamiento de Vulnerabilidades y Mitigación de Archivos No Confiables

- **Fecha:** 2026-10-05
- **Estado:** Aceptado
- **Fase:** Fase 10 (Sub-mejora 10.1)

#### Contexto
La versión `xlsx@0.18.5` en el registro npm contenía dos vulnerabilidades críticas no resueltas (Prototype Pollution GHSA-4r6h-8v6p-xvw6 y ReDoS GHSA-5pgg-2g8v-p4x9), dado que los autores descontinuaron la publicación en npm en 2022. Además, las rutinas de importación de planillas de alumnos carecían de límites defensivos de tamaño y de protección contra inyección de propiedades maliciosas.

#### Decisión
1. Actualizar hacia la distribución canónica segura de SheetJS (`"xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"`, Apache-2.0, 100% gratuita), eliminando las alertas de npm audit y manteniendo soporte para `.xlsx`, `.xls` y `.csv`.
2. Conservar el aislamiento Rollup en `vite.config.js` (`vendor-excel`), garantizando carga bajo demanda (*lazy*).
3. Establecer límite estricto de tamaño de archivo (máx. 5 MB) y límite de filas (máx. 5.000 filas por planilla) en `src/lib/excel.js` y `ExcelImporter.jsx`.
4. Sanitizar metódicamente los objetos de fila para prevenir Prototype Pollution (`__proto__`, `constructor`, `prototype`).
5. Preservar íntegramente la API pública de `src/lib/excel.js`.

#### Consecuencias
- **Positivas:**
  - Cero vulnerabilidades activas en npm audit para dependencias de planillas.
  - Protección robusta contra archivos excesivos o malformados provistos por usuarios.
  - Compatibilidad completa con planillas de cálculo escolares (.xlsx, .xls y .csv).
  - Cero breaking changes en componentes consumidores.
- **Negativas / Costos:**
  - Dependencia de un archivo tarball seguro servido desde `cdn.sheetjs.com`.

---

### ADR-011: Estandarización de Formularios con React Hook Form, Validación Tipada Zod y Accesibilidad ARIA

- **Fecha:** 2026-10-05
- **Estado:** Aceptado
- **Fase:** Fase 10 (Sub-mejora 10.2)

#### Contexto
Los modales operativos del Dashboard (`NuevaCatedraModal`, `QuickClassModal`, `QuickEventModal`) gestionaban estados dispersos con `useState`, provocando re-renderizados completos en cada tecla, carecían de esquemas tipados reutilizables y no vinculaban programáticamente los errores con los campos (`aria-invalid` y `aria-describedby` ausentes).

#### Decisión
1. Adoptar `react-hook-form` + `zod` con `@hookform/resolvers/zod` (100% MIT, open source).
2. Aislar las dependencias en el chunk dedicado `vendor-forms` en `vite.config.js`.
3. Centralizar esquemas declarativos en `src/schemas/dashboardForms.js` (`nuevaCatedraSchema`, `quickClassSchema`, `quickEventSchema`).
4. Refactorizar los 3 modales operativos con validación en tiempo de envío, control de componentes personalizados (`CustomSelect`) con `Controller` y mensajes accesibles con `role="alert"` y foco visual claro.
5. Mantener los componentes bajo el límite estricto de 300 líneas (290, 196 y 254 líneas respectivamente).

#### Consecuencias
- **Positivas:**
  - Rendimiento óptimo sin re-evaluaciones innecesarias del modal.
  - Validación tipada y consistente antes de enviar datos al servidor.
  - Conformidad con WCAG 2.1 AA en accesibilidad de formularios.
  - Esquemas puros y testeables de forma unitaria.
- **Negativas / Costos:**
  - Incorporación de dependencias de formularios, mitigadas por el chunk dedicado `vendor-forms`.

---

### ADR-012: Estandarización del Manejo de Fechas con date-fns, Localización en Español y Aislamiento de Bundle

- **Fecha:** 2026-10-05
- **Estado:** Aceptado
- **Fase:** Fase 10 (Sub-mejora 10.3)

#### Contexto
El formateo, cálculo de diferencias relativas y correspondencia de días festivos dependía de manipulaciones manuales sobre el objeto `Date` y strings (`split('-')`, arrays de meses e índices caseros), acarreando riesgos de desfase de día por diferencias de huso horario (ej. UTC vs. hora argentina UTC-3) e inconsistencias en comparaciones relativas.

#### Decisión
1. Adoptar **`date-fns` v4** junto con el locale oficial en español (`date-fns/locale/es`) bajo licencia MIT.
2. Aislar la dependencia en el chunk Rollup dedicado `vendor-dates` en `vite.config.js` (~23.8 kB / 7.0 kB gzipped).
3. Refactorizar `src/lib/dateUtils.js` y `src/utils/feriadosAcademicos.ts` utilizando utilidades puras e inmutables (`format`, `parseISO`, `differenceInCalendarDays`, `isWithinInterval`, `isBefore`, `endOfDay`).
4. Preservar íntegramente la API pública y el estándar institucional: `DD-MM-YYYY` para presentación y `YYYY-MM-DD` para base de datos.

#### Consecuencias
- **Positivas:**
  - Eliminación absoluta de desfases de día por huso horario en calendarios, avisos y asistencias.
  - Formateo idiomático en español (`Lun 5 Oct`) y cálculo robusto de días relativos.
  - Cero breaking changes en componentes consumidores.
- **Negativas / Costos:**
  - Incorporación de la dependencia `date-fns`, mitigada por su peso ligero y aislamiento en Rollup.

---

### ADR-013: Tablas Avanzadas de Alta Densidad con TanStack Table (@tanstack/react-table) y Accesibilidad WCAG AA

- **Fecha:** 2026-10-05
- **Estado:** Aceptado
- **Fase:** Fase 10 (Sub-mejora 10.4)

#### Contexto
Las tablas de gestión académica (`StudentsTab.jsx`, `GradesTab.jsx`) contenían marcado HTML manual acoplado con lógica de ordenamiento imperativa y carecían de atributos semánticos `aria-sort="ascending" | "descending" | "none"`, soporte accesible para lectores de pantalla, paginación configurable y primera columna fija consistente en dispositivos con desplazamiento horizontal.

#### Decisión
1. Adoptar **`@tanstack/react-table` v8** (100% Open Source, licencia MIT) con arquitectura *headless*.
2. Aislar la dependencia en el chunk dedicado `vendor-table` en `vite.config.js` (~51.8 kB / 13.9 kB gzipped).
3. Diseñar componentes modulares bajo el límite de 300 líneas:
   - `src/components/catedra/tables/studentColumns.jsx` (264 líneas): Factoría memoizada de definiciones de columnas para cursantes y alumnos de equivalencia.
   - `src/components/catedra/tables/StudentsDataTable.jsx` (248 líneas): Tabla headless con primera columna fija (*sticky DNI*), headers pegajosos con *backdrop-blur*, ordenamiento accesible y paginación con selector de tamaño de página.
4. Integrar `StudentsDataTable` en `StudentsTab.jsx`, eliminando más de 360 líneas de marcado manual y componentes duplicados (`StudentRow`, `EquivalenciaRow`).

#### Consecuencias
- **Positivas:**
  - Control de accesibilidad completo según WCAG AA con `aria-sort`, `caption` descriptivo y navegación por teclado.
  - Paginación dinámica y selector de filas (15, 25, 50, 100) para cursos masivos sin saturar el DOM.
  - Separación de responsabilidades: la lógica de estado la provee TanStack Table y la presentación visual se controla 100% mediante Tailwind CSS y tokens de diseño de Korum.
  - Saneamiento y reducción de tamaño del archivo `StudentsTab.jsx`.
- **Negativas / Costos:**
  - Nueva dependencia de runtime, mitigada por aislamiento en chunk `vendor-table` y carga diferida.

