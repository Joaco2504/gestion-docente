#!/usr/bin/env node
/**
 * Task Master State Engine (`claude-task-master`)
 * Motor determinista de estado para gestionar `.taskmaster/tasks/tasks.json`,
 * `.taskmaster/state.json`, `.taskmaster/config.json` y archivos `.taskmaster/tasks/task_XXX.md`.
 *
 * Comandos soportados:
 *   node scripts/taskmaster-state.mjs status
 *   node scripts/taskmaster-state.mjs list [--status=<status>] [--tag=<tag>] [--with-subtasks]
 *   node scripts/taskmaster-state.mjs next [--tag=<tag>]
 *   node scripts/taskmaster-state.mjs show <id> [--tag=<tag>]
 *   node scripts/taskmaster-state.mjs set-status --id=<id> --status=<status> [--tag=<tag>]
 *   node scripts/taskmaster-state.mjs add-task --title="..." [--description="..."] [--priority=high|medium|low] [--depends-on=1,2]
 *   node scripts/taskmaster-state.mjs add-subtask --parent=<id> --title="..." [--description="..."] [--depends-on=1]
 *   node scripts/taskmaster-state.mjs update-subtask --id=<taskId.subId> --prompt="..."
 *   node scripts/taskmaster-state.mjs validate-dependencies [--fix]
 *   node scripts/taskmaster-state.mjs tags | use-tag <name> | add-tag <name> [--description="..."]
 *   node scripts/taskmaster-state.mjs generate
 */

import fs from 'node:fs';
import path from 'node:path';

const VALID_STATUSES = ['pending', 'in-progress', 'review', 'done', 'deferred', 'cancelled'];
const PRIORITY_RANK = { high: 3, medium: 2, low: 1 };

const ROOT_DIR = process.cwd();
const TM_DIR = path.join(ROOT_DIR, '.taskmaster');
const TASKS_DIR = path.join(TM_DIR, 'tasks');
const TASKS_FILE = path.join(TASKS_DIR, 'tasks.json');
const STATE_FILE = path.join(TM_DIR, 'state.json');
const CONFIG_FILE = path.join(TM_DIR, 'config.json');

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (const arg of argv) {
    if (arg.startsWith('--')) {
      const eqIdx = arg.indexOf('=');
      if (eqIdx !== -1) {
        flags[arg.slice(2, eqIdx)] = arg.slice(eqIdx + 1);
      } else {
        flags[arg.slice(2)] = true;
      }
    } else {
      positional.push(arg);
    }
  }
  return { command: positional[0] || 'status', args: positional.slice(1), flags };
}

function ensureStateEngineInitialized() {
  if (!fs.existsSync(TASKS_DIR)) fs.mkdirSync(TASKS_DIR, { recursive: true });
  if (!fs.existsSync(STATE_FILE)) {
    fs.writeFileSync(
      STATE_FILE,
      JSON.stringify(
        {
          currentTag: 'master',
          lastUpdated: new Date().toISOString(),
          migrationNoticeShown: true,
          lastSwitched: new Date().toISOString(),
          branchTagMapping: { main: 'master' },
        },
        null,
        2
      ),
      'utf8'
    );
  }
  if (!fs.existsSync(TASKS_FILE)) {
    fs.writeFileSync(
      TASKS_FILE,
      JSON.stringify(
        {
          master: {
            tasks: [],
            metadata: {
              created: new Date().toISOString(),
              updated: new Date().toISOString(),
              description: 'Master tasks context',
            },
          },
        },
        null,
        2
      ),
      'utf8'
    );
  }
}

function loadState() {
  ensureStateEngineInitialized();
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
}

function saveState(state) {
  state.lastUpdated = new Date().toISOString();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + '\n', 'utf8');
}

function loadTasksDb() {
  ensureStateEngineInitialized();
  return JSON.parse(fs.readFileSync(TASKS_FILE, 'utf8'));
}

function saveTasksDb(db, tag) {
  const now = new Date().toISOString();
  if (tag && db[tag]) {
    db[tag].metadata = db[tag].metadata || {};
    db[tag].metadata.updated = now;
  }
  fs.writeFileSync(TASKS_FILE, JSON.stringify(db, null, 2) + '\n', 'utf8');
  const state = loadState();
  const activeTag = tag || state.currentTag || 'master';
  const tasks = db[activeTag]?.tasks || [];
  state.metadata = state.metadata || {};
  state.metadata.metrics = {
    totalTaskCount: tasks.length,
    tagCount: Object.keys(db).length,
    listCommandCount: (state.metadata?.metrics?.listCommandCount || 0) + 1,
    tasksWithDependencies: tasks.filter((t) => Array.isArray(t.dependencies) && t.dependencies.length > 0).length,
  };
  saveState(state);
}

function generateTaskMarkdownFiles(db, tag) {
  const tasks = db[tag]?.tasks || [];
  for (const t of tasks) {
    const padded = String(t.id).padStart(3, '0');
    const suffix = tag === 'master' ? '' : `_${tag}`;
    const filePath = path.join(TASKS_DIR, `task_${padded}${suffix}.md`);
    const deps = (t.dependencies || []).length > 0 ? t.dependencies.join(', ') : 'None';
    let md = `# Task ID: ${t.id}\n`;
    md += `**Title:** ${t.title}\n`;
    md += `**Status:** ${t.status}\n`;
    md += `**Priority:** ${t.priority || 'medium'}\n`;
    md += `**Dependencies:** ${deps}\n\n`;
    md += `## Description\n${t.description || ''}\n\n`;
    if (t.details) md += `## Implementation Details\n${t.details}\n\n`;
    if (t.testStrategy) md += `## Test Strategy\n${t.testStrategy}\n\n`;
    if (Array.isArray(t.subtasks) && t.subtasks.length > 0) {
      md += `## Subtasks\n`;
      for (const st of t.subtasks) {
        md += `- **[${st.status === 'done' ? 'x' : ' '}] ${t.id}.${st.id}: ${st.title}** (${st.status})\n`;
        if (st.description) md += `  - ${st.description}\n`;
        if (st.details) md += `  - Notes: ${st.details.replace(/\n/g, ' ')}\n`;
      }
    }
    fs.writeFileSync(filePath, md, 'utf8');
  }
}

function findNextTask(tasks) {
  const doneIds = new Set(tasks.filter((t) => t.status === 'done').map((t) => Number(t.id)));
  const inProgress = tasks.filter(
    (t) => t.status === 'in-progress' && (t.dependencies || []).every((d) => doneIds.has(Number(d)))
  );
  const candidates =
    inProgress.length > 0
      ? inProgress
      : tasks.filter((t) => t.status === 'pending' && (t.dependencies || []).every((d) => doneIds.has(Number(d))));

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    const pDiff = (PRIORITY_RANK[b.priority] || 2) - (PRIORITY_RANK[a.priority] || 2);
    if (pDiff !== 0) return pDiff;
    const depDiff = (a.dependencies?.length || 0) - (b.dependencies?.length || 0);
    if (depDiff !== 0) return depDiff;
    return Number(a.id) - Number(b.id);
  });

  const chosen = candidates[0];
  let nextSubtask = null;
  if (Array.isArray(chosen.subtasks) && chosen.subtasks.length > 0) {
    const doneSubIds = new Set(chosen.subtasks.filter((s) => s.status === 'done').map((s) => Number(s.id)));
    nextSubtask =
      chosen.subtasks.find(
        (s) =>
          (s.status === 'in-progress' || s.status === 'pending') &&
          (s.dependencies || []).every((d) => doneSubIds.has(Number(d)))
      ) || null;
  }

  return { task: chosen, subtask: nextSubtask };
}

function validateDependencies(tasks, fix = false) {
  const validIds = new Set(tasks.map((t) => Number(t.id)));
  const issues = [];

  for (const t of tasks) {
    const deps = Array.isArray(t.dependencies) ? t.dependencies : [];
    const cleaned = [];
    for (const d of deps) {
      const numD = Number(d);
      if (numD === Number(t.id)) {
        issues.push(`Task ${t.id} has self-dependency (${d})`);
        if (!fix) cleaned.push(numD);
      } else if (!validIds.has(numD)) {
        issues.push(`Task ${t.id} depends on non-existent task ${d}`);
        if (!fix) cleaned.push(numD);
      } else {
        cleaned.push(numD);
      }
    }
    if (fix) t.dependencies = [...new Set(cleaned)];
  }

  // Cycle detection via DFS
  const adj = new Map(tasks.map((t) => [Number(t.id), (t.dependencies || []).map(Number)]));
  const visited = new Set();
  const inStack = new Set();

  function dfs(nodeId) {
    visited.add(nodeId);
    inStack.add(nodeId);
    const neighbors = adj.get(nodeId) || [];
    for (const depId of neighbors) {
      if (!visited.has(depId)) {
        if (dfs(depId)) return true;
      } else if (inStack.has(depId)) {
        issues.push(`Circular dependency detected involving task ${nodeId} -> ${depId}`);
        if (fix) {
          const taskObj = tasks.find((t) => Number(t.id) === nodeId);
          if (taskObj) {
            taskObj.dependencies = (taskObj.dependencies || []).filter((d) => Number(d) !== depId);
          }
        }
        return true;
      }
    }
    inStack.delete(nodeId);
    return false;
  }

  for (const t of tasks) {
    const id = Number(t.id);
    if (!visited.has(id)) dfs(id);
  }

  return issues;
}

function main() {
  const { command, args, flags } = parseArgs(process.argv.slice(2));
  const state = loadState();
  const db = loadTasksDb();
  const activeTag = flags.tag || state.currentTag || 'master';

  if (!db[activeTag]) {
    db[activeTag] = {
      tasks: [],
      metadata: {
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        description: `Tag context: ${activeTag}`,
      },
    };
  }
  const tasks = db[activeTag].tasks;

  switch (command) {
    case 'init': {
      saveTasksDb(db, activeTag);
      generateTaskMarkdownFiles(db, activeTag);
      console.log(JSON.stringify({ ok: true, message: 'Task Master State Engine initialized', tag: activeTag }, null, 2));
      break;
    }

    case 'status':
    case 'dashboard': {
      const counts = VALID_STATUSES.reduce((acc, s) => ({ ...acc, [s]: 0 }), {});
      for (const t of tasks) counts[t.status] = (counts[t.status] || 0) + 1;
      const total = tasks.length;
      const completionPct = total > 0 ? Math.round(((counts.done || 0) / total) * 100) : 0;
      const next = findNextTask(tasks);
      console.log(
        JSON.stringify(
          {
            engine: 'claude-task-master-state-engine',
            activeTag,
            availableTags: Object.keys(db),
            totalTasks: total,
            completionPercentage: `${completionPct}%`,
            counts,
            nextRecommendedTask: next
              ? {
                  id: next.subtask ? `${next.task.id}.${next.subtask.id}` : next.task.id,
                  title: next.subtask ? `${next.task.title} -> ${next.subtask.title}` : next.task.title,
                  priority: next.task.priority,
                }
              : null,
          },
          null,
          2
        )
      );
      break;
    }

    case 'list': {
      const filterStatus = flags.status;
      const withSubtasks = Boolean(flags['with-subtasks']);
      const filtered = filterStatus ? tasks.filter((t) => t.status === filterStatus) : tasks;
      const summary = filtered.map((t) => {
        const item = {
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          dependencies: t.dependencies || [],
          subtasksCount: (t.subtasks || []).length,
        };
        if (withSubtasks && Array.isArray(t.subtasks)) {
          item.subtasks = t.subtasks.map((s) => ({
            id: `${t.id}.${s.id}`,
            title: s.title,
            status: s.status,
            dependencies: s.dependencies || [],
          }));
        }
        return item;
      });
      console.log(JSON.stringify({ tag: activeTag, count: summary.length, tasks: summary }, null, 2));
      break;
    }

    case 'next': {
      const next = findNextTask(tasks);
      if (!next) {
        console.log(
          JSON.stringify(
            {
              tag: activeTag,
              nextTask: null,
              message: 'No hay tareas pendientes listas para ejecutar (todas están completadas o bloqueadas).',
            },
            null,
            2
          )
        );
      } else {
        console.log(
          JSON.stringify(
            {
              tag: activeTag,
              nextTask: next.task,
              nextSubtask: next.subtask,
            },
            null,
            2
          )
        );
      }
      break;
    }

    case 'show': {
      const rawId = flags.id || args[0];
      if (!rawId) {
        console.error('Error: Debe especificar un ID (ej: show 1 o show 1.2)');
        process.exit(1);
      }
      const [parentStr, subStr] = String(rawId).split('.');
      const parentTask = tasks.find((t) => Number(t.id) === Number(parentStr));
      if (!parentTask) {
        console.error(`Error: Tarea ${parentStr} no encontrada en tag '${activeTag}'.`);
        process.exit(1);
      }
      if (subStr) {
        const sub = (parentTask.subtasks || []).find((s) => Number(s.id) === Number(subStr));
        if (!sub) {
          console.error(`Error: Subtarea ${rawId} no encontrada.`);
          process.exit(1);
        }
        console.log(JSON.stringify({ parentId: parentTask.id, parentTitle: parentTask.title, subtask: sub }, null, 2));
      } else {
        console.log(JSON.stringify(parentTask, null, 2));
      }
      break;
    }

    case 'set-status': {
      const rawId = flags.id || args[0];
      const newStatus = flags.status || args[1];
      if (!rawId || !newStatus || !VALID_STATUSES.includes(newStatus)) {
        console.error(`Error: Uso: set-status --id=<id> --status=<${VALID_STATUSES.join('|')}>`);
        process.exit(1);
      }
      const [parentStr, subStr] = String(rawId).split('.');
      const parentTask = tasks.find((t) => Number(t.id) === Number(parentStr));
      if (!parentTask) {
        console.error(`Error: Tarea ${parentStr} no encontrada.`);
        process.exit(1);
      }
      if (subStr) {
        const sub = (parentTask.subtasks || []).find((s) => Number(s.id) === Number(subStr));
        if (!sub) {
          console.error(`Error: Subtarea ${rawId} no encontrada.`);
          process.exit(1);
        }
        sub.previousStatus = sub.status;
        sub.status = newStatus;
        sub.updatedAt = new Date().toISOString();
      } else {
        parentTask.previousStatus = parentTask.status;
        parentTask.status = newStatus;
        parentTask.updatedAt = new Date().toISOString();
      }
      saveTasksDb(db, activeTag);
      generateTaskMarkdownFiles(db, activeTag);
      console.log(JSON.stringify({ ok: true, id: rawId, status: newStatus, tag: activeTag }, null, 2));
      break;
    }

    case 'add-task': {
      const title = flags.title || flags.prompt || args.join(' ');
      if (!title) {
        console.error('Error: Debe indicar --title="..." o --prompt="..."');
        process.exit(1);
      }
      const nextId = tasks.reduce((max, t) => Math.max(max, Number(t.id)), 0) + 1;
      const deps = flags['depends-on']
        ? String(flags['depends-on'])
            .split(',')
            .map((x) => Number(x.trim()))
            .filter(Boolean)
        : [];
      const newTask = {
        id: nextId,
        title,
        description: flags.description || title,
        status: 'pending',
        dependencies: deps,
        priority: flags.priority || 'medium',
        details: flags.details || '',
        testStrategy: flags['test-strategy'] || 'Verificar mediante Vitest y revisión funcional.',
        subtasks: [],
      };
      tasks.push(newTask);
      saveTasksDb(db, activeTag);
      generateTaskMarkdownFiles(db, activeTag);
      console.log(JSON.stringify({ ok: true, createdTask: newTask, tag: activeTag }, null, 2));
      break;
    }

    case 'add-subtask': {
      const parentId = Number(flags.parent || flags.id || args[0]);
      const title = flags.title || flags.prompt || args.slice(1).join(' ');
      const parentTask = tasks.find((t) => Number(t.id) === parentId);
      if (!parentTask || !title) {
        console.error('Error: Uso: add-subtask --parent=<id> --title="..."');
        process.exit(1);
      }
      parentTask.subtasks = parentTask.subtasks || [];
      const nextSubId = parentTask.subtasks.reduce((max, s) => Math.max(max, Number(s.id)), 0) + 1;
      const deps = flags['depends-on']
        ? String(flags['depends-on'])
            .split(',')
            .map((x) => Number(x.trim()))
            .filter(Boolean)
        : [];
      const newSub = {
        id: nextSubId,
        title,
        description: flags.description || title,
        status: 'pending',
        dependencies: deps,
        details: flags.details || '',
      };
      parentTask.subtasks.push(newSub);
      saveTasksDb(db, activeTag);
      generateTaskMarkdownFiles(db, activeTag);
      console.log(JSON.stringify({ ok: true, parentId, createdSubtask: newSub }, null, 2));
      break;
    }

    case 'update-subtask': {
      const rawId = String(flags.id || args[0] || '');
      const notes = flags.prompt || flags.notes || args.slice(1).join(' ');
      const [parentStr, subStr] = rawId.split('.');
      const parentTask = tasks.find((t) => Number(t.id) === Number(parentStr));
      const sub = parentTask?.subtasks?.find((s) => Number(s.id) === Number(subStr));
      if (!sub || !notes) {
        console.error('Error: Uso: update-subtask --id=<taskId.subId> --prompt="notas..."');
        process.exit(1);
      }
      const stamp = new Date().toISOString();
      sub.details = sub.details ? `${sub.details}\n\n[${stamp}] ${notes}` : `[${stamp}] ${notes}`;
      saveTasksDb(db, activeTag);
      generateTaskMarkdownFiles(db, activeTag);
      console.log(JSON.stringify({ ok: true, id: rawId, updatedSubtask: sub }, null, 2));
      break;
    }

    case 'validate-dependencies':
    case 'fix-dependencies': {
      const shouldFix = command === 'fix-dependencies' || Boolean(flags.fix);
      const issues = validateDependencies(tasks, shouldFix);
      if (shouldFix && issues.length > 0) {
        saveTasksDb(db, activeTag);
        generateTaskMarkdownFiles(db, activeTag);
      }
      console.log(JSON.stringify({ ok: issues.length === 0, fixed: shouldFix, issues }, null, 2));
      break;
    }

    case 'tags': {
      const tagSummary = Object.entries(db).map(([name, data]) => ({
        tag: name,
        active: name === state.currentTag,
        taskCount: (data.tasks || []).length,
        doneCount: (data.tasks || []).filter((t) => t.status === 'done').length,
        description: data.metadata?.description || '',
      }));
      console.log(JSON.stringify({ currentTag: state.currentTag, tags: tagSummary }, null, 2));
      break;
    }

    case 'use-tag': {
      const targetTag = flags.name || args[0];
      if (!targetTag || !db[targetTag]) {
        console.error(`Error: Tag '${targetTag}' no existe.`);
        process.exit(1);
      }
      state.currentTag = targetTag;
      state.lastSwitched = new Date().toISOString();
      saveState(state);
      console.log(JSON.stringify({ ok: true, currentTag: targetTag }, null, 2));
      break;
    }

    case 'add-tag': {
      const newTag = flags.name || args[0];
      if (!newTag) {
        console.error('Error: Debe indicar el nombre del tag: add-tag <nombre>');
        process.exit(1);
      }
      if (!db[newTag]) {
        db[newTag] = {
          tasks: [],
          metadata: {
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
            description: flags.description || `Tag context: ${newTag}`,
          },
        };
        saveTasksDb(db, newTag);
      }
      console.log(JSON.stringify({ ok: true, tag: newTag }, null, 2));
      break;
    }

    case 'generate': {
      generateTaskMarkdownFiles(db, activeTag);
      console.log(JSON.stringify({ ok: true, generatedCount: tasks.length, tag: activeTag }, null, 2));
      break;
    }

    default: {
      console.log(
        JSON.stringify(
          {
            error: `Comando desconocido: ${command}`,
            availableCommands: [
              'init',
              'status',
              'list',
              'next',
              'show',
              'set-status',
              'add-task',
              'add-subtask',
              'update-subtask',
              'validate-dependencies',
              'fix-dependencies',
              'tags',
              'use-tag',
              'add-tag',
              'generate',
            ],
          },
          null,
          2
        )
      );
      process.exit(1);
    }
  }
}

main();
