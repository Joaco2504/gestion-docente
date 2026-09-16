---
name: tremor
description: Tremor expert guidance — dashboard components, metric KPI cards, DonutChart, BarChart, AreaChart, BarList, ProgressBar, and financial/academic analytics visualizations built with React and Tailwind CSS. Use when building teacher dashboards, grade distributions, attendance statistics, progress trackers, or analytic reports.
metadata:
  repo: https://github.com/tremorlabs/tremor
  docs: https://tremor.so
triggers:
  - tremor
  - chart
  - grafico
  - metricas
  - kpi
  - dashboard
  - donutchart
  - barchart
---

# Tremor Master Guide

Guía experta de **Tremor** para dashboards y visualización de datos de alto rendimiento con Tailwind CSS.

## 1. Concepto y Enfoque
Tremor está optimizado para construir **paneles de control, dashboards analíticos y reportes ejecutivos** con una tipografía limpia, gráficos nítidos y soporte nativo para modo oscuro.

## 2. Componentes Esenciales

### A. Tarjeta de Métrica / KPI con Barra de Progreso
Ideal para resúmenes de cátedra (asistencia media, porcentaje de regularidad):
```jsx
export function KpiCard({ title, metric, target, percentage, color = "emerald" }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-2xl p-5 shadow-xs">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {title}
        </span>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
          {target}
        </span>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {metric}
        </span>
      </div>

      {/* Barra de Progreso Proporcionada */}
      <div className="mt-4">
        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-medium">
          <span>Progreso de Regularidad</span>
          <span>{percentage}%</span>
        </div>
        <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
```

### B. Distribución de Alumnos (Donut / Semáforo de Condiciones)
Para visualizar la proporción de alumnos Promovidos, Regulares y Libres:
```jsx
export function CondicionDistribution({ counts }) {
  const total = (counts.promovidos || 0) + (counts.regulares || 0) + (counts.libres || 0);
  
  const items = [
    { label: "Promovidos", count: counts.promovidos || 0, color: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
    { label: "Regulares", count: counts.regulares || 0, color: "bg-blue-500", text: "text-blue-600 dark:text-blue-400" },
    { label: "Libres", count: counts.libres || 0, color: "bg-rose-500", text: "text-rose-600 dark:text-rose-400" },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-2xl p-5 shadow-xs">
      <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
        Distribución de Condiciones RAM
      </h4>

      {/* Barra Segmentada Proporcional */}
      <div className="flex h-3 w-full rounded-full overflow-hidden gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 mb-4">
        {items.map(item => {
          const pct = total > 0 ? (item.count / total) * 100 : 0;
          if (pct === 0) return null;
          return (
            <div
              key={item.label}
              style={{ width: `${pct}%` }}
              className={`h-full rounded-full ${item.color} transition-all duration-300`}
              title={`${item.label}: ${item.count} (${pct.toFixed(1)}%)`}
            />
          );
        })}
      </div>

      {/* Leyenda y Conteo */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/60 dark:border-white/5 text-center">
        {items.map(item => (
          <div key={item.label} className="flex flex-col items-center">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">{item.label}</span>
            <span className={`text-base font-extrabold ${item.text}`}>{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### C. BarList (Lista de Calificaciones y Ránking)
Para comparar rendimiento por comisiones o trabajos prácticos:
```jsx
export function BarList({ data }) {
  const maxValue = Math.max(...data.map(d => d.value), 1);

  return (
    <div className="space-y-3">
      {data.map(item => (
        <div key={item.name} className="flex items-center justify-between text-xs">
          <div className="flex-1 mr-4">
            <div className="flex justify-between mb-1 font-semibold text-slate-700 dark:text-slate-300">
              <span>{item.name}</span>
              <span>{item.value}</span>
            </div>
            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${(item.value / maxValue) * 100}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

## 3. Principios de Diseño
1. **Formato Numérico Localizado**: Utilizar `Intl.NumberFormat('es-AR')` para formatear valores monetarios o calificaciones decimales.
2. **Jerarquía Clara**: El número principal (`metric`) debe ser siempre el elemento visual de mayor escala tipográfica (`text-3xl font-extrabold`).
