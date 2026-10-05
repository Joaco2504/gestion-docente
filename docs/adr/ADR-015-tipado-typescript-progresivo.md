# ADR-015: Tipado TypeScript Progresivo en Modelos Clave, Utilitarios y Barril Central

- **Fecha:** 2026-10-05
- **Estado:** Aceptado
- **Fase:** Fase 10 (Sub-mejora 10.6) - Mejoras modulares opcionales
- **Autor:** Antigravity Agentic Assistant

---

## 1. Contexto y Problema

A lo largo de las fases de refactorización se fueron consolidando tipos TypeScript para la base de datos (`src/types/database.types.ts`), constantes de dominios (`src/lib/enums.ts`), tokens de gráficos (`chartTokens.ts`), fechas (`dateUtils.js`) y utilitarios RAM (`src/utils/ramCalculator.ts`):
1. **Dispersión de Definiciones de Tipo:** No existía un punto de entrada centralizado (`index.ts`) para importar tipos de entidades principales, obligando a los componentes a importar desde rutas relativas dispares o duplicar interfaces locales.
2. **Ausencia de Tipado en Contratos de Alto Nivel:** Modelos vitales para la lógica pedagógica (como opciones de cálculo de condición final, resumen de alertas tempranas `EarlyWarningRisk` y respuestas compuestas de RPCs `dashboard_resumen` / `dashboard_agenda`) carecían de interfaces formales documentadas.
3. **Riesgo de Inconsistencia Frontend/Backend:** La evolución de modelos como `EstudianteCatedra` requería acoplar formalmente los campos agregados en fases anteriores (`es_equivalencia`, `resolucion_equivalencia`, `tiene_certificado_trabajo`).

---

## 2. Decisión de Diseño

Se estructuró una capa de tipado progresivo en `src/types/`, 100% interoperable con JavaScript y TypeScript:

### 2.1 Módulo `src/types/academic.ts` (109 líneas)
- Define contratos estrictos para el motor de cálculo:
  - `PorcentajeAsistenciaOptions`: Estructura para cálculo de presentismo sin penalizar ausencias docentes.
  - `CondicionFinalOptions`: Entrada completa para cálculo de regularidad, promoción y régimen libre.
  - `CalculoCondicionResult`: Salida estructurada de evaluación.
  - `EarlyWarningRisk` y `EarlyWarningLevel`: Modelado del semáforo pedagógico ('OPTIMAL', 'WARNING', 'CRITICAL').
  - `EstudianteCatedra`: Modelo unificado de alumno inscripto con campos académicos y de equivalencia.
  - Re-exportación de contratos de regularidad desde `ramCalculator.ts` (`AsistenciaItem`, `ClaseItem`, `EvaluacionItem`, `NotaItem`, `EvaluacionResultadoRAM`, `CriteriosRamCatedra`).

### 2.2 Módulo `src/types/dashboard.ts` (84 líneas)
- Modela los contratos de comunicación y renderizado del panel docente:
  - `DashboardResumenRPCResponse`: Tipo del resultado devuelto por la función PostgreSQL `dashboard_resumen`.
  - `DashboardAgendaRPCResponse`: Tipo de la agenda devuelta por `dashboard_agenda`.
  - `ProximaClaseInfo`: Información de la clase inminente o en curso con estado en vivo.
  - `DashboardMetricStats`, `DashboardAgendaItem`, `DashboardAlertaPedagogica`.

### 2.3 Barril Centralizado `src/types/index.ts` (9 líneas)
- Provee un único punto de exportación para toda la aplicación:
  ```ts
  export * from './database.types';
  export * from './catedra';
  export * from './academic';
  export * from './dashboard';
  ```
- Permite a cualquier módulo consumir tipos limpios mediante `import { ... } from '@/types'` o `../types`.

---

## 3. Pruebas y Verificación

1. **Compilación de Producción (`npm run build`):**
   - 3.670 módulos transformados en 17.12s.
   - 0 sobrecosto en bundle (0 kB agregados al runtime de producción).
   - 0 errores o advertencias de compilación.
2. **Suite pgTAP (`npm run db:test`):**
   - **8 suites, 50/50 tests passing (100 % éxito)**.
3. **Verificación de Schema Drift (`npm run db:diff`):**
   - **0 diferencias de esquema (`No schema changes found`)**.
4. **Límites de Líneas de Código:**
   - `academic.ts`: 109 líneas (< 300).
   - `dashboard.ts`: 84 líneas (< 300).
   - `catedra.ts`: 185 líneas (< 300).
   - `index.ts`: 9 líneas (< 300).

---

## 4. Estado de Licencias y Dependencias

- **Cero nuevas dependencias externas**.
- Cumplimiento estricto de las directrices del proyecto y cierre exitoso de la Fase 10.
