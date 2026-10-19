---
name: bmad-method
description: Agile AI-Driven Development (BMad Method) — end-to-end framework for ideation, product briefs, PRDs, UX design, architecture, epic/story breakdown, implementation (bmad-build), code review, E2E testing, and retrospectives. Use when invoking BMad Method workflows or agents.
---

# BMad Method — Agile AI-Driven Development (`bmad-method`)

El método **BMad (Breakthrough Method of Agile AI-Driven Development)** convierte una idea o requerimiento de cambio en software funcional manteniendo las decisiones explícitas y el contexto continuo a través de todo el ciclo de vida en `_bmad/`.

---

## Ciclo de Entrega BMad

1. **Clarify / Ideate (Descubrimiento):**
   - `bmad-brainstorming` — Exploración creativa y generación de ideas.
   - `bmad-forge-idea` — Refinamiento y prueba de estrés de conceptos.
   - `bmad-deep-recon` — Investigación profunda de dominio o código existente.
   - `bmad-prfaq` — Documento Working Backwards (Press Release + FAQ).
   - `bmad-product-brief` — Definición ejecutiva del producto o iniciativa.

2. **Plan & Design (Especificación y Arquitectura):**
   - `bmad-prd` — Creación y validación del Product Requirements Document (PRD).
   - `bmad-ux` — Diseño de experiencia de usuario, flujos e interfaz.
   - `bmad-architecture` — Arquitectura técnica, decisiones de diseño (ADRs), épicas e historias listas para desarrollo.
   - `bmad-project-context` — Captura de convenciones y reglas transversales del repositorio en `project-context.md`.

3. **Build & Verify (Implementación y Calidad):**
   - `bmad-build` — Implementación guiada de historias o cambios directos.
   - `bmad-build-auto` — Ejecución desatendida del ciclo de construcción y verificación.
   - `bmad-review` / `bmad-code-review` — Revisión multi-ángulo de artefactos y código.
   - `bmad-qa-generate-e2e-tests` — Generación automatizada de pruebas End-to-End (E2E).
   - `bmad-walkthrough` — Recorrido estructurado de cambios implementados.

4. **Learn & Adjust (Mejora Continua y Agentes):**
   - `bmad-retrospective` — Retrospectiva post-entrega y captura de mejoras.
   - `bmad-party-mode` — Sesión colaborativa multi-agente (PM, Architect, Dev, UX, Analyst, PO).
   - **Agentes Especializados:**
     - `bmad-agent-analyst` (Mary — Business Analyst)
     - `bmad-agent-pm` (John — Product Manager)
     - `bmad-agent-ux-designer` (Sally — UX Designer)
     - `bmad-agent-architect` (Winston — Architect)
     - `bmad-agent-po` (Sarah — Product Owner / Scrum Master)
     - `bmad-agent-dev` (Amelia — Senior Developer)

---

## Cómo Usar BMad en este Proyecto

- **Hub central y ayuda contextual:** Invoca la skill [`bmad`](file:///c:/Users/emili/Documents/docente/.agent/skills/bmad/SKILL.md) para consultar el estado de la iniciativa activa, configurar módulos o pedir recomendación del siguiente paso:
  ```bash
  uv run .agent/skills/bmad/scripts/knowledge.py --content --root .agent/skills
  ```
- **Directorio de estado BMad:** `_bmad/` en la raíz del proyecto (`c:\Users\emili\Documents\docente\_bmad\`).
