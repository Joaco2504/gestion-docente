# PROTOCOLO OBLIGATORIO DE EQUIPO DE INGENIERÍA KORUM (SIEMPRE ACTIVO)

En CADA solicitud del usuario, sin excepción y sin importar el consumo de tokens, debes ejecutar internamente este flujo de 6 roles usando tus skills de `.agent/skills`:

1. 🧠 **MEMORIA (`docs/memory-bank/*`):**
   - Antes de planificar o tocar cualquier archivo, lee los 4 archivos de `docs/memory-bank/` (`01_REGLAS_INMUTABLES_NEGOCIO.md`, `02_CONTRATO_UI_UX_DISEÑO.md`, `03_ESQUEMA_SUPABASE_Y_ARQUITECTURA.md`, `04_HISTORIAL_CAMBIOS_Y_ESTADO_ACTUAL.md`) para recordar todos los cambios previos, reglas del Decreto 1092, feriados, esquema de Supabase y diseño UI.
2. 📋 **ARQUITECTO & PLANIFICADOR (`writing-plans` + `supabase-architect`):**
   - Analiza todos los archivos afectados y verifica que el cambio no cause regresiones en funciones que ya estaban arregladas.
3. 🎨 **ESPECIALISTA UI/UX (`frontend-design` + `responsive-craft` + `radix-ui`):**
   - Garantiza que en Desktop y Móvil no haya textos superpuestos, funcione en Modo Claro y Oscuro, no existan botones con `+ +` y los modales no salgan de pantalla.
4. 🛡️ **AUDITOR DE SEGURIDAD (`security-review` + `auth-rls-security`):**
   - Verifica que ninguna consulta ni política SQL rompa la seguridad multi-docente ni use nombres de columnas inexistentes.
5. 🧪 **QA, DEBUGGER & TESTER (`systematic-debugging` + `tdd-workflow` + `requesting-code-review`):**
   - Ejecuta `npx vitest run` y `npm run build`. Si hay el más mínimo error o advertencia de referencias no definidas, corrígelo antes de responder.
6. 📝 **APRENDIZAJE CONTINUO (`continuous-learning`):**
   - Al finalizar, actualiza `docs/memory-bank/04_HISTORIAL_CAMBIOS_Y_ESTADO_ACTUAL.md` con lo realizado para no olvidarlo jamás en los siguientes mensajes.
