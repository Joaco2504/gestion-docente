import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building, 
  Users, 
  Percent, 
  Clock, 
  CheckCircle2, 
  Pencil, 
  MoreVertical, 
  CheckSquare, 
  GraduationCap, 
  ArrowRight, 
  Plus 
} from 'lucide-react';
import Badge from '../../../components/common/Badge';
import Button from '../../../components/common/Button';
import Card from '../../../components/common/Card';
import { formatFechaLegible, getTodayYMD } from '../../../lib/dateUtils';

export default function CatedraCard({
  cat,
  activeMenuCatedraId,
  onToggleMenu,
  onEdit,
  onRegisterFirstClass
}) {
  const navigate = useNavigate();
  const hasClases = Boolean(cat.ultima_clase);
  const ultClase = cat.ultima_clase;
  const asistPromedio = cat.asistencia_promedio;
  const isMenuOpen = activeMenuCatedraId === cat.id;

  return (
    <Card hover={true} className="flex flex-col justify-between group">
      <div className="space-y-4">
        {/* Encabezado: Badges Nivel + Modalidad + Botones de Acción */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant={cat.nivel === 'TERCIARIO' ? 'primary' : 'warning'}>
              {cat.nivel}
            </Badge>
            <Badge variant="default">
              {cat.modalidad}
            </Badge>
          </div>

          <div className="flex items-center gap-1 relative">
            {/* Botón Acción Rápida: Editar Cátedra */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(cat);
              }}
              className="p-1.5 rounded-xl text-text-muted hover:text-primary hover:bg-primary/10 transition-all cursor-pointer"
              title="Modificar o editar cátedra"
              aria-label="Modificar o editar cátedra"
            >
              <Pencil className="w-4 h-4" />
            </button>

            {/* Menú Contextual (...) */}
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleMenu(cat.id);
                }}
                className="p-1.5 rounded-xl text-text-muted hover:text-text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                title="Más opciones de cátedra"
                aria-label="Más opciones de cátedra"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {isMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-30" 
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleMenu(null);
                    }} 
                  />
                  <div className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl p-1.5 z-40 animate-fadeIn space-y-0.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleMenu(null);
                        onEdit(cat);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold text-text-primary hover:text-primary hover:bg-primary/10 rounded-xl transition-colors cursor-pointer text-left"
                    >
                      <Pencil className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>Editar Configuración</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleMenu(null);
                        navigate(`/catedra/${cat.id}?tab=asistencias`);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer text-left"
                    >
                      <CheckSquare className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>Asistencias</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleMenu(null);
                        navigate(`/catedra/${cat.id}?tab=calificaciones`);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer text-left"
                    >
                      <GraduationCap className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span>Calificaciones</span>
                    </button>
                    <div className="border-t border-slate-100 dark:border-white/10 my-1" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleMenu(null);
                        navigate(`/catedra/${cat.id}`);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-text-secondary hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer text-left"
                    >
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Ir a la Cátedra</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Botón Ir a la Cátedra */}
            <button
              type="button"
              onClick={() => navigate(`/catedra/${cat.id}`)}
              className="p-1.5 rounded-xl text-text-muted group-hover:text-primary group-hover:bg-primary/10 transition-all cursor-pointer"
              title="Ver detalle de la cátedra"
              aria-label="Ver detalle de la cátedra"
            >
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* Título de la Asignatura */}
        <div>
          <h3
            onClick={() => navigate(`/catedra/${cat.id}`)}
            className="text-base font-bold text-text-primary group-hover:text-primary cursor-pointer transition-colors leading-snug line-clamp-2"
            title={cat.nombre}
          >
            {cat.nombre}
          </h3>

          {/* Etiqueta visual de la Institución con icono */}
          <div className="inline-flex items-center gap-1.5 mt-2 text-xs text-text-secondary bg-slate-100/70 dark:bg-slate-800/50 px-2.5 py-1 rounded-xl border border-slate-200/60 dark:border-white/5 max-w-full truncate font-medium">
            <Building className="w-3.5 h-3.5 text-primary/70 shrink-0" />
            <span className="truncate">{cat.institucion_nombre}</span>
          </div>
        </div>

        {/* Métricas Rápidas: Alumnos Inscriptos + Asistencia General */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="p-2.5 rounded-2xl bg-slate-100/60 dark:bg-slate-800/40 border border-slate-200/60 dark:border-white/5 flex items-center gap-2">
            <Users className="w-4 h-4 text-text-muted shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] text-text-muted block uppercase font-bold tracking-wider">Inscriptos</span>
              <span className="text-xs font-mono font-bold text-text-primary truncate block">
                {cat.estudiantes_count} alumnos
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-slate-100/60 dark:bg-slate-800/40 border border-slate-200/60 dark:border-white/5 flex items-center gap-2">
            <Percent className="w-4 h-4 text-text-muted shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] text-text-muted block uppercase font-bold tracking-wider">Asist. Media</span>
              <span className={`text-xs font-mono font-bold truncate block ${
                asistPromedio === null 
                  ? 'text-text-muted' 
                  : asistPromedio >= 75 
                    ? 'text-emerald-600 dark:text-emerald-400' 
                    : 'text-amber-600 dark:text-amber-400'
              }`}>
                {asistPromedio !== null ? `${asistPromedio}%` : 'Sin clases'}
              </span>
            </div>
          </div>
        </div>

        {/* MÓDULO INTEGRADO: "ÚLTIMA CLASE REGISTRADA" */}
        <div className="rounded-2xl border border-slate-200/60 dark:border-white/5 bg-slate-100/70 dark:bg-slate-800/50 p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-primary" />
              <span>Última Clase Dictada</span>
            </span>
            {hasClases && (
              <span className="text-[10px] font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                {formatFechaLegible(ultClase.fecha)}
              </span>
            )}
          </div>

          {hasClases ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-text-primary line-clamp-2 leading-snug">
                {ultClase.tema || 'Clase regular sin tema especificado'}
              </p>

              <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-200/50 dark:border-white/5 font-mono text-text-muted">
                <span className="text-text-secondary">Asistencia:</span>
                <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                  <CheckCircle2 className="w-3 h-3" />
                  {ultClase.presentes !== undefined 
                    ? `${ultClase.presentes}/${ultClase.totalAsist || cat.estudiantes_count} presentes` 
                    : 'Registrada'}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-2 space-y-2">
              <p className="text-[11px] text-text-muted">
                Aún no hay sesiones de clase registradas.
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRegisterFirstClass(cat);
                }}
                className="inline-flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-xl text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Registrar Primera Clase</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer con Horario y Botón Ingresar */}
      <div className="pt-4 mt-2 border-t border-slate-200/60 dark:border-white/5 flex items-center justify-between gap-3">
        <span className="text-[11px] text-text-muted font-mono truncate max-w-[140px]">
          {cat.horarios_semanales?.length > 0 
            ? `${cat.horarios_semanales[0].dia} ${cat.horarios_semanales[0].desde || ''}` 
            : 'Horario flexible'}
        </span>

        <Button
          variant="primary"
          size="sm"
          icon={ArrowRight}
          onClick={() => navigate(`/catedra/${cat.id}`)}
          className="text-xs shadow-xs rounded-xl min-h-[44px] sm:min-h-[36px]"
          aria-label={`Ingresar a la cátedra ${cat.nombre}`}
        >
          Ingresar
        </Button>
      </div>
    </Card>
  );
}
