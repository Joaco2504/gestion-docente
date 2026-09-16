---
name: magicui
description: Magic UI expert guidance — animated components, Bento Grid layouts, border beams, animated beams, particle backgrounds, interactive hover cards, and high-impact visual design engineering for React and Tailwind CSS. Use when adding modern visual flair, animated hero sections, dynamic dashboard cards, or interactive bento grids.
metadata:
  repo: https://github.com/magicuidesign/magicui
  docs: https://magicui.design
triggers:
  - magicui
  - magic ui
  - bento
  - border beam
  - animated beam
  - particles
  - visual effects
---

# Magic UI Master Guide

Guía experta de **Magic UI** para interfaces React + Tailwind CSS de alto impacto visual y Bento Grids interactivos.

## 1. Concepto y Filosofía
Al igual que shadcn/ui, Magic UI **no es una dependencia monolítica en npm**. Los componentes se copian directamente en tu código fuente (`src/components/magicui/`), construidos con:
- **Tailwind CSS** para estilizado de tokens y layout.
- **Motion / Framer Motion** para física interactiva y resortes.

## 2. Componentes Clave

### A. Bento Grid Interactivo
Estructura de mosaico con fondo interactivo al pasar el mouse:
```jsx
export function BentoGrid({ children, className = '' }) {
  return (
    <div className={`grid w-full auto-rows-[22rem] grid-cols-1 md:grid-cols-3 gap-4 ${className}`}>
      {children}
    </div>
  );
}

export function BentoCard({ name, className = '', background, Icon, description, href, cta }) {
  return (
    <div
      className={`group relative col-span-3 flex flex-col justify-between overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 p-6 shadow-xs transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${className}`}
    >
      <div>{background}</div>
      <div className="pointer-events-none z-10 flex flex-col gap-1 transition-all duration-300 group-hover:-translate-y-2">
        <Icon className="h-10 w-10 origin-left text-primary transition-all duration-300 ease-in-out group-hover:scale-90" />
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">{name}</h3>
        <p className="max-w-lg text-sm text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      {cta && (
        <div className="pointer-events-none absolute bottom-0 flex w-full translate-y-10 transform-gpu flex-row items-center p-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <span className="text-xs font-bold text-primary">{cta} →</span>
        </div>
      )}
    </div>
  );
}
```

### B. Border Beam (Haz de Luz Perimetral)
Luz animada que recorre el borde de una tarjeta destacada:
```jsx
export function BorderBeam({
  size = 200,
  duration = 15,
  anchor = 90,
  borderWidth = 1.5,
  colorFrom = "#1a56db",
  colorTo = "#059669",
  delay = 0,
}) {
  return (
    <div
      style={{
        "--size": size,
        "--duration": duration,
        "--anchor": anchor,
        "--border-width": borderWidth,
        "--color-from": colorFrom,
        "--color-to": colorTo,
        "--delay": `-${delay}s`,
      }}
      className="pointer-events-none absolute inset-0 rounded-[inherit] [border:calc(var(--border-width)*1px)_solid_transparent] ![mask-clip:padding-box,border-box] ![mask-composite:intersect] [mask:linear-gradient(transparent,transparent),linear-gradient(white,white)] after:absolute after:aspect-square after:w-[calc(var(--size)*1px)] after:animate-border-beam after:[animation-delay:var(--delay)] after:[background:linear-gradient(to_left,var(--color-from),var(--color-to),transparent)] after:[offset-anchor:calc(var(--anchor)*1%)_50%] after:[offset-path:rect(0_auto_auto_0_round_calc(var(--size)*1px))]"
    />
  );
}
```

### C. Number Ticker (Contador Numérico Animado)
Animación suave de números para métricas y KPIs (ej: "94% Asistencia", "28 Alumnos"):
```jsx
import { useEffect, useRef } from "react";
import { useInView, useMotionValue, useSpring } from "framer-motion";

export function NumberTicker({ value, direction = "up", delay = 0, className = "" }) {
  const ref = useRef(null);
  const motionValue = useMotionValue(direction === "down" ? value : 0);
  const springValue = useSpring(motionValue, { damping: 60, stiffness: 100 });
  const isInView = useInView(ref, { once: true, margin: "0px" });

  useEffect(() => {
    if (isInView) {
      setTimeout(() => {
        motionValue.set(direction === "down" ? 0 : value);
      }, delay * 1000);
    }
  }, [motionValue, isInView, delay, value, direction]);

  useEffect(() => {
    springValue.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = Intl.NumberFormat("es-AR").format(Number(latest.toFixed(0)));
      }
    });
  }, [springValue]);

  return <span className={`inline-block tabular-nums tracking-wider ${className}`} ref={ref} />;
}
```

## 3. Mejores Prácticas
1. **Moderación Visual**: No sobrecargar una misma vista con múltiples efectos a la vez (evitar combinar partículas + border beam + meteors en la misma tarjeta).
2. **Optimización en Móviles**: Desactivar efectos intensivos de renderizado en pantallas pequeñas mediante clases `hidden sm:block` o detectando `window.matchMedia`.
