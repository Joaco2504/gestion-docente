import React, { useState, useEffect, useMemo } from 'react';
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

  const [loading, setLoading] = useState(true);
  const [eligibleStudents, setEligibleStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState('SUGERIDOS'); // 'SUGERIDOS' | 'TODOS' | 'PROMOCIONAL' | 'REGULAR' | 'LIBRE'
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());

  const isMesaPromocional = (mesa?.condicion_acta || mesa?.tipo_mesa || '').toUpperCase() === 'PROMOCIONAL';
  const isMesaLibre = (mesa?.condicion_acta || '').toUpperCase() === 'LIBRE';
  const isMesaRegular = (mesa?.condicion_acta || '').toUpperCase() === 'REGULAR';

  // Conjunto de DNIs y IDs de estudiantes ya incorporados en el acta de esta mesa
  const alreadyInActaSet = useMemo(() => {
    const set = new Set();
    currentActas.forEach(a => {
      if (a.estudiante_id) set.add(a.estudiante_id);
      if (a.alumno_dni) set.add(String(a.alumno_dni).trim());
    });
    return set;
  }, [currentActas]);

  // Cargar estudiantes elegibles al abrir modal
  useEffect(() => {
    if (isOpen && mesa?.catedra_id) {
      setSelectedStudentIds(new Set());
      setSearchQuery('');
      setFilterTab('SUGERIDOS');
      fetchEligibleStudents();
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
          console.warn('Fallback por ausencia de RPC get_alumnos_elegibles_mesa:', rpcErr);
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

      // 3. Fallback Local / Modo Demo
      const storedEst = JSON.parse(localStorage.getItem(`estudiantes_${mesa.catedra_id}`) || '[]');
      const storedAllMesas = JSON.parse(localStorage.getItem(`mesas_examen_${mesa.catedra_id}`) || '[]');
      
      const failedMapLocal = new Map();
      storedAllMesas.forEach(m => {
        const actas = JSON.parse(localStorage.getItem(`actas_examen_${m.id}`) || '[]');
        actas.forEach(a => {
          if (a.dictamen === 'DESAPROBADO') {
            const key = a.estudiante_id || a.alumno_dni;
            failedMapLocal.set(key, (failedMapLocal.get(key) || 0) + 1);
          }
        });
      });

      const fallbackMapped = storedEst
        .filter(s => s.estado_academico !== 'ACREDITADO')
        .map(s => ({
          estudiante_id: s.id,
          dni: s.dni,
          apellido: s.apellido,
          nombre: s.nombre,
          condicion: s.condicion || 'REGULAR',
          estado_academico: s.estado_academico || 'CURSANDO',
          ciclo_anio: 2026,
          intentos_desaprobados: failedMapLocal.get(s.id) || failedMapLocal.get(s.dni) || 0
        }))
        .sort((a, b) => (a.apellido || '').localeCompare(b.apellido || ''));

      setEligibleStudents(fallbackMapped);
    } catch (err) {
      console.error('Error fetching eligible students for mesa:', err);
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
        // Si es Libre en sugeridos mostramos Libres
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
      title="Seleccionar Alumnos a Evaluar"
      subtitle={`Nómina de alumnos no acreditados elegibles para ${mesa?.condicion_acta || mesa?.turno_llamado || 'esta mesa'}`}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4 text-xs">
        
        {/* Banner de Contexto de la Mesa */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/5 flex items-center justify-between gap-3 flex-wrap">
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
            Disponibles para incorporar: <b>{unassignedStudents.length}</b>
          </span>
        </div>

        {/* Pestañas de Filtrado */}
        <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-white/10 pb-2 overflow-x-auto scrollbar-none">
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

        {/* Buscador & Selección Rápida */}
        <div className="flex items-center justify-between gap-2.5">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por apellido, nombre o DNI..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-text-primary text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleSelectAllVisible}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-white/5 font-semibold text-xs text-text-secondary flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            {allVisibleSelected ? (
              <>
                <CheckSquare className="w-3.5 h-3.5 text-primary" />
                <span>Deseleccionar ({filteredStudents.length})</span>
              </>
            ) : (
              <>
                <Square className="w-3.5 h-3.5 text-text-muted" />
                <span>Seleccionar Todos ({filteredStudents.length})</span>
              </>
            )}
          </button>
        </div>

        {/* Lista de Alumnos Elegibles */}
        <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 dark:border-white/10 divide-y divide-slate-100 dark:divide-white/5 bg-white dark:bg-slate-900/50">
          {loading ? (
            <div className="p-8 text-center text-text-muted">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2" />
              <span>Consultando nómina de alumnos elegibles...</span>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-8 text-center text-text-muted space-y-1">
              <Users className="w-7 h-7 mx-auto opacity-40 mb-1" />
              <p className="font-semibold text-text-primary">No se encontraron alumnos para este criterio.</p>
              <p className="text-[11px]">
                {unassignedStudents.length === 0 
                  ? 'Todos los estudiantes de la cátedra ya han sido incorporados en esta mesa o ya están acreditados.'
                  : 'Prueba cambiando de pestaña o limpiando el texto de búsqueda.'}
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
                  className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-primary/5 dark:bg-primary/10'
                      : 'hover:bg-slate-50 dark:hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="text-primary shrink-0">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-primary" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="font-bold text-text-primary truncate flex items-center gap-2">
                        <span>{st.apellido}, {st.nombre}</span>
                        {hasFailedAttempts && (
                          <span 
                            className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold border border-amber-500/20"
                            title={`El estudiante cuenta con ${st.intentos_desaprobados} examen/es previo/s desaprobado/s en esta materia`}
                          >
                            <AlertTriangle className="w-3 h-3 text-amber-500" />
                            <span>{st.intentos_desaprobados} {st.intentos_desaprobados === 1 ? 'intento previo' : 'intentos previos'}</span>
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-text-muted flex items-center gap-2 flex-wrap">
                        <span className="font-mono">DNI: {st.dni || 'S/D'}</span>
                        <span>•</span>
                        <span className="font-mono text-slate-500">Cohorte: {st.ciclo_anio || 'Actual'}</span>
                        <span>•</span>
                        <span className="font-medium text-text-secondary">Condición: {st.condicion || 'REGULAR'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Detalle Derecho: Calificación sugerida para promocionales o Badge */}
                  <div className="text-right shrink-0">
                    {isMesaPromocional ? (
                      <div className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded-lg border border-emerald-500/20 font-mono text-[11px]">
                        <span className="text-[9px] uppercase block font-bold">Promedio cursada</span>
                        <strong>Nota: {avg ?? 7}</strong>
                      </div>
                    ) : (
                      <Badge 
                        variant={st.condicion === 'LIBRE' ? 'libre' : 'regular'}
                        className="text-[10px] uppercase font-bold"
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

        {/* Footer con Contador y Confirmación */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-white/10">
          <span className="text-text-muted text-xs">
            Seleccionados: <strong className="text-primary font-mono text-sm">{selectedStudentIds.size}</strong> alumnos
          </span>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
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
            >
              Inscribir {selectedStudentIds.size > 0 ? `(${selectedStudentIds.size})` : ''} al Acta
            </Button>
          </div>
        </div>

      </div>
    </Modal>
  );
}
