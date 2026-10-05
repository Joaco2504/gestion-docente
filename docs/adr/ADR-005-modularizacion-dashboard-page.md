# ADR-005: Modularización Arquitectónica de `DashboardPage.jsx` sin Alteración Visual

- **Fecha:** 2026-10-05
- **Estado:** Aceptado
- **Fase:** Fase 5 - Refactor de `DashboardPage.jsx` (sin cambio visual)
- **Autor:** Antigravity Agentic Assistant

---

## 1. Contexto y Problema

El componente principal del panel docente, `src/pages/DashboardPage.jsx`, se había convertido en un monolito de casi 2.000 líneas (1.968 líneas). En dicho archivo coexistían de forma acoplada:
1. Llamadas masivas y paralelas a Supabase junto a un motor de datos de demostración local (`loadDemoData`).
2. Cálculos estadísticos y algoritmos de búsqueda y coincidencia de horarios semanales (`upcomingClass`).
3. Tres modales completos de formulario (`NuevaCatedraModal`, `QuickClassModal`, `QuickEventModal`) más la invocación de `EditarCatedraModal`.
4. El renderizado integral de todas las secciones del Bento Grid (acciones rápidas, métricas con SVG Donut Chart interactivo, grilla de tarjetas de cátedra con menú contextual flotante y agenda de eventos para los próximos 15 días).

Esta concentración de responsabilidades dificultaba el mantenimiento, la auditabilidad de código y la futura introducción de la capa de datos reactiva con TanStack Query (Fase 7) y RPCs de base de datos (Fase 6).

---

## 2. Restricciones y Principios de Diseño

1. **Paridad Visual Estricta:** Cero cambios en la experiencia de usuario (UX), jerarquía visual, animaciones, tokens Tailwind o diseño responsive en móvil, tablet y escritorio.
2. **Límites de Líneas de Código:**
   - Orquestador `src/pages/DashboardPage.jsx` estricto **< 200 líneas**.
   - Cada subcomponente modularizado **< 300 líneas**.
3. **Cero Dependencias de Pago:** Ninguna librería comercial agregada; 100% React, Lucide Icons y utilidades existentes del proyecto.

---

## 3. Decisión de Diseño

Se estructuró la nueva arquitectura dentro del directorio de dominio funcional `src/features/dashboard/`:

```
src/features/dashboard/
├── hooks/
│   └── useDashboardData.js             (253 líneas - Carga paralela Supabase + Demo + Estado)
├── utils/
│   └── dashboardHelpers.js             (211 líneas - Cálculos puros, filtros, agenda, métricas)
└── components/
    ├── DashboardActionCards.jsx         (81 líneas - Fila superior de 4 accesos directos)
    ├── UpcomingClassCard.jsx            (74 líneas - Bento Box 1: Próxima clase inminente)
    ├── QuickMetricsCard.jsx            (132 líneas - Bento Box 2: SVG Donut + contadores)
    ├── CatedrasSection.jsx             (145 líneas - Grilla Bento + búsqueda + filtros nivel)
    ├── CatedraCard.jsx                 (256 líneas - Tarjeta individual con menú contextual)
    ├── DashboardAgendaSection.jsx      (114 líneas - Sección de agenda de 15 días)
    └── modals/
        ├── NuevaCatedraModal.jsx       (233 líneas - Modal creación de cátedras)
        ├── QuickClassModal.jsx         (149 líneas - Modal registro de 1ª clase)
        └── QuickEventModal.jsx         (176 líneas - Modal agendamiento de eventos)
```

### 3.1 Orquestador `src/pages/DashboardPage.jsx` (179 líneas)
El archivo orquestador quedó reducido a **179 líneas**, limitándose a:
- Coordinar los hooks de autenticación y datos (`useAuth`, `useApp`, `useDashboardData`).
- Mantener los estados de interacción y visibilidad de modales.
- Computar valores memoizados derivados de primer nivel mediante los helpers puros.
- Componer la jerarquía visual de los componentes de feature.

---

## 4. Métricas y Verificación

1. **Cumplimiento de Tamaño:**
   - `DashboardPage.jsx`: **179 líneas** (Meta: < 200 líneas).
   - Componentes en `src/features/dashboard/`: Entre 74 y 256 líneas (Meta: todos < 300 líneas).
2. **Build de Producción (`npm run build`):** Compilación limpia con Vite v6.4.3 en 10.53s sin errores ni advertencias de tipo.
3. **Suite pgTAP (`npm run db:test`):** 41/41 tests pasando (100% éxito).
4. **Drift de Base de Datos (`npm run db:diff`):** 0 drift (`No schema changes found`).

---

## 5. Conclusión

La modularización de la Fase 5 deja la arquitectura del panel docente completamente desacoplada y lista para la **Fase 6: Rendimiento y RPC `dashboard_resumen`**, donde las consultas complejas de asistencia y clases serán reemplazadas de manera transparente dentro de `useDashboardData.js` sin alterar los componentes visuales.
