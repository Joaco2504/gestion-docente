import React, { useState } from 'react';
import { 
  MoreHorizontal, 
  Edit3, 
  ListChecks, 
  Trash2, 
  Calendar, 
  ExternalLink,
  Info
} from 'lucide-react';
import { formatFechaDMY } from '../../../lib/dateUtils';
import Tooltip from '../../common/Tooltip';
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator 
} from '../../common/DropdownMenu';

/**
 * Deriva un título ordinal corto ("TP 1", "Parcial 2", "Recup. 1", etc.)
 * para garantizar legibilidad en cabeceras compactas (≤ 56px de altura).
 */
export function getShortEvaluationTitle(titulo, tipo, fallbackIndex = 0) {
  if (!titulo) return `${tipo || 'Eval'} ${fallbackIndex + 1}`;
  const t = titulo.trim();

  // Trabajos Prácticos
  const tpMatch = t.match(/^(?:TP|Trabajo\s+Pr[aá]ctico)\s*(?:N[°o]?)?\s*(\d+)/i);
  if (tpMatch) return `TP ${tpMatch[1]}`;

  // Parciales ordinales
  if (/^(?:Primer|1[°o])\s+Parcial/i.test(t)) return 'Parcial 1';
  if (/^(?:Segundo|2[°o])\s+Parcial/i.test(t)) return 'Parcial 2';
  if (/^(?:Tercer|3[°o])\s+Parcial/i.test(t)) return 'Parcial 3';
  const parcialNum = t.match(/^Parcial\s*(\d+)/i);
  if (parcialNum) return `Parcial ${parcialNum[1]}`;

  // Recuperatorios
  const recupNum = t.match(/^Recup(?:eratorio)?\s*(?:de|del)?\s*(?:Parcial\s*)?(\d+)/i);
  if (recupNum) return `Recup. ${recupNum[1]}`;
  if (/^Recup(?:eratorio)?/i.test(t)) return 'Recup.';

  // Pruebas
  const pruebaNum = t.match(/^Prueba\s*(\d+)/i);
  if (pruebaNum) return `Prueba ${pruebaNum[1]}`;

  if (t.length <= 12) return t;
  return `${t.slice(0, 10)}…`;
}

/**
 * Cabecera compacta por columna de evaluación (≤ 56 px de altura).
 * Incluye nombre corto, fecha discreta, tooltip descriptivo y menú '⋯'.
 */
export default function GradesHeaderColumn({
  ev,
  index = 0,
  density = 'comfortable',
  onEdit,
  onBatchGrade,
  onDeleteRequest
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const shortTitle = getShortEvaluationTitle(ev.titulo, ev.tipo, index);
  const rawDate = ev.fecha_entrega || ev.fecha;
  const isCompact = density === 'compact';

  return (
    <th
      scope="col"
      className={`border-l border-surface-border text-center align-middle transition-colors bg-slate-50/90 dark:bg-slate-800/90 hover:bg-slate-100/90 dark:hover:bg-slate-800 ${
        isCompact 
          ? 'w-24 sm:w-28 min-w-[100px] max-w-[130px] px-2 py-1 h-[42px] max-h-[44px]' 
          : 'w-28 sm:w-32 min-w-[115px] max-w-[150px] px-2.5 py-1 h-[46px] max-h-[48px]'
      }`}
    >
      <div className="flex items-center justify-between gap-1 h-full max-h-[46px]">
        {/* Contenedor de Texto y Fecha (Truncado seguro) */}
        <div className="flex-1 min-w-0 text-left pr-1">
          {/* Línea 1: Nombre Corto con Tooltip de Título Completo */}
          <Tooltip content={`Título completo: "${ev.titulo}" (${ev.tipo})`}>
            <span className="block font-bold text-xs text-slate-800 dark:text-slate-100 truncate cursor-default select-none">
              {shortTitle}
            </span>
          </Tooltip>

          {/* Línea 2: Fecha o Invitación a Cargar */}
          <div className="mt-0.5 text-[10px] leading-tight truncate">
            {rawDate ? (
              <span 
                className="font-mono text-slate-500 dark:text-slate-400 font-medium"
                title={`Fecha: ${formatFechaDMY(rawDate)}`}
              >
                {formatFechaDMY(rawDate)}
              </span>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit && onEdit(ev);
                }}
                title="Sin fecha asignada. Haz clic para fijar fecha estipulada"
                className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer inline-flex items-center gap-0.5"
              >
                <span>+ Fecha</span>
              </button>
            )}
          </div>
        </div>

        {/* Menú Contextual '⋯' Accesible */}
        <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Acciones para ${ev.titulo}`}
              title="Opciones de la evaluación"
              className="p-1 touch-target-44 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors cursor-pointer shrink-0"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="truncate">
              {ev.titulo}
            </DropdownMenuLabel>
            
            <DropdownMenuItem onClick={() => onEdit && onEdit(ev)}>
              <Edit3 className="w-3.5 h-3.5 text-amber-500" />
              <span>Editar evaluación y fecha</span>
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => onBatchGrade && onBatchGrade(ev)}>
              <ListChecks className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Calificar curso completo</span>
            </DropdownMenuItem>

            {ev.archivo_url && (
              <DropdownMenuItem asChild>
                <a 
                  href={ev.archivo_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
                  <span>Consignas en Google Drive</span>
                </a>
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />

            <DropdownMenuItem 
              onClick={() => onDeleteRequest && onDeleteRequest(ev)}
              className="text-rose-600 dark:text-rose-400 focus:text-rose-700 dark:focus:text-rose-300 focus:bg-rose-50 dark:focus:bg-rose-950/40"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Eliminar evaluación...</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </th>
  );
}
