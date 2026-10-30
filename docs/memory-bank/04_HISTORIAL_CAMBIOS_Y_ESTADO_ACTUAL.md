# 04. Historial de Cambios y Estado Actual — Korum 2.0

Bitácora técnica viva donde se registran cronológicamente todas las directivas, refactorizaciones y correcciones realizadas para preservar la memoria del proyecto y evitar cualquier tipo de regresión.

---

## Hitos Históricos y Mejoras de Producción

### 1. Catálogo Completo Decreto 1092/1979 e Integración de Licencias
- Creación de [`src/utils/decreto1092Catalog.js`](file:///c:/Users/emili/Documents/docente/src/utils/decreto1092Catalog.js) con catálogo completo de artículos.
- Soporte para licencias multi-día con cómputo de días `CORRIDOS` y `HABILES`.
- Control de cupos anuales y mensuales en tiempo real.

### 2. Edición Completa de Licencias Registradas y Reconciliación
- Creación de `updateLicencia` en [`src/services/licenciasService.js`](file:///c:/Users/emili/Documents/docente/src/services/licenciasService.js) con reconciliación de fechas liberadas vs nuevas fechas alcanzadas.
- Exclusión del registro en edición al evaluar topes disponibles para evitar falsos bloqueos.

### 3. Corrección Exhaustiva de Vistas Desktop (10 Puntos UI/UX)
- Solución definitiva al solapamiento en el Header ([`Navbar.jsx`](file:///c:/Users/emili/Documents/docente/src/components/layout/Navbar.jsx)) eliminando `absolute` de la barra central y distribuyendo 3 bloques `flex`.
- Optimización de tarjetas de Clases Registradas, Calendario, SuperAdmin, Login y Portal Estudiantil en resoluciones de escritorio.

### 4. Rediseño del Portal Estudiantil "Mi espacio académico"
- Enmascaramiento de DNI (`42.***.302`) por privacidad en [`ConsultaAlumnoPage.jsx`](file:///c:/Users/emili/Documents/docente/src/pages/ConsultaAlumnoPage.jsx).
- Explicación pedagógica de la condición del alumno (Regular, Promocional, Libre) y tarjetas adaptables en dispositivos móviles.

### 5. Autogeneración Estricta en Días de Cursada y Soporte de Feriados Oficiales
- Implementación de regla estricta: solo se autogeneran clases en días de la semana donde la cátedra efectivamente se dicta (`catedraHasClassOnDate`).
- Catálogo oficial `FERIADOS_OFICIALES_2026` con prioridad absoluta sobre licencias docentes (verificado con regresión para el lunes 12/10/2026).
- 67 tests unitarios pasando en Vitest y build limpio con Vite.

### 6. Instalación de Skills y Motores de Estado
- `cursor-memory-bank`: Directorio `memory-bank/` + comandos `/van`, `/plan`, `/creative`, `/build`, `/reflect`, `/archive`.
- `claude-task-master`: Motor de estado determinista `.taskmaster/` + CLI `scripts/taskmaster-state.mjs` (`npm run tm`).
- `bmad-method`: 31 skills oficiales + directorio `_bmad/` inicializado con `uv`.

### 7. Auditoría y Refactorización Responsiva Integral (Phone 360px–430px & Tablet 768px–1024px)
- **Estado:** ✅ Completado y Verificado (Fases 1 a 8).
- **Alcance y Mejoras Realizadas:**
  * **Viewport y Scroll:** Contención global en `html, body, #root { overflow-x: hidden; max-width: 100vw; }` en `index.css`.
  * **Layout Global:** Padding inferior en `AppLayout.jsx` (`pb-28 lg:pb-12`) previniendo solapamiento con el `BottomNav` móvil.
  * **Header & Navbar:** Selectores en `HeaderSelector.jsx` fluidos con `min-w-0`, truncado de selector de cátedra en celulares, botón táctil de búsqueda de 44px.
  * **BottomNav:** Padding seguro `pb-safe`, áreas de contacto mínimas de 48px, texto de 10px con truncado defensivo.
  * **Dashboard:** Bento cards 50/50 y tarjetas de acciones rápidas fluidas sin desbordes horizontales en 360px.
  * **Cátedra & Asistencia:** Botonera táctil de 3 estados (Presente, Ausente, Justificado) en tarjetas móviles con $44\text{px}\times 44\text{px}$, barra de temas y Decreto 1092 con ajuste flexible en pantallas estrechas.
  * **Calendario:** Horas de referencia (`07:00 hs`, etc.) fijadas con `sticky left-0` para mantener la orientación temporal mientras se desliza horizontalmente entre días en móviles y tablets.
  * **Modales:** Limitación universal en `Modal.jsx` a `max-h-[90dvh]` con scroll vertical independiente y gesto táctil swipe-down para descartar.
  * **Login & Portal Estudiantil:** Formulario con padding elástico para celulares (`p-4 xs:p-6`), DNI enmascarado (`42.***.302`), y tabla de calificaciones que transmuta automáticamente a tarjetas apiladas en pantallas pequeñas.
  * **QA & Build:** 67/67 pruebas unitarias aprobadas en Vitest (`npx vitest run --passWithNoTests`) y build de producción exitoso con Vite (Código 0).

### 8. Integración de Vercel Speed Insights
- **Estado:** ✅ Completado y Verificado.
- **Detalle:**
  * Paquete `@vercel/speed-insights` verificado e instalado en `package.json`.
  * Integración en la raíz de la aplicación ([`src/App.jsx`](file:///c:/Users/emili/Documents/docente/src/App.jsx)) importando y montando `<SpeedInsights />` junto a `<Analytics />`.
  * Verificación de calidad: 67/67 tests pasando en Vitest y compilación de producción exitosa con Vite (código 0).

### 9. Corrección Quirúrgica de Vista Celular (< 640px)
- **Estado:** ✅ Completado y Verificado.
- **Alcance y Mejoras Realizadas:**
  * **Desbloqueo de Scroll Vertical Táctil en Alumnos (`StudentsTab.jsx`):** Eliminado `overflow-y-auto overscroll-y-contain` atrapado del contenedor principal de la vista, permitiendo que el scroll táctil fluya libremente al nivel del layout de la página. Incorporado `touch-pan-y` y `style={{ touchAction: 'pan-y' }}` en `StudentCardMobile`, `EquivalenciaCardMobile` y el contenedor grid móvil.
  * **Buscador & Ordenamiento Móvil Unificado:** En móviles (`< 1024px`), se sustituyó la lupa circular expandible por un input de búsqueda siempre visible con ícono de lupa y botón `X` de limpieza (`placeholder="Buscar alumno por nombre o DNI..."`), y una única fila de ordenamiento con select de criterios y botón `Asc`/`Desc`. En desktop (`>= 1024px`) se mantiene `ExpandableSearch` y el botón rápido `Ordenar: A-Z`.
  * **Sub-pestañas Móviles:** Incorporadas clases `scrollbar-none [&::-webkit-scrollbar]:hidden` en el listado horizontal de sub-pestañas para eliminar la barra gris de scroll en navegadores WebKit/Blink/Gecko.
  * **Header Móvil Compacto (`Navbar.jsx`, `UserMenu.jsx`, `NotificationPanel.jsx`):** Reducción quirúrgica de padding lateral (`px-2.5 sm:px-4 lg:px-6`), gap (`gap-1 sm:gap-2`), y tamaño responsivo del avatar de usuario a `w-8 h-8 sm:w-10 sm:h-10`, garantizando que las iniciales `EP` y el menú de perfil entren 100% completos en pantallas de 360px–390px sin desbordamiento horizontal.
  * **QA y Verificación:** 67/67 tests unitarios aprobados en Vitest (`npx vitest run --passWithNoTests`) y build de producción exitoso con Vite (Código 0).

### 10. Sistema de Recuperatorio Diferenciado por Alumno, Reemplazo Trazable de Notas y Promoción Indirecta
- **Estado:** ✅ Completado y Verificado al 100%.
- **Alcance y Mejoras Realizadas:**
  * **Lógica Académica (`academicLogic.js` & `ramCalculator.ts`):**
    - Sábana con una única columna de evaluación tipo Recuperatorio configurada individualmente por alumno.
    - Soporte de límites por régimen: Cuatrimestral (máx. 1 parcial recuperable; $\ge 2$ desaprobados en 1ra instancia $\rightarrow$ automáticamente `LIBRE`) y Anual (máx. 2 parciales recuperables; $\ge 3$ desaprobados en 1ra instancia $\rightarrow$ automáticamente `LIBRE`).
    - Motor `calcularNotasEfectivasEstudiante`: reemplazo de nota si la nota recuperada es $\ge 4$, cómputo del promedio efectivo y trazabilidad íntegra del parcial original versus nota recuperada.
    - Condición académica integral: soporte de `PROMOCIONAL` (0 recuperados, notas $\ge 7$, asist $\ge 80\%$), `PROMOCION_INDIRECTA` (exactamente 1 parcial recuperado con nota $\ge 7$, notas finales $\ge 7$, asist $\ge 80\%$), `REGULAR` (parciales $\ge 4$, o 2 parciales recuperados) y `LIBRE` (exceso de límite, recuperatorio desaprobado o inasistencias).
  * **Persistencia & Supabase (`useGradesData.js` & migración SQL):**
    - Migración `supabase/migrations/20261019180000_notas_detalle_recuperatorio.sql` agregando la columna `detalle_recuperatorio JSONB DEFAULT NULL`.
    - Normalización bidireccional y guardado dual con fallback y retry transparente en `observaciones` para resiliencia offline y compatibilidad inmediata con bases de datos remotas.
    - Resolución y aprovisionamiento automático de la evaluación de recuperatorio mediante `ensureRecuperatorioEval`.
  * **Componentes UI:**
    - `ConfigurarRecuperatorioModal.jsx`: Modal táctil y accesible para configurar los parciales que rinde cada estudiante, notas obtenidas, estados (Aus., N/E) y alertas en tiempo real de cupo y exclusión a `LIBRE`.
    - `Badge.jsx`: Variante `promo_ind` con paleta teal/esmeralda y dot indicador para `PROM. IND`.
    - `GradeCell.jsx`: Trazabilidad visual de nota original tachada y nota efectiva: `~3~ ➔ 7 (R)` con tooltip explicativo.
    - `GradeMatrixTable.jsx`: Columna consolidada de Recuperatorio con chips compactos `P1: 7 · P2: 8`, badge `Excede límite (Libre)`, botón `+ Configurar`, badges `PROM. DIR` y `PROM. IND`.
    - `GradesTab.jsx`: Selector de conmutación de régimen `Anual (máx. 2)` / `Cuatrimestral (máx. 1)` en barra superior con persistencia.
    - `GradeCardsMobile.jsx`: Fila dedicada de Recuperatorio General con apertura del modal táctil y visualización `~3~ ➔ 7 (R)`.
    - `ConsultaAlumnoPage.jsx`: Portal del estudiante actualizado reconociendo `PROMOCIÓN INDIRECTA`, desglose de parciales recuperados y trazabilidad visual de notas reemplazadas.
  * **QA y Verificación:** 74/74 tests unitarios aprobados en Vitest (`npx vitest run`) y build de producción exitoso con Vite (Código 0).

### 11. Detención de Bucle Infinito en Cátedra, Persistencia Firme de Notas, Borrado Seguro de Parciales en 2 Pasos y Google Drive 100% Opcional
- **Estado:** ✅ Completado y Verificado al 100%.
- **Alcance y Mejoras Realizadas:**
  * **1. Eliminación Radical del Bucle Infinito de Recarga:**
    - Identificada la causa raíz: `useAttendanceManager` incluía el objeto `catedra` en las dependencias de `fetchData`, recreándolo en cada ciclo y ejecutando `ensureScheduledClassesToDate` y escrituras continuas en `localStorage`.
    - Implementación de candados de sincronización con `initializedCatedraRef = useRef(null)` en `useAttendanceManager.js`, `useGradesData.js`, `CatedraDetailPage.jsx`, `StudentsTab.jsx` y `LibroTemasTab.jsx`.
    - Estabilización de dependencias a `[catedraId, isDemo, userId]` eliminando completamente las recargas cíclicas.
  * **2. Persistencia Inmutable y Protección de Notas:**
    - Cero pérdida de calificaciones: implementado guardado local incondicional inmediato en `localStorage` (`notas_${catedraId}` y `docentepro_demo_notas_${catedraId}`) antes de la llamada de red a Supabase.
    - Soporte dual y simetría total de campos: mapeo bidireccional `nota` y `valor`, y reintento resiliente con búsqueda previa por `(estudiante_id, evaluacion_id)` e inserción/actualización con columnas esenciales para tolerar cualquier divergencia en restricciones UNIQUE remotas.
  * **3. Borrado Seguro de Parciales en 2 Pasos (Cascada FK):**
    - En `src/services/evaluacionesService.js` (`deleteEvaluacion`):
      * Paso 1: Eliminar primero todas las calificaciones asociadas en `notas` para la evaluación y cualquier recuperatorio hijo vinculado (`evaluacion_origen_id`).
      * Paso 2: Eliminar recuperatorios hijos y posteriormente la fila de `evaluaciones`.
      * Paso 3: Limpieza sincronizada en `localStorage` de todas las claves de evaluaciones y notas.
    - En `GradesTab.jsx`: actualización optimista inmediata en UI con `deleteEvaluacionLocal(id)` antes del llamado asíncrono y refetch de confirmación.
    - En `EditEvaluacionParamsModal.jsx`: agregado botón de eliminación directa con alerta de confirmación en el pie del modal.
  * **4. Enlace a Google Drive 100% Opcional:**
    - En `EditEvaluacionParamsModal.jsx`: removida validación bloqueante `if (consignaType === 'GOOGLE_LINK' && !driveUrl.trim())` y atributo HTML5 `required` del input. Label actualizado a `URL del Documento / Carpeta en Drive (Opcional)`. Si el campo está vacío, guarda `archivo_url: null`.
    - En `NuevaEvaluacionModal.jsx`: integración de `saveEvaluacion` automático cuando no se suministra `onSave`, soporte unificado de callbacks (`onEvaluacionCreada` y `onEvaluacionCreated`), y cierre automático con toast informativo.
  * **QA y Verificación:**
    - 74/74 tests unitarios aprobados en Vitest (`npx vitest run --passWithNoTests`).
    - Build de producción ejecutado con éxito sin errores (`npm run build`, Código 0).

### 12. Corrección de `ReferenceError: useRef is not defined` en Calificaciones y Auditoría Global de Hooks de React
- **Estado:** ✅ Completado y Verificado al 100%.
- **Alcance y Mejoras Realizadas:**
  * **Causa Raíz Solucionada (`useGradesData.js`):** Incorporado `useRef` en la línea 1 (`import { useState, useEffect, useMemo, useCallback, useRef } from 'react';`) para resolver el `ReferenceError: useRef is not defined` al inicializar `initializedCatedraRef = useRef(null)` desde `GradesTab.jsx`.
  * **Blindaje de Importaciones de React:** Asegurada la importación explícita `{ useState, useEffect, useMemo, useCallback, useRef }` en `GradesTab.jsx`, `GradeMatrixTable.jsx` y `AttendanceTab.jsx`, además de confirmar su presencia en `useAttendanceManager.js`, `StudentsTab.jsx`, `LibroTemasTab.jsx` y `CatedraDetailPage.jsx`.
  * **Auditoría Estática Completa:** Escaneo automatizado sobre todos los archivos de `src/` confirmando **0** hooks de React invocados sin importar.
  * **QA y Verificación:** 74/74 tests pasando en Vitest y `npm run build` exitoso (Código 0).

### 13. Selector de Visibilidad de Notas (Parciales, TPs, Promedio), Panel de Parámetros de Condición y Override Manual/Automático por Alumno
- **Estado:** ✅ Completado y Verificado al 100%.
- **Alcance y Mejoras Realizadas:**
  * **1. Selector de Visibilidad de Notas (`GradesTab.jsx`, `GradeMatrixTable.jsx`, `GradeCardsMobile.jsx`, `ConsultaAlumnoPage.jsx`, `studentPortalService.js`):**
    - Incorporadas píldoras interactivas en la barra superior de Calificaciones (`GradesTab.jsx`): `[✓] Todo a la vez`, `[✓] Parciales y Recuperatorios` (`mostrar_parciales`), `[✓] Trabajos Prácticos` (`mostrar_tps`) y `[✓] Promedio General` (`mostrar_promedio`).
    - Añadido switch `"Sincronizar esta vista con el Portal del Alumno"` que persiste `mostrar_parciales`, `mostrar_tps` y `mostrar_promedio` en `public.catedras` (con respaldo instantáneo en `localStorage`).
    - Filtrado dinámico de columnas de evaluaciones (`PARCIAL`/`RECUPERATORIO`, `TP`) y de la columna/KPI `Promedio` tanto en la tabla desktop/tablet (`GradeMatrixTable.jsx`) como en las tarjetas móviles (`GradeCardsMobile.jsx`) y en el Portal Estudiantil (`ConsultaAlumnoPage.jsx`).
  * **2. Panel de Parámetros para Decidir la Condición Académica (`GradesTab.jsx`, `academicLogic.js`, `ramCalculator.ts`, `useGradesData.js`):**
    - Desplegable `"⚙️ Parámetros de Condición"` en `GradesTab.jsx` con checkboxes de criterios activos:
      * `[✓] Evaluar Asistencia` (`eval_considerar_asistencia`): al destildarse, las inasistencias no dejan `LIBRE` al alumno en el cálculo automático.
      * `[✓] Evaluar Parciales y Recuperatorios` (`eval_considerar_parciales`): al destildarse, decide la condición únicamente con los demás parámetros activos.
      * `[✓] Evaluar Trabajos Prácticos` (`eval_considerar_tps`): al destildarse, los TPs desaprobados o `N/E` no reducen la condición del alumno.
    - Inputs numéricos rápidos de umbrales: `Nota mínima Regularidad` (`nota_regularidad`, default `4`), `Nota mínima Promoción` (`nota_promocion`, default `7`), `% Asistencia Regular` (`ram_asistencia_regular`, default `70%`), `% Régimen Laboral` (`ram_asistencia_trabajo`, default `60%`), `% de TPs aprobados para Regularizar` (`porcentaje_tps_regular`, default `80%`), `% para Promocionar` (`porcentaje_tps_promocion`, default `100%`) y selector de `Régimen de cursada` (`Anual (máx. 2 recup.)` | `Cuatrimestral (máx. 1 recup.)`).
    - Guardado en `public.catedras` y `public.criterios_evaluacion` con recálculo instantáneo de toda la planilla.
  * **3. Override Manual de Condición por Alumno sin Perder el Automático (`GradeMatrixTable.jsx`, `GradeCardsMobile.jsx`, `catedraEstudiantesService.js`, `useGradesData.js`, `ConsultaAlumnoPage.jsx`):**
    - `ConditionBadge` interactivo con Popover (renderizado vía React Portal para evitar recortes por `overflow`) disponible tanto en la tabla de PC/Tablet como en las tarjetas de Celular.
    - Exhibe arriba `🤖 Sugerencia Automática: [PROM. DIR / PROM. IND / REG / LIB]` junto con la explicación automática detallada.
    - Permite elegir entre `⚡ Automático (Según parámetros de la cátedra)` (`condicion_manual: null`) o fijar manualmente `PROMOCIONAL`, `PROMOCION_INDIRECTA`, `REGULAR` o `LIBRE` en `public.inscripciones`, incluyendo el campo `"Motivo de ajuste manual (opcional)"`.
    - Distinción visual con icono `✋`, anillo indicador y Tooltip reglamentario: `"Condición fijada manualmente por el docente: REGULAR (Cálculo automático: LIBRE). Clic para volver a automático."`
    - El Portal Estudiantil (`ConsultaAlumnoPage.jsx`) exhibe siempre la condición efectiva (`inscripcion.condicion_manual || condicionAutomatica`).
  * **4. Migración SQL y QA:**
    - Migración [`supabase/migrations/20261030160000_visibilidad_parametros_condicion_manual.sql`](file:///c:/Users/emili/Documents/docente/supabase/migrations/20261030160000_visibilidad_parametros_condicion_manual.sql).
    - 78/78 tests unitarios aprobados en Vitest (`npx vitest run --passWithNoTests`) y build de producción limpio (`npm run build`, Código 0).




