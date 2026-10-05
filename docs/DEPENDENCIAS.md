# Registro de Nuevas Dependencias — Korum

Este documento registra todas las dependencias incorporadas al proyecto durante las distintas fases de refactorización, justificando su necesidad, peso, licencia y alternativas evaluadas.

---

## Restricción de Licencia
Todas las dependencias deben ser **100 % gratuitas y Open Source** bajo licencias permisivas: **MIT**, **Apache-2.0**, **BSD** o **ISC**. Prohibido software privativo o servicios con planes comerciales requeridos.

---

## Dependencias por Fase

### Fase 1: Línea base y saneamiento del *schema drift*

#### 1. `supabase` (`devDependencies`)
- **Versión:** `^2.119.0`
- **Licencia:** MIT / Apache-2.0
- **Tamaño en bundle de producción:** 0 kB (exclusiva de desarrollo/build, no entra en el chunk de cliente Vite).
- **Propósito:** Proporciona el ejecutable CLI local para `npm run db:types` y `npm run db:diff`, garantizando paridad en Windows y Linux sin depender de instalaciones globales de sistema.
- **Alternativas descartadas:**
  - Instalar Supabase CLI globalmente: Rechazado porque rompe la portabilidad del repositorio para otros desarrolladores o pipelines CI.
  - Generar tipos a mano: Rechazado por riesgo de drift y desalineación con la base real.

---

### Fase 7: Capa de datos con TanStack Query

#### 2. `@tanstack/react-query` (`dependencies`)
- **Versión:** `^5.104.1`
- **Licencia:** MIT (100 % Open Source, gratuita y permisiva).
- **Tamaño en bundle de producción:** ~46 kB (14.4 kB gzipped), aislado en el chunk dedicado `vendor-query` mediante `rollupOptions.output.manualChunks`.
- **Propósito:** Administrador declarativo de estado del servidor para Korum:
  - Cacheo y deduplicación automática de peticiones en red (`staleTime: 5 min`, `gcTime: 15 min`).
  - Revalidación fluida en segundo plano y recolección de basura controlada.
  - Integración reactiva con RPCs (`dashboard_resumen`, `dashboard_agenda`) y consultas de cátedras.
  - Eliminación de waterfalls y soporte nativo para mutaciones e invalidación granular.
- **Alternativas descartadas:**
  - `swr`: Descartado por menor soporte para manipulaciones complejas de caché relacional (`setQueryData` granular) y mutaciones compuestas.
  - Caché manual exclusivo con `Map` (`catedraCache.js` previo): Descartado como solución final por ausencia de garbage collection automático, riesgo de fugas de memoria y falta de revalidación en segundo plano. Se conservó como adaptador puente para compatibilidad total con componentes existentes.

