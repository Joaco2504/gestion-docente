# ADR-008: Rediseño Integral del Dashboard con Jerarquía Orientada al Día ("Hoy"), Alerta Temprana, Tarjetas Unificadas y Accesibilidad AA

- **Fecha:** 2026-10-05
- **Estado:** Aceptado
- **Fase:** Fase 8 - Rediseño integral del Dashboard
- **Autor:** Antigravity Agentic Assistant

---

## 1. Contexto y Problema

En las versiones previas de Korum, la pantalla principal presentaba una estructura funcional pero dispersa:
1. **Falta de foco diario:** El docente al iniciar su jornada requería responder de inmediato a preguntas operativas elementales: "¿Qué tengo hoy?", "¿Cuál es mi clase inminente?", "¿Tengo compromisos o exámenes en las próximas 48 horas?". La interfaz no destacaba el estado del día de forma prioritaria.
2. **Ausencia de alertas proactivas:** Las situaciones académicas críticas (cátedras con baja asistencia promedio por debajo del 75% o materias sin clases registradas) permanecían ocultas dentro de cada materia, obligando al docente a ingresar individualmente a cada cátedra para detectar riesgos.
3. **Fragmentación de componentes y estilos:** Múltiples secciones implementaban contenedores `div` con clases de bordes y sombras desacopladas en lugar del contenedor canónico del Design System (`Card.jsx`).
4. **Ergonomía y Accesibilidad Móvil:** En dispositivos compactos (320px–480px), algunos elementos de acción carecían de objetivos táctiles confortables (mínimo 44x44 px recomendado por WCAG 2.1 AA) y los contrastes secundarios requerían alineación formal con la paleta accesible del proyecto.

---

## 2. Decisión de Diseño

Se implementó el rediseño integral del panel docente estructurado bajo los siguientes pilares:

### 2.1 Jerarquía Orientada al Día ("Hoy")
- Se diseñó el componente [`DashboardTodayFocus.jsx`](file:///c:/Users/emili/Documents/docente/src/features/dashboard/components/DashboardTodayFocus.jsx):
  - **Saludo contextualizado:** Saludo empático según la hora del día ("Buenos días", "Buenas tardes", "Buenas noches") personalizado con el nombre del docente.
  - **Fecha en español:** Fecha completa legible (ej. "Lunes, 5 de octubre de 2026") e indicador del Ciclo Lectivo activo.
  - **Foco de clase:** Indicador en vivo de estado del día: badge esmeralda pulsante si hay clase hoy con acceso directo, o estado sereno si el día está libre de clases en horario.

### 2.2 Sistema de Alertas Tempranas ("Early Warning")
- Se integró un motor de monitoreo proactivo dentro de `DashboardTodayFocus`:
  - **Asistencia crítica:** Detecta materias con asistencia promedio inferior al 75% (umbral reglamentario de regularidad en terciario y secundario).
  - **Planificación demorada:** Alerta materias activas que aún no han registrado su primera clase.
  - **Compromisos inmediatos:** Destaca eventos de agenda, exámenes o cierres programados para hoy o mañana.
  - **Interfaz defensiva:** Banner adaptable con recuento de alertas críticas/advertencias, panel desplegable con detalle de la materia afectada y botón de acción directa ("Ver Asistencias", "Iniciar 1ª Clase", "Ver Calendario"). Si todas las cátedras están en regla, muestra confirmación positiva de trayectorias académicas al día.

### 2.3 Unificación Estricta en `Card.jsx`
- Se refactorizaron todas las tarjetas del panel para extender de forma consistente [`src/components/common/Card.jsx`](file:///c:/Users/emili/Documents/docente/src/components/common/Card.jsx):
  - `UpcomingClassCard.jsx`: Bento Box 1 unificado con resplandor ambiental y `Card`.
  - `QuickMetricsCard.jsx`: Bento Box 2 unificado con gráfico Donut SVG y contadores.
  - `CatedraCard.jsx`: Tarjetas de materia basadas en `<Card hover={true}>`.
  - `DashboardAgendaSection.jsx`: Eventos y estado vacío construidos con `Card`.
  - `DashboardTodayFocus.jsx`: Cabecera construida con `Card`.

### 2.4 Ergonomía y Accesibilidad WCAG 2.1 AA (320px–1024px+)
- **Áreas táctiles:** Todos los botones, accesos directos y selectores cuentan con altura mínima de **44 a 52 px** (`min-h-[44px]` o `min-h-[52px]`) en móvil.
- **Contrastes de texto:** Títulos con `text-slate-900 dark:text-white` y textos auxiliares con `text-slate-600 dark:text-slate-400` y `text-slate-500`.
- **Navegación accesible:** Atributos semánticos `aria-label`, `role="img"`, `role="link"`, `aria-expanded` y gestión de teclado (`focus-visible:ring-2`).
- **Resiliencia en 320px:** Grillas flexibles `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` y textos truncados sin desbordes horizontales.

### 2.5 Respeto de Límites de Complejidad
- El orquestador [`src/pages/DashboardPage.jsx`](file:///c:/Users/emili/Documents/docente/src/pages/DashboardPage.jsx) se mantiene estrictamente en **189 líneas** (< 200 líneas).
- Cada submódulo en `src/features/dashboard/components/` se mantiene bajo 275 líneas (< 300 líneas).

---

## 3. Pruebas y Verificación

1. **Compilación de Producción (`npm run build`):** Compilación limpia con Vite v6.4.3 en 13.02s sin advertencias ni errores.
2. **Suite de Base de Datos pgTAP (`npm run db:test`):** 8 suites, 50/50 tests passing (100% de éxito).
3. **Drift de Base de Datos (`npm run db:diff`):** 0 diferencias (`No schema changes found`).

---

## 4. Consecuencias

- **Positivas:**
  - Reducción del tiempo que le toma al docente ubicarse y operar en su jornada diaria.
  - Prevención temprana de deserción o pérdida de regularidad de alumnos gracias a alertas visibles en el inicio.
  - Identidad visual armónica Bento Grid coherente con el Design System de Korum.
  - Accesibilidad táctil garantizada en smartphones pequeños y lectores de pantalla.
- **Negativas / Costos:**
  - Ninguna identificada; la carga computacional de alertas se realiza en memoria sobre datos ya obtenidos del RPC.
