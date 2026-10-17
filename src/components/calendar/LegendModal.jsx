import React from 'react';
import { 
  GraduationCap, 
  BookOpen, 
  CheckSquare, 
  Bookmark, 
  CalendarRange,
  ShieldAlert,
  CheckCircle2
} from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { DEFAULT_CURATED_COLORS, DEFAULT_MESA_COLOR } from '../../lib/colorTokens';

export default function LegendModal({
  isOpen,
  onClose,
  catedras
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Leyenda y Código de Colores"
      subtitle="Convención de colores, cátedras, licencias y mesas de examen"
    >
      <div className="space-y-4 text-xs">
        {/* Cátedras */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-white/5 space-y-2">
          <span className="text-[11px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider block">
            Cátedras Activas (Colores Heredados)
          </span>
          <div className="space-y-2">
            {(catedras || []).map(cat => (
              <div key={cat.id} className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-white/5">
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-4 h-4 rounded-full shrink-0 ring-2 ring-black/10 dark:ring-white/20 shadow-xs"
                    style={{ backgroundColor: cat.color || DEFAULT_CURATED_COLORS[0].value }}
                  />
                  <span className="font-bold text-slate-800 dark:text-slate-100">
                    {cat.nombre}
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-text-muted">
                  {cat.modalidad || 'Cursada'}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-text-muted pt-1">
            💡 Todas las clases, parciales y entregas de una cátedra heredan su color identificador.
          </p>
        </div>

        {/* Licencias Docentes */}
        <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/30 rounded-2xl border-2 border-dashed border-amber-400 dark:border-amber-500/50 space-y-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <h4 className="font-bold text-amber-950 dark:text-amber-100 text-sm">
                🛡️ Licencias Docentes (Decreto Acuerdo 1092)
              </h4>
              <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
                Color ámbar distintivo reservado • Días excluidos del cómputo de asistencia
              </p>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-200 dark:border-amber-800/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="w-4 h-4 rounded-md shrink-0 border border-amber-500 shadow-xs"
                style={{ backgroundColor: '#F59E0B' }}
              />
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Ámbar Oficial de Licencias
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400">
              #F59E0B
            </span>
          </div>
          <p className="text-[11px] text-amber-900/80 dark:text-amber-200/80 leading-relaxed">
            Las jornadas cubiertas por una licencia docente (médica, duelo, matrimonio, examen, razones particulares, etc.) no descuentan porcentaje de asistencia a los estudiantes.
          </p>
        </div>

        {/* Mesas de Examen */}
        <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-2xl border-2 border-dashed border-indigo-400 space-y-2">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <div>
              <h4 className="font-bold text-indigo-950 dark:text-indigo-100 text-sm">
                Mesas de Examen Final
              </h4>
              <p className="text-[11px] text-indigo-800/80 dark:text-indigo-300/80">
                Doble distinción: color propio reservado + indicador de su cátedra
              </p>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="w-4 h-4 rounded-md shrink-0 border border-dashed border-indigo-500 shadow-xs text-white"
                style={{ backgroundColor: DEFAULT_MESA_COLOR, color: '#FFFFFF' }}
              />
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Color Reservado de Mesas
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
              #4338CA
            </span>
          </div>
          <p className="text-[11px] text-indigo-900/80 dark:text-indigo-200/80 leading-relaxed">
            Las mesas nunca se confunden con una cátedra. Tienen borde punteado, ícono de graduación y un punto indicador del color de su cátedra de origen.
          </p>
        </div>

        {/* Tipos de Eventos */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-white/5 space-y-2">
          <span className="text-[11px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider block">
            Tipos de Eventos e Íconos
          </span>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-white/5">
              <BookOpen className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="font-medium text-slate-700 dark:text-slate-200">Clase Regular</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-white/5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="font-medium text-slate-700 dark:text-slate-200">✓ Asistencia Tomada</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-white/5">
              <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="font-medium text-slate-700 dark:text-slate-200">🛡️ Licencia Docente</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-white/5">
              <CheckSquare className="w-4 h-4 text-blue-500 shrink-0" />
              <span className="font-medium text-slate-700 dark:text-slate-200">Evaluación / Parcial</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-white/5">
              <Bookmark className="w-4 h-4 text-violet-500 shrink-0" />
              <span className="font-medium text-slate-700 dark:text-slate-200">Entrega de TP</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-white/5">
              <CalendarRange className="w-4 h-4 text-teal-500 shrink-0" />
              <span className="font-medium text-slate-700 dark:text-slate-200">Período Académico</span>
            </div>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <Button
            variant="secondary"
            onClick={onClose}
          >
            Entendido
          </Button>
        </div>
      </div>
    </Modal>
  );
}
