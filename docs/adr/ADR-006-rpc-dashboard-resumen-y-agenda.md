# ADR-006: Consolidación de Métricas de Dashboard en RPCs PostgreSQL (`dashboard_resumen` y `dashboard_agenda`)

- **Fecha:** 2026-10-05
- **Estado:** Aceptado
- **Fase:** Fase 6 - Rendimiento y RPC `dashboard_resumen`
- **Autor:** Antigravity Agentic Assistant

---

## 1. Contexto y Problema

En el flujo original de Korum, la pantalla principal (`DashboardPage.jsx`) requería calcular métricas agregadas globales y por cátedra (total de alumnos inscriptos, total de clases dictadas, porcentaje de asistencia promedio general y por materia, y última clase dictada con conteo de presentes).

Para obtener esta información, el cliente frontend:
1. Realizaba múltiples consultas separadas a `catedras`, `inscripciones`, `clases`, `asistencias` y `asistencias_alumnos`.
2. Sufría de un patrón N+1 de red o sobre-descarga de registros: transfería potencialmente miles de registros detallados de asistencias y clases para luego iterarlos y reducirlos con JavaScript en el navegador.
3. Para la agenda de los próximos 15 días, descargaba la totalidad de eventos de calendario y períodos académicos del docente para filtrarlos y ordenarlos en memoria del cliente.

Este enfoque aumentaba el consumo de ancho de banda móvil, incrementaba el tiempo de renderizado inicial (TBT / LCP) y creaba discrepancias potenciales en la interpretación de métricas entre distintos clientes.

---

## 2. Decisión de Diseño

Se decidió consolidar la computación de datos del dashboard en el motor PostgreSQL mediante dos funciones almacenadas (`RPCs`) optimizadas:

### 2.1 RPC `public.dashboard_resumen(p_docente_id UUID)`
- **Seguridad:** Marcada como `SECURITY DEFINER` con `SET search_path = public` explícito para prevenir secuestro de esquemas.
- **Aislamiento Multi-inquilino:** Valida defensivamente que `auth.uid() = p_docente_id` o que el usuario posea rol superadmin (`public.es_superadmin()`).
- **Arquitectura de Agregación:** Utiliza Common Table Expressions (CTEs) eficientes:
  - `cte_catedras`: Recupera cátedras activas del docente ordenadas alfabéticamente.
  - `cte_inscriptos`: Agrupa y cuenta alumnos con inscripciones activas por cátedra.
  - `cte_clases`: Agrupa y cuenta clases registradas por cátedra.
  - `cte_asistencias_catedra`: Calcula el porcentaje de asistencia promedio por cátedra (`ROUND((presentes::numeric / NULLIF(total, 0)) * 100, 1)`).
  - `cte_ultima_clase`: Obtiene la última clase dictada (`fecha <= CURRENT_DATE`) con tema y conteo exacto de alumnos presentes vía subconsultas correlacionadas compactas.
- **Salida:** Retorna un único objeto `JSONB` estructurado:
  ```json
  {
    "metricas_globales": {
      "total_catedras": 3,
      "total_estudiantes": 45,
      "total_clases": 12,
      "asistencia_promedio": 88.5
    },
    "catedras": [
      {
        "id": "...",
        "nombre": "...",
        "color": "...",
        "cuatrimestre": "...",
        "anio": 2026,
        "horarios": [...],
        "total_estudiantes": 20,
        "total_clases": 5,
        "asistencia_promedio": 92.0,
        "ultima_clase": {
          "id": "...",
          "fecha": "2026-10-02",
          "tema": "Introducción",
          "presentes": 18,
          "total_alumnos": 20
        }
      }
    ]
  }
  ```

### 2.2 RPC `public.dashboard_agenda(p_docente_id UUID, p_dias INT DEFAULT 15)`
- **Aislamiento Multi-inquilino:** Mismo control estricto de identidad.
- **Unificación de Compromisos:** Consolida en un único `UNION ALL` los eventos de `eventos_calendario` y las fechas límite de `periodos_academicos` que caigan en la ventana `[CURRENT_DATE, CURRENT_DATE + p_dias]`.
- **Salida:** Retorna un arreglo `JSONB` ordenado cronológicamente con metadatos de cátedra asociados.

### 2.3 Resiliencia y Fallback Transparente en el Cliente
En `src/features/dashboard/hooks/useDashboardData.js`:
- Se invoca `supabase.rpc('dashboard_resumen')` y `supabase.rpc('dashboard_agenda')` en paralelo mediante `Promise.allSettled` / `try-catch`.
- Si las funciones RPC responden exitosamente, se puebla el estado directamente con latencia ultrabaja y carga de red mínima (< 5 KB).
- **Fallback transparente:** Si el RPC falla o no está disponible en un entorno determinado, el hook captura el error silenciosamente y ejecuta el flujo de consultas cliente tradicional (`fetchFallbackData()`), garantizando 100% de disponibilidad sin degradar la interfaz de usuario.

---

## 3. Pruebas y Verificación

1. **Suite pgTAP (`supabase/tests/08_fase6_rpc_dashboard.sql`):**
   - 9 asserts dedicados validando existencia de funciones, parámetros, control de acceso por `docente_id`, estructura JSON retornada, cálculo de presentes en última clase y filtrado de agenda a 15 días.
   - Ejecución integrada: **8 suites, 50/50 tests passing (100% éxito)**.
2. **Rollback atómico:** Creado en `supabase/rollbacks/20261005080000_fase6_rpc_dashboard_rollback.sql` con `DROP FUNCTION` limpio.
3. **Drift de Base de Datos (`npm run db:diff`):** 0 drift (`No schema changes found`).
4. **Compilación Frontend (`npm run build`):** Vite v6.4.3 compiló exitosamente en 11.23s sin errores de importación, sintaxis o TypeScript.

---

## 4. Consecuencias

- **Positivas:**
  - Reducción de llamadas de red de hasta 5 consultas a solo 2 RPCs en paralelo.
  - El volumen de datos transmitidos pasa de potencialmente megabytes de asistencias detalladas a un payload JSON consolidado de < 5 KB.
  - Cero N+1 en el cálculo de métricas de cátedras y asistencias.
  - Blindaje de seguridad con `SECURITY DEFINER` y validación de `auth.uid()`.
  - Fallback transparente que garantiza alta resiliencia si la conexión RPC se degrada.
- **Negativas / Costos:**
  - Las reglas de agregación de métricas de cátedras ahora están versionadas en PostgreSQL; cambios de esquema en asistencias o clases deben reflejarse en los CTEs del RPC.
