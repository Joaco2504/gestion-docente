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
  Award,
  LayoutGrid,
  Table as TableIcon,
  ChevronRight,
  UserCheck,
  Percent,
  Calendar,
  Upload,
  FileText,
  Paperclip,
  X,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Card from '../common/Card';
import Modal from '../common/Modal';
import { SkeletonTable } from '../common/SkeletonLoader';
import { calcularCondicionFinal, calcularPorcentajeAsistencia } from '../../lib/academicLogic';
import { exportGradesToExcel } from '../../lib/excel';
import { supabase, isSupabaseConfigured, uploadCatedraFile } from '../../lib/supabase';
import { formatFechaDMY, parseDMYtoYMD } from '../../lib/dateUtils';
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
  const [inasistenciasDocente, setInasistenciasDocente] = useState([]);
  const [criterios, setCriterios] = useState({
    min_asist_promo: 80,
    min_asist_reg: 70,
    nota_min_promo: 7,
    nota_min_reg: 4,
    nota_min_sec: 6
  });
  const [loading, setLoading] = useState(true);

  // Mobile View mode: 'table' | 'cards'
  const [viewMode, setViewMode] = useState('table');

  // Auto-switch to cards on very small mobile screens
  useEffect(() => {
    if (window.innerWidth < 640) {
      setViewMode('cards');
    }
  }, []);

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
  const [evalFechaEntrega, setEvalFechaEntrega] = useState('');
  const [evalFile, setEvalFile] = useState(null);
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

        // 5. Inasistencias Docente
        const { data: inasistData } = await supabase
          .from('inasistencias_docente')
          .select('*')
          .eq('catedra_id', catedraId);

        // 6. Criterios
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
        setInasistenciasDocente(inasistData || []);
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

        const storedInasist = localStorage.getItem(`inasistencias_docente_${catedraId}`);
        setInasistenciasDocente(storedInasist ? JSON.parse(storedInasist) : []);

        localStorage.setItem(`evaluaciones_${catedraId}`, JSON.stringify(evalList));
        localStorage.setItem(`notas_${catedraId}`, JSON.stringify(notasList));
      }
    } catch (err) {
      console.error('Error fetching grades data:', err);
      toast.error('No se pudieron cargar las calificaciones.');
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
      toast.error('La calificación debe ser un valor numérico entre 1 y 10.');
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

      toast.success(`Nota de ${selectedStudentForNota.apellido} actualizada a ${valNum}`);
      setIsEditNotaModalOpen(false);
    } catch (err) {
      toast.error('Error al guardar la calificación: ' + err.message);
    } finally {
      setSavingNota(false);
    }
  };

  const handleCreateEvaluacion = async (e) => {
    e.preventDefault();
    if (!evalTitulo.trim()) return;

    setSavingEval(true);
    try {
      let archivoUrl = null;
      let archivoNombre = null;

      // 1. Si se adjuntó un archivo de Trabajo Práctico, subirlo
      if (evalFile) {
        if (isSupabaseConfigured && !isDemo) {
          const uploadRes = await uploadCatedraFile(catedraId, evalFile);
          if (uploadRes.error) {
            console.warn('Aviso al subir archivo adjunto:', uploadRes.error);
            toast.error('No se pudo subir el archivo: ' + uploadRes.error.message);
          } else {
            archivoUrl = uploadRes.publicUrl;
            archivoNombre = evalFile.name;
          }
        } else {
          archivoUrl = URL.createObjectURL(evalFile);
          archivoNombre = evalFile.name;
        }

        // Registrar también en la tabla 'recursos' para que aparezca en el repositorio
        if (archivoUrl) {
          try {
            const recCategory = evalTipo === 'PARCIAL' ? 'PARCIAL' : 'TP';
            const newRec = {
              catedra_id: catedraId,
              categoria: recCategory,
              tipo_origen: 'LOCAL',
              titulo: `${evalTitulo.trim()} — ${archivoNombre}`,
              url_o_path: archivoUrl,
              created_at: new Date().toISOString()
            };
            if (isSupabaseConfigured && !isDemo) {
              await supabase.from('recursos').insert(newRec);
            } else {
              const prevRec = JSON.parse(localStorage.getItem(`recursos_${catedraId}`) || '[]');
              localStorage.setItem(`recursos_${catedraId}`, JSON.stringify([{ ...newRec, id: 'rec-' + Date.now() }, ...prevRec]));
            }
          } catch (recErr) {
            console.warn('Aviso al sincronizar con repositorio:', recErr);
          }
        }
      }

      const isoFechaEntrega = evalFechaEntrega ? parseDMYtoYMD(evalFechaEntrega) : null;

      const newEvalObj = {
        catedra_id: catedraId,
        titulo: evalTitulo.trim(),
        tipo: evalTipo,
        evaluacion_origen_id: evalTipo === 'RECUPERATORIO' && evalOrigenId ? evalOrigenId : null,
        fecha_entrega: isoFechaEntrega,
        archivo_url: archivoUrl,
        archivo_nombre: archivoNombre
      };

      if (isSupabaseConfigured && !isDemo) {
        let createdData = null;
        // Intento de inserción con campos extendidos
        const { data, error } = await supabase
          .from('evaluaciones')
          .insert(newEvalObj)
          .select()
          .single();

        if (error) {
          // Si el esquema de Supabase no tiene aún las columnas fecha_entrega / archivo_url
          if (error.message && (error.message.includes('column') || error.message.includes('fecha_entrega') || error.message.includes('archivo_url'))) {
            const baseObj = {
              catedra_id: catedraId,
              titulo: evalTitulo.trim(),
              tipo: evalTipo,
              evaluacion_origen_id: evalTipo === 'RECUPERATORIO' && evalOrigenId ? evalOrigenId : null
            };
            const fallbackRes = await supabase
              .from('evaluaciones')
              .insert(baseObj)
              .select()
              .single();

            if (fallbackRes.error) throw fallbackRes.error;
            createdData = {
              ...fallbackRes.data,
              fecha_entrega: isoFechaEntrega,
              archivo_url: archivoUrl,
              archivo_nombre: archivoNombre
            };
          } else {
            throw error;
          }
        } else {
          createdData = data;
        }

        setEvaluaciones([...evaluaciones, createdData]);
      } else {
        const created = { ...newEvalObj, id: 'eval-' + Date.now() };
        const updated = [...evaluaciones, created];
        setEvaluaciones(updated);
        localStorage.setItem(`evaluaciones_${catedraId}`, JSON.stringify(updated));
      }

      toast.success(`Evaluación "${evalTitulo}" guardada correctamente.`);
      setIsNewEvalModalOpen(false);
      setEvalTitulo('');
      setEvalOrigenId('');
      setEvalFechaEntrega('');
      setEvalFile(null);
    } catch (err) {
      toast.error('Error al crear evaluación: ' + err.message);
    } finally {
      setSavingEval(false);
    }
  };

  // Build matrix data
  const mainEvaluations = evaluaciones.filter(e => e.tipo !== 'RECUPERATORIO');

  const matrixData = estudiantes.map(est => {
    const studentAsistencias = asistencias.filter(a => a.estudiante_id === est.id);
    const asistPct = calcularPorcentajeAsistencia(
      studentAsistencias, 
      clases.length, 
      inasistenciasDocente.length
    );

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
    try {
      exportGradesToExcel(
        { nombre: catedraName, nivel: academicLevel, modalidad },
        estudiantes,
        evaluaciones,
        notas,
        matrixData.map(m => ({ estudianteId: m.estudiante.id, asistenciaPct: m.asistenciaPct, condicion: m.condicion }))
      );
      toast.success('Archivo Excel generado correctamente.');
    } catch (err) {
      toast.error('Error al exportar Excel: ' + err.message);
    }
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
      <div className="py-6 space-y-4">
        <SkeletonTable rows={6} cols={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-12 sm:pb-0">
      {/* Top Action & View Switcher Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface p-4 rounded-2xl border border-surface-border shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-text-primary">
            Sábana de Calificaciones & Condición Final
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            Recuperatorios exhibidos junto al parcial original sin sobreescribir la nota.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* Mobile View Toggle */}
          <div className="inline-flex rounded-xl bg-surface-hover p-1 border border-surface-border">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all touch-target-44 ${
                viewMode === 'table'
                  ? 'bg-surface text-primary shadow-xs'
                  : 'text-text-muted hover:text-text-primary'
              }`}
              title="Vista de tabla tradicional con columna fija"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Tabla</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`p-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all touch-target-44 ${
                viewMode === 'cards'
                  ? 'bg-surface text-primary shadow-xs'
                  : 'text-text-muted hover:text-text-primary'
              }`}
              title="Vista de tarjetas individuales por estudiante"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Tarjetas</span>
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            icon={Download}
            onClick={handleExport}
            disabled={estudiantes.length === 0}
            className="text-xs"
          >
            <span className="hidden sm:inline">Exportar </span>Excel
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => setIsNewEvalModalOpen(true)}
            className="text-xs"
          >
            Nueva Eval.
          </Button>
        </div>
      </div>

      {/* Main Content: Table View vs Student Cards View */}
      {estudiantes.length === 0 ? (
        <Card className="text-center py-12">
          <GraduationCap className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-50" />
          <h4 className="text-base font-semibold text-text-primary">No hay estudiantes inscriptos en esta cátedra</h4>
          <p className="text-xs text-text-muted mt-1 mb-4">
            Ve a la pestaña "Cargar Alumnos (Excel)" para importar la nómina de estudiantes.
          </p>
        </Card>
      ) : viewMode === 'cards' ? (
        /* Mobile-First Student Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {matrixData.map((item, idx) => {
            const est = item.estudiante;
            const initials = `${est.nombre?.[0] || ''}${est.apellido?.[0] || ''}`.toUpperCase();

            return (
              <Card key={est.id} className="p-4 sm:p-5 flex flex-col justify-between space-y-4">
                {/* Student header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-primary/20 text-primary font-bold text-sm flex items-center justify-center shrink-0">
                      {initials}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-text-primary leading-tight">
                        {est.apellido}, {est.nombre}
                      </h4>
                      <span className="text-[11px] font-mono text-text-muted">
                        DNI: {est.dni}
                      </span>
                    </div>
                  </div>

                  {/* Condition Badge */}
                  <Badge variant={getCondBadgeVariant(item.condicion.condicion)}>
                    {item.condicion.condicion}
                  </Badge>
                </div>

                {/* Attendance Mini Bar */}
                <div className="bg-surface-hover/60 p-2.5 rounded-xl border border-surface-border">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-text-muted font-medium flex items-center gap-1">
                      <Percent className="w-3.5 h-3.5" /> Asistencia
                    </span>
                    <span className={`font-mono font-bold ${
                      item.asistenciaPct < 70 ? 'text-rose-600' : 'text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {item.asistenciaPct}%
                    </span>
                  </div>
                  <div className="w-full bg-surface rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        item.asistenciaPct < 70 ? 'bg-rose-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, item.asistenciaPct)}%` }}
                    />
                  </div>
                </div>

                {/* Evaluation grades pills */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                    Evaluaciones y Notas:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {mainEvaluations.map(ev => {
                      const recup = evaluaciones.find(r => r.tipo === 'RECUPERATORIO' && r.evaluacion_origen_id === ev.id);
                      const notaOriginal = getNotaValue(est.id, ev.id);
                      const notaRecup = recup ? getNotaValue(est.id, recup.id) : null;

                      return (
                        <div
                          key={ev.id}
                          className="p-2.5 rounded-xl bg-surface-hover/40 border border-surface-border flex flex-col justify-between"
                        >
                          <div>
                            <span className="text-[11px] font-bold text-text-primary block truncate" title={ev.titulo}>
                              {ev.titulo}
                            </span>
                            {ev.fecha_entrega && (
                              <span className="text-[10px] font-mono text-text-muted flex items-center gap-1 mt-0.5" title={`Fecha de entrega: ${formatFechaDMY(ev.fecha_entrega)}`}>
                                <Clock className="w-2.5 h-2.5 text-primary/70 shrink-0" />
                                <span>Entrega: {formatFechaDMY(ev.fecha_entrega)}</span>
                              </span>
                            )}
                            {ev.archivo_url && (
                              <a
                                href={ev.archivo_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-primary hover:underline inline-flex items-center gap-1 mt-1 font-medium"
                                title={`Ver/Descargar archivo: ${ev.archivo_nombre || 'Consignas'}`}
                              >
                                <FileText className="w-2.5 h-2.5" />
                                <span className="truncate max-w-[120px]">{ev.archivo_nombre || 'Consignas adjuntas'}</span>
                                <Download className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-2">
                            {/* Original note */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditNota(est, ev)}
                              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-mono font-bold transition-all touch-target-44 text-center border ${
                                notaOriginal !== null
                                  ? notaOriginal >= 7
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300'
                                    : notaOriginal >= 4
                                    ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300'
                                    : 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300'
                                  : 'bg-surface hover:bg-surface-hover text-text-muted border-dashed border-surface-border'
                              }`}
                            >
                              {notaOriginal !== null ? notaOriginal : '—'}
                            </button>

                            {/* Recuperatorio if exists */}
                            {recup && (
                              <button
                                type="button"
                                onClick={() => handleOpenEditNota(est, recup)}
                                title={`Recuperatorio: ${recup.titulo}`}
                                className={`py-1.5 px-2 rounded-lg text-[11px] font-mono font-bold transition-all touch-target-44 text-center border ${
                                  notaRecup !== null
                                    ? 'bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300'
                                    : 'bg-purple-50/50 text-purple-400 border-dashed border-purple-200 dark:bg-purple-950/20'
                                }`}
                              >
                                {notaRecup !== null ? `R:${notaRecup}` : 'R:—'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {item.condicion.motivo && (
                  <p className="text-[10px] text-text-muted pt-2 border-t border-surface-border">
                    {item.condicion.motivo}
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        /* High-Density Panoramic Table View with sticky student column */
        <div className="bg-surface rounded-2xl border border-surface-border overflow-hidden shadow-xs">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead className="bg-surface-hover/80 text-text-secondary border-b border-surface-border">
                <tr>
                  <th className="px-3 sm:px-4 py-3 text-center w-12 font-mono">#</th>
                  <th className="px-3 sm:px-4 py-3 font-mono">DNI</th>
                  <th className="px-3 sm:px-4 py-3 min-w-[180px] sm:min-w-[210px]">Estudiante</th>
                  <th className="px-3 py-3 text-center w-24 font-mono">% Asist.</th>

                  {/* Main Evaluation Columns */}
                  {mainEvaluations.map(ev => {
                    const recup = evaluaciones.find(r => r.tipo === 'RECUPERATORIO' && r.evaluacion_origen_id === ev.id);
                    return (
                      <th key={ev.id} className="px-3 sm:px-4 py-3 text-center border-l border-surface-border min-w-[145px] align-top">
                        <div className="font-bold text-text-primary text-xs sm:text-sm truncate" title={ev.titulo}>
                          {ev.titulo}
                        </div>
                        <div className="flex items-center justify-center gap-1 mt-1 flex-wrap">
                          <span className="text-[10px] font-mono uppercase bg-primary/10 dark:bg-primary/20 text-primary px-1.5 py-0.5 rounded font-bold">
                            {ev.tipo}
                          </span>
                          {recup && (
                            <span className="text-[10px] font-mono uppercase bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded font-bold">
                              +RECUP
                            </span>
                          )}
                        </div>

                        {/* Fecha de Entrega si existe */}
                        {ev.fecha_entrega && (
                          <div className="mt-1 flex items-center justify-center gap-1 text-[10px] font-mono text-text-muted" title={`Fecha límite de entrega: ${formatFechaDMY(ev.fecha_entrega)}`}>
                            <Clock className="w-3 h-3 text-primary/70 shrink-0" />
                            <span>Entrega: {formatFechaDMY(ev.fecha_entrega)}</span>
                          </div>
                        )}

                        {/* Archivo consignas de TP si fue subido */}
                        {ev.archivo_url && (
                          <div className="mt-1 flex items-center justify-center">
                            <a
                              href={ev.archivo_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                              title={`Descargar consignas: ${ev.archivo_nombre || 'Documento adjunto'}`}
                            >
                              <FileText className="w-3 h-3 shrink-0" />
                              <span className="truncate max-w-[85px]">{ev.archivo_nombre || 'Consignas'}</span>
                              <Download className="w-2.5 h-2.5 shrink-0" />
                            </a>
                          </div>
                        )}
                      </th>
                    );
                  })}

                  <th className="px-4 py-3 text-center border-l border-surface-border min-w-[150px] bg-surface-hover/90 font-bold">
                    Condición Final
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-surface-border">
                {matrixData.map((item, idx) => {
                  const est = item.estudiante;
                  return (
                    <tr key={est.id} className="hover:bg-surface-hover/40 transition-colors">
                      <td className="px-3 sm:px-4 py-3 text-center text-text-muted font-mono">{idx + 1}</td>
                      <td className="px-3 sm:px-4 py-3 font-mono text-text-secondary">{est.dni}</td>
                      <td className="px-3 sm:px-4 py-3 font-semibold text-text-primary whitespace-nowrap">
                        {est.apellido}, {est.nombre}
                      </td>

                      {/* Attendance % */}
                      <td className="px-3 py-3 text-center font-mono">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          item.asistenciaPct < 70 
                            ? 'bg-red-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300' 
                            : 'bg-green-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
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
                          <td key={ev.id} className="px-3 sm:px-4 py-3 text-center border-l border-surface-border">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Original note button */}
                              <button
                                type="button"
                                onClick={() => handleOpenEditNota(est, ev)}
                                title={`Editar nota de ${ev.titulo}`}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all border touch-target-44 flex items-center justify-center ${
                                  notaOriginal !== null
                                    ? notaOriginal >= 7
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800 hover:bg-emerald-100'
                                      : notaOriginal >= 4
                                      ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800 hover:bg-amber-100'
                                      : 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800 hover:bg-rose-100'
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
                                  className={`px-2 py-1.5 rounded-lg text-xs font-mono font-bold transition-all border touch-target-44 flex items-center justify-center ${
                                    notaRecup !== null
                                      ? notaRecup >= 4
                                        ? 'bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800 hover:bg-purple-100'
                                        : 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800 hover:bg-rose-100'
                                      : 'bg-purple-50/50 hover:bg-purple-100 text-purple-400 border-dashed border-purple-200 dark:bg-purple-950/20'
                                  }`}
                                >
                                  {notaRecup !== null ? `R:${notaRecup}` : 'R:—'}
                                </button>
                              )}
                            </div>
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

      {/* Modal / Bottom Sheet Editar Nota */}
      <Modal
        isOpen={isEditNotaModalOpen}
        onClose={() => setIsEditNotaModalOpen(false)}
        title="Asignar Calificación"
        subtitle={selectedStudentForNota && selectedEvalForNota ? `${selectedStudentForNota.apellido}, ${selectedStudentForNota.nombre} • ${selectedEvalForNota.titulo}` : ''}
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
              className="w-full px-3.5 py-3 text-lg font-mono font-bold border border-surface-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none bg-surface text-text-primary"
            />
            <p className="text-[11px] text-text-muted mt-1.5">
              {selectedEvalForNota?.tipo === 'RECUPERATORIO' 
                ? 'Nota de examen recuperatorio: se conserva en paralelo sin sobreescribir la nota del examen original.' 
                : 'Escala numérica estándar reglamentaria de 1 a 10.'}
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-surface-border">
            <Button variant="secondary" onClick={() => setIsEditNotaModalOpen(false)} type="button">
              Cancelar
            </Button>
            <Button type="submit" loading={savingNota}>
              Guardar Nota
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal / Bottom Sheet Nueva Evaluación */}
      <Modal
        isOpen={isNewEvalModalOpen}
        onClose={() => {
          setIsNewEvalModalOpen(false);
          setEvalFile(null);
        }}
        title="Crear Nueva Evaluación"
        subtitle="Registra un Parcial, Trabajo Práctico o Recuperatorio con fecha de entrega y consignas"
      >
        <form onSubmit={handleCreateEvaluacion} className="space-y-4">
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl text-xs text-text-secondary leading-relaxed flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <span>
              Puedes registrar la evaluación ahora y subir sus consignas. Se guardará de inmediato y los estudiantes no serán penalizados mientras el trabajo esté en plazo de entrega.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-text-secondary mb-1.5">
              Título o Nombre de la Evaluación *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: TP N° 1 - Modelado Relacional, Parcial 1..."
              value={evalTitulo}
              onChange={(e) => setEvalTitulo(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-surface-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none bg-surface text-text-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold uppercase text-text-secondary mb-1.5">
                Tipo de Evaluación *
              </label>
              <select
                value={evalTipo}
                onChange={(e) => setEvalTipo(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-surface-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none bg-surface text-text-primary cursor-pointer"
              >
                <option value="PARCIAL">Parcial (Instancia Mayor)</option>
                <option value="TP">Trabajo Práctico Obligatorio</option>
                <option value="PRUEBA">Prueba Escrita / Evaluación Periódica</option>
                <option value="RECUPERATORIO">Recuperatorio</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase text-text-secondary">
                  Fecha de Entrega (Opcional)
                </label>
                {evalFechaEntrega && (
                  <span className="text-[10px] font-mono text-primary font-bold">
                    {formatFechaDMY(evalFechaEntrega)}
                  </span>
                )}
              </div>
              <input
                type="date"
                value={evalFechaEntrega}
                onChange={(e) => setEvalFechaEntrega(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm font-mono border border-surface-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none bg-surface text-text-primary"
              />
            </div>
          </div>

          {evalTipo === 'RECUPERATORIO' && (
            <div>
              <label className="block text-xs font-semibold uppercase text-text-secondary mb-1.5">
                Vincular al Parcial Original (Opcional)
              </label>
              <select
                value={evalOrigenId}
                onChange={(e) => setEvalOrigenId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-surface-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none bg-surface text-text-primary cursor-pointer"
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

          {/* Subir archivo de Trabajo Práctico / Consignas */}
          <div>
            <label className="block text-xs font-semibold uppercase text-text-secondary mb-1.5">
              Subir Consignas / Documento del Trabajo Práctico (Opcional)
            </label>
            {!evalFile ? (
              <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-surface-border rounded-2xl cursor-pointer hover:border-primary/50 hover:bg-surface-hover transition-all group">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary mb-2 group-hover:scale-110 transition-transform">
                  <Upload className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-text-primary">
                  Haz clic para adjuntar las consignas
                </span>
                <span className="text-[11px] text-text-muted mt-0.5">
                  Formatos admitidos: PDF, Word (.doc, .docx), Excel, ZIP
                </span>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setEvalFile(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="flex items-center justify-between p-3 rounded-xl bg-surface-hover border border-surface-border">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-text-primary truncate">
                      {evalFile.name}
                    </p>
                    <p className="text-[10px] text-text-muted font-mono">
                      {(evalFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEvalFile(null)}
                  className="p-1.5 rounded-lg hover:bg-danger/10 text-text-muted hover:text-danger transition-colors"
                  title="Quitar archivo adjunto"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-surface-border">
            <Button
              variant="secondary"
              onClick={() => {
                setIsNewEvalModalOpen(false);
                setEvalFile(null);
              }}
              type="button"
              disabled={savingEval}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={savingEval}>
              Guardar Evaluación
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
