---
name: claude-task-master
description: Task Master AI (eyaltoledano/claude-task-master) workflow and deterministic State Engine (.taskmaster/tasks/tasks.json, .taskmaster/state.json, .taskmaster/config.json, and scripts/taskmaster-state.mjs). Use to manage tasks, subtasks, dependencies DAG, tags, complexity reports, and task status transitions.
---

# Claude Task Master + Motor de Estado (`claude-task-master`)

Sistema de gestión de tareas e ingeniería guiada por estado basado en [`eyaltoledano/claude-task-master`](https://github.com/eyaltoledano/claude-task-master), integrado con un **Motor de Estado determinista local** en `.taskmaster/` que funciona sin requerir claves de API externas y mantiene compatibilidad 100% con el esquema oficial de `task-master-ai`.

---

## Arquitectura del Motor de Estado (`.taskmaster/`)

El estado persistente del proyecto reside en `c:\Users\emili\Documents\docente\.taskmaster\`:

- **[`.taskmaster/tasks/tasks.json`](file:///c:/Users/emili/Documents/docente/.taskmaster/tasks/tasks.json)** — Base de datos principal de tareas y subtareas estructurada por contextos (`tags`, por defecto `"master"`).
- **[`.taskmaster/state.json`](file:///c:/Users/emili/Documents/docente/.taskmaster/state.json)** — Estado activo del motor (`currentTag`, `lastUpdated`, `lastSwitched`, `branchTagMapping`, métricas).
- **[`.taskmaster/config.json`](file:///c:/Users/emili/Documents/docente/.taskmaster/config.json)** — Configuración de modelos e idioma del proyecto.
- **[`.taskmaster/docs/prd.md`](file:///c:/Users/emili/Documents/docente/.taskmaster/docs/prd.md)** — Documento de Especificación de Producto (PRD).
- **[`.taskmaster/reports/task-complexity-report.json`](file:///c:/Users/emili/Documents/docente/.taskmaster/reports/task-complexity-report.json)** — Reporte de análisis de complejidad (escala 1–10).
- **`.taskmaster/tasks/task_XXX.md`** — Archivos Markdown individuales sincronizados automáticamente en cada cambio de estado.

---

## Comandos del Motor de Estado (`scripts/taskmaster-state.mjs`)

Ejecuta cualquiera de estos comandos mediante `node scripts/taskmaster-state.mjs <comando>` (o `npm run tm -- <comando>`):

### 1. Dashboard y Próxima Tarea (Resolución DAG)
```bash
# Ver estado general del proyecto, conteo por estados y siguiente tarea recomendada
node scripts/taskmaster-state.mjs status

# Calcular la siguiente tarea/subtarea desbloqueada según grafo de dependencias y prioridad
node scripts/taskmaster-state.mjs next
```

### 2. Listado e Inspección de Tareas
```bash
# Listar todas las tareas del tag activo (con o sin subtareas)
node scripts/taskmaster-state.mjs list --with-subtasks

# Filtrar por estado (pending | in-progress | review | done | deferred | cancelled)
node scripts/taskmaster-state.mjs list --status=pending

# Ver el detalle completo de una tarea (ej: 5) o subtarea (ej: 5.1)
node scripts/taskmaster-state.mjs show 5
```

### 3. Transiciones de Estado (`set-status`)
```bash
# Cambiar el estado de una tarea o subtarea y regenerar archivos task_XXX.md
node scripts/taskmaster-state.mjs set-status --id=5 --status=in-progress
node scripts/taskmaster-state.mjs set-status --id=5 --status=done
```

### 4. Creación de Tareas, Subtareas y Notas de Progreso
```bash
# Crear una nueva tarea con prioridad y dependencias
node scripts/taskmaster-state.mjs add-task --title="Nueva funcionalidad" --description="Detalle..." --priority=high --depends-on=5

# Desglosar una tarea en subtareas
node scripts/taskmaster-state.mjs add-subtask --parent=6 --title="Subtarea 1" --description="Paso 1"

# Registrar notas de implementación con timestamp en una subtarea
node scripts/taskmaster-state.mjs update-subtask --id=6.1 --prompt="Se implementó el servicio y pasaron los tests."
```

### 5. Validación del Grafo de Dependencias (DAG) y Tags
```bash
# Validar que no existan dependencias circulares ni IDs huérfanos (y corregirlos con --fix)
node scripts/taskmaster-state.mjs validate-dependencies --fix

# Gestionar contextos (Tagged Task Lists)
node scripts/taskmaster-state.mjs tags
node scripts/taskmaster-state.mjs add-tag feature-x --description="Contexto aislado"
node scripts/taskmaster-state.mjs use-tag feature-x
```

---

## Reglas de Flujo de Trabajo Incluidas

Dentro de esta skill se encuentran las reglas oficiales de `claude-task-master`:
- [`rules/dev_workflow.mdc`](file:///c:/Users/emili/Documents/docente/.agent/skills/claude-task-master/rules/dev_workflow.mdc) — Ciclo de desarrollo iterativo (`list` → `next` → `show` → `expand` → `update-subtask` → `set-status`).
- [`rules/taskmaster.mdc`](file:///c:/Users/emili/Documents/docente/.agent/skills/claude-task-master/rules/taskmaster.mdc) — Referencia completa de herramientas MCP y equivalentes CLI.
- [`TM_COMMANDS_GUIDE.md`](file:///c:/Users/emili/Documents/docente/.agent/skills/claude-task-master/TM_COMMANDS_GUIDE.md) — Guía de comandos `/project:tm/*`.
