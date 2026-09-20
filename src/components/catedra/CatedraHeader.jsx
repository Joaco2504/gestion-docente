import React, { useState } from 'react';
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
  Unlock,
  Pencil,
  ChevronDown,
  ChevronUp,
  Settings,
  SlidersHorizontal,
  Layers
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
    return {
      text: `${diasStr} ${timeStr}${aulaStr}`.trim(),
      dias: diasStr,
      time: timeStr,
      aula: g.aula || 'Sin aula asignada'
    };
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
 * Mini medidor circular SVG para micro-KPIs
 */
function MiniCircularGauge({ percentage, size = 42, strokeWidth = 4, color = "stroke-emerald-500", label }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const safePercentage = Math.min(100, Math.max(0, percentage));
  const strokeDashoffset = circumference - (safePercentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-slate-200 dark:stroke-slate-700/80 fill-none"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className={`${color} fill-none transition-all duration-700 ease-out`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>
      {label && (
        <span className="absolute text-[10px] font-extrabold text-slate-700 dark:text-slate-200 select-none">
          {label}
        </span>
      )}
    </div>
  );
}

/**
 * CatedraHeader - Bento Hero Card Principal ("Cátedra Dashboard")
 */
export default function CatedraHeader({
  catedra,
  criterios,
  activeCiclo,
  onOpenPortal,
  onOpenStats,
  onEditCatedra,
  cursadaFinalizada = false,
  fechaCierreCursada = null,
  onFinalizarCursada,
  onReabrirCursada,
  onNavigateToConfig
}) {
  const [isScheduleExpanded, setIsScheduleExpanded] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);

  const institucionNombre = 
    catedra?.instituciones?.nombre ?? 
    catedra?.institucion_nombre ?? 
    'Sin Institución';

  const isTerciario = (catedra?.nivel || '').toUpperCase() === 'TERCIARIO';
  const nivelLabel = isTerciario ? 'Terciario' : 'Secundario';

  const modalidadRaw = catedra?.modalidad || 'ANUAL';
  const modalidadLabel = formatModalidadLabel(modalidadRaw);

  const anioCiclo = 
    catedra?.ciclos_lectivos?.anio ?? 
    catedra?.ciclos_lectivos?.nombre ?? 
    activeCiclo?.anio ?? 
    '2026';

  const schedules = Array.isArray(catedra?.horarios_semanales) ? catedra.horarios_semanales : [];
  const schedulesList = formatSchedulesList(schedules);
  const isPortalActive = Boolean(catedra?.portal_activo);

  const minAsistReg = Number(criterios?.min_asist_reg) || 70;
  const minAsistPromo = Number(criterios?.min_asist_promo) || 80;
  const notaMinReg = Number(criterios?.nota_min_reg) || 4;

  return (
    <div className="relative w-full bg-white dark:bg-[#0F172A] border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 sm:p-7 shadow-sm mb-6 transition-all overflow-visible">
      {/* Luz ambiental sutil Korum (decoración superior) */}
      <div className="absolute top-0 right-1/4 w-96 h-28 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================= */}
        {/* BLOQUE IZQUIERDO: TÍTULO, IDENTIDAD Y MICRO-KPIS (lg:col-span-7) */}
        {/* ========================================================= */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-5">
          {/* Eyebrow & Badges de contexto */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-[10px] sm:text-xs uppercase font-bold tracking-widest text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Cátedra Dashboard
              </span>

              {cursadaFinalizada && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                  <Lock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  Cursado Cerrado
                </span>
              )}
            </div>

            {/* Nombre de la materia principal */}
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
              {catedra?.nombre ?? 'Cátedra'}
            </h1>

            {/* Meta-datos institucionales en texto compacto */}
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 flex flex-wrap items-center gap-1.5">
              <span>{institucionNombre}</span>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span>{nivelLabel}</span>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span>{modalidadLabel}</span>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span>Ciclo {anioCiclo}</span>
            </p>
          </div>

          {/* Micro-KPIs incrustados Bento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* KPI 1: Asistencia RAM */}
            <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/80 shadow-2xs">
              <MiniCircularGauge
                percentage={minAsistReg}
                size={44}
                strokeWidth={4.5}
                color="stroke-emerald-500"
                label={`${minAsistReg}%`}
              />
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
                  Asistencia RAM
                </p>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                  {minAsistReg}% Reg. · {minAsistPromo}% Promo
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  Exigencia institucional
                </p>
              </div>
            </div>

            {/* KPI 2: Aprobación de Parciales */}
            <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/80 shadow-2xs">
              <MiniCircularGauge
                percentage={(notaMinReg / 10) * 100}
                size={44}
                strokeWidth={4.5}
                color="stroke-amber-500"
                label={`${notaMinReg}+`}
              />
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
                  Aprobación RAM
                </p>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                  Mínimo {notaMinReg} / 10
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  Escala de acreditación
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* BLOQUE DERECHO: HORARIOS, PORTAL Y ACCIONES (lg:col-span-5) */}
        {/* ========================================================= */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
          {/* Card colapsable: Aula / Horarios */}
          <div className="bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 rounded-2xl p-3.5 transition-all shadow-2xs">
            <button
              type="button"
              onClick={() => setIsScheduleExpanded(!isScheduleExpanded)}
              className="w-full flex items-center justify-between gap-2 text-left cursor-pointer group"
              title="Clic para ver todos los horarios y aulas"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Aula y Horarios
                  </p>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {schedulesList.length > 0 ? schedulesList[0].text : 'Sin horarios asignados'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200">
                {schedulesList.length > 1 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    +{schedulesList.length - 1}
                  </span>
                )}
                {isScheduleExpanded ? (
                  <ChevronUp className="w-4 h-4 transition-transform" />
                ) : (
                  <ChevronDown className="w-4 h-4 transition-transform" />
                )}
              </div>
            </button>

            {/* Lista desplegada de horarios si está abierto */}
            {isScheduleExpanded && (
              <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-700/50 space-y-2 animate-fadeIn">
                {schedulesList.length > 0 ? (
                  schedulesList.map((slot, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-white/80 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800"
                    >
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {slot.dias} ({slot.time})
                      </span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-bold">
                        {slot.aula}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">No hay horarios registrados para esta cátedra.</p>
                )}
              </div>
            )}
          </div>

          {/* Fila de Controles: Switch Portal, Estadísticas y Acciones Dropdown */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            {/* Switch interactivo: Portal Alumnos */}
            <button
              type="button"
              onClick={onOpenPortal}
              className={`flex-1 sm:flex-initial flex items-center justify-between sm:justify-start gap-2.5 px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all duration-150 active:scale-[0.98] cursor-pointer shadow-xs ${
                isPortalActive
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15'
                  : 'bg-slate-100/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200/70'
              }`}
              title="Configurar y compartir el portal público para alumnos"
            >
              <div className="flex items-center gap-2">
                <Globe className={`w-4 h-4 shrink-0 ${isPortalActive ? 'text-emerald-500 animate-pulse' : 'text-slate-400'}`} />
                <span>Portal Alumnos</span>
              </div>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase transition-colors shrink-0 ${
                isPortalActive
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isPortalActive ? 'bg-white' : 'bg-slate-400'}`} />
                <span>{isPortalActive ? 'ON' : 'OFF'}</span>
              </span>
            </button>

            {/* Botón rápido: Estadísticas */}
            <button
              type="button"
              onClick={onOpenStats}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/60 text-xs font-semibold shadow-2xs active:scale-[0.98] transition-all cursor-pointer"
              title="Ver métricas de asistencia, notas y rendimiento"
            >
              <BarChart3 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Estadísticas</span>
            </button>

            {/* Menú Desplegable Unificado: Cátedra Acciones ▾ */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsActionsOpen(!isActionsOpen)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm shadow-emerald-600/20 active:scale-[0.98] transition-all cursor-pointer"
                title="Menú de gestión y operaciones de cátedra"
              >
                <span>Acciones</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isActionsOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Overlay para click outside */}
              {isActionsOpen && (
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsActionsOpen(false)} 
                />
              )}

              {/* Menú Flotante */}
              {isActionsOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-xl z-50 py-1.5 animate-fadeIn">
                  {/* Opción: Editar Cátedra */}
                  {onEditCatedra && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsActionsOpen(false);
                        onEditCatedra();
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors text-left cursor-pointer"
                    >
                      <Pencil className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Editar Cátedra</span>
                    </button>
                  )}

                  {/* Opción: Finalizar o Reabrir Cursado */}
                  {!cursadaFinalizada ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsActionsOpen(false);
                        if (onFinalizarCursada) onFinalizarCursada();
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors text-left cursor-pointer"
                    >
                      <Flag className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>Finalizar Cursado</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setIsActionsOpen(false);
                        if (onReabrirCursada) onReabrirCursada();
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors text-left cursor-pointer"
                    >
                      <Unlock className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Reabrir Cursado</span>
                    </button>
                  )}

                  <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

                  {/* Opción: Configuración / Criterios RAM */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsActionsOpen(false);
                      if (onNavigateToConfig) onNavigateToConfig();
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors text-left cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Configuración / RAM</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
