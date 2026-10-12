import React from 'react';
import { 
  Users, 
  Award, 
  BarChart3, 
  CheckCircle2, 
  FileSpreadsheet,
  TrendingUp,
  GraduationCap
} from 'lucide-react';

/**
 * GradesStatsHeader
 * Métricas grupales reactivas en formato Bento Grid para la sábana de notas.
 */
export default function GradesStatsHeader({ overallStats }) {
  const {
    totalAlumnos = 0,
    conNotas = 0,
    promedioGeneral = '—',
    tasaAprobacion = 0,
    totalEvaluaciones = 0
  } = overallStats || {};

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {/* 1. Alumnos Calificados */}
      <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 backdrop-blur-md shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
            Calificados
          </span>
          <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
            <Users className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <strong className="text-2xl font-black font-mono text-text-primary">
            {conNotas}
          </strong>
          <span className="text-xs text-text-muted font-medium">
            de {totalAlumnos} alumnos
          </span>
        </div>
        <div className="text-[10px] text-text-muted mt-1">
          {totalAlumnos > 0 ? Math.round((conNotas / totalAlumnos) * 100) : 0}% de cobertura
        </div>
      </div>

      {/* 2. Promedio General de la Cátedra */}
      <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 backdrop-blur-md shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
            Promedio General
          </span>
          <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <Award className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <strong className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            {promedioGeneral}
          </strong>
          <span className="text-xs text-text-muted font-medium">
            / 10 pts
          </span>
        </div>
        <div className="text-[10px] text-text-muted mt-1 flex items-center gap-1">
          <TrendingUp className="w-3 h-3 text-emerald-500" />
          <span>Rendimiento global</span>
        </div>
      </div>

      {/* 3. Tasa de Aprobación */}
      <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 backdrop-blur-md shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
            Aprobación
          </span>
          <div className="w-7 h-7 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <strong className="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400">
            {tasaAprobacion}%
          </strong>
          <span className="text-xs text-text-muted font-medium">
            regular / promo
          </span>
        </div>
        <div className="text-[10px] text-text-muted mt-1">
          Criterio RAM Catamarca
        </div>
      </div>

      {/* 4. Evaluaciones Activas */}
      <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 backdrop-blur-md shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
            Evaluaciones
          </span>
          <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
            <FileSpreadsheet className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <strong className="text-2xl font-black font-mono text-text-primary">
            {totalEvaluaciones}
          </strong>
          <span className="text-xs text-text-muted font-medium">
            instancias
          </span>
        </div>
        <div className="text-[10px] text-text-muted mt-1 flex items-center gap-1">
          <GraduationCap className="w-3 h-3 text-primary" />
          <span>Parciales y TP reglamentarios</span>
        </div>
      </div>
    </div>
  );
}
