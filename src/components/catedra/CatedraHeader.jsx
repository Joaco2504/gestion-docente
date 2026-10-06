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
import Card from '../common/Card';
import Badge from '../common/Badge';
import Button from '../common/Button';

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
function MiniCircularGauge({ percentage, size = 44, strokeWidth = 4.5, color = "stroke-emerald-500", label }) {
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
          className="stroke-surface-border fill-none"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className={`${color} fill-none transition-[stroke-dashoffset] duration-700 ease-out`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>
      {label && (
        <span className="absolute text-[10px] font-extrabold text-text-primary select-none">
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
    <Card variant="bento" padding="lg" className="relative w-full mb-6 overflow-visible">
      {/* Luz ambiental sutil Korum (decoración superior) */}
      <div className="absolute top-0 right-1/4 w-96 h-28 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================= */}
        {/* BLOQUE IZQUIERDO: TÍTULO, IDENTIDAD Y MICRO-KPIS (lg:col-span-7) */}
        {/* ========================================================= */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
          {/* Eyebrow & Badges de contexto */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-[10px] sm:text-xs uppercase font-bold tracking-widest text-primary flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Cátedra Dashboard
              </span>

              {cursadaFinalizada && (
                <Badge variant="warning" size="xs">
                  <Lock className="w-3 h-3 mr-1" />
                  Cursado Cerrado
                </Badge>
              )}
            </div>

            {/* Nombre de la materia principal con tipografía fluida y protección de desborde */}
            <h1 className="font-fluid-display font-extrabold tracking-tight text-text-primary leading-tight min-w-0 break-words" title={catedra?.nombre}>
              {catedra?.nombre ?? 'Cátedra'}
            </h1>

            {/* Meta-datos institucionales en texto compacto sin cortes */}
            <div className="text-xs text-text-muted mt-2 flex flex-wrap items-center gap-1.5 min-w-0">
              <span className="font-semibold text-text-secondary">{institucionNombre}</span>
              <span className="text-slate-300 dark:text-slate-700 select-none">·</span>
              <span>{nivelLabel}</span>
              <span className="text-slate-300 dark:text-slate-700 select-none">·</span>
              <span>{modalidadLabel}</span>
              <span className="text-slate-300 dark:text-slate-700 select-none">·</span>
              <span className="font-mono">Ciclo {anioCiclo}</span>
            </div>
          </div>

          {/* Micro-KPIs incrustados Bento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* KPI 1: Asistencia RAM */}
            <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-surface-hover/70 border border-surface-border shadow-xs">
              <MiniCircularGauge
                percentage={minAsistReg}
                size={44}
                strokeWidth={4.5}
                color="stroke-emerald-500"
                label={`${minAsistReg}%`}
              />
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold tracking-wider text-text-muted">
                  Asistencia RAM
                </p>
                <p className="text-xs font-bold text-text-primary truncate mt-0.5">
                  {minAsistReg}% Reg. · {minAsistPromo}% Promo
                </p>
                <p className="text-[10px] text-text-muted truncate">
                  Exigencia institucional
                </p>
              </div>
            </div>

            {/* KPI 2: Aprobación de Parciales */}
            <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-surface-hover/70 border border-surface-border shadow-xs">
              <MiniCircularGauge
                percentage={(notaMinReg / 10) * 100}
                size={44}
                strokeWidth={4.5}
                color="stroke-amber-500"
                label={`${notaMinReg}+`}
              />
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold tracking-wider text-text-muted">
                  Aprobación RAM
                </p>
                <p className="text-xs font-bold text-text-primary truncate mt-0.5">
                  Mínimo {notaMinReg} / 10
                </p>
                <p className="text-[10px] text-text-muted truncate">
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
          <div className="bg-surface-hover/80 border border-surface-border rounded-2xl p-3.5 shadow-xs transition-[border-color] duration-150">
            <button
              type="button"
              onClick={() => setIsScheduleExpanded(!isScheduleExpanded)}
              className="w-full flex items-center justify-between gap-2 text-left cursor-pointer group select-none min-h-[44px]"
              title="Clic para ver todos los horarios y aulas"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                    Aula y Horarios
                  </p>
                  <p className="text-xs font-semibold text-text-primary truncate group-hover:text-primary transition-colors">
                    {schedulesList.length > 0 ? schedulesList[0].text : 'Sin horarios asignados'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 text-text-muted group-hover:text-text-primary">
                {schedulesList.length > 1 && (
                  <Badge variant="secondary" size="xs">
                    +{schedulesList.length - 1}
                  </Badge>
                )}
                {isScheduleExpanded ? (
                  <ChevronUp className="w-4 h-4 transition-transform duration-150" />
                ) : (
                  <ChevronDown className="w-4 h-4 transition-transform duration-150" />
                )}
              </div>
            </button>

            {/* Lista desplegada de horarios si está abierto */}
            {isScheduleExpanded && (
              <div className="mt-3 pt-3 border-t border-surface-border space-y-2 animate-fadeIn">
                {schedulesList.length > 0 ? (
                  schedulesList.map((slot, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-xl bg-surface border border-surface-border shadow-xs"
                    >
                      <span className="font-semibold text-text-secondary">
                        {slot.dias} ({slot.time})
                      </span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-primary/10 text-primary font-bold">
                        {slot.aula}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-text-muted italic">No hay horarios registrados para esta cátedra.</p>
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
              className={`flex-1 sm:flex-initial flex items-center justify-between sm:justify-start gap-2.5 px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-[background-color,border-color,transform] duration-150 active:scale-[0.98] cursor-pointer shadow-xs min-h-[44px] ${
                isPortalActive
                  ? 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/15'
                  : 'bg-surface border-surface-border text-text-secondary hover:bg-surface-hover'
              }`}
              title="Configurar y compartir el portal público para alumnos"
            >
              <div className="flex items-center gap-2">
                <Globe className={`w-4 h-4 shrink-0 ${isPortalActive ? 'text-primary animate-pulse' : 'text-text-muted'}`} />
                <span>Portal Alumnos</span>
              </div>
              <Badge
                variant={isPortalActive ? "promo" : "secondary"}
                size="xs"
                dot={true}
              >
                {isPortalActive ? 'ON' : 'OFF'}
              </Badge>
            </button>

            {/* Botón rápido: Estadísticas */}
            <Button
              variant="secondary"
              size="md"
              icon={BarChart3}
              onClick={onOpenStats}
              title="Ver métricas de asistencia, notas y rendimiento"
            >
              Estadísticas
            </Button>

            {/* Menú Desplegable Unificado: Cátedra Acciones ▾ */}
            <div className="relative">
              <Button
                variant="primary"
                size="md"
                onClick={() => setIsActionsOpen(!isActionsOpen)}
                title="Menú de gestión y operaciones de cátedra"
              >
                <span>Acciones</span>
                <ChevronDown className={`w-3.5 h-3.5 ml-1 transition-transform duration-150 ${isActionsOpen ? 'rotate-180' : ''}`} />
              </Button>

              {/* Overlay para click outside */}
              {isActionsOpen && (
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsActionsOpen(false)} 
                />
              )}

              {/* Menú Flotante */}
              {isActionsOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-surface border border-surface-border shadow-xl z-50 py-1.5 animate-fadeIn space-y-0.5">
                  {/* Opción: Editar Cátedra */}
                  {onEditCatedra && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsActionsOpen(false);
                        onEditCatedra();
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-text-primary hover:text-primary hover:bg-primary/10 rounded-xl transition-colors text-left cursor-pointer"
                    >
                      <Pencil className="w-4 h-4 text-primary shrink-0" />
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
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-xl transition-colors text-left cursor-pointer"
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
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-xl transition-colors text-left cursor-pointer"
                    >
                      <Unlock className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Reabrir Cursado</span>
                    </button>
                  )}

                  <div className="border-t border-surface-border my-1" />

                  {/* Opción: Configuración / Criterios RAM */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsActionsOpen(false);
                      if (onNavigateToConfig) onNavigateToConfig();
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-xl transition-colors text-left cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-text-muted shrink-0" />
                    <span>Configuración / RAM</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
