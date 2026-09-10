import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Download, 
  Edit3, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  GraduationCap, 
  FileSpreadsheet,
  Award
} from 'lucide-react';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Card from '../common/Card';
import Modal from '../common/Modal';
import { calcularCondicionFinal, calcularPorcentajeAsistencia } from '../../lib/academicLogic';
import { exportGradesToExcel } from '../../lib/excel';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

export default function GradesTab({
  catedraId,
  catedraName,
  academicLevel = 'TERCIARIO',
  modalidad = 'ANUAL'
}) {
  const { user, isDemo } = useAuth();

  const [estudiantes, setEstudiantes] = useState([]);
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [notas, setNotas] = useState([]);
  const [clases, setClases] = useState([]);
  const [asistencias, setAsistencias] = useState([]);
  const [criterios, setCriterios] = useState({
    min_asist_promo: 80,
    min_asist_reg: 70,
    nota_min_promo: 7,
    nota_min_reg: 4,
    nota_min_sec: 6
  });
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isNewEvalModalOpen, setIsNewEvalModalOpen] = useState(false);
  const [isEditNotaModalOpen, setIsEditNotaModalOpen] = useState(false);
  const [selectedStudentForNota, setSelectedStudentForNota] = useState(null);
  const [selectedEvalForNota, setSelectedEvalForNota] = useState(null);
  const [inputNotaValor, setInputNotaValor] = useState('');
  const [savingNota, setSavingNota] = useState(false);

  // New Eval form
  const [evalTitulo, setEvalTitulo] = useState('');
  const [evalTipo, setEvalTipo] = useState(academicLevel === 'SECUNDARIO' ? 'PRUEBA' : 'PARCIAL');
  const [evalOrigenId, setEvalOrigenId] = useState('');
  const [savingEval, setSavingEval] = useState(false);

  useEffect(() => {
    fetchData();
  }, [catedraId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (isSupabaseConfigured && !isDemo) {
        // 1. Estudiantes
        const { data: inscData } = await supabase
          .from('inscripciones')
          .select(`
            estudiante_id,
            estudiantes (
              id,
              dni,
              apellido,
              nombre
            )
          `)
          .eq('catedra_id', catedraId);

        const estList = (inscData || []).map(i => i.estudiantes).filter(Boolean);
        estList.sort((a, b) => a.apellido.localeCompare(b.apellido));

        // 2. Evaluaciones
        const { data: evalData } = await supabase
          .from('evaluaciones')
          .select('*')
          .eq('catedra_id', catedraId)
          .order('created_at', { ascending: true });

        // 3. Notas
        const evalIds = (evalData || []).map(e => e.id);
        let notasList = [];
        if (evalIds.length > 0) {
          const { data: nData } = await supabase
            .from('notas')
            .select('*')
            .in('evaluacion_id', evalIds);
          notasList = nData || [];
        }

        // 4. Clases & Asistencias
        const { data: cData } = await supabase
          .from('clases')
          .select('*')
          .eq('catedra_id', catedraId);

        let asistList = [];
        if ((cData || []).length > 0) {
          const { data: aData } = await supabase
            .from('asistencias')
            .select('*')
            .in('clase_id', cData.map(c => c.id));
          asistList = aData || [];
        }

        // 5. Criterios
        const { data: critData } = await supabase
          .from('criterios_evaluacion')
          .select('*')
          .eq('catedra_id', catedraId)
          .maybeSingle();

        setEstudiantes(estList);
        setEvaluaciones(evalData || []);
        setNotas(notasList);
        setClases(cData || []);
        setAsistencias(asistList);
        if (critData) {
          setCriterios({
            min_asist_promo: Number(critData.min_asist_promo) || 80,
            min_asist_reg: Number(critData.min_asist_reg) || 70,
            nota_min_promo: Number(critData.nota_min_promo) || 7,
            nota_min_reg: Number(critData.nota_min_reg) || 4,
            nota_min_sec: Number(critData.nota_min_sec) || 6
          });
        }
      } else {
        // Demo mode fallback
        const storedEst = localStorage.getItem(`estudiantes_${catedraId}`);
        const storedEval = localStorage.getItem(`evaluaciones_${catedraId}`);
        const storedNotas = localStorage.getItem(`notas_${catedraId}`);
        const storedClases = localStorage.getItem(`clases_${catedraId}`);
        const storedAsist = localStorage.getItem(`asistencias_${catedraId}`);

        let estList = storedEst ? JSON.parse(storedEst) : [
          { id: 'est-1', dni: '40111222', apellido: 'Álvarez', nombre: 'Martín' },
          { id: 'est-2', dni: '39444555', apellido: 'Benítez', nombre: 'Lucía' },
          { id: 'est-3', dni: '41888999', apellido: 'Castillo', nombre: 'Ignacio' },
          { id: 'est-4', dni: '38222333', apellido: 'Domínguez', nombre: 'Valentina' },
          { id: 'est-5', dni: '42333444', apellido: 'Fernández', nombre: 'Santiago' }
        ];

        let evalList = storedEval ? JSON.parse(storedEval) : [
          { id: 'eval-1', catedra_id: catedraId, titulo: 'TP N° 1 - Arquitectura', tipo: 'TP' },
          { id: 'eval-2', catedra_id: catedraId, titulo: 'Parcial 1', tipo: 'PARCIAL' },
          { id: 'eval-3', catedra_id: catedraId, titulo: 'Recuperatorio Parcial 1', tipo: 'RECUPERATORIO', evaluacion_origen_id: 'eval-2' },
          { id: 'eval-4', catedra_id: catedraId, titulo: 'Parcial 2', tipo: 'PARCIAL' }
        ];

        let notasList = storedNotas ? JSON.parse(storedNotas) : [
          { evaluacion_id: 'eval-1', estudiante_id: 'est-1', valor: 9 },
          { evaluacion_id: 'eval-2', estudiante_id: 'est-1', valor: 8 },
          { evaluacion_id: 'eval-4', estudiante_id: 'est-1', valor: 7.5 },
          { evaluacion_id: 'eval-1', estudiante_id: 'est-2', valor: 8 },
          { evaluacion_id: 'eval-2', estudiante_id: 'est-2', valor: 4 },
          { evaluacion_id: 'eval-3', estudiante_id: 'est-2', valor: 8 },
          { evaluacion_id: 'eval-4', estudiante_id: 'est-2', valor: 7 },
          { evaluacion_id: 'eval-1', estudiante_id: 'est-3', valor: 7 },
          { evaluacion_id: 'eval-2', estudiante_id: 'est-3', valor: 6 },
          { evaluacion_id: 'eval-4', estudiante_id: 'est-3', valor: 6 },
          { evaluacion_id: 'eval-1', estudiante_id: 'est-4', valor: 6 },
          { evaluacion_id: 'eval-2', estudiante_id: 'est-4', valor: 2 },
          { evaluacion_id: 'eval-4', estudiante_id: 'est-4', valor: 4 },
          { evaluacion_id: 'eval-1', estudiante_id: 'est-5', valor: 10 },
          { evaluacion_id: 'eval-2', estudiante_id: 'est-5', valor: 9 },
          { evaluacion_id: 'eval-4', estudiante_id: 'est-5', valor: 9 }
        ];

        let cls = storedClases ? JSON.parse(storedClases) : [
          { id: 'clase-1', catedra_id: catedraId, fecha: '2026-03-02', tema: 'Clase 1' },
          { id: 'clase-2', catedra_id: catedraId, fecha: '2026-03-09', tema: 'Clase 2' }
        ];

        let asist = storedAsist ? JSON.parse(storedAsist) : [
          { clase_id: 'clase-1', estudiante_id: 'est-1', estado: 'PRESENTE' },
          { clase_id: 'clase-1', estudiante_id: 'est-2', estado: 'PRESENTE' },
          { clase_id: 'clase-1', estudiante_id: 'est-3', estado: 'PRESENTE' },
          { clase_id: 'clase-1', estudiante_id: 'est-4', estado: 'AUSENTE' },
          { clase_id: 'clase-1', estudiante_id: 'est-5', estado: 'PRESENTE' },
          { clase_id: 'clase-2', estudiante_id: 'est-1', estado: 'PRESENTE' },
          { clase_id: 'clase-2', estudiante_id: 'est-2', estado: 'AUSENTE' },
          { clase_id: 'clase-2', estudiante_id: 'est-3', estado: 'PRESENTE' },
          { clase_id: 'clase-2', estudiante_id: 'est-4', estado: 'PRESENTE' },
          { clase_id: 'clase-2', estudiante_id: 'est-5', estado: 'PRESENTE' }
        ];

        setEstudiantes(estList);
        setEvaluaciones(evalList);
        setNotas(notasList);
        setClases(cls);
        setAsistencias(asist);

        localStorage.setItem(`evaluaciones_${catedraId}`, JSON.stringify(evalList));
        localStorage.setItem(`notas_${catedraId}`, JSON.stringify(notasList));
      }
    } catch (err) {
      console.error('Error fetching grades data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getNotaValue = (estudianteId, evaluacionId) => {
    const record = notas.find(
      n => n.estudiante_id === estudianteId && n.evaluacion_id === evaluacionId
    );
    return record?.valor !== undefined && record?.valor !== null ? Number(record.valor) : null;
  };

  const handleOpenEditNota = (estudiante, evaluacion) => {
    setSelectedStudentForNota(estudiante);
    setSelectedEvalForNota(evaluacion);
    const actual = getNotaValue(estudiante.id, evaluacion.id);
    setInputNotaValor(actual !== null ? String(actual) : '');
    setIsEditNotaModalOpen(true);
  };

  const handleSaveNotaSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudentForNota || !selectedEvalForNota) return;

    const valNum = Number(inputNotaValor);
    if (isNaN(valNum) || valNum < 1 || valNum > 10) {
      alert('La calificación debe ser un valor numérico entre 1 y 10.');
      return;
    }

    setSavingNota(true);
    try {
      if (isSupabaseConfigured && !isDemo) {
        await supabase
          .from('notas')
          .upsert({
            evaluacion_id: selectedEvalForNota.id,
            estudiante_id: selectedStudentForNota.id,
            valor: valNum
          }, { onConflict: 'evaluacion_id,estudiante_id' });
      }

      // Local update
      const filtered = notas.filter(
        n => !(n.evaluacion_id === selectedEvalForNota.id && n.estudiante_id === selectedStudentForNota.id)
      );
      const updated = [...filtered, {
        evaluacion_id: selectedEvalForNota.id,
        estudiante_id: selectedStudentForNota.id,
        valor: valNum
      }];
      setNotas(updated);

      if (!isSupabaseConfigured || isDemo) {
        localStorage.setItem(`notas_${catedraId}`, JSON.stringify(updated));
      }

      setIsEditNotaModalOpen(false);
    } catch (err) {
      alert('Error al guardar la calificación: ' + err.message);
    } finally {
      setSavingNota(false);
    }
  };

  const handleCreateEvaluacion = async (e) => {
    e.preventDefault();
    if (!evalTitulo.trim()) return;

    setSavingEval(true);
    try {
      const newEvalObj = {
        catedra_id: catedraId,
        titulo: evalTitulo.trim(),
        tipo: evalTipo,
        evaluacion_origen_id: evalTipo === 'RECUPERATORIO' && evalOrigenId ? evalOrigenId : null
      };

      if (isSupabaseConfigured && !isDemo) {
        const { data, error } = await supabase
          .from('evaluaciones')
          .insert(newEvalObj)
          .select()
          .single();

        if (error) throw error;
        setEvaluaciones([...evaluaciones, data]);
      } else {
        const created = { ...newEvalObj, id: 'eval-' + Date.now() };
        const updated = [...evaluaciones, created];
        setEvaluaciones(updated);
        localStorage.setItem(`evaluaciones_${catedraId}`, JSON.stringify(updated));
      }

      setIsNewEvalModalOpen(false);
      setEvalTitulo('');
      setEvalOrigenId('');
    } catch (err) {
      alert('Error al crear evaluación: ' + err.message);
    } finally {
      setSavingEval(false);
    }
  };

  // Build matrix data
  const mainEvaluations = evaluaciones.filter(e => e.tipo !== 'RECUPERATORIO');

  const matrixData = estudiantes.map(est => {
    const studentAsistencias = asistencias.filter(a => a.estudiante_id === est.id);
    const asistPct = calcularPorcentajeAsistencia(studentAsistencias, clases.length);

    // Collect student notes
    const studentNotas = [];
    evaluaciones.forEach(ev => {
      const v = getNotaValue(est.id, ev.id);
      if (v !== null) {
        studentNotas.push({
          evaluacion_id: ev.id,
          valor: v,
          tipo: ev.tipo,
          evaluacion_origen_id: ev.evaluacion_origen_id
        });
      }
    });

    const cond = calcularCondicionFinal(
      academicLevel,
      modalidad,
      asistPct,
      evaluaciones,
      studentNotas,
      criterios
    );

    return {
      estudiante: est,
      asistenciaPct: asistPct,
      condicion: cond
    };
  });

  const handleExport = () => {
    exportGradesToExcel(
      { nombre: catedraName, nivel: academicLevel, modalidad },
      estudiantes,
      evaluaciones,
      notas,
      matrixData.map(m => ({ estudianteId: m.estudiante.id, asistenciaPct: m.asistenciaPct, condicion: m.condicion }))
    );
  };

  const getCondBadgeVariant = (cond) => {
    switch (cond) {
      case 'PROMOCIONAL': return 'promo';
      case 'REGULAR': return 'regular';
      case 'LIBRE': return 'libre';
      case 'APROBADO': return 'promo';
      case 'DESAPROBADO': return 'libre';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface p-4 rounded-xl border border-surface-border shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-text-primary">
            Sábana de Calificaciones & Condición Final
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            Las calificaciones de recuperatorios se exhiben junto a la nota original sin sobreescribirla.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={Download}
            onClick={handleExport}
            disabled={estudiantes.length === 0}
          >
            Exportar Excel (.xlsx)
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => setIsNewEvalModalOpen(true)}
          >
            Nueva Evaluación
          </Button>
        </div>
      </div>

      {/* Grade Table */}
      {estudiantes.length === 0 ? (
        <Card className="text-center py-12">
          <GraduationCap className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-50" />
          <h4 className="text-base font-semibold text-text-primary">No hay estudiantes inscriptos en esta cátedra</h4>
          <p className="text-xs text-text-muted mt-1 mb-4">
            Ve a la pestaña "Cargar Alumnos (Excel)" para importar la nómina de estudiantes.
          </p>
        </Card>
      ) : (
        <div className="bg-surface rounded-xl border border-surface-border overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead className="bg-surface-hover/70 text-text-secondary border-b border-surface-border">
                <tr>
                  <th className="sticky-col bg-surface-hover px-4 py-3 text-center w-12 font-mono">#</th>
                  <th className="sticky-col bg-surface-hover px-4 py-3 font-mono">DNI</th>
                  <th className="sticky-col bg-surface-hover px-4 py-3 min-w-[200px]">Estudiante</th>
                  <th className="px-3 py-3 text-center w-24 font-mono">% Asist.</th>

                  {/* Main Evaluation Columns */}
                  {mainEvaluations.map(ev => {
                    const recup = evaluaciones.find(r => r.tipo === 'RECUPERATORIO' && r.evaluacion_origen_id === ev.id);
                    return (
                      <th key={ev.id} className="px-4 py-3 text-center border-l border-surface-border min-w-[130px]">
                        <div className="font-bold text-text-primary truncate" title={ev.titulo}>
                          {ev.titulo}
                        </div>
                        <div className="flex items-center justify-center gap-1 mt-0.5">
                          <span className="text-[10px] font-mono uppercase bg-primary/10 text-primary px-1.5 py-0.2 rounded font-bold">
                            {ev.tipo}
                          </span>
                          {recup && (
                            <span className="text-[10px] font-mono uppercase bg-purple-50 text-purple-700 px-1.5 py-0.2 rounded font-bold">
                              +RECUP
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}

                  {/* Standalone Recuperatorios if any */}
                  {evaluaciones.filter(e => e.tipo === 'RECUPERATORIO' && !e.evaluacion_origen_id).map(ev => (
                    <th key={ev.id} className="px-4 py-3 text-center border-l border-surface-border min-w-[120px]">
                      <div className="font-bold text-text-primary truncate">{ev.titulo}</div>
                      <span className="text-[10px] font-mono uppercase bg-purple-50 text-purple-700 px-1.5 py-0.2 rounded font-bold">
                        RECUP
                      </span>
                    </th>
                  ))}

                  <th className="px-4 py-3 text-center border-l border-surface-border min-w-[150px] bg-surface-hover/80 font-bold">
                    Condición Final
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-surface-border">
                {matrixData.map((item, idx) => {
                  const est = item.estudiante;
                  return (
                    <tr key={est.id} className="hover:bg-surface-hover/40 transition-colors">
                      <td className="sticky-col bg-surface px-4 py-3 text-center text-text-muted font-mono">{idx + 1}</td>
                      <td className="sticky-col bg-surface px-4 py-3 font-mono text-text-secondary">{est.dni}</td>
                      <td className="sticky-col bg-surface px-4 py-3 font-semibold text-text-primary">
                        {est.apellido}, {est.nombre}
                      </td>

                      {/* Attendance % */}
                      <td className="px-3 py-3 text-center font-mono">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          item.asistenciaPct < 70 ? 'bg-red-50 text-rose-600' : 'bg-green-50 text-emerald-700'
                        }`}>
                          {item.asistenciaPct}%
                        </span>
                      </td>

                      {/* Main evaluations and linked recuperatorios */}
                      {mainEvaluations.map(ev => {
                        const recup = evaluaciones.find(r => r.tipo === 'RECUPERATORIO' && r.evaluacion_origen_id === ev.id);
                        const notaOriginal = getNotaValue(est.id, ev.id);
                        const notaRecup = recup ? getNotaValue(est.id, recup.id) : null;

                        return (
                          <td key={ev.id} className="px-4 py-3 text-center border-l border-surface-border">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Original note button */}
                              <button
                                type="button"
                                onClick={() => handleOpenEditNota(est, ev)}
                                title={`Editar nota de ${ev.titulo}`}
                                className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all border ${
                                  notaOriginal !== null
                                    ? notaOriginal >= 7
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                                      : notaOriginal >= 4
                                      ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                                      : 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                                    : 'bg-surface hover:bg-surface-hover text-text-muted border-dashed border-surface-border'
                                }`}
                              >
                                {notaOriginal !== null ? notaOriginal : '—'}
                              </button>

                              {/* Recuperatorio side-by-side if exists */}
                              {recup && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditNota(est, recup)}
                                  title={`Editar ${recup.titulo}`}
                                  className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all border ${
                                    notaRecup !== null
                                      ? notaRecup >= 4
                                        ? 'bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100'
                                        : 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                                      : 'bg-purple-50/50 hover:bg-purple-100 text-purple-400 border-dashed border-purple-200'
                                  }`}
                                >
                                  {notaRecup !== null ? `R:${notaRecup}` : 'R:—'}
                                </button>
                              )}
                            </div>
                          </td>
                        );
                      })}

                      {/* Standalone Recuperatorios if any */}
                      {evaluaciones.filter(e => e.tipo === 'RECUPERATORIO' && !e.evaluacion_origen_id).map(ev => {
                        const val = getNotaValue(est.id, ev.id);
                        return (
                          <td key={ev.id} className="px-4 py-3 text-center border-l border-surface-border">
                            <button
                              type="button"
                              onClick={() => handleOpenEditNota(est, ev)}
                              className="px-2.5 py-1 rounded text-xs font-mono font-bold transition-all border bg-purple-50 text-purple-700 border-purple-300"
                            >
                              {val !== null ? val : '—'}
                            </button>
                          </td>
                        );
                      })}

                      {/* Final Condition Badge */}
                      <td className="px-4 py-3 text-center border-l border-surface-border bg-surface-hover/20">
                        <div className="flex flex-col items-center gap-1">
                          <Badge variant={getCondBadgeVariant(item.condicion.condicion)}>
                            {item.condicion.condicion}
                          </Badge>
                          {item.condicion.motivo && (
                            <span className="text-[10px] text-text-muted truncate max-w-[130px]" title={item.condicion.motivo}>
                              {item.condicion.motivo}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Editar / Asignar Calificación */}
      <Modal
        isOpen={isEditNotaModalOpen}
        onClose={() => setIsEditNotaModalOpen(false)}
        title="Asignar Calificación"
        subtitle={selectedStudentForNota && selectedEvalForNota ? `${selectedStudentForNota.apellido}, ${selectedStudentForNota.nombre} — ${selectedEvalForNota.titulo}` : ''}
      >
        <form onSubmit={handleSaveNotaSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-text-secondary mb-1.5">
              Calificación Numérica (1 a 10) *
            </label>
            <input
              type="number"
              step="0.5"
              min="1"
              max="10"
              required
              autoFocus
              placeholder="Ej: 7.5"
              value={inputNotaValor}
              onChange={(e) => setInputNotaValor(e.target.value)}
              className="w-full px-3.5 py-2.5 text-base font-mono font-bold border border-surface-border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none bg-surface text-text-primary"
            />
            <p className="text-[11px] text-text-muted mt-1.5">
              {selectedEvalForNota?.tipo === 'RECUPERATORIO' 
                ? 'Esta nota corresponde a un recuperatorio y no borrará la nota del parcial original.' 
                : 'Escala numérica estándar reglamentaria.'}
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setIsEditNotaModalOpen(false)} type="button">
              Cancelar
            </Button>
            <Button type="submit" loading={savingNota}>
              Guardar Nota
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Crear Nueva Evaluación */}
      <Modal
        isOpen={isNewEvalModalOpen}
        onClose={() => setIsNewEvalModalOpen(false)}
        title="Crear Nueva Evaluación"
        subtitle="Registra un Parcial, Trabajo Práctico, Prueba o Recuperatorio"
      >
        <form onSubmit={handleCreateEvaluacion} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-text-secondary mb-1.5">
              Título o Nombre de la Evaluación *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Parcial N° 1, TP Obligatorio N° 2"
              value={evalTitulo}
              onChange={(e) => setEvalTitulo(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-surface-border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none bg-surface text-text-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-text-secondary mb-1.5">
              Tipo de Evaluación
            </label>
            <select
              value={evalTipo}
              onChange={(e) => setEvalTipo(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-surface-border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none bg-surface text-text-primary"
            >
              <option value="PARCIAL">Parcial (Instancia Mayor)</option>
              <option value="TP">Trabajo Práctico Obligatorio</option>
              <option value="PRUEBA">Prueba Escrita / Evaluación Periódica</option>
              <option value="RECUPERATORIO">Recuperatorio</option>
            </select>
          </div>

          {evalTipo === 'RECUPERATORIO' && (
            <div>
              <label className="block text-xs font-semibold uppercase text-text-secondary mb-1.5">
                Vincular al Parcial Original (Opcional)
              </label>
              <select
                value={evalOrigenId}
                onChange={(e) => setEvalOrigenId(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-surface-border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none bg-surface text-text-primary"
              >
                <option value="">-- Sin vinculación directa --</option>
                {evaluaciones.filter(e => e.tipo === 'PARCIAL' || e.tipo === 'PRUEBA').map(e => (
                  <option key={e.id} value={e.id}>
                    {e.titulo} ({e.tipo})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setIsNewEvalModalOpen(false)} type="button">
              Cancelar
            </Button>
            <Button type="submit" loading={savingEval}>
              Crear Evaluación
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
