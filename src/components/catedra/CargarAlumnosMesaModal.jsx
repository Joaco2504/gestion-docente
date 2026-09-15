import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  CheckSquare, 
  Square, 
  Award, 
  CheckCircle2, 
  GraduationCap, 
  AlertCircle,
  Sparkles,
  X
} from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Badge from '../common/Badge';
import { formatFechaDMY } from '../../lib/dateUtils';

/**
 * Normalización para búsqueda sensible a diacríticos
 */
const normalizeText = (str) => {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

export default function CargarAlumnosMesaModal({
  isOpen,
  onClose,
  mesa,
  students = [],
  currentActas = [],
  evaluaciones = [],
  notas = [],
  onConfirmSelection
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('TODOS'); // 'TODOS' | 'PROMOCIONAL' | 'REGULAR' | 'LIBRE'
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());

  const isMesaPromocional = (mesa?.tipo_mesa || '').toUpperCase() === 'PROMOCIONAL';

  // Map de IDs y DNIs ya presentes en el acta de esta mesa
  const alreadyInMesaMap = useMemo(() => {
    const map = new Set();
    currentActas.forEach(a => {
      if (a.estudiante_id) map.add(a.estudiante_id);
      if (a.alumno_dni) map.add(String(a.alumno_dni).trim());
    });
    return map;
  }, [currentActas]);

  // Cálculo de promedio de cursada por estudiante para promocionales
  const studentAverageMap = useMemo(() => {
    const map = new Map();
    students.forEach(st => {
      const studentGrades = [];
      evaluaciones.forEach(ev => {
        const foundNota = notas.find(n => n.estudiante_id === st.id && n.evaluacion_id === ev.id);
        if (foundNota && foundNota.valor !== null && foundNota.valor !== undefined) {
          studentGrades.push(Number(foundNota.valor));
        }
      });

      if (studentGrades.length > 0) {
        const sum = studentGrades.reduce((acc, curr) => acc + curr, 0);
        const avg = Math.round(sum / studentGrades.length);
        map.set(st.id, avg);
      } else {
        map.set(st.id, null);
      }
    });
    return map;
  }, [students, evaluaciones, notas]);

  // Lista de estudiantes elegibles:
  // 1. Excluir estudiantes ya acreditados (materia ya aprobada)
  // 2. Excluir estudiantes ya inscriptos en esta mesa de examen
  const eligibleStudents = useMemo(() => {
    return students.filter(st => {
      // Si ya está acreditado en esta cátedra
      if (st.estado_academico === 'ACREDITADO') return false;
      // Si ya está en el acta de esta mesa
      if (alreadyInMesaMap.has(st.id) || (st.dni && alreadyInMesaMap.has(String(st.dni).trim()))) {
        return false;
      }
      return true;
    });
  }, [students, alreadyInMesaMap]);

  // Filtro por tab y término de búsqueda
  const filteredStudents = useMemo(() => {
    const q = normalizeText(searchQuery);
    return eligibleStudents.filter(st => {
      // Filtro por pestaña de condición
      const cond = (st.condicion || 'REGULAR').toUpperCase();
      if (selectedTab !== 'TODOS' && cond !== selectedTab) {
        return false;
      }

      // Filtro por texto
      if (q) {
        const fullName = normalizeText(`${st.apellido} ${st.nombre}`);
        const dniStr = normalizeText(st.dni);
        if (!fullName.includes(q) && !dniStr.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [eligibleStudents, selectedTab, searchQuery]);

  // Conteo de alumnos por condición elegibles
  const countsByCond = useMemo(() => {
    const counts = { TODOS: eligibleStudents.length, PROMOCIONAL: 0, REGULAR: 0, LIBRE: 0 };
    eligibleStudents.forEach(st => {
      const cond = (st.condicion || 'REGULAR').toUpperCase();
      if (counts[cond] !== undefined) {
        counts[cond]++;
      }
    });
    return counts;
  }, [eligibleStudents]);

  // Manejador de selección individual
  const toggleSelectStudent = (id) => {
    const next = new Set(selectedStudentIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedStudentIds(next);
  };

  // Manejador de seleccionar/deseleccionar todos los visibles
  const areAllFilteredSelected = filteredStudents.length > 0 && 
    filteredStudents.every(st => selectedStudentIds.has(st.id));

  const handleToggleSelectAllVisible = () => {
    const next = new Set(selectedStudentIds);
    if (areAllFilteredSelected) {
      filteredStudents.forEach(st => next.delete(st.id));
    } else {
      filteredStudents.forEach(st => next.add(st.id));
    }
    setSelectedStudentIds(next);
  };

  const handleConfirm = () => {
    const selectedList = students.filter(st => selectedStudentIds.has(st.id));
    onConfirmSelection(selectedList, isMesaPromocional, studentAverageMap);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isMesaPromocional ? '🎖️ Cargar Alumnos a Mesa Promocional' : '📋 Inscribir Alumnos a la Mesa de Examen'}
      size="lg"
    >
      <div className="space-y-4">
        {/* Cabecera contextual de la Mesa */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider block">
              Mesa Destino
            </span>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="font-bold text-slate-900 dark:text-white text-sm">
                {mesa?.turno_llamado || 'Turno Regular'}
              </span>
              <span className="text-slate-400 dark:text-slate-500">•</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">
                {formatFechaDMY(mesa?.fecha)}
              </span>
              <span className="text-slate-400 dark:text-slate-500">•</span>
              <Badge variant={isMesaPromocional ? 'promo' : 'info'}>
                {isMesaPromocional ? '🎖️ PROMOCIONAL' : 'FINAL / ORDINARIA'}
              </Badge>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[11px] font-bold text-primary">
              {selectedStudentIds.size} de {eligibleStudents.length} seleccionados
            </span>
          </div>
        </div>

        {/* Notificación explicativa si es mesa promocional */}
        {isMesaPromocional && (
          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-900 dark:text-purple-200 text-xs flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
            <span>
              <b>Mesa Promocional:</b> Los estudiantes con condición <b>PROMOCIONAL</b> tendrán su nota definitiva precargada con su promedio de cursada y dictamen predeterminado <b>ACREDITADO</b>.
            </span>
          </div>
        )}

        {/* Pestañas de condición académica + Barra de búsqueda */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {/* Tabs de Filtro */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/5 overflow-x-auto text-xs">
              <button
                type="button"
                onClick={() => setSelectedTab('TODOS')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedTab === 'TODOS'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Todos ({countsByCond.TODOS})
              </button>

              <button
                type="button"
                onClick={() => setSelectedTab('PROMOCIONAL')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  selectedTab === 'PROMOCIONAL'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-purple-700 dark:text-purple-300 hover:bg-purple-500/10'
                }`}
              >
                <span>Promocionales</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-500/20">
                  {countsByCond.PROMOCIONAL}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTab('REGULAR')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  selectedTab === 'REGULAR'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-blue-700 dark:text-blue-300 hover:bg-blue-500/10'
                }`}
              >
                <span>Regulares</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-500/20">
                  {countsByCond.REGULAR}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTab('LIBRE')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  selectedTab === 'LIBRE'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-rose-700 dark:text-rose-300 hover:bg-rose-500/10'
                }`}
              >
                <span>Libres</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500/20">
                  {countsByCond.LIBRE}
                </span>
              </button>
            </div>

            {/* Selector 'Seleccionar todos visibles' */}
            {filteredStudents.length > 0 && (
              <button
                type="button"
                onClick={handleToggleSelectAllVisible}
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1.5 px-2 py-1 cursor-pointer"
              >
                {areAllFilteredSelected ? (
                  <>
                    <CheckSquare className="w-4 h-4" />
                    <span>Deseleccionar visibles ({filteredStudents.length})</span>
                  </>
                ) : (
                  <>
                    <Square className="w-4 h-4" />
                    <span>Seleccionar visibles ({filteredStudents.length})</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Input de Búsqueda */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por Apellido, Nombre o DNI..."
              className="w-full pl-9 pr-9 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Lista de Alumnos con Checkboxes */}
        <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 dark:border-white/10 divide-y divide-slate-100 dark:divide-white/5 scrollbar-thin">
          {filteredStudents.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-xs">
              <Users className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                No se encontraron alumnos disponibles para inscribir
              </p>
              <p className="mt-1">
                {eligibleStudents.length === 0
                  ? 'Todos los alumnos de la cátedra ya se encuentran inscriptos en esta mesa o ya han acreditado la materia.'
                  : 'Prueba cambiando el filtro de condición o el término de búsqueda.'}
              </p>
            </div>
          ) : (
            filteredStudents.map((st) => {
              const isSelected = selectedStudentIds.has(st.id);
              const cond = (st.condicion || 'REGULAR').toUpperCase();
              const cursadaAvg = studentAverageMap.get(st.id);

              return (
                <div
                  key={st.id}
                  onClick={() => toggleSelectStudent(st.id)}
                  className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition-colors text-xs ${
                    isSelected
                      ? 'bg-primary/5 dark:bg-primary/10'
                      : 'hover:bg-slate-50 dark:hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}} // Manejado por contenedor
                      className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 dark:text-white truncate">
                        {st.apellido}, {st.nombre}
                      </p>
                      <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        DNI: {st.dni || 'Sin DNI'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Nota promedio si es mesa promocional y es alumno promocional */}
                    {isMesaPromocional && cond === 'PROMOCIONAL' && (
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40">
                        Promedio: {cursadaAvg !== null ? `${cursadaAvg}/10` : 'S/N'}
                      </span>
                    )}

                    <Badge 
                      variant={
                        cond === 'PROMOCIONAL' ? 'promo' :
                        cond === 'REGULAR' ? 'regular' : 'libre'
                      }
                    >
                      {cond}
                    </Badge>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer con Acciones */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-white/10">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {selectedStudentIds.size === 1
              ? '1 alumno seleccionado'
              : `${selectedStudentIds.size} alumnos seleccionados`}
          </span>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={isMesaPromocional ? Award : Users}
              onClick={handleConfirm}
              disabled={selectedStudentIds.size === 0}
              className="text-xs font-bold"
            >
              Inscribir {selectedStudentIds.size > 0 ? `(${selectedStudentIds.size})` : ''}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
