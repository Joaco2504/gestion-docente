import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Users, 
  Search, 
  CheckSquare, 
  Square, 
  Award, 
  CheckCircle2, 
  AlertCircle, 
  GraduationCap, 
  Sparkles, 
  X,
  History,
  AlertTriangle
} from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Badge from '../common/Badge';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { handleAppError } from '../../utils/handleAppError';

const normalizeText = (str) => {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

export default function SeleccionarAlumnosMesaModal({
  isOpen,
  onClose,
  mesa,
  currentActas = [],
  evaluaciones = [],
  notas = [],
  onConfirmSelection
}) {
  const { isDemo } = useAuth();
  const searchInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [eligibleStudents, setEligibleStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState('SUGERIDOS'); // 'SUGERIDOS' | 'TODOS' | 'PROMOCIONAL' | 'REGULAR' | 'LIBRE'
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());

  const isMesaPromocional = (mesa?.condicion_acta || mesa?.tipo_mesa || '').toUpperCase() === 'PROMOCIONAL';
  const isMesaLibre = (mesa?.condicion_acta || '').toUpperCase() === 'LIBRE';
  const isMesaRegular = !isMesaPromocional && !isMesaLibre;

  // Conjunto de DNIs y IDs de estudiantes ya incorporados en el acta de esta mesa
  const alreadyInActaSet = useMemo(() => {
    const set = new Set();
    currentActas.forEach(a => {
      if (a.estudiante_id) set.add(a.estudiante_id);
      if (a.alumno_dni) set.add(String(a.alumno_dni).trim());
    });
    return set;
  }, [currentActas]);

  // Cargar estudiantes elegibles al abrir modal y hacer autoenfoque
  useEffect(() => {
    if (isOpen && mesa?.catedra_id) {
      setSelectedStudentIds(new Set());
      setSearchQuery('');
      setFilterTab('SUGERIDOS');
      fetchEligibleStudents();

      // Enfocar buscador al abrir
      const focusTimer = setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 100);
      return () => clearTimeout(focusTimer);
    }
  }, [isOpen, mesa?.id, mesa?.catedra_id]);

  async function fetchEligibleStudents() {
    setLoading(true);
    try {
      if (isSupabaseConfigured && !isDemo) {
        // 1. Intentar llamar a la RPC get_alumnos_elegibles_mesa
        try {
          const { data: rpcData, error: rpcError } = await supabase.rpc('get_alumnos_elegibles_mesa', {
            p_catedra_id: mesa.catedra_id,
            p_condicion_acta: 'TODOS'
          });

          if (!rpcError && rpcData) {
            setEligibleStudents(rpcData);
            setLoading(false);
            return;
          }
        } catch (rpcErr) {
          console.warn('[SeleccionarAlumnos] Fallback por ausencia de RPC get_alumnos_elegibles_mesa:', rpcErr);
        }

        // 2. Fallback de consulta directa si la RPC no existe aún
        const { data: inscData } = await supabase
          .from('inscripciones')
          .select(`
            estudiante_id,
            condicion,
            estado_academico,
            ciclos_lectivos ( anio ),
            estudiantes ( id, dni, apellido, nombre )
          `)
          .eq('catedra_id', mesa.catedra_id);

        if (inscData) {
          // Obtener desaprobados previos
          const { data: prevActas } = await supabase
            .from('actas_examen_alumnos')
            .select('estudiante_id, alumno_dni, dictamen, mesa_id, mesas_examen!inner(catedra_id)')
            .eq('mesas_examen.catedra_id', mesa.catedra_id)
            .eq('dictamen', 'DESAPROBADO');

          const failedMap = new Map();
          (prevActas || []).forEach(pa => {
            if (pa.estudiante_id) {
              failedMap.set(pa.estudiante_id, (failedMap.get(pa.estudiante_id) || 0) + 1);
            }
          });

          const mapped = inscData
            .filter(i => i.estudiantes && i.estado_academico !== 'ACREDITADO')
            .map(i => ({
              estudiante_id: i.estudiantes.id,
              dni: i.estudiantes.dni,
              apellido: i.estudiantes.apellido,
              nombre: i.estudiantes.nombre,
              condicion: i.condicion || 'REGULAR',
              estado_academico: i.estado_academico || 'CURSANDO',
              ciclo_anio: i.ciclos_lectivos?.anio || new Date().getFullYear(),
              intentos_desaprobados: failedMap.get(i.estudiantes.id) || 0
            }))
            .sort((a, b) => (a.apellido || '').localeCompare(b.apellido || ''));

          setEligibleStudents(mapped);
          setLoading(false);
          return;
        }
      }

      setEligibleStudents([]);
    } catch (err) {
      handleAppError(err, 'SeleccionarAlumnosMesaModal / fetchEligibleStudents', user);
      setEligibleStudents([]);
    } finally {
      setLoading(false);
    }
  }

  // Mapa de promedios de cursada para asignación sugerida en actas promocionales
  const studentAverageMap = useMemo(() => {
    const map = new Map();
    eligibleStudents.forEach(st => {
      const studentGrades = [];
      evaluaciones.forEach(ev => {
        const foundNota = notas.find(n => n.estudiante_id === st.estudiante_id && n.evaluacion_id === ev.id);
        if (foundNota && foundNota.valor !== null && foundNota.valor !== undefined) {
          studentGrades.push(Number(foundNota.valor));
        }
      });

      if (studentGrades.length > 0) {
        const sum = studentGrades.reduce((acc, curr) => acc + curr, 0);
        map.set(st.estudiante_id, Math.round(sum / studentGrades.length));
      } else {
        map.set(st.estudiante_id, 7); // nota mínima sugerida de promoción si no hay notas cargadas
      }
    });
    return map;
  }, [eligibleStudents, evaluaciones, notas]);

  // Filtrado de estudiantes no incorporados aún en esta mesa
  const unassignedStudents = useMemo(() => {
    return eligibleStudents.filter(st => {
      if (alreadyInActaSet.has(st.estudiante_id)) return false;
      if (st.dni && alreadyInActaSet.has(String(st.dni).trim())) return false;
      return true;
    });
  }, [eligibleStudents, alreadyInActaSet]);

  // Lista filtrada según pestaña y buscador
  const filteredStudents = useMemo(() => {
    const q = normalizeText(searchQuery);
    return unassignedStudents.filter(st => {
      const cond = (st.condicion || 'REGULAR').toUpperCase();

      // Filtro de condición según pestaña
      if (filterTab === 'SUGERIDOS') {
        if (isMesaPromocional && cond !== 'PROMOCIONAL') return false;
        if (isMesaRegular && cond !== 'REGULAR') return false;
        if (isMesaLibre && cond !== 'LIBRE') return false;
      } else if (filterTab !== 'TODOS' && cond !== filterTab) {
        return false;
      }

      // Filtro de búsqueda
      if (!q) return true;
      const fullName = normalizeText(`${st.apellido} ${st.nombre}`);
      const dniStr = String(st.dni || '');
      return fullName.includes(q) || dniStr.includes(q);
    });
  }, [unassignedStudents, searchQuery, filterTab, isMesaPromocional, isMesaRegular, isMesaLibre]);

  const toggleSelectStudent = (id) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    const allVisibleSelected = filteredStudents.length > 0 && 
      filteredStudents.every(s => selectedStudentIds.has(s.estudiante_id));

    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        filteredStudents.forEach(s => next.delete(s.estudiante_id));
      } else {
        filteredStudents.forEach(s => next.add(s.estudiante_id));
      }
      return next;
    });
  };

  const handleConfirm = () => {
    const selected = eligibleStudents.filter(s => selectedStudentIds.has(s.estudiante_id));
    if (selected.length === 0) return;

    if (onConfirmSelection) {
      onConfirmSelection(selected, isMesaPromocional, studentAverageMap);
    }
    onClose();
  };

  const allVisibleSelected = filteredStudents.length > 0 && 
    filteredStudents.every(s => selectedStudentIds.has(s.estudiante_id));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Seleccionar Alumnos para el Acta"
      subtitle={`Nómina de alumnos no acreditados elegibles para ${mesa?.condicion_acta || mesa?.turno_llamado || 'esta mesa'}`}
      maxWidth="max-w-2xl"
    >
      <div className="flex flex-col text-xs -mb-5 sm:-mb-6">
        
        {/* Banner de Contexto de la Mesa */}
        <div className="mb-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/5 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 dark:text-white">Condición del Acta:</span>
            <Badge 
              variant={
                isMesaPromocional ? 'promo' :
                isMesaRegular ? 'regular' : 'libre'
              }
              className="text-xs font-bold uppercase"
            >
              {isMesaPromocional ? '🎖️ PROMOCIONAL' : isMesaRegular ? '📋 REGULAR' : '🔓 LIBRE'}
            </Badge>
          </div>

          <span className="text-text-muted text-[11px] font-mono">
            Elegibles para incorporar: <b>{unassignedStudents.length}</b>
          </span>
        </div>

        {/* Buscador Interactivo con AutoFocus y Limpieza Rápida */}
        <div className="relative mb-3">
          <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            ref={searchInputRef}
            type="text"
            autoFocus
            placeholder="Buscar por apellido, nombre o DNI (autoenfoque activo)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-text-primary text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-primary rounded-lg transition-colors cursor-pointer"
              title="Borrar texto de búsqueda"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Pestañas de Filtrado */}
        <div className="flex items-center gap-1.5 pb-2 mb-2 border-b border-slate-100 dark:border-white/5 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setFilterTab('SUGERIDOS')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              filterTab === 'SUGERIDOS'
                ? 'bg-primary text-white shadow-xs'
                : 'text-text-muted hover:text-text-primary hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Sugeridos ({mesa?.condicion_acta || 'Mesa'})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('TODOS')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${
              filterTab === 'TODOS'
                ? 'bg-primary text-white shadow-xs'
                : 'text-text-muted hover:text-text-primary hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            Todos ({unassignedStudents.length})
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('PROMOCIONAL')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${
              filterTab === 'PROMOCIONAL'
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'text-text-muted hover:text-text-primary hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            Promocionales
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('REGULAR')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${
              filterTab === 'REGULAR'
                ? 'bg-primary text-white shadow-xs'
                : 'text-text-muted hover:text-text-primary hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            Regulares
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('LIBRE')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${
              filterTab === 'LIBRE'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-text-muted hover:text-text-primary hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            Libres
          </button>
        </div>

        {/* Checkbox Maestro de Cabecera: Seleccionar Todos */}
        <div className="flex items-center justify-between py-1 px-1 mb-1">
          <button
            type="button"
            onClick={handleSelectAllVisible}
            disabled={filteredStudents.length === 0}
            className="min-h-[44px] flex items-center gap-2 text-xs font-bold text-text-primary hover:text-primary transition-colors cursor-pointer disabled:opacity-50 px-2 py-1 rounded-xl"
          >
            <div className="w-7 h-7 flex items-center justify-center shrink-0">
              {allVisibleSelected ? (
                <CheckSquare className="w-5 h-5 text-primary" />
              ) : (
                <Square className="w-5 h-5 text-slate-300 dark:text-slate-600" />
              )}
            </div>
            <span>
              {allVisibleSelected
                ? `Deseleccionar todos (${filteredStudents.length} alumnos)`
                : `Seleccionar Todos (${filteredStudents.length} alumnos)`}
            </span>
          </button>

          <span className="text-[11px] text-text-muted font-mono pr-1">
            {selectedStudentIds.size} de {filteredStudents.length} seleccionados
          </span>
        </div>

        {/* Contenedor de Scroll Táctil Suave (max-h-[60vh] overflow-y-auto) */}
        <div className="max-h-[60vh] overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 dark:border-white/10 divide-y divide-slate-100 dark:divide-white/5 bg-white dark:bg-slate-900/50 shadow-inner mb-4">
          {loading ? (
            <div className="p-10 text-center text-text-muted">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary mx-auto mb-2" />
              <span>Consultando nómina de alumnos elegibles en Supabase...</span>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-10 text-center text-text-muted space-y-2">
              <Users className="w-8 h-8 mx-auto opacity-30 text-text-muted mb-1" />
              <p className="font-bold text-text-primary text-xs">No se encontraron alumnos para este criterio</p>
              <p className="text-[11px] max-w-sm mx-auto">
                {unassignedStudents.length === 0 
                  ? 'Todos los estudiantes de la cátedra ya han sido incorporados en esta mesa o ya se encuentran acreditados.'
                  : 'Prueba cambiando de pestaña de condición o borrando el texto de búsqueda.'}
              </p>
            </div>
          ) : (
            filteredStudents.map((st) => {
              const isSelected = selectedStudentIds.has(st.estudiante_id);
              const avg = studentAverageMap.get(st.estudiante_id);
              const hasFailedAttempts = st.intentos_desaprobados > 0;

              return (
                <div
                  key={st.estudiante_id}
                  onClick={() => toggleSelectStudent(st.estudiante_id)}
                  className={`min-h-[48px] p-3 sm:p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-colors active:bg-primary/10 ${
                    isSelected
                      ? 'bg-primary/[0.07] dark:bg-primary/[0.14]'
                      : 'hover:bg-slate-50 dark:hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Checkbox Amplio Táctil de 44x44px */}
                    <div className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0 -ml-1">
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-primary" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                      )}
                    </div>

                    <div className="min-w-0">
                      {/* Apellido y Nombre en Negrita */}
                      <div className="font-bold text-sm text-text-primary truncate flex items-center gap-2">
                        <span>{st.apellido}, {st.nombre}</span>
                        {hasFailedAttempts && (
                          <span 
                            className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold border border-amber-500/20 shrink-0"
                            title={`El estudiante cuenta con ${st.intentos_desaprobados} examen/es previo/s desaprobado/s en esta cátedra`}
                          >
                            <AlertTriangle className="w-3 h-3 text-amber-500" />
                            <span>{st.intentos_desaprobados} {st.intentos_desaprobados === 1 ? 'desaprobado previo' : 'desaprobados previos'}</span>
                          </span>
                        )}
                      </div>

                      {/* DNI y Cohorte en Gris Secundario */}
                      <div className="text-[11px] text-text-muted flex items-center gap-2 flex-wrap mt-0.5">
                        <span className="font-mono font-medium">DNI: {st.dni || 'S/D'}</span>
                        <span>•</span>
                        <span className="font-mono text-slate-500">Cohorte: {st.ciclo_anio || 'Actual'}</span>
                        <span>•</span>
                        <span className="text-text-secondary font-medium">Condición: {st.condicion || 'REGULAR'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Badge con promedio de cursada y condición sugerida */}
                  <div className="text-right shrink-0">
                    {isMesaPromocional ? (
                      <div className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-xl border border-emerald-500/20 font-mono text-xs">
                        <span className="text-[9px] uppercase block font-bold">Promedio</span>
                        <strong>Nota: {avg ?? 7}</strong>
                      </div>
                    ) : (
                      <Badge 
                        variant={st.condicion === 'LIBRE' ? 'libre' : st.condicion === 'PROMOCIONAL' ? 'promo' : 'regular'}
                        className="text-[10px] uppercase font-bold px-2 py-0.5"
                      >
                        {st.condicion || 'REGULAR'}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Barra Inferior Fija (Sticky Bottom Bar) */}
        <div className="sticky bottom-0 -mx-5 sm:-mx-6 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-slate-200/80 dark:border-white/10 p-3.5 sm:px-6 flex items-center justify-between gap-3 z-20 shadow-lg">
          <span className="text-text-secondary text-xs">
            <strong className="text-primary font-mono text-sm font-black">{selectedStudentIds.size}</strong> alumnos seleccionados
          </span>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="rounded-xl min-h-[44px] px-4 cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              icon={CheckCircle2}
              onClick={handleConfirm}
              disabled={selectedStudentIds.size === 0}
              className="rounded-xl min-h-[44px] font-bold px-4 shadow-sm cursor-pointer"
            >
              Inscribir al Acta {selectedStudentIds.size > 0 ? `(${selectedStudentIds.size})` : ''}
            </Button>
          </div>
        </div>

      </div>
    </Modal>
  );
}
