import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * SectionHeader - Primitiva unificada para encabezados de sección y vistas de Korum.
 * Unifica la jerarquía visual eliminando encabezados ad-hoc y garantizando:
 * - Acción primaria destacada.
 * - Jerarquía tipográfica fluida y legible.
 * - Iconografía de contexto en contenedor con tokens oficiales.
 * - Navegación de retorno accesible (retroceso / migas de pan).
 * - Zona de acciones y filtros responsiva sin desbordes.
 */
export default function SectionHeader({
  title,
  subtitle,
  icon: Icon,
  badge,
  backAction,
  actions,
  search,
  titleAs: TitleHeading = 'h1',
  className = ''
}) {
  return (
    <div className={`space-y-3.5 mb-5 sm:mb-6 ${className}`}>
      {/* Fila Principal: Título + Acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        {/* Lado Izquierdo: Retorno + Icono + Título/Subtítulo */}
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          {backAction && (
            backAction.href ? (
              <Link
                to={backAction.href}
                className="p-2 -ml-1 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors touch-target-44 min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0 cursor-pointer"
                title={backAction.label || 'Volver'}
                aria-label={backAction.label || 'Volver'}
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={backAction.onClick}
                className="p-2 -ml-1 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors touch-target-44 min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0 cursor-pointer"
                title={backAction.label || 'Volver'}
                aria-label={backAction.label || 'Volver'}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )
          )}

          {Icon && (
            <div className="p-2 sm:p-2.5 rounded-2xl bg-primary/10 text-primary dark:bg-primary/20 shrink-0 flex items-center justify-center">
              {React.isValidElement(Icon) ? Icon : <Icon className="w-5 h-5" />}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <TitleHeading className="text-lg sm:text-xl md:text-2xl font-bold text-text-primary tracking-tight truncate">
                {title}
              </TitleHeading>
              {badge && <div className="shrink-0">{badge}</div>}
            </div>

            {subtitle && (
              <p className="text-xs sm:text-sm text-text-muted mt-0.5 leading-snug line-clamp-2">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Lado Derecho: Acciones de cabecera */}
        {actions && (
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0 self-end sm:self-center">
            {actions}
          </div>
        )}
      </div>

      {/* Fila Secundaria opcional: Búsqueda y Filtros */}
      {search && (
        <div className="pt-1">
          {search}
        </div>
      )}
    </div>
  );
}
