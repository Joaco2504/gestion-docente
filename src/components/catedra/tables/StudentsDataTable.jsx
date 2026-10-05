import React, { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender
} from '@tanstack/react-table';
import {
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { getStudentColumns } from './studentColumns';

/**
 * StudentsDataTable - Tabla headless accesible de alta densidad construida con @tanstack/react-table.
 * Cumple con WCAG AA, primera columna fija (sticky DNI), ordenamiento con aria-sort y paginación.
 */
export default function StudentsDataTable({
  data = [],
  isEquivalencias = false,
  getStudentCondition,
  studentRiskMap,
  getCondBadgeVariant,
  onOpenStudentDetail,
  onOpenEdit,
  onOpenDelete,
  onOpenDeclararEquivalencia,
  onToggleCertificadoTrabajo,
  onRevertirEquivalencia,
  defaultPageSize = 25
}) {
  const [sorting, setSorting] = useState([{ id: 'apellido', desc: false }]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: defaultPageSize });

  // 1. Columnas Memoizadas según vista
  const columns = useMemo(() => {
    return getStudentColumns({
      isEquivalencias,
      getStudentCondition,
      studentRiskMap,
      getCondBadgeVariant,
      onOpenStudentDetail,
      onOpenEdit,
      onOpenDelete,
      onOpenDeclararEquivalencia,
      onToggleCertificadoTrabajo,
      onRevertirEquivalencia
    });
  }, [
    isEquivalencias,
    getStudentCondition,
    studentRiskMap,
    getCondBadgeVariant,
    onOpenStudentDetail,
    onOpenEdit,
    onOpenDelete,
    onOpenDeclararEquivalencia,
    onToggleCertificadoTrabajo,
    onRevertirEquivalencia
  ]);

  // 2. Instanciación Headless con TanStack Table
  const table = useReactTable({
    data,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  });

  const pageCount = table.getPageCount();
  const currentRowsCount = table.getRowModel().rows.length;
  const totalRowsCount = data.length;

  return (
    <div className="space-y-3">
      {/* Contenedor de Tabla con Scroll Horizontal y Headers Sticky */}
      <div className="overflow-x-auto overscroll-x-contain select-none" style={{ touchAction: 'pan-x pan-y' }}>
        <table
          className="w-full text-left text-xs sm:text-sm border-collapse"
          aria-label={isEquivalencias ? "Alumnos Acreditados por Equivalencia" : "Nómina Oficial de Estudiantes"}
        >
          <caption className="sr-only">
            {isEquivalencias ? "Nómina de alumnos eximidos por equivalencia reglamentaria" : "Nómina oficial de estudiantes inscriptos en la cátedra"}
          </caption>
          <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/90 backdrop-blur z-20 text-text-secondary font-semibold border-b border-surface-border">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header, idx) => {
                  const isSortable = header.column.getCanSort();
                  const sortState = header.column.getIsSorted();
                  const isStickyCol = idx === 0;

                  return (
                    <th
                      key={header.id}
                      scope="col"
                      aria-sort={sortState === 'asc' ? 'ascending' : sortState === 'desc' ? 'descending' : isSortable ? 'none' : undefined}
                      className={`px-4 py-3 min-h-[44px] font-bold text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-300 ${
                        isStickyCol ? 'sticky left-0 bg-slate-50 dark:bg-slate-800 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]' : ''
                      }`}
                    >
                      {header.isPlaceholder ? null : isSortable ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="w-full flex items-center justify-between gap-1.5 hover:text-emerald-600 dark:hover:text-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 transition-colors cursor-pointer group"
                          title={`Ordenar por ${header.column.id}`}
                        >
                          <span className="truncate">{flexRender(header.column.columnDef.header, header.getContext())}</span>
                          <span className="shrink-0">
                            {sortState === 'asc' ? (
                              <ChevronUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                            ) : sortState === 'desc' ? (
                              <ChevronDown className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-slate-400 dark:text-slate-500 opacity-60 group-hover:opacity-100" aria-hidden="true" />
                            )}
                          </span>
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-surface-border">
            {currentRowsCount === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-xs text-text-muted">
                  No se encontraron estudiantes para los criterios seleccionados.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map(row => (
                <tr key={row.id} className="hover:bg-surface-hover/40 transition-colors group">
                  {row.getVisibleCells().map((cell, idx) => {
                    const isStickyCol = idx === 0;
                    return (
                      <td
                        key={cell.id}
                        scope={isStickyCol ? "row" : undefined}
                        className={`px-4 py-3.5 whitespace-nowrap ${
                          isStickyCol ? 'sticky left-0 bg-surface group-hover:bg-surface-hover/80 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]' : ''
                        }`}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 3. Barra de Paginación Accesible */}
      {totalRowsCount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-surface-border bg-surface/50 text-xs">
          <div className="text-text-secondary">
            Mostrando <strong className="font-mono text-text-primary">{table.getState().pagination.pageIndex * table.getState().pagination.pageSize + (currentRowsCount > 0 ? 1 : 0)}</strong> a{' '}
            <strong className="font-mono text-text-primary">
              {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, totalRowsCount)}
            </strong> de <strong className="font-mono text-text-primary">{totalRowsCount}</strong> estudiantes
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-text-muted">Filas:</span>
              <select
                value={table.getState().pagination.pageSize}
                onChange={e => table.setPageSize(Number(e.target.value))}
                aria-label="Registros por página"
                className="bg-surface border border-surface-border text-text-primary rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                {[15, 25, 50, 100].map(size => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
                className="p-1.5 rounded-lg border border-surface-border bg-surface hover:bg-surface-hover disabled:opacity-40 disabled:pointer-events-none text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                title="Primera página"
                aria-label="Primera página"
              >
                <ChevronsLeft className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="p-1.5 rounded-lg border border-surface-border bg-surface hover:bg-surface-hover disabled:opacity-40 disabled:pointer-events-none text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                title="Página anterior"
                aria-label="Página anterior"
              >
                <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
              <span className="px-2 text-text-secondary">
                Pág. <strong className="text-text-primary font-mono">{table.getState().pagination.pageIndex + 1}</strong> de{' '}
                <strong className="text-text-primary font-mono">{Math.max(1, pageCount)}</strong>
              </span>
              <button
                type="button"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="p-1.5 rounded-lg border border-surface-border bg-surface hover:bg-surface-hover disabled:opacity-40 disabled:pointer-events-none text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                title="Página siguiente"
                aria-label="Página siguiente"
              >
                <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => table.setPageIndex(pageCount - 1)}
                disabled={!table.getCanNextPage()}
                className="p-1.5 rounded-lg border border-surface-border bg-surface hover:bg-surface-hover disabled:opacity-40 disabled:pointer-events-none text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                title="Última página"
                aria-label="Última página"
              >
                <ChevronsRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
