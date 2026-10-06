import React from 'react';
import EmptyState from './EmptyState';
import { SkeletonTable } from './SkeletonLoader';

/**
 * DataTable - Primitiva unificada para todas las tablas de Korum.
 * Implementa de forma centralizada:
 * - Regla compartida de tabla (table-layout: auto, min-w-0, badges sin corte).
 * - Envoltorio responsivo universal sin secuestro de scroll vertical (touch-action: pan-x pan-y).
 * - Soporte para columnas fijas (stickyFirstCol / stickyLastCol) con pista de sombra.
 * - Modos de densidad: 'comfortable' vs 'compact'.
 * - Integración nativa de estados de carga (Skeleton) y vacío (EmptyState).
 * - Paginador / barra de herramientas inferior opcional.
 */
export default function DataTable({
  children,
  data = null,
  columns = null,
  renderRow = null,
  loading = false,
  emptyTitle = 'No hay datos registrados',
  emptyDescription = '',
  emptyAction = null,
  emptyIllustration = 'folder',
  density = 'comfortable', // 'comfortable' | 'compact'
  stickyHeader = true,
  stickyFirstCol = false,
  stickyLastCol = false,
  caption,
  footer,
  className = '',
  tableClassName = '',
  ...props
}) {
  const densityCellPadding = density === 'compact'
    ? 'py-2 px-2.5 sm:px-3 text-xs'
    : 'py-3 px-3 sm:px-4 text-xs sm:text-sm';

  const densityHeaderPadding = density === 'compact'
    ? 'py-2 px-2.5 sm:px-3 text-[10px]'
    : 'py-2.5 px-3 sm:px-4 text-xs';

  // 1. Estado de Carga
  if (loading) {
    return (
      <div className={`tbl-wrap bg-surface ${className}`}>
        <div className="p-4 sm:p-6">
          <SkeletonTable rows={5} cols={columns ? columns.length : 4} />
        </div>
      </div>
    );
  }

  // 2. Estado Vacío (solo si se pasa array de datos explícito y está vacío)
  if (Array.isArray(data) && data.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        illustration={emptyIllustration}
        action={emptyAction}
        className={className}
      />
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Contenedor con Scroll Horizontal no bloqueante */}
      <div className="tbl-wrap bg-surface shadow-xs" style={{ touchAction: 'pan-x pan-y' }}>
        <table
          className={`tbl tbl-auto ${tableClassName}`}
          {...props}
        >
          {caption && <caption className="sr-only">{caption}</caption>}

          {/* Modo Declarativo: si se especifican columnas y renderRow */}
          {columns && Array.isArray(data) ? (
            <>
              <thead className={stickyHeader ? 'sticky top-0 z-20' : ''}>
                <tr>
                  {columns.map((col, idx) => {
                    const isFirst = idx === 0 && stickyFirstCol;
                    const isLast = idx === columns.length - 1 && stickyLastCol;
                    const stickyCls = isFirst ? 'sticky-col z-30' : isLast ? 'sticky-col-right z-30' : '';
                    const alignCls = col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left';

                    return (
                      <th
                        key={col.key || col.id || idx}
                        style={{ width: col.width }}
                        className={`${densityHeaderPadding} ${stickyCls} ${alignCls} ${col.headerClassName || ''}`}
                      >
                        {col.label || col.header}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {data.map((row, rowIdx) => (
                  <tr
                    key={row.id || rowIdx}
                    className="hover:bg-surface-hover/60 transition-colors duration-100"
                  >
                    {renderRow ? (
                      renderRow(row, rowIdx, { densityCellPadding, stickyFirstCol, stickyLastCol })
                    ) : (
                      columns.map((col, colIdx) => {
                        const isFirst = colIdx === 0 && stickyFirstCol;
                        const isLast = colIdx === columns.length - 1 && stickyLastCol;
                        const stickyCls = isFirst ? 'sticky-col' : isLast ? 'sticky-col-right' : '';
                        const alignCls = col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left';
                        const val = col.render ? col.render(row[col.key], row, rowIdx) : row[col.key];

                        return (
                          <td
                            key={col.key || colIdx}
                            className={`${densityCellPadding} ${stickyCls} ${alignCls} ${col.cellClassName || ''}`}
                          >
                            {val}
                          </td>
                        );
                      })
                    )}
                  </tr>
                ))}
              </tbody>
            </>
          ) : (
            // Modo Flexible / Children
            children
          )}
        </table>
      </div>

      {/* Paginador o Barra Inferior */}
      {footer && (
        <div className="flex items-center justify-between text-xs text-text-muted px-2 py-1">
          {footer}
        </div>
      )}
    </div>
  );
}
