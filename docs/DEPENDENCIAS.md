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
