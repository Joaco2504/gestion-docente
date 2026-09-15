import React, { useState, useEffect, useMemo } from 'react';
import { 
  Award, 
  Calendar as CalendarIcon, 
  Plus, 
  Edit3, 
  Trash2, 
  Printer, 
  Users, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Search, 
  ArrowLeft,
  BookOpen,
  UserCheck,
  Percent,
  Download,
  ShieldCheck,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
  CheckSquare,
  Lock
} from 'lucide-react';
import { toast } from 'sonner';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Card from '../common/Card';
import Modal from '../common/Modal';
import CustomSelect from '../common/CustomSelect';
import EmptyState from '../common/EmptyState';
import ExpandableSearch from '../common/ExpandableSearch';
import { SkeletonTable } from '../common/SkeletonLoader';
import PrintPreviewModal from '../common/PrintPreviewModal';
import CargarAlumnosMesaModal from './CargarAlumnosMesaModal';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { formatFechaDMY, getTodayYMD } from '../../lib/dateUtils';

const TURNO_OPTIONS = [
  { value: '1° LLAMADO', label: '1° Llamado (Turno Ordinario)' },
  { value: '2° LLAMADO', label: '2° Llamado (Turno Ordinario)' },
  { value: 'TURNO ESPECIAL MAYO', label: 'Turno Especial (Mayo)' },
  { value: 'TURNO ESPECIAL SEPTIEMBRE', label: 'Turno Especial (Septiembre)' },
  { value: 'TURNO EXTRAORDINARIO', label: 'Turno Extraordinario' },
  { value: 'PROMOCIONAL DIRECTA', label: '🎖️ Promoción Directa (Cierre Cursada)' }
];

export default function MesasExamenTab({ 
  catedraId, 
  catedraName, 
  academicLevel = 'TERCIARIO', 
  modalidad = 'ANUAL',
  cursadaFinalizada = false 
}) {
  const { user, isDemo } = useAuth();
  const { activeCiclo, catedras } = useApp();

  const currentCatedra = useMemo(() => {
    return catedras.find(c => c.id === catedraId) || { id: catedraId, nombre: catedraName };
  }, [catedras, catedraId, catedraName]);

  const [mesas, setMesas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Mesa seleccionada para carga de notas / acta volante
  const [selectedMesa, setSelectedMesa] = useState(null);
  const [actasAlumnos, setActasAlumnos] = useState([]);
  const [loadingActa, setLoadingActa] = useState(false);
  const [savingActa, setSavingActa] = useState(false);

  // Modal: Nueva / Editar Mesa
  const [isMesaModalOpen, setIsMesaModalOpen] = useState(false);
  const [editingMesa, setEditingMesa] = useState(null);
  const [mesaTipo, setMesaTipo] = useState('FINAL'); // 'FINAL' | 'PROMOCIONAL'
  const [mesaFecha, setMesaFecha] = useState(getTodayYMD());
  const [mesaTurno, setMesaTurno] = useState('1° LLAMADO');
  const [mesaLibro, setMesaLibro] = useState('');
  const [mesaTomo, setMesaTomo] = useState('');
  const [mesaFolio, setMesaFolio] = useState('');
  const [mesaActaNumero, setMesaActaNumero] = useState('');
  const [mesaPresidente, setMesaPresidente] = useState('');
  const [mesaVocal1, setMesaVocal1] = useState('');
  const [mesaVocal2, setMesaVocal2] = useState('');
  const [isAccordionOpen, setIsAccordionOpen] = useState(false);

  // Modal: Cargar Alumnos a la Mesa (Multi-selector inteligente)
  const [isCargarAlumnosModalOpen, setIsCargarAlumnosModalOpen] = useState(false);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [catedraEvaluaciones, setCatedraEvaluaciones] = useState([]);
  const [catedraNotas, setCatedraNotas] = useState([]);

  // Modal: Inscribir Alumno Individual a la Mesa
  const [isInscribirModalOpen, setIsInscribirModalOpen] = useState(false);
  const [inscribirDni, setInscribirDni] = useState('');
  const [inscribirNombre, setInscribirNombre] = useState('');
  const [inscribirCondicion, setInscribirCondicion] = useState('REGULAR');

  // Modal Impresión Reglamentaria
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [mesaToPrint, setMesaToPrint] = useState(null);
  const [alumnosToPrint, setAlumnosToPrint] = useState([]);

  // =========================================================================
  // CARGA DE MESAS DE EXAMEN
  // =========================================================================
  useEffect(() => {
    fetchMesas();
    fetchAvailableStudents();
    fetchCatedraEvaluacionesYNotas();
  }, [catedraId]);

  async function fetchCatedraEvaluacionesYNotas() {
    try {
      if (isSupabaseConfigured && !isDemo) {
        const [evRes, nRes] = await Promise.all([
          supabase.from('evaluaciones').select('*').eq('catedra_id', catedraId),
          supabase.from('notas').select('*')
        ]);
        if (evRes.data) setCatedraEvaluaciones(evRes.data);
        if (nRes.data) setCatedraNotas(nRes.data);
      } else {
        const storedEv = JSON.parse(localStorage.getItem(`evaluaciones_${catedraId}`) || '[]');
        const storedN = JSON.parse(localStorage.getItem(`notas_${catedraId}`) || '[]');
        setCatedraEvaluaciones(storedEv);
        setCatedraNotas(storedN);
      }
    } catch (_) {}
  }

  async function fetchMesas() {
    setLoading(true);
    try {
      if (isSupabaseConfigured && !isDemo) {
        const { data, error } = await supabase
          .from('mesas_examen')
          .select('*')
          .eq('catedra_id', catedraId)
          .order('fecha', { ascending: false });

        if (error) {
          console.warn('Error fetching mesas from Supabase, checking fallback:', error);
          loadFallbackMesas();
        } else {
          setMesas(data || []);
          try {
            localStorage.setItem(`mesas_examen_${catedraId}`, JSON.stringify(data || []));
          } catch (_) {}
        }
      } else {
        loadFallbackMesas();
      }
    } catch (err) {
      console.error('Error in fetchMesas:', err);
      loadFallbackMesas();
    } finally {
      setLoading(false);
    }
  }

  function loadFallbackMesas() {
    try {
      const stored = localStorage.getItem(`mesas_examen_${catedraId}`);
      if (stored) {
        setMesas(JSON.parse(stored));
        return;
      }
    } catch (_) {}

    // Semilla inicial demostrativa con una mesa regular y una mesa promocional
    const initialDemoMesas = [
      {
        id: 'mesa-demo-promo',
        catedra_id: catedraId,
        fecha: getTodayYMD(),
        turno_llamado: 'PROMOCIONAL DIRECTA',
        tipo_mesa: 'PROMOCIONAL',
        libro: 'IX',
        tomo: '1',
        folio: '45',
        acta_numero: '2026-P01',
        presidente: user?.user_metadata?.nombre_completo || 'Prof. Titular',
        vocal_1: 'Lic. García',
        vocal_2: 'Prof. Romero',
        created_at: new Date().toISOString()
      },
      {
        id: 'mesa-demo-final',
        catedra_id: catedraId,
        fecha: getTodayYMD(),
        turno_llamado: '1° LLAMADO',
        tipo_mesa: 'FINAL',
        libro: 'VIII',
        tomo: '1',
        folio: '142',
        acta_numero: '2026-09',
        presidente: user?.user_metadata?.nombre_completo || 'Prof. Titular',
        vocal_1: 'Lic. García',
        vocal_2: 'Prof. Romero',
        created_at: new Date().toISOString()
      }
    ];
    setMesas(initialDemoMesas);
    localStorage.setItem(`mesas_examen_${catedraId}`, JSON.stringify(initialDemoMesas));
  }

  // =========================================================================
  // CARGA DE ACTA / ALUMNOS DE LA MESA SELECCIONADA
  // =========================================================================
  useEffect(() => {
    if (selectedMesa) {
      fetchActaAlumnos(selectedMesa.id);
      fetchAvailableStudents();
    } else {
      setActasAlumnos([]);
    }
  }, [selectedMesa]);

  async function fetchActaAlumnos(mesaId) {
    setLoadingActa(true);
    try {
      if (isSupabaseConfigured && !isDemo) {
        const { data, error } = await supabase
          .from('actas_examen_alumnos')
          .select('*')
          .eq('mesa_id', mesaId)
          .order('alumno_nombre_completo', { ascending: true });

        if (error) {
          console.warn('Error fetching actas from Supabase, loading fallback:', error);
          loadFallbackActas(mesaId);
        } else {
          setActasAlumnos(data || []);
          try {
            localStorage.setItem(`actas_examen_${mesaId}`, JSON.stringify(data || []));
          } catch (_) {}
        }
      } else {
        loadFallbackActas(mesaId);
      }
    } catch (err) {
      console.error('Error in fetchActaAlumnos:', err);
      loadFallbackActas(mesaId);
    } finally {
      setLoadingActa(false);
    }
  }

  function loadFallbackActas(mesaId) {
    try {
      const stored = localStorage.getItem(`actas_examen_${mesaId}`);
      if (stored) {
        setActasAlumnos(JSON.parse(stored));
      } else {
        setActasAlumnos([]);
      }
    } catch (_) {
      setActasAlumnos([]);
    }
  }

  // Carga lista de alumnos de la cátedra para autocompletar
  async function fetchAvailableStudents() {
    try {
      if (isSupabaseConfigured && !isDemo) {
        const { data } = await supabase
          .from('inscripciones')
          .select(`
            estudiante_id,
            condicion,
            estado_academico,
            nota_final,
            estudiantes ( id, dni, apellido, nombre )
          `)
          .eq('catedra_id', catedraId);

        if (data) {
          const list = data
            .map(i => ({
              ...i.estudiantes,
              condicion: i.condicion || 'REGULAR',
              estado_academico: i.estado_academico || 'CURSANDO',
              nota_final: i.nota_final
            }))
            .filter(s => s && s.id)
            .sort((a, b) => (a.apellido || '').localeCompare(b.apellido || ''));
          setAvailableStudents(list);
          return;
        }
      }
      // Fallback local
      const stored = localStorage.getItem(`estudiantes_${catedraId}`);
      if (stored) {
        setAvailableStudents(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Error fetching available students:', err);
    }
  };

  // =========================================================================
  // ACCIONES DE MESA (CREAR / EDITAR / ELIMINAR)
  // =========================================================================
  const handleOpenNewMesaModal = (tipo = 'FINAL') => {
    setEditingMesa(null);
    setMesaFecha(getTodayYMD());
    setMesaTurno(tipo === 'PROMOCIONAL' ? 'PROMOCIONAL DIRECTA' : '1° LLAMADO');
    setMesaTipo(tipo);
    setMesaLibro('');
    setMesaTomo('');
    setMesaFolio('');
    setMesaActaNumero('');
    const teacherName = user?.user_metadata?.nombre_completo || user?.user_metadata?.full_name || user?.email || 'Prof. Titular';
    setMesaPresidente(teacherName);
    setMesaVocal1('');
    setMesaVocal2('');
    setIsAccordionOpen(false);
    setIsMesaModalOpen(true);
  };

  const handleOpenEditMesaModal = (mesa, e) => {
    if (e) e.stopPropagation();
    setEditingMesa(mesa);
    setMesaFecha(mesa.fecha);
    setMesaTurno(mesa.turno_llamado || '1° LLAMADO');
    setMesaTipo(mesa.tipo_mesa || 'FINAL');
    setMesaLibro(mesa.libro || '');
    setMesaTomo(mesa.tomo || '');
    setMesaFolio(mesa.folio || '');
    setMesaActaNumero(mesa.acta_numero || '');
    setMesaPresidente(mesa.presidente || '');
    setMesaVocal1(mesa.vocal1 || mesa.vocal_1 || '');
    setMesaVocal2(mesa.vocal2 || mesa.vocal_2 || '');
    setIsAccordionOpen(Boolean(mesa.libro || mesa.tomo || mesa.folio || mesa.acta_numero || mesa.vocal1 || mesa.vocal_1 || mesa.vocal2 || mesa.vocal_2));
    setIsMesaModalOpen(true);
  };

  const handleSaveMesa = async (e) => {
    e.preventDefault();
    if (!mesaFecha) {
      toast.error('Indica la fecha de constitución de la mesa.');
      return;
    }

    const mesaPayload = {
      catedra_id: catedraId,
      docente_id: user?.id,
      fecha: mesaFecha,
      turno_llamado: mesaTurno,
      tipo_mesa: mesaTipo || 'FINAL',
      libro: (mesaLibro || '').trim(),
      tomo: (mesaTomo || '').trim(),
      folio: (mesaFolio || '').trim(),
      acta_numero: (mesaActaNumero || '').trim(),
      presidente: (mesaPresidente || '').trim(),
      vocal_1: (mesaVocal1 || '').trim(),
      vocal_2: (mesaVocal2 || '').trim()
    };

    try {
      if (isSupabaseConfigured && !isDemo) {
        if (editingMesa) {
          let { error } = await supabase
            .from('mesas_examen')
            .update(mesaPayload)
            .eq('id', editingMesa.id);

          // Si la base de datos utiliza vocal1 o no tiene tipo_mesa
          if (error && (error.message?.includes('vocal_1') || error.message?.includes('tipo_mesa') || error.code === '42703')) {
            const fallbackPayload = {
              ...mesaPayload,
              vocal1: mesaPayload.vocal_1,
              vocal2: mesaPayload.vocal_2
            };
            delete fallbackPayload.vocal_1;
            delete fallbackPayload.vocal_2;
            if (error.message?.includes('tipo_mesa')) delete fallbackPayload.tipo_mesa;

            const resFallback = await supabase
              .from('mesas_examen')
              .update(fallbackPayload)
              .eq('id', editingMesa.id);
            error = resFallback.error;
          }

          if (error) throw error;
          toast.success('Mesa de examen actualizada con éxito.');
        } else {
          let { error } = await supabase
            .from('mesas_examen')
            .insert([mesaPayload]);

          // Si la base de datos utiliza vocal1 o no tiene tipo_mesa
          if (error && (error.message?.includes('vocal_1') || error.message?.includes('tipo_mesa') || error.code === '42703')) {
            const fallbackPayload = {
              ...mesaPayload,
              vocal1: mesaPayload.vocal_1,
              vocal2: mesaPayload.vocal_2
            };
            delete fallbackPayload.vocal_1;
            delete fallbackPayload.vocal_2;
            if (error.message?.includes('tipo_mesa')) delete fallbackPayload.tipo_mesa;

            const resFallback = await supabase
              .from('mesas_examen')
              .insert([fallbackPayload]);
            error = resFallback.error;
          }

          if (error) throw error;
          toast.success('Mesa de examen constituida exitosamente.');
        }
      } else {
        // Modo local
        if (editingMesa) {
          const updated = mesas.map(m => m.id === editingMesa.id ? { ...m, ...mesaPayload } : m);
          setMesas(updated);
          localStorage.setItem(`mesas_examen_${catedraId}`, JSON.stringify(updated));
          toast.success('Mesa de examen actualizada.');
        } else {
          const newMesa = {
            id: `mesa-${Date.now()}`,
            ...mesaPayload,
            created_at: new Date().toISOString()
          };
          const updated = [newMesa, ...mesas];
          setMesas(updated);
          localStorage.setItem(`mesas_examen_${catedraId}`, JSON.stringify(updated));
          toast.success('Mesa de examen creada exitosamente.');
        }
      }

      setIsMesaModalOpen(false);
      fetchMesas();
    } catch (err) {
      console.error('Error saving mesa:', err);
      toast.error('No se pudo guardar la mesa de examen.');
    }
  };

  const handleDeleteMesa = async (mesa, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`¿Estás seguro de eliminar la mesa del ${formatFechaDMY(mesa.fecha)} (${mesa.turno_llamado}) y todas sus notas asociadas?`)) {
      return;
    }

    try {
      if (isSupabaseConfigured && !isDemo) {
        const { error } = await supabase
          .from('mesas_examen')
          .delete()
          .eq('id', mesa.id);
        if (error) throw error;
      }
      const updated = mesas.filter(m => m.id !== mesa.id);
      setMesas(updated);
      localStorage.setItem(`mesas_examen_${catedraId}`, JSON.stringify(updated));
      if (selectedMesa?.id === mesa.id) {
        setSelectedMesa(null);
      }
      toast.success('Mesa de examen eliminada.');
    } catch (err) {
      console.error('Error deleting mesa:', err);
      toast.error('Error al eliminar la mesa de examen.');
    }
  };

  // =========================================================================
  // GESTIÓN DE NOTAS Y ACTA VOLANTE
  // =========================================================================
  
  // Recalcula nota definitiva y dictamen según normativa terciaria/universitaria
  const calculateNotaDefinitivaYDictamen = (escritoStr, oralStr, condicion) => {
    const hasEscrito = escritoStr !== '' && escritoStr !== null && escritoStr !== undefined;
    const hasOral = oralStr !== '' && oralStr !== null && oralStr !== undefined;

    if (!hasEscrito && !hasOral) {
      return { nota_definitiva: null, dictamen: 'AUSENTE' };
    }

    const nEscrito = hasEscrito ? Number(escritoStr) : null;
    const nOral = hasOral ? Number(oralStr) : null;

    // Si es Libre: debe aprobar escrito (>= 4) para rendir oral y promediar
    if (condicion === 'LIBRE') {
      if (nEscrito !== null && nEscrito < 4) {
        return { nota_definitiva: nEscrito, dictamen: 'DESAPROBADO' };
      }
      if (nOral !== null && nOral < 4) {
        return { nota_definitiva: nOral, dictamen: 'DESAPROBADO' };
      }
    }

    let finalNota = 0;
    if (nEscrito !== null && nOral !== null) {
      finalNota = Math.round((nEscrito + nOral) / 2);
    } else if (nEscrito !== null) {
      finalNota = nEscrito;
    } else if (nOral !== null) {
      finalNota = nOral;
    }

    const dictamen = finalNota >= 4 ? 'APROBADO' : 'DESAPROBADO';
    return { nota_definitiva: finalNota, dictamen };
  };

  const handleGradeChange = (index, field, value) => {
    const updated = [...actasAlumnos];
    const item = { ...updated[index], [field]: value === '' ? null : value };

    // Recalcular automáticamente si cambia escrito u oral o condición
    if (field === 'nota_escrito' || field === 'nota_oral' || field === 'condicion_previa') {
      const calc = calculateNotaDefinitivaYDictamen(
        field === 'nota_escrito' ? value : item.nota_escrito,
        field === 'nota_oral' ? value : item.nota_oral,
        field === 'condicion_previa' ? value : item.condicion_previa
      );
      item.nota_definitiva = calc.nota_definitiva;
      item.dictamen = calc.dictamen;
    }

    updated[index] = item;
    setActasAlumnos(updated);
  };

  const handleDictamenOverride = (index, dictamen) => {
    const updated = [...actasAlumnos];
    updated[index] = { ...updated[index], dictamen };
    setActasAlumnos(updated);
  };

  const handleAlumnosSelectedFromModal = (selectedStudents, isPromo, averageMap) => {
    const existingDnis = new Set(actasAlumnos.map(a => String(a.alumno_dni || '').trim()));
    const toAdd = selectedStudents.filter(s => !existingDnis.has(String(s.dni || '').trim()));

    if (toAdd.length === 0) {
      toast.info('Los alumnos seleccionados ya se encuentran en el acta.');
      return;
    }

    const newRows = toAdd.map(s => {
      const isStudentPromo = isPromo && (s.condicion === 'PROMOCIONAL');
      const cursadaAvg = isStudentPromo ? (averageMap?.get(s.id) || 7) : null;

      return {
        id: `temp-${Date.now()}-${s.id || s.dni}`,
        mesa_id: selectedMesa.id,
        estudiante_id: s.id,
        alumno_nombre_completo: `${s.apellido}, ${s.nombre}`,
        alumno_dni: s.dni || '',
        condicion_previa: s.condicion || (isPromo ? 'PROMOCIONAL' : 'REGULAR'),
        nota_escrito: null,
        nota_oral: null,
        nota_definitiva: isStudentPromo ? cursadaAvg : null,
        dictamen: isStudentPromo ? 'ACREDITADO' : 'AUSENTE',
        observaciones: isStudentPromo ? 'Acreditación por Promoción Directa' : ''
      };
    });

    const merged = [...actasAlumnos, ...newRows].sort((a, b) => 
      a.alumno_nombre_completo.localeCompare(b.alumno_nombre_completo)
    );

    setActasAlumnos(merged);
    toast.success(`Se agregaron ${toAdd.length} alumnos a la mesa de examen.`);
  };

  const handleSaveActaCalificaciones = async () => {
    if (!selectedMesa) return;
    setSavingActa(true);

    try {
      if (isSupabaseConfigured && !isDemo) {
        let rpcSuccessful = false;

        // 1. Intentar registrar mediante RPC atómica
        try {
          for (const a of actasAlumnos) {
            const rpcPayload = {
              p_acta_alumno_id: String(a.id).startsWith('temp-') ? null : a.id,
              p_mesa_id: selectedMesa.id,
              p_estudiante_id: a.estudiante_id || null,
              p_alumno_nombre_completo: a.alumno_nombre_completo,
              p_alumno_dni: a.alumno_dni || '',
              p_condicion_previa: a.condicion_previa || 'REGULAR',
              p_nota_escrito: a.nota_escrito !== null && a.nota_escrito !== '' ? Number(a.nota_escrito) : null,
              p_nota_oral: a.nota_oral !== null && a.nota_oral !== '' ? Number(a.nota_oral) : null,
              p_nota_definitiva: a.nota_definitiva !== null && a.nota_definitiva !== '' ? Number(a.nota_definitiva) : null,
              p_dictamen: a.dictamen || 'AUSENTE',
              p_observaciones: a.observaciones || ''
            };
            const { error: rpcError } = await supabase.rpc('registrar_resultado_examen', rpcPayload);
            if (rpcError) throw rpcError;
          }
          rpcSuccessful = true;
        } catch (rpcErr) {
          console.warn('Fallback por ausencia o error en RPC registrar_resultado_examen:', rpcErr);
        }

        // 2. Fallback de guardado directo si la RPC no existe aún
        if (!rpcSuccessful) {
          const rows = actasAlumnos.map(a => ({
            id: String(a.id).startsWith('temp-') ? undefined : a.id,
            mesa_id: selectedMesa.id,
            estudiante_id: a.estudiante_id || null,
            alumno_nombre_completo: a.alumno_nombre_completo,
            alumno_dni: a.alumno_dni,
            condicion_previa: a.condicion_previa,
            nota_escrito: a.nota_escrito !== null && a.nota_escrito !== '' ? Number(a.nota_escrito) : null,
            nota_oral: a.nota_oral !== null && a.nota_oral !== '' ? Number(a.nota_oral) : null,
            nota_definitiva: a.nota_definitiva !== null && a.nota_definitiva !== '' ? Number(a.nota_definitiva) : null,
            dictamen: a.dictamen || 'AUSENTE',
            observaciones: a.observaciones || ''
          }));

          const { error: upsertErr } = await supabase
            .from('actas_examen_alumnos')
            .upsert(rows, { onConflict: 'id' });
          if (upsertErr) throw upsertErr;

          // Actualizar acreditación en inscripciones para los aprobados / acreditados
          const fechaAcreditacion = selectedMesa.fecha ? new Date(selectedMesa.fecha).toISOString() : new Date().toISOString();
          for (const a of actasAlumnos) {
            if (a.estudiante_id && (a.dictamen === 'ACREDITADO' || a.dictamen === 'APROBADO')) {
              try {
                await supabase
                  .from('inscripciones')
                  .update({
                    estado_academico: 'ACREDITADO',
                    nota_final: a.nota_definitiva,
                    fecha_acreditacion: fechaAcreditacion
                  })
                  .eq('catedra_id', catedraId)
                  .eq('estudiante_id', a.estudiante_id);
              } catch (_) {}
            }
          }
        }
      }

      // 3. Persistencia local garantizada
      localStorage.setItem(`actas_examen_${selectedMesa.id}`, JSON.stringify(actasAlumnos));

      // Actualizar estudiantes locales acreditados
      try {
        const storedEst = JSON.parse(localStorage.getItem(`estudiantes_${catedraId}`) || '[]');
        const updatedEst = storedEst.map(s => {
          const matchingActa = actasAlumnos.find(a => 
            a.estudiante_id === s.id || (a.alumno_dni && s.dni && String(a.alumno_dni) === String(s.dni))
          );
          if (matchingActa && (matchingActa.dictamen === 'ACREDITADO' || matchingActa.dictamen === 'APROBADO')) {
            return {
              ...s,
              estado_academico: 'ACREDITADO',
              nota_final: matchingActa.nota_definitiva,
              fecha_acreditacion: selectedMesa.fecha || new Date().toISOString()
            };
          }
          return s;
        });
        localStorage.setItem(`estudiantes_${catedraId}`, JSON.stringify(updatedEst));
      } catch (_) {}

      toast.success('Calificaciones y acreditaciones guardadas con éxito.');
      fetchActaAlumnos(selectedMesa.id);
      fetchAvailableStudents();
    } catch (err) {
      console.error('Error saving acta:', err);
      localStorage.setItem(`actas_examen_${selectedMesa.id}`, JSON.stringify(actasAlumnos));
      toast.success('Guardado en almacenamiento local seguro.');
    } finally {
      setSavingActa(false);
    }
  };

  const handleInscribirIndividual = (e) => {
    e.preventDefault();
    if (!inscribirNombre.trim()) {
      toast.error('Ingresa el apellido y nombre del alumno.');
      return;
    }

    const newRow = {
      id: `temp-${Date.now()}`,
      mesa_id: selectedMesa.id,
      estudiante_id: null,
      alumno_nombre_completo: inscribirNombre.trim().toUpperCase(),
      alumno_dni: inscribirDni.trim(),
      condicion_previa: inscribirCondicion,
      nota_escrito: null,
      nota_oral: null,
      nota_definitiva: null,
      dictamen: 'AUSENTE',
      observaciones: ''
    };

    const updated = [...actasAlumnos, newRow].sort((a, b) => 
      a.alumno_nombre_completo.localeCompare(b.alumno_nombre_completo)
    );

    setActasAlumnos(updated);
    setIsInscribirModalOpen(false);
    setInscribirDni('');
    setInscribirNombre('');
    setInscribirCondicion('REGULAR');
    toast.success('Alumno inscripto a la mesa.');
  };

  const handleRemoveAlumnoFromActa = (index) => {
    const updated = actasAlumnos.filter((_, i) => i !== index);
    setActasAlumnos(updated);
    toast.info('Alumno removido del acta.');
  };

  // Abrir vista de impresión reglamentaria
  const handleOpenPrintModal = (mesa, e) => {
    if (e) e.stopPropagation();
    setMesaToPrint(mesa);
    
    // Si la mesa es la activa usamos actasAlumnos, sino recuperamos de storage
    if (selectedMesa?.id === mesa.id) {
      setAlumnosToPrint(actasAlumnos);
    } else {
      try {
        const stored = localStorage.getItem(`actas_examen_${mesa.id}`);
        setAlumnosToPrint(stored ? JSON.parse(stored) : []);
      } catch (_) {
        setAlumnosToPrint([]);
      }
    }
    setIsPrintModalOpen(true);
  };

  // Filtro reactivo de mesas
  const filteredMesas = useMemo(() => {
    if (!searchQuery.trim()) return mesas;
    const q = searchQuery.toLowerCase();
    return mesas.filter(m => 
      (m.turno_llamado && m.turno_llamado.toLowerCase().includes(q)) ||
      (m.acta_numero && m.acta_numero.toLowerCase().includes(q)) ||
      (m.presidente && m.presidente.toLowerCase().includes(q)) ||
      (m.fecha && m.fecha.includes(q))
    );
  }, [mesas, searchQuery]);

  // Resumen estadístico de la mesa seleccionada
  const statsSelectedMesa = useMemo(() => {
    const total = actasAlumnos.length;
    const ausentes = actasAlumnos.filter(a => a.dictamen === 'AUSENTE').length;
    const presentes = total - ausentes;
    const aprobados = actasAlumnos.filter(a => a.dictamen === 'APROBADO' || a.dictamen === 'ACREDITADO').length;
    const desaprobados = actasAlumnos.filter(a => a.dictamen === 'DESAPROBADO').length;
    const pctAprobacion = presentes > 0 ? Math.round((aprobados / presentes) * 100) : 0;
    return { total, ausentes, presentes, aprobados, desaprobados, pctAprobacion };
  }, [actasAlumnos]);

  return (
    <div className="space-y-6">
      
      {/* =========================================================================
          VISTA 1: DETALLE Y CARGA DE NOTAS DE LA MESA SELECCIONADA
      ========================================================================= */}
      {selectedMesa ? (
        <div className="space-y-6 animate-fadeIn">
          {/* Header Superior de la Mesa */}
          <div className="backdrop-blur-xl bg-white/75 dark:bg-slate-900/60 rounded-3xl border border-slate-200/80 dark:border-white/10 p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <button
                onClick={() => setSelectedMesa(null)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-text-muted hover:text-primary transition-colors mb-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver a todas las mesas</span>
              </button>
              
              <div className="flex items-center gap-2.5 flex-wrap">
                <Badge 
                  variant={selectedMesa.tipo_mesa === 'PROMOCIONAL' ? 'success' : 'primary'} 
                  className="font-bold text-xs uppercase"
                >
                  {selectedMesa.tipo_mesa === 'PROMOCIONAL' ? '🎖️ PROMOCIONAL' : selectedMesa.turno_llamado}
                </Badge>
                <span className="text-xs font-mono font-bold text-text-secondary">
                  {formatFechaDMY(selectedMesa.fecha)}
                </span>
                <span className="text-xs text-text-muted bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-lg border border-slate-200/60 dark:border-white/5">
                  Libro: <b>{selectedMesa.libro || '—'}</b> • Folio: <b>{selectedMesa.folio || '—'}</b> • Acta: <b>{selectedMesa.acta_numero || '—'}</b>
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
                Planilla de Calificaciones del Acta Volante
              </h2>
              <p className="text-xs text-text-muted">
                Tribunal: <b>{selectedMesa.presidente || 'Presidente'}</b> (Pres.), <b>{selectedMesa.vocal1 || selectedMesa.vocal_1 || 'Vocal 1'}</b> (V1), <b>{selectedMesa.vocal2 || selectedMesa.vocal_2 || 'Vocal 2'}</b> (V2)
              </p>
            </div>

            {/* Botones de acción rápida */}
            <div className="flex items-center gap-2 flex-wrap self-stretch md:self-auto">
              <Button
                variant="outline"
                icon={Printer}
                onClick={() => handleOpenPrintModal(selectedMesa)}
                className="text-xs font-bold rounded-2xl min-h-[44px] whitespace-nowrap shrink-0"
              >
                <span className="hidden sm:inline">Imprimir Acta Volante</span>
                <span className="sm:hidden">🖨️ Acta</span>
              </Button>

              <Button
                variant="outline"
                icon={UserCheck}
                onClick={() => setIsCargarAlumnosModalOpen(true)}
                className="text-xs font-bold rounded-2xl min-h-[44px] whitespace-nowrap shrink-0 border-primary/30 text-primary hover:bg-primary/5"
                title="Cargar alumnos elegibles para esta mesa de examen"
              >
                <span className="hidden sm:inline">+ Cargar Alumnos a la Mesa</span>
                <span className="sm:hidden">+ Alumnos</span>
              </Button>

              <Button
                variant="secondary"
                icon={Plus}
                onClick={() => setIsInscribirModalOpen(true)}
                className="text-xs font-bold rounded-2xl min-h-[44px] whitespace-nowrap shrink-0"
              >
                <span className="hidden sm:inline">Inscribir Manual</span>
                <span className="sm:hidden">+ Manual</span>
              </Button>

              <Button
                variant="primary"
                icon={CheckCircle2}
                onClick={handleSaveActaCalificaciones}
                loading={savingActa}
                className="text-xs font-bold rounded-2xl min-h-[44px] shadow-sm whitespace-nowrap shrink-0"
              >
                <span className="hidden sm:inline">Guardar Notas</span>
                <span className="sm:hidden">Guardar</span>
              </Button>
            </div>
          </div>

          {/* Tarjetas Bento de Métricas Rápidas del Acta */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 backdrop-blur-md">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">Inscriptos</span>
              <strong className="text-xl font-mono font-bold text-text-primary">{statsSelectedMesa.total}</strong>
            </div>

            <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 backdrop-blur-md">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">Presentes</span>
              <strong className="text-xl font-mono font-bold text-text-primary">{statsSelectedMesa.presentes}</strong>
            </div>

            <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 backdrop-blur-md">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Ausentes</span>
              <strong className="text-xl font-mono font-bold text-slate-600 dark:text-slate-400">{statsSelectedMesa.ausentes}</strong>
            </div>

            <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 backdrop-blur-md">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">Aprobados</span>
              <strong className="text-xl font-mono font-bold text-emerald-600 dark:text-emerald-400">{statsSelectedMesa.aprobados}</strong>
            </div>

            <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 backdrop-blur-md">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block">Desaprobados</span>
              <strong className="text-xl font-mono font-bold text-rose-600 dark:text-rose-400">{statsSelectedMesa.desaprobados}</strong>
            </div>

            <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 backdrop-blur-md">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary block">% Aprobación</span>
              <strong className="text-xl font-mono font-bold text-primary">{statsSelectedMesa.pctAprobacion}%</strong>
            </div>
          </div>

          {/* Tabla Interactiva de Calificaciones */}
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50/75 dark:bg-white/[0.02] text-text-muted font-bold text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-3 w-10 text-center">N°</th>
                    <th className="py-3 px-3">Estudiante (Nombre y DNI)</th>
                    <th className="py-3 px-3 text-center w-28">Condición</th>
                    <th className="py-3 px-3 text-center w-24">Escrito (1-10)</th>
                    <th className="py-3 px-3 text-center w-24">Oral (1-10)</th>
                    <th className="py-3 px-3 text-center w-28">Definitiva</th>
                    <th className="py-3 px-3 text-center w-36">Dictamen</th>
                    <th className="py-3 px-3 text-center w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-white/5">
                  {actasAlumnos.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-12 text-center text-text-muted">
                        <div className="max-w-md mx-auto space-y-3">
                          <Users className="w-10 h-10 mx-auto text-text-muted/50" />
                          <p className="font-semibold text-sm">No hay alumnos inscriptos en esta mesa todavía.</p>
                          <p className="text-xs">
                            Puedes presionar "<b>+ Cargar Alumnos a la Mesa</b>" para seleccionar alumnos promocionales, regulares o libres de la nómina, o inscribir alumnos manualmente.
                          </p>
                          <Button
                            variant="primary"
                            icon={UserCheck}
                            size="sm"
                            onClick={() => setIsCargarAlumnosModalOpen(true)}
                            className="mt-2"
                          >
                            + Cargar Alumnos a la Mesa
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    actasAlumnos.map((alumno, idx) => {
                      const isAcreditado = alumno.dictamen === 'ACREDITADO';
                      const isAprobado = alumno.dictamen === 'APROBADO' || isAcreditado;
                      const isDesaprobado = alumno.dictamen === 'DESAPROBADO';
                      const isAusente = alumno.dictamen === 'AUSENTE';
                      const isPromocional = alumno.condicion_previa === 'PROMOCIONAL';

                      return (
                        <tr key={alumno.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-text-muted">
                            {idx + 1}
                          </td>

                          <td className="py-2.5 px-3">
                            <div className="font-bold text-text-primary text-xs flex items-center gap-1.5">
                              <span>{alumno.alumno_nombre_completo}</span>
                              {isPromocional && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/20">
                                  Promoción
                                </span>
                              )}
                            </div>
                            <div className="font-mono text-[11px] text-text-muted">
                              DNI: {alumno.alumno_dni || 'S/D'}
                            </div>
                          </td>

                          <td className="py-2.5 px-3 text-center">
                            <select
                              value={alumno.condicion_previa || 'REGULAR'}
                              onChange={(e) => handleGradeChange(idx, 'condicion_previa', e.target.value)}
                              className="text-[11px] font-bold py-1 px-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-text-primary cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                              <option value="REGULAR">REGULAR</option>
                              <option value="PROMOCIONAL">PROMOCIONAL</option>
                              <option value="LIBRE">LIBRE</option>
                            </select>
                          </td>

                          {/* Escrito Input */}
                          <td className="py-2.5 px-3 text-center">
                            {isPromocional ? (
                              <span className="text-text-muted font-mono text-xs" title="Exento de examen escrito por promoción directa">—</span>
                            ) : (
                              <input
                                type="number"
                                min="1"
                                max="10"
                                step="1"
                                value={alumno.nota_escrito ?? ''}
                                placeholder="—"
                                onChange={(e) => handleGradeChange(idx, 'nota_escrito', e.target.value)}
                                className="w-16 text-center py-1.5 px-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 font-mono font-bold text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                              />
                            )}
                          </td>

                          {/* Oral Input */}
                          <td className="py-2.5 px-3 text-center">
                            {isPromocional ? (
                              <span className="text-text-muted font-mono text-xs" title="Exento de examen oral por promoción directa">—</span>
                            ) : (
                              <input
                                type="number"
                                min="1"
                                max="10"
                                step="1"
                                value={alumno.nota_oral ?? ''}
                                placeholder="—"
                                onChange={(e) => handleGradeChange(idx, 'nota_oral', e.target.value)}
                                className="w-16 text-center py-1.5 px-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 font-mono font-bold text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                              />
                            )}
                          </td>

                          {/* Definitiva */}
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="number"
                              min="1"
                              max="10"
                              value={alumno.nota_definitiva ?? ''}
                              placeholder="—"
                              onChange={(e) => handleGradeChange(idx, 'nota_definitiva', e.target.value)}
                              className={`w-16 text-center py-1.5 px-2 rounded-xl border font-mono font-black text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                                isPromocional 
                                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400' 
                                  : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-text-primary'
                              }`}
                            />
                          </td>

                          {/* Dictamen */}
                          <td className="py-2.5 px-3 text-center">
                            <select
                              value={alumno.dictamen || 'AUSENTE'}
                              onChange={(e) => handleDictamenOverride(idx, e.target.value)}
                              className={`text-[11px] font-black py-1.5 px-2.5 rounded-xl border transition-colors cursor-pointer focus:outline-none focus:ring-1 ${
                                isAcreditado
                                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
                                  : isAprobado
                                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                                  : isDesaprobado
                                  ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30'
                                  : 'bg-slate-100 dark:bg-white/5 text-text-muted border-slate-200 dark:border-white/10'
                              }`}
                            >
                              <option value="AUSENTE">AUSENTE</option>
                              <option value="APROBADO">APROBADO</option>
                              <option value="ACREDITADO">ACREDITADO</option>
                              <option value="DESAPROBADO">DESAPROBADO</option>
                            </select>
                          </td>

                          <td className="py-2.5 px-3 text-center">
                            <button
                              onClick={() => handleRemoveAlumnoFromActa(idx)}
                              className="p-1.5 text-text-muted hover:text-danger rounded-lg hover:bg-danger/10 transition-colors"
                              title="Remover alumno del acta"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : (
        /* =========================================================================
            VISTA 2: LISTADO Y TARJETAS BENTO DE MESAS DE EXAMEN
        ========================================================================= */
        <div className="space-y-6">
          {/* Header Superior del Módulo */}
          <div className="backdrop-blur-xl bg-white/75 dark:bg-slate-900/60 rounded-3xl border border-slate-200/80 dark:border-white/10 p-6 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-2xl bg-primary/10 text-primary">
                  <Award className="w-5 h-5" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
                  Mesas de Examen y Tribunales
                </h2>
              </div>
              <p className="text-xs text-text-muted">
                Constitución de mesas examinadoras, actas volantes con triple rúbrica y registro matriz.
              </p>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap">
              <ExpandableSearch
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Buscar mesa por llamado, acta, docente..."
              />
              <Button
                variant="outline"
                icon={Sparkles}
                onClick={() => handleOpenNewMesaModal('PROMOCIONAL')}
                className="text-xs font-bold rounded-2xl min-h-[44px] border-emerald-500/40 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 whitespace-nowrap"
              >
                <span className="hidden sm:inline">🎖️ Mesa Promocional</span>
                <span className="sm:hidden">🎖️ Promocional</span>
              </Button>
              <Button
                variant="primary"
                icon={Plus}
                onClick={() => handleOpenNewMesaModal('FINAL')}
                className="text-xs font-bold rounded-2xl min-h-[44px] shadow-sm whitespace-nowrap"
              >
                <span className="hidden sm:inline">+ Nueva Mesa Final</span>
                <span className="sm:hidden">+ Mesa</span>
              </Button>
            </div>
          </div>

          {/* Grilla Bento de Mesas Registradas */}
          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredMesas.length === 0 ? (
            <EmptyState
              title={searchQuery ? 'No se encontraron mesas de examen' : 'Sin mesas de examen constituidas'}
              description={
                searchQuery
                  ? 'Intenta con otro término de búsqueda.'
                  : 'Registra los turnos de examen final, ordinarios o especiales, para confeccionar las actas volantes.'
              }
              actionLabel="Constituir Mesa de Examen"
              onAction={() => handleOpenNewMesaModal('FINAL')}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMesas.map((mesa) => (
                <div
                  key={mesa.id}
                  onClick={() => setSelectedMesa(mesa)}
                  className="group cursor-pointer backdrop-blur-xl bg-white/75 dark:bg-slate-900/60 rounded-3xl border border-slate-200/80 dark:border-white/10 p-5 shadow-xs hover:shadow-md hover:border-primary/40 transition-all duration-200 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <Badge 
                        variant={mesa.tipo_mesa === 'PROMOCIONAL' ? 'success' : 'primary'} 
                        className="text-[11px] font-bold uppercase"
                      >
                        {mesa.tipo_mesa === 'PROMOCIONAL' ? '🎖️ PROMOCIONAL' : mesa.turno_llamado}
                      </Badge>
                      <span className="text-xs font-mono font-bold text-text-muted flex items-center gap-1">
                        <CalendarIcon className="w-3.5 h-3.5 text-primary" />
                        {formatFechaDMY(mesa.fecha)}
                      </span>
                    </div>

                    {/* Matriz: Libro, Tomo, Folio, Acta */}
                    <div className="grid grid-cols-4 gap-1 p-2 bg-slate-100/70 dark:bg-white/[0.03] rounded-xl border border-slate-200/60 dark:border-white/5 text-center text-[10px] font-mono">
                      <div>
                        <span className="text-[9px] uppercase text-text-muted block">Libro</span>
                        <strong className="text-text-primary">{mesa.libro || '—'}</strong>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase text-text-muted block">Tomo</span>
                        <strong className="text-text-primary">{mesa.tomo || '—'}</strong>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase text-text-muted block">Folio</span>
                        <strong className="text-text-primary">{mesa.folio || '—'}</strong>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase text-text-muted block">Acta</span>
                        <strong className="text-text-primary">{mesa.acta_numero || '—'}</strong>
                      </div>
                    </div>

                    {/* Tribunal Evaluador */}
                    <div className="space-y-1 text-xs text-text-secondary">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="truncate"><b>Pres:</b> {mesa.presidente || 'A designar'}</span>
                      </div>
                      <div className="text-[11px] text-text-muted truncate pl-5">
                        V1: {mesa.vocal1 || '—'} • V2: {mesa.vocal2 || '—'}
                      </div>
                    </div>
                  </div>

                  {/* Footer de Tarjeta con Acciones Rápidas */}
                  <div className="pt-3 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setSelectedMesa(mesa)}
                      className="text-xs font-bold rounded-xl flex-1"
                    >
                      Cargar Notas
                    </Button>

                    <button
                      onClick={(e) => handleOpenPrintModal(mesa, e)}
                      className="p-2 text-text-muted hover:text-primary rounded-xl hover:bg-primary/10 transition-colors"
                      title="Imprimir Acta Volante"
                    >
                      <Printer className="w-4 h-4" />
                    </button>

                    <button
                      onClick={(e) => handleOpenEditMesaModal(mesa, e)}
                      className="p-2 text-text-muted hover:text-text-primary rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                      title="Editar Mesa"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={(e) => handleDeleteMesa(mesa, e)}
                      className="p-2 text-text-muted hover:text-danger rounded-xl hover:bg-danger/10 transition-colors"
                      title="Eliminar Mesa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          MODAL: NUEVA / EDITAR MESA DE EXAMEN
      ========================================================================= */}
      <Modal
        isOpen={isMesaModalOpen}
        onClose={() => setIsMesaModalOpen(false)}
        title={editingMesa ? 'Editar Mesa de Examen' : 'Constituir Nueva Mesa de Examen'}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSaveMesa} className="space-y-4 text-xs">
          {/* Selector de Tipo de Mesa: Final vs Promocional */}
          <div>
            <label className="block font-bold text-text-secondary mb-1.5">
              Tipo de Mesa Examinadora *
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/5">
              <button
                type="button"
                onClick={() => {
                  setMesaTipo('FINAL');
                  if (mesaTurno === 'PROMOCIONAL DIRECTA') setMesaTurno('1° LLAMADO');
                }}
                className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  mesaTipo === 'FINAL'
                    ? 'bg-white dark:bg-slate-800 text-primary shadow-xs'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <span>📋 Examen Final / Ordinaria</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMesaTipo('PROMOCIONAL');
                  setMesaTurno('PROMOCIONAL DIRECTA');
                }}
                className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  mesaTipo === 'PROMOCIONAL'
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <span>🎖️ Mesa Promocional</span>
              </button>
            </div>
            {mesaTipo === 'PROMOCIONAL' && (
              <p className="mt-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                Permite asentar la acreditación por promoción directa en libro matriz con acta reglamentaria.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-text-secondary mb-1">Fecha de la Mesa *</label>
              <input
                type="date"
                value={mesaFecha}
                onChange={(e) => setMesaFecha(e.target.value)}
                required
                className="w-full py-2 px-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-text-secondary mb-1">Turno / Llamado *</label>
              <CustomSelect
                value={mesaTurno}
                onChange={setMesaTurno}
                options={TURNO_OPTIONS}
              />
            </div>
          </div>

          {/* Tribunal: Presidente de Mesa (Precompletado con docente titular) */}
          <div className="p-3.5 bg-slate-50 dark:bg-white/[0.02] rounded-2xl border border-slate-200/80 dark:border-white/10 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-text-secondary block">
                Presidente de Mesa (Docente Titular) *
              </label>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                ✓ Docente a cargo
              </span>
            </div>
            <input
              type="text"
              placeholder="Nombre del Presidente de mesa..."
              value={mesaPresidente}
              onChange={(e) => setMesaPresidente(e.target.value)}
              required
              className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-xs text-text-primary"
            />
          </div>

          {/* Acordeón Opcional: Matriz y Vocales */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden">
            <button
              type="button"
              onClick={() => setIsAccordionOpen(!isAccordionOpen)}
              className="w-full py-2.5 px-3.5 bg-slate-50 hover:bg-slate-100 dark:bg-white/[0.02] dark:hover:bg-white/[0.05] transition-colors flex items-center justify-between text-left cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-text-primary">
                  Libro Matriz y Vocales Acompañantes
                </span>
                <span className="text-[10px] text-text-muted bg-slate-200/60 dark:bg-white/10 px-1.5 py-0.5 rounded-md">
                  Opcional
                </span>
              </div>
              {isAccordionOpen ? (
                <ChevronUp className="w-4 h-4 text-text-muted" />
              ) : (
                <ChevronDown className="w-4 h-4 text-text-muted" />
              )}
            </button>

            {isAccordionOpen && (
              <div className="p-3.5 space-y-3 bg-white dark:bg-slate-900/40 border-t border-slate-200/80 dark:border-white/10 animate-fadeIn">
                {/* Registro Matriz */}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block mb-1.5">
                    Registro Matriz Institucional
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="text-[10px] text-text-muted block">Libro N°</label>
                      <input
                        type="text"
                        placeholder="Ej. VIII"
                        value={mesaLibro}
                        onChange={(e) => setMesaLibro(e.target.value)}
                        className="w-full py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-text-muted block">Tomo N°</label>
                      <input
                        type="text"
                        placeholder="Ej. 1"
                        value={mesaTomo}
                        onChange={(e) => setMesaTomo(e.target.value)}
                        className="w-full py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-text-muted block">Folio N°</label>
                      <input
                        type="text"
                        placeholder="Ej. 142"
                        value={mesaFolio}
                        onChange={(e) => setMesaFolio(e.target.value)}
                        className="w-full py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-text-muted block">Acta N°</label>
                      <input
                        type="text"
                        placeholder="Ej. 2026-09"
                        value={mesaActaNumero}
                        onChange={(e) => setMesaActaNumero(e.target.value)}
                        className="w-full py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Vocales */}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block mb-1.5">
                    Vocales Examinadores (Rúbricas del Tribunal)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-text-muted block">Primer Vocal (Vocal 1)</label>
                      <input
                        type="text"
                        placeholder="Nombre de Vocal 1..."
                        value={mesaVocal1}
                        onChange={(e) => setMesaVocal1(e.target.value)}
                        className="w-full py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-xs text-text-primary"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-text-muted block">Segundo Vocal (Vocal 2)</label>
                      <input
                        type="text"
                        placeholder="Nombre de Vocal 2..."
                        value={mesaVocal2}
                        onChange={(e) => setMesaVocal2(e.target.value)}
                        className="w-full py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-xs text-text-primary"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsMesaModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
            >
              {editingMesa ? 'Guardar Cambios' : 'Constituir Mesa'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* =========================================================================
          MODAL: INSCRIBIR ALUMNO A LA MESA
      ========================================================================= */}
      <Modal
        isOpen={isInscribirModalOpen}
        onClose={() => setIsInscribirModalOpen(false)}
        title="Inscribir Alumno a la Mesa de Examen"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleInscribirIndividual} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-text-secondary mb-1">
              Seleccionar de Alumnos de la Cátedra (Opcional)
            </label>
            <select
              onChange={(e) => {
                const found = availableStudents.find(s => s.id === e.target.value);
                if (found) {
                  setInscribirNombre(`${found.apellido}, ${found.nombre}`);
                  setInscribirDni(found.dni || '');
                }
              }}
              className="w-full py-2 px-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 text-xs"
            >
              <option value="">-- Elegir de la nómina de cátedra --</option>
              {availableStudents.map(s => (
                <option key={s.id} value={s.id}>
                  {s.apellido}, {s.nombre} ({s.dni || 'Sin DNI'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-text-secondary mb-1">Apellido y Nombres *</label>
            <input
              type="text"
              placeholder="Ej. PÉREZ, JUAN MANUEL"
              value={inscribirNombre}
              onChange={(e) => setInscribirNombre(e.target.value)}
              required
              className="w-full py-2 px-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-text-primary uppercase focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div>
            <label className="block font-bold text-text-secondary mb-1">D.N.I. del Estudiante</label>
            <input
              type="text"
              placeholder="Ej. 42345678"
              value={inscribirDni}
              onChange={(e) => setInscribirDni(e.target.value)}
              className="w-full py-2 px-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-text-primary font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div>
            <label className="block font-bold text-text-secondary mb-1">Condición de Inscripción</label>
            <CustomSelect
              value={inscribirCondicion}
              onChange={setInscribirCondicion}
              options={[
                { value: 'REGULAR', label: 'REGULAR (Cursada Aprobada)' },
                { value: 'LIBRE', label: 'LIBRE (Rinde Programa Completo)' }
              ]}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsInscribirModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
            >
              Inscribir al Acta
            </Button>
          </div>
        </form>
      </Modal>

      {/* =========================================================================
          MODAL: CARGAR ALUMNOS A LA MESA (MULTI-SELECTOR INTELIGENTE)
      ========================================================================= */}
      <CargarAlumnosMesaModal
        isOpen={isCargarAlumnosModalOpen}
        onClose={() => setIsCargarAlumnosModalOpen(false)}
        mesa={selectedMesa}
        students={availableStudents}
        currentActas={actasAlumnos}
        evaluaciones={catedraEvaluaciones}
        notas={catedraNotas}
        onConfirmSelection={handleAlumnosSelectedFromModal}
      />

      {/* =========================================================================
          VISOR UNIFICADO: IMPRESIÓN REGLAMENTARIA DEL ACTA VOLANTE
      ========================================================================= */}
      <PrintPreviewModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        type="acta-examen"
        title={`Acta Volante de Exámenes Finales — ${mesaToPrint?.turno_llamado || 'Examen'}`}
        subtitle="Documento reglamentario para archivo en Secretaría Académica y Libro Matriz"
        defaultOrientation="portrait"
        data={{
          mesa: mesaToPrint,
          alumnos: alumnosToPrint,
          catedra: currentCatedra,
          institucionNombre: currentCatedra?.instituciones?.nombre || currentCatedra?.institucion_nombre || 'INSTITUTO DE EDUCACIÓN SUPERIOR',
          cicloAnio: activeCiclo?.anio || '2026'
        }}
      />

    </div>
  );
}
