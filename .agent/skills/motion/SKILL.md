---
name: motion
description: Motion (Framer Motion / Motion for React) expert guidance — declarative animations, layout transitions, AnimatePresence, gestural microinteractions, spring physics, scroll-linked animations, and hardware-accelerated UI motion. Use when animating React components, building tabs, modals, accordions, drag-and-drop or page transitions.
metadata:
  repo: https://github.com/motiondivision/motion
  docs: https://motion.dev
triggers:
  - motion
  - framer-motion
  - animacion
  - animaciones
  - animate
  - transition
  - layout animation
---

# Motion (Framer Motion) Master Guide

Guía experta de **Motion** (`motion/react` / `framer-motion`) para React.

## 1. Instalación y Configuración
```bash
npm install motion
# o si se utiliza framer-motion tradicional:
npm install framer-motion
```
Importación estándar:
```jsx
import * as motion from "motion/react-client";
// o en aplicaciones React cliente:
import { motion, AnimatePresence } from "framer-motion"; // o 'motion/react'
```

## 2. Animaciones Declarativas Básicas
Usar las propiedades `initial`, `animate` y `transition`:
```jsx
<motion.div
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -8 }}
  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
  className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-white/10"
>
  Contenido Animado
</motion.div>
```

## 3. Gestos y Microinteracciones Físicas
- **Botones Interactivos (`whileHover`, `whileTap`)**:
  ```jsx
  <motion.button
    whileHover={{ y: -2, scale: 1.01 }}
    whileTap={{ scale: 0.98 }}
    transition={{ type: "spring", stiffness: 400, damping: 25 }}
    className="px-5 py-2.5 rounded-xl font-bold bg-primary text-white shadow-md"
  >
    Acción Principal
  </motion.button>
  ```
- **Íconos Reactivos**:
  ```jsx
  <motion.div
    whileHover={{ rotate: 8, scale: 1.1 }}
    transition={{ type: "spring", stiffness: 300, damping: 15 }}
  >
    <Icon className="w-5 h-5 text-primary" />
  </motion.div>
  ```

## 4. Transiciones de Salida con `AnimatePresence`
Para elementos condicionales (modales, alertas, pestañas, acordeones):
```jsx
<AnimatePresence mode="wait">
  {isOpen && (
    <motion.div
      key="modal-content"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl">
        Diálogo Activo
      </div>
    </motion.div>
  )}
</AnimatePresence>
```

## 5. Píldora Deslizante para Pestañas (`layoutId`)
Para crear un indicador flotante fluido entre botones o pestañas de navegación:
```jsx
<nav className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl">
  {tabs.map((tab) => (
    <button
      key={tab.id}
      onClick={() => setActiveTab(tab.id)}
      className="relative px-4 py-2 text-xs font-bold rounded-xl z-10 transition-colors"
    >
      {activeTab === tab.id && (
        <motion.div
          layoutId="activeTabBadge"
          className="absolute inset-0 bg-white dark:bg-slate-900 rounded-xl shadow-xs"
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
        />
      )}
      <span className="relative z-10">{tab.label}</span>
    </button>
  ))}
</nav>
```

## 6. Reglas de Oro para Rendimiento
1. **Solo Animaciones Aceleradas por GPU**: Animar exclusivamente `transform` (`x`, `y`, `scale`, `rotate`) y `opacity`. Evitar animar `height`, `width`, `top` o `left` directamente para prevenir *layout thrashing*.
2. **Respeto a Preferencias del Usuario**: Soportar `prefers-reduced-motion` mediante el hook `useReducedMotion()`.
