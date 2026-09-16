import React from 'react';
import { 
  Building2, 
  GraduationCap, 
  Hourglass, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  Target, 
  Globe, 
  BarChart3,
  Flag,
  Lock,
  Unlock
} from 'lucide-react';

/**
 * Formatea la lista de horarios semanales agrupando días con mismo horario y aula
 */
function formatSchedulesList(schedules) {
  if (!Array.isArray(schedules) || schedules.length === 0) return [];

  const groups = new Map();
  for (const item of schedules) {
    if (!item.dia) continue;
    const key = `${item.desde || ''}|${item.hasta || ''}|${item.aula || ''}`;
    if (!groups.has(key)) {
      groups.set(key, {
        dias: [],
        desde: item.desde,
        hasta: item.hasta,
        aula: item.aula
      });
    }
    groups.get(key).dias.push(item.dia);
  }

  const dayAbbr = {
    'Lunes': 'Lun',
    'Martes': 'Mar',
    'Miércoles': 'Mié',
    'Miercoles': 'Mié',
    'Jueves': 'Jue',
    'Viernes': 'Vie',
    'Sábado': 'Sáb',
    'Sabado': 'Sáb',
    'Domingo': 'Dom'
  };

  return Array.from(groups.values()).map(g => {
    const diasStr = g.dias.map(d => dayAbbr[d] || d).join(' y ');
    let timeStr = '';
    if (g.desde && g.hasta) {
      timeStr = `${g.desde} - ${g.hasta}`;
    } else if (g.desde) {
      timeStr = `desde ${g.desde}`;
    }
    const aulaStr = g.aula ? ` · ${g.aula}` : '';
    return `${diasStr} ${timeStr}${aulaStr}`.trim();
  });
}

/**
 * Normaliza la etiqueta visual del régimen / modalidad académica
 */
function formatModalidadLabel(mod) {
  if (!mod) return 'Anual';
  const upper = String(mod).toUpperCase().trim();
  if (upper === 'PRIMER_CUATRIMESTRE' || upper.includes('1°') || upper.includes('1ER')) return '1° Cuatrimestre';
  if (upper === 'SEGUNDO_CUATRIMESTRE' || upper.includes('2°') || upper.includes('2DO')) return '2° Cuatrimestre';
  if (upper === 'CUATRIMESTRAL') return 'Cuatrimestral';
  if (upper === 'BIMESTRAL') return 'Bimestral';
  if (upper === 'ANUAL') return 'Anual';
  return mod;
}

/**
 * CatedraHeader - Hero Bento Header unificado para la vista de Cátedra
 */
export default function CatedraHeader({
  catedra,
  criterios,
  activeCiclo,
  onOpenPortal,
  onOpenStats,
  cursadaFinalizada = false,
  fechaCierreCursada = null,
  onFinalizarCursada,
  onReabrirCursada
}) {
  const institucionNombre = 
    catedra?.instituciones?.nombre ?? 
    catedra?.institucion_nombre ?? 
    'Sin Institución';

  const isTerciario = (catedra?.nivel || '').toUpperCase() === 'TERCIARIO';
  const nivelLabel = isTerciario ? 'Terciario' : 'Secundario';

  const modalidadRaw = catedra?.modalidad || 'ANUAL';
  const modalidadLabel = formatModalidadLabel(modalidadRaw);
  const isCuatrimestral = modalidadLabel.toLowerCase().includes('cuatrimestre') || modalidadLabel.toLowerCase().includes('bimestral');

  const anioCiclo = 
    catedra?.ciclos_lectivos?.anio ?? 
    catedra?.ciclos_lectivos?.nombre ?? 
    activeCiclo?.anio ?? 
    '2026';

  const schedules = Array.isArray(catedra?.horarios_semanales) ? catedra.horarios_semanales : [];
  const schedulesList = formatSchedulesList(schedules);
  const isPortalActive = Boolean(catedra?.portal_activo);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-2xl p-6 shadow-sm mb-6 transition-all">
      {/* 1. FILA SUPERIOR: BADGES INSTITUCIONALES EN UNA SOLA LÍNEA HORIZONTAL */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 mb-4 text-xs font-semibold">
        {/* Institución */}
        <span 
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/10"
          title={`Institución: ${institucionNombre}`}
        >
          <Building2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
          <span>{institucionNombre}</span>
        </span>

        <span className="text-slate-300 dark:text-slate-700 select-none">·</span>

        {/* Nivel */}
        <span 
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${
            isTerciario
              ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20'
              : 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20'
          }`}
          title={`Nivel Educativo: ${nivelLabel}`}
        >
          <GraduationCap className="w-3.5 h-3.5 shrink-0" />
          <span>{nivelLabel}</span>
        </span>

        <span className="text-slate-300 dark:text-slate-700 select-none">·</span>

        {/* Modalidad / Régimen */}
        <span 
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${
            isCuatrimestral
              ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
              : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
          }`}
          title={`Régimen de Cursado: ${modalidadLabel}`}
        >
          <Hourglass className="w-3.5 h-3.5 shrink-0" />
          <span>{modalidadLabel}</span>
        </span>

        <span className="text-slate-300 dark:text-slate-700 select-none">·</span>

        {/* Ciclo */}
        <span 
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/10"
          title={`Ciclo Lectivo ${anioCiclo}`}
        >
          <Calendar className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
          <span>Ciclo {anioCiclo}</span>
        </span>

        {cursadaFinalizada && (
          <>
            <span className="text-slate-300 dark:text-slate-700 select-none">·</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/30">
              <Lock className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Cursado Cerrado</span>
            </span>
          </>
        )}
      </div>

      {/* 2. FILA CENTRAL: TÍTULO FLUIDO Y BOTONES DE ACCIÓN */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 py-1 border-b border-slate-100 dark:border-white/5 pb-5">
        {/* Título de cátedra fluido sin quiebres de palabra forzados */}
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white max-w-4xl break-normal leading-tight">
          {catedra?.nombre ?? 'Cátedra'}
        </h1>

        {/* Botones de Acción */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full lg:w-auto shrink-0">
          {/* Botón 1: Portal Estudiante */}
          <button
            type="button"
            onClick={onOpenPortal}
            className={`relative flex items-center justify-center gap-2 px-3.5 py-2 sm:py-2.5 rounded-xl border text-xs sm:text-sm font-semibold transition-all duration-150 active:scale-[0.98] cursor-pointer shadow-xs min-h-[42px] ${
              isPortalActive
                ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40'
                : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:border-slate-300 dark:hover:border-white/20'
            }`}
            title="Configurar y compartir el portal público de consulta para los alumnos"
          >
            <Globe className={`w-4 h-4 shrink-0 ${isPortalActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`} />
            <span className="truncate">Portal Estudiante</span>
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase transition-colors shrink-0 ${
              isPortalActive
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isPortalActive ? 'bg-white animate-pulse' : 'bg-slate-400 dark:bg-slate-500'}`} />
              <span>{isPortalActive ? 'ON' : 'OFF'}</span>
            </span>
          </button>

          {/* Botón 2: Estadísticas de Cátedra */}
          <button
            type="button"
            onClick={onOpenStats}
            className="flex items-center justify-center gap-2 px-3.5 py-2 sm:py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:text-primary hover:border-primary/40 hover:bg-primary/5 dark:hover:bg-primary/10 transition-all duration-150 active:scale-[0.98] text-xs sm:text-sm font-semibold shadow-xs cursor-pointer min-h-[42px]"
            title="Ver gráficos estadísticos y métricas analíticas"
          >
            <BarChart3 className="w-4 h-4 text-primary shrink-0" />
            <span className="truncate">Estadísticas</span>
          </button>

          {/* Botón 3: Estado de Cursado */}
          {!cursadaFinalizada ? (
            <button
              type="button"
              onClick={onFinalizarCursada}
              className="flex items-center justify-center gap-2 px-3.5 py-2 sm:py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition-all duration-150 active:scale-[0.98] text-xs sm:text-sm font-bold shadow-xs cursor-pointer min-h-[42px]"
              title="Finalizar cursado"
            >
              <Flag className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="truncate">Finalizar Cursado</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onReabrirCursada}
              className="group flex items-center justify-center gap-2 px-3.5 py-2 sm:py-2.5 rounded-xl border border-amber-500/40 bg-amber-500/15 text-amber-800 dark:text-amber-200 hover:bg-amber-500/25 transition-all duration-150 active:scale-[0.98] text-xs sm:text-sm font-bold shadow-xs cursor-pointer min-h-[42px]"
              title="Cursado cerrado. Clic para reabrir cursado"
            >
              <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 group-hover:hidden" />
              <Unlock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 hidden group-hover:inline-block" />
              <span className="truncate">Cursado Cerrado</span>
              <span className="text-[10px] font-normal text-amber-700 dark:text-amber-300 underline decoration-dotted ml-0.5">
                (Reabrir)
              </span>
            </button>
          )}
        </div>
      </div>

      {/* 3. FILA INFERIOR: CHIPS DE DATOS RÁPIDOS */}
      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 pt-4 text-xs font-medium">
        {/* Horarios */}
        {schedulesList.length > 0 ? (
          schedulesList.map((slotText, idx) => (
            <div 
              key={idx} 
              className="bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-200/60 dark:border-white/5 text-slate-700 dark:text-slate-300 flex items-center gap-2 shadow-2xs"
            >
              <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>{slotText}</span>
            </div>
          ))
        ) : (
          <div className="bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-200/60 dark:border-white/5 text-slate-500 dark:text-slate-400 flex items-center gap-2 shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Sin horarios configurados</span>
          </div>
        )}

        {/* Criterio RAM */}
        <div className="bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-200/60 dark:border-white/5 text-slate-700 dark:text-slate-300 flex items-center gap-2 shadow-2xs">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span>
            Mín. <b>{criterios?.min_asist_reg ?? 70}%</b> Reg. / <b>{criterios?.min_asist_promo ?? 80}%</b> Promo
          </span>
        </div>

        {/* Nota de Aprobación */}
        <div className="bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-200/60 dark:border-white/5 text-slate-700 dark:text-slate-300 flex items-center gap-2 shadow-2xs">
          <Target className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span>
            Aprobación: <b>{criterios?.nota_min_reg ?? 4}+</b> / 10
          </span>
        </div>
      </div>
    </div>
  );
}
