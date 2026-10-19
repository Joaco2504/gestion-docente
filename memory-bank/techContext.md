# Tech Context — Korum

## Stack Tecnológico
- **Frontend:** React 18, Vite, React Router DOM, Tailwind CSS, Lucide React, Framer Motion, Radix UI.
- **Backend / BaaS:** Supabase (PostgreSQL, Auth, Row Level Security, Storage, Edge Functions).
- **Testing & Calidad:** Vitest (`npx vitest run`), Playwright (`@playwright/test`).
- **Entorno Operativo:** Windows (PowerShell / `cmd.exe`), Node.js + npm, Python + `uv` (para scripts de skills y BMad).
- **Sistemas Agénticos Instalados:**
  1. **Memory Bank (`cursor-memory-bank`)**: Directorio `memory-bank/` + reglas `.cursor/rules/isolation_rules/` y comandos `.cursor/commands/`.
  2. **Task Master (`claude-task-master`)**: Motor de estado en `.taskmaster/` (`tasks/tasks.json`, `state.json`, `config.json`) + CLI local `scripts/taskmaster-state.mjs` (`npm run tm`).
  3. **BMad Method (`bmad-method`)**: Directorio `_bmad/` + 31 skills oficiales en `.agent/skills/bmad*`.
