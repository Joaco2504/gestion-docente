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

---

### Fase 9: Gráficos accesibles con Recharts / Visx

#### 3. `recharts` (`dependencies`)
- **Versión:** `^3.10.1`
- **Licencia:** MIT (100 % Open Source, gratuita y permisiva).
- **Tamaño en bundle de producción:** ~386 kB (111.9 kB gzipped), aislado en el chunk dedicado `vendor-charts` mediante `rollupOptions.output.manualChunks`. No penaliza la carga inicial del bundle principal.
- **Propósito:** Visualización de métricas académicas (barras, tortas, gauges de asistencia) con gráficos vectoriales SVG accesibles:
  - Soporte nativo para lectores de pantalla mediante roles `img` y etiquetas `aria-label` descriptivas.
  - Paleta centralizada de tokens de diseño (`chartTokens.ts`) con contraste WCAG 2.1 AA.
  - Componentes responsivos (`ResponsiveContainer`) y adaptables a móviles compactos (320px–480px).
  - Tooltips interactivos formateados y animaciones fluidas con modo claro/oscuro.
- **Alternativas descartadas:**
  - `Chart.js`: Descartado por renderizado sobre Canvas bitmap, inaccesible por defecto para lectores de pantalla y menos idiomático en React.
  - `visx`: Descartado por requerir excesivo código boilerplate y primitivas de bajo nivel para necesidades directas de barras y donas académicas.
  - SVG caseros manuales: Descartados por dificultad de mantenimiento, problemas de escalabilidad en diferentes relaciones de aspecto y falta de soporte para ejes y tooltips accesibles.

---

### Fase 10 (Sub-mejora 10.1): Reemplazo seguro de Excel y saneamiento de dependencias

#### 4. `xlsx` (`dependencies`, distribución oficial segura vía `cdn.sheetjs.com`)
- **Versión:** `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` (v0.20.3)
- **Licencia:** Apache-2.0 (100 % Open Source, gratuita y permisiva).
- **Tamaño en bundle de producción:** ~500 kB (163.1 kB gzipped), aislado en el chunk dedicado `vendor-excel` mediante `rollupOptions.output.manualChunks`. Se carga bajo demanda únicamente cuando el usuario importa o exporta una planilla.
- **Propósito:** Procesamiento seguro de planillas de cálculo académicas (.xlsx, .xls y .csv):
  - Remediación definitiva de las vulnerabilidades críticas reportadas en `npm audit` para la versión desatendida de npm `xlsx@0.18.5` (Prototype Pollution GHSA-4r6h-8v6p-xvw6 y ReDoS GHSA-5pgg-2g8v-p4x9).
  - Soporte integral de formatos admitidos: archivos antiguos `.xls` (BIFF8), planillas modernas `.xlsx` y archivos `.csv`.
  - Tratamiento estricto de archivos externos como no confiables: límite máximo de 5 MB, límite defensivo de 5.000 filas y sanitización preventiva contra Prototype Pollution (`__proto__`, `constructor`, `prototype`).
- **Alternativas descartadas:**
  - `exceljs`: Descartado porque carece de soporte para el formato binario `.xls` (BIFF8 utilizado frecuentemente en sistemas educativos provinciales), e introduce sobrecarga de dependencias de streams/Node polyfills en el navegador.
  - Conservar `xlsx@0.18.5`: Descartado por fallar auditorías de seguridad con 2 vulnerabilidades críticas sin remediación en el registro npm público.

---

### Fase 10 (Sub-mejora 10.2): Formularios Tipados con `react-hook-form` y `zod`

#### 5. `react-hook-form` (`dependencies`)
- **Versión:** `^7.89.0`
- **Licencia:** MIT (100 % Open Source, gratuita y permisiva).
- **Tamaño en bundle de producción:** Aislado en el chunk dedicado `vendor-forms` (~119 kB / 36.7 kB gzipped).
- **Propósito:** Manejo declarativo, performante y accesible de estados de formulario:
  - Elimina re-renderizados innecesarios del modal completo ante cada pulsación de tecla.
  - Gestión nativa de accesibilidad: atributos `aria-invalid` y `aria-describedby` conectados a mensajes de error con `role="alert"`.
  - Integración fluida con componentes controlados (`CustomSelect` mediante `Controller`).

#### 6. `zod` (`dependencies`)
- **Versión:** `^4.6.5`
- **Licencia:** MIT (100 % Open Source, gratuita y permisiva).
- **Tamaño en bundle de producción:** Aislado en el chunk `vendor-forms`.
- **Propósito:** Declaración de esquemas de validación tipados, inmutables y reutilizables (`src/schemas/dashboardForms.js`) para cátedras, clases rápidas y eventos de agenda.

#### 7. `@hookform/resolvers` (`dependencies`)
- **Versión:** `^5.9.1`
- **Licencia:** MIT (100 % Open Source, gratuita y permisiva).
- **Tamaño en bundle de producción:** Aislado en el chunk `vendor-forms`.
- **Propósito:** Puente oficial entre `react-hook-form` y el resolver de validación de esquemas de `zod` (`zodResolver`).

- **Alternativas descartadas:**
  - `formik` + `yup`: Descartado por excesivos re-renderizados globales en el árbol de componentes y mayor peso en bundle.
  - Validación manual con `useState` disperso: Descartado por código repetitivo, fragilidad ante nuevos campos y falta de consistencia en accesibilidad ARIA.


