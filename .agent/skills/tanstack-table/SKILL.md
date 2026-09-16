---
name: tanstack-table
description: TanStack Table (React Table v8) expert guidance — headless table architecture, column definitions, sorting, filtering, pagination, sticky columns, row selection, virtualization, and accessible high-density data grids with Tailwind CSS. Use when building complex tables for grades, attendance, rosters, or data dashboards.
metadata:
  repo: https://github.com/TanStack/table
  docs: https://tanstack.com/table/latest
triggers:
  - tanstack-table
  - react-table
  - tabla
  - tablas
  - planilla
  - grid
  - data table
---

# TanStack Table (React Table v8) Master Guide

Guía experta de **TanStack Table** para React en entornos Tailwind CSS y planillas densas de datos.

## 1. Instalación
```bash
npm install @tanstack/react-table
```

## 2. Concepto Clave: Arquitectura Headless
TanStack Table provee **únicamente la lógica de estado y cálculo** (ordenamiento, filtrado, paginación, selección, agrupamiento). No inyecta ningún elemento HTML ni CSS predeterminado, permitiendo un control total del marcado con Tailwind CSS.

## 3. Patrón de Implementación Estándar
```jsx
import React, { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper
} from '@tanstack/react-table';
import { ArrowUpDown, ChevronDown, ChevronUp } from 'lucide-react';

const columnHelper = createColumnHelper();

export function EstudiantesTable({ data }) {
  const [sorting, setSorting] = useState([]);
  const [globalFilter, setGlobalFilter] = useState('');

  // 1. Definición de Columnas (Siempre memoizadas)
  const columns = useMemo(() => [
    columnHelper.accessor('dni', {
      header: 'DNI',
      cell: info => <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">{info.getValue()}</span>,
    }),
    columnHelper.accessor('apellido', {
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 font-bold"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Apellido
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
        </button>
      ),
      cell: info => <span className="font-semibold text-slate-900 dark:text-white">{info.getValue()}</span>,
    }),
    columnHelper.accessor('nombre', {
      header: 'Nombre',
      cell: info => info.getValue(),
    }),
    columnHelper.accessor('condicion', {
      header: 'Condición',
      cell: info => {
        const val = info.getValue();
        const colors = {
          PROMOVIDO: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40',
          REGULAR: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/40',
          LIBRE: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/40',
        };
        return (
          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${colors[val] || 'bg-slate-100 text-slate-700'}`}>
            {val}
          </span>
        );
      },
    }),
  ], []);

  // 2. Instanciación de la tabla
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="space-y-4">
      {/* Buscador global */}
      <input
        type="text"
        value={globalFilter ?? ''}
        onChange={e => setGlobalFilter(e.target.value)}
        placeholder="Buscar estudiante..."
        className="px-3.5 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-xl"
      />

      {/* Contenedor Responsivo con Primera Columna Fija */}
      <div className="overflow-x-auto select-none touch-pan-x rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs">
        <table className="w-full text-left border-collapse">
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id} className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-white/10">
                {headerGroup.headers.map((header, idx) => (
                  <th
                    key={header.id}
                    className={`py-3 px-4 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider ${
                      idx === 0 ? 'sticky left-0 bg-slate-50 dark:bg-slate-800 z-10 shadow-sm' : ''
                    }`}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-200/60 dark:divide-white/5 text-sm">
            {table.getRowModel().rows.map(row => (
              <tr key={row.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                {row.getVisibleCells().map((cell, idx) => (
                  <td
                    key={cell.id}
                    className={`py-3 px-4 ${
                      idx === 0 ? 'sticky left-0 bg-white dark:bg-slate-900 z-10 shadow-sm' : ''
                    }`}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

## 4. Reglas de Oro de Rendimiento
1. **Memoizar Siempre**: Tanto `columns` como `data` deben estar envueltos en `useMemo` para evitar re-cálculos de filtros y ordenamiento en cada re-render.
2. **Virtualización para Listas Masivas**: Para cursos o nóminas de más de 200 filas, integrar `@tanstack/react-virtual` junto a TanStack Table.
