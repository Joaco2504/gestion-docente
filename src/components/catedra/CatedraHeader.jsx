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
      {/* Banner de Cursado Cerrado si aplica */}
      {cursadaFinalizada && (
        <div className="mb-4 p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-primary/5 to-emerald-500/10 border border-amber-500/30 flex items-center justify-between gap-3 flex-wrap animate-fadeIn">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-bold text-xs sm:text-sm">
            <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>🔒 Cursado Cerrado — Instancia de Examen / Acreditación</span>
          </div>
          <span className="text-[11px] text-text-muted font-medium">
            Toma de asistencia y notas regulares bloqueadas. Instancia de acreditación y mesas de examen activa.
          </span>
        </div>
      )}

      {/* 1. FILA SUPERIOR: CONTEXTO INSTITUCIONAL (Badges en una sola línea horizontal) */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {/* Institución: Badge neutro con icono */}
        <span 
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/10"
          title={`Institución: ${institucionNombre}`}
        >
          <Building2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
          <span>{institucionNombre}</span>
        </span>

        {/* Nivel: Píldora violeta/azul suave */}
        <span 
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
            isTerciario
              ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20'
              : 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20'
          }`}
          title={`Nivel Educativo: ${nivelLabel}`}
        >
          <GraduationCap className="w-3.5 h-3.5 shrink-0" />
          <span>{nivelLabel}</span>
        </span>

        {/* Régimen / Modalidad: Píldora ámbar/esmeralda */}
        <span 
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
            isCuatrimestral
              ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
              : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
          }`}
          title={`Régimen de Cursado: ${modalidadLabel}`}
        >
          <Hourglass className="w-3.5 h-3.5 shrink-0" />
          <span>{modalidadLabel}</span>
        </span>

        {/* Ciclo Lectivo */}
        <span 
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/10"
          title={`Ciclo Lectivo ${anioCiclo}`}
        >
          <Calendar className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
          <span>Ciclo Lectivo {anioCiclo}</span>
        </span>

        {/* Badge Cursado Finalizado en la fila de badges */}
        {cursadaFinalizada && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
            <Lock className="w-3.5 h-3.5" />
            <span>Cursado Cerrado</span>
          </span>
        )}
      </div>

      {/* 2. FILA CENTRAL: TÍTULO Y ACCIONES PRINCIPALES */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 py-1 border-b border-slate-100 dark:border-white/5 pb-5">
        {/* Título de Cátedra sin quiebres forzados */}
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-white leading-snug max-w-3xl">
          {catedra?.nombre ?? 'Cátedra'}
        </h1>

        {/* Botones de Acción (agrupados a la derecha en desktop, 2 columnas o wrap en mobile) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full mt-2 lg:mt-0 lg:flex lg:items-center lg:gap-2.5 lg:w-auto shrink-0">
          {/* Botón Cierre / Reapertura de Cursado */}
          {!cursadaFinalizada ? (
            <button
              type="button"
              onClick={onFinalizarCursada}
              className="flex items-center justify-center gap-2 px-3.5 py-2 sm:py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition-all duration-150 active:scale-[0.98] text-xs sm:text-sm font-bold shadow-xs cursor-pointer min-h-[42px]"
              title="Finalizar cursada: cierra asistencias y notas regulares y abre instancia de mesas de examen"
            >
              <Flag className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="truncate">Finalizar Cursado</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onReabrirCursada}
              className="flex items-center justify-center gap-2 px-3.5 py-2 sm:py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-primary hover:border-primary/40 transition-all duration-150 active:scale-[0.98] text-xs sm:text-sm font-semibold shadow-xs cursor-pointer min-h-[42px]"
              title="Reabrir cursado para realizar modificaciones"
            >
              <Unlock className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
              <span className="truncate">Reabrir Cursado</span>
            </button>
          )}

          {/* Botón 1: Portal Estudiante con switch / indicador activo */}
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
            title="Ver gráficos estadísticos y distribución de rendimiento de los alumnos"
          >
            <BarChart3 className="w-4 h-4 text-primary shrink-0" />
            <span className="truncate">Estadísticas</span>
          </button>
        </div>
      </div>

      {/* 3. FILA INFERIOR: CÁPSULAS DE REGLAS ACADÉMICAS Y HORARIOS (Metadatos rápidos) */}
      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 pt-4 text-xs">
        {/* Horarios semanales */}
        {schedulesList.length > 0 ? (
          schedulesList.map((slotText, idx) => (
            <div 
              key={idx} 
              className="bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-200/60 dark:border-white/5 font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2 shadow-2xs"
            >
              <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>{slotText}</span>
            </div>
          ))
        ) : (
          <div className="bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-200/60 dark:border-white/5 font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2 shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Sin horarios configurados</span>
          </div>
        )}

        {/* Criterio RAM */}
        <div className="bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-200/60 dark:border-white/5 font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2 shadow-2xs">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span>
            Asist: Mín <b>{criterios?.min_asist_reg ?? 70}%</b> Reg. / <b>{criterios?.min_asist_promo ?? 80}%</b> Promo
          </span>
        </div>

        {/* Nota de Aprobación */}
        <div className="bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-200/60 dark:border-white/5 font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2 shadow-2xs">
          <Target className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span>
            Aprobación: Nota <b>{criterios?.nota_min_reg ?? 4}+</b> / 10
          </span>
        </div>
      </div>
    </div>
  );
}
