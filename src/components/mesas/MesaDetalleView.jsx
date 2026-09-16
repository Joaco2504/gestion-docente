import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Printer, 
  UserPlus, 
  CheckCircle2, 
  Trash2, 
  Sparkles, 
  Users, 
  AlertCircle,
  Building2,
  GraduationCap,
  Calendar,
  BookOpen,
  BookMarked,
  ShieldCheck,
  Award,
  AlertTriangle,
  Info
} from 'lucide-react';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Card from '../common/Card';
import PrintPreviewModal from '../common/PrintPreviewModal';
import SeleccionarAlumnosMesaModal from './SeleccionarAlumnosMesaModal';
import { toast } from 'sonner';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { formatFechaDMY } from '../../lib/dateUtils';
import { notificarErrorDiscord } from '../../services/discordLogger';
import { procesarErrorDocente } from '../../utils/errorCodes';

export default function MesaDetalleView({
  mesa,
  onBack,
  onMesaUpdated,
  onMesaDeleted
}) {
  const { user, isDemo } = useAuth();
  const { agregarNotificacion } = useNotifications();

  const [actasAlumnos, setActasAlumnos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isSelectAlumnosModalOpen, setIsSelectAlumnosModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Evaluaciones y notas de cursada para calcular promedios
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [notas, setNotas] = useState([]);

  const isPromocional = (mesa?.condicion_acta || mesa?.tipo_mesa || '').toUpperCase() === 'PROMOCIONAL';
  const isLibre = (mesa?.condicion_acta || '').toUpperCase() === 'LIBRE';
  const isRegular = !isPromocional && !isLibre;

  useEffect(() => {
    if (mesa?.id) {
      fetchActas();
      fetchCursadaData();
    }
  }, [mesa?.id]);

  async function fetchCursadaData() {
    try {
      if (isSupabaseConfigured && !isDemo && mesa?.catedra_id) {
        const [evRes, nRes] = await Promise.all([
          supabase.from('evaluaciones').select('*').eq('catedra_id', mesa.catedra_id),
          supabase.from('notas').select('*')
        ]);
        if (evRes.data) setEvaluaciones(evRes.data);
        if (nRes.data) setNotas(nRes.data);
      }
    } catch (_) {}
  }

  async function fetchActas() {
    setLoading(true);
    try {
      if (isSupabaseConfigured && !isDemo && mesa?.id) {
        // Consultar directamente actas_examen_alumnos con join opcional a estudiantes
        const { data, error } = await supabase
          .from('actas_examen_alumnos')
          .select(`
            id,
            mesa_id,
            estudiante_id,
            alumno_nombre_completo,
            alumno_dni,
            condicion_previa,
            nota_escrito,
            nota_oral,
            nota_definitiva,
            dictamen,
            observaciones,
            estudiantes ( id, dni, apellido, nombre )
          `)
          .eq('mesa_id', mesa.id)
          .order('alumno_nombre_completo', { ascending: true });

        if (error) {
          throw error;
        }

        if (data) {
          const normalized = data.map(row => {
            const student = row.estudiantes;
            let nombreCompleto = row.alumno_nombre_completo;
            if ((!nombreCompleto || nombreCompleto.trim() === '') && student) {
              nombreCompleto = `${student.apellido || ''}, ${student.nombre || ''}`.trim().toUpperCase();
            }
            let dni = row.alumno_dni;
            if ((!dni || dni.trim() === '') && student?.dni) {
              dni = student.dni;
            }

            return {
              ...row,
              alumno_nombre_completo: nombreCompleto || 'ALUMNO REGISTRADO',
              alumno_dni: dni || ''
            };
          });

          setActasAlumnos(normalized);
          setLoading(false);
          return;
        }
      }

      setActasAlumnos([]);
    } catch (err) {
      console.error('Error fetching actas from Supabase:', err);
      const infoError = procesarErrorDocente(err);
      toast.error(`${infoError.mensaje} (Código: ${infoError.codigo})`);
      agregarNotificacion({
        tipo: 'error',
        titulo: 'Error al recuperar planilla de calificaciones',
        mensaje: `${infoError.mensaje} (Código: ${infoError.codigo})`,
        codigo: infoError.codigo
      });
      notificarErrorDiscord({
        codigoError: infoError.codigo,
        mensajeUsuario: infoError.mensaje,
        errorTecnico: err,
        contexto: `MesaDetalleView / fetchActas (Mesa: ${mesa?.id})`,
        usuario: { email: user?.email, id: user?.id }
      });
      setActasAlumnos([]);
    } finally {
      setLoading(false);
    }
  }

  // Cálculo de nota definitiva según normativa
  const calculateNotaDefinitivaYDictamen = (escritoStr, oralStr, condicion) => {
    const hasEscrito = escritoStr !== '' && escritoStr !== null && escritoStr !== undefined;
    const hasOral = oralStr !== '' && oralStr !== null && oralStr !== undefined;

    if (!hasEscrito && !hasOral) {
      return { nota_definitiva: null, dictamen: 'AUSENTE' };
    }

    const nEscrito = hasEscrito ? Number(escritoStr) : null;
    const nOral = hasOral ? Number(oralStr) : null;

    // Normativa para examen Libre: escrito eliminatorio (>= 4 para promediar)
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

    const dictamen = finalNota >= 4 ? 'ACREDITADO' : 'DESAPROBADO';
    return { nota_definitiva: finalNota, dictamen };
  };

  const handleGradeChange = (index, field, value) => {
    const updated = [...actasAlumnos];
    const item = { ...updated[index], [field]: value === '' ? null : value };

    // Si es regular o libre y cambia escrito u oral, recalcular nota definitiva y dictamen
    if (!isPromocional && (field === 'nota_escrito' || field === 'nota_oral')) {
      const calc = calculateNotaDefinitivaYDictamen(
        field === 'nota_escrito' ? value : item.nota_escrito,
        field === 'nota_oral' ? value : item.nota_oral,
        item.condicion_previa || mesa.condicion_acta
      );
      item.nota_definitiva = calc.nota_definitiva;
      item.dictamen = calc.dictamen;
    } else if (field === 'nota_definitiva') {
      const numVal = Number(value);
      if (value !== '' && !isNaN(numVal)) {
        item.dictamen = numVal >= (isPromocional ? 7 : 4) ? 'ACREDITADO' : 'DESAPROBADO';
      }
    }

    updated[index] = item;
    setActasAlumnos(updated);
  };

  const handleDictamenChange = (index, dictamen) => {
    const updated = [...actasAlumnos];
    updated[index] = { ...updated[index], dictamen };
    setActasAlumnos(updated);
  };

  const handleAlumnosSelected = (selectedList, isPromo, averageMap) => {
    const existingIds = new Set(actasAlumnos.map(a => a.estudiante_id).filter(Boolean));
    const existingDnis = new Set(actasAlumnos.map(a => String(a.alumno_dni || '').trim()));

    const toAdd = selectedList.filter(s => 
      !existingIds.has(s.estudiante_id) && 
      !existingDnis.has(String(s.dni || '').trim())
    );

    if (toAdd.length === 0) {
      toast.info('Los alumnos seleccionados ya estaban incorporados en el acta.');
      return;
    }

    const newRows = toAdd.map(s => {
      const isStudentPromo = isPromo || s.condicion === 'PROMOCIONAL';
      const cursadaAvg = averageMap?.get(s.estudiante_id) ?? (isStudentPromo ? 7 : null);

      return {
        id: `temp-${Date.now()}-${s.estudiante_id || s.dni}`,
        mesa_id: mesa.id,
        estudiante_id: s.estudiante_id || null,
        alumno_nombre_completo: `${s.apellido}, ${s.nombre}`.toUpperCase(),
        alumno_dni: s.dni || '',
        condicion_previa: s.condicion || (isPromo ? 'PROMOCIONAL' : isLibre ? 'LIBRE' : 'REGULAR'),
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

  const handleRemoveAlumno = (index) => {
    const updated = actasAlumnos.filter((_, i) => i !== index);
    setActasAlumnos(updated);
    toast.info('Alumno removido del acta (presiona Guardar Notas para asentar cambios).');
  };

  // Acción rápida para promocionales: Acreditar a todos los alumnos con calificación
  const handleAcreditarTodos = () => {
    if (actasAlumnos.length === 0) {
      toast.info('No hay alumnos en el acta para acreditar.');
      return;
    }

    const updated = actasAlumnos.map(a => {
      const nota = a.nota_definitiva !== null && a.nota_definitiva !== undefined ? Number(a.nota_definitiva) : 7;
      return {
        ...a,
        nota_definitiva: nota,
        dictamen: 'ACREDITADO',
        observaciones: a.observaciones || 'Acreditado por Promoción Directa'
      };
    });

    setActasAlumnos(updated);
    toast.success('Todos los estudiantes fueron marcados como ACREDITADOS.');
  };

  const handleSaveActa = async () => {
    if (!mesa?.id) return;
    setSaving(true);

    try {
      if (isSupabaseConfigured && !isDemo) {
        // Formatear filas para RPC guardar_acta_examen_lote
        const p_filas = actasAlumnos.map(a => ({
          id: String(a.id || '').startsWith('temp-') ? null : a.id,
          estudiante_id: a.estudiante_id || null,
          alumno_nombre_completo: a.alumno_nombre_completo || '',
          alumno_dni: a.alumno_dni || '',
          condicion_previa: a.condicion_previa || mesa.condicion_acta || 'REGULAR',
          nota_escrito: a.nota_escrito !== null && a.nota_escrito !== '' ? Number(a.nota_escrito) : null,
          nota_oral: a.nota_oral !== null && a.nota_oral !== '' ? Number(a.nota_oral) : null,
          nota_definitiva: a.nota_definitiva !== null && a.nota_definitiva !== '' ? Number(a.nota_definitiva) : null,
          dictamen: a.dictamen || 'AUSENTE',
          observaciones: a.observaciones || ''
        }));

        let rpcSuccess = false;

        // 1. Invocar RPC guardar_acta_examen_lote
        try {
          const { data: rpcRes, error: rpcErr } = await supabase.rpc('guardar_acta_examen_lote', {
            p_mesa_id: mesa.id,
            p_catedra_id: mesa.catedra_id,
            p_filas
          });

          if (rpcErr) {
            throw rpcErr;
          }
          rpcSuccess = true;
        } catch (rpcError) {
          console.warn('[MesaDetalleView] Fallback de guardado por fallo en RPC guardar_acta_examen_lote:', rpcError);
        }

        // 2. Fallback de guardado directo si la RPC falló o no está cargada en Supabase
        if (!rpcSuccess) {
          const rowsToUpsert = actasAlumnos.map(a => ({
            id: String(a.id || '').startsWith('temp-') ? undefined : a.id,
            mesa_id: mesa.id,
            estudiante_id: a.estudiante_id || null,
            alumno_nombre_completo: a.alumno_nombre_completo,
            alumno_dni: a.alumno_dni,
            condicion_previa: a.condicion_previa || mesa.condicion_acta || 'REGULAR',
            nota_escrito: a.nota_escrito !== null && a.nota_escrito !== '' ? Number(a.nota_escrito) : null,
            nota_oral: a.nota_oral !== null && a.nota_oral !== '' ? Number(a.nota_oral) : null,
            nota_definitiva: a.nota_definitiva !== null && a.nota_definitiva !== '' ? Number(a.nota_definitiva) : null,
            dictamen: a.dictamen || 'AUSENTE',
            observaciones: a.observaciones || ''
          }));

          const { error: upsertErr } = await supabase
            .from('actas_examen_alumnos')
            .upsert(rowsToUpsert, { onConflict: 'id' });

          if (upsertErr) throw upsertErr;

          // Actualizar acreditación en inscripciones para aprobados
          const fechaAcred = mesa.fecha ? new Date(mesa.fecha).toISOString() : new Date().toISOString();
          for (const a of actasAlumnos) {
            if (a.estudiante_id && (a.dictamen === 'ACREDITADO' || a.dictamen === 'APROBADO')) {
              try {
                await supabase
                  .from('inscripciones')
                  .update({
                    estado_academico: 'ACREDITADO',
                    nota_final: a.nota_definitiva,
                    nota_final_acreditacion: a.nota_definitiva,
                    fecha_acreditacion: fechaAcred
                  })
                  .eq('catedra_id', mesa.catedra_id)
                  .eq('estudiante_id', a.estudiante_id);
              } catch (_) {}
            }
          }
        }
      }

      toast.success('Acta de examen asentada exitosamente.');
      agregarNotificacion({
        tipo: 'success',
        titulo: 'Acta de examen guardada',
        mensaje: `Se asentaron ${actasAlumnos.length} calificaciones y se actualizaron las acreditaciones.`
      });

      if (onMesaUpdated) {
        onMesaUpdated(mesa);
      }

      await fetchActas();
    } catch (err) {
      console.error('Error al guardar acta de examen:', err);
      const infoError = procesarErrorDocente(err);
      toast.error(`${infoError.mensaje} (Código: ${infoError.codigo})`);
      
      agregarNotificacion({
        tipo: 'error',
        titulo: 'Fallo al asentar acta de examen',
        mensaje: `${infoError.mensaje} (Código: ${infoError.codigo})`,
        codigo: infoError.codigo
      });

      await notificarErrorDiscord({
        codigoError: infoError.codigo,
        mensajeUsuario: infoError.mensaje,
        errorTecnico: err,
        contexto: `MesaDetalleView / handleSaveActa (Mesa: ${mesa.id}, Cátedra: ${mesa.catedra_id})`,
        usuario: { email: user?.email, id: user?.id }
      });
    } finally {
      setSaving(false);
    }
  };

  // Métricas reactivas del acta
  const stats = useMemo(() => {
    const total = actasAlumnos.length;
    const ausentes = actasAlumnos.filter(a => a.dictamen === 'AUSENTE').length;
    const presentes = total - ausentes;
    const acreditados = actasAlumnos.filter(a => a.dictamen === 'ACREDITADO' || a.dictamen === 'APROBADO').length;
    const desaprobados = actasAlumnos.filter(a => a.dictamen === 'DESAPROBADO').length;
    const pct = presentes > 0 ? Math.round((acreditados / presentes) * 100) : 0;
    return { total, ausentes, presentes, acreditados, desaprobados, pct };
  }, [actasAlumnos]);

  const catedraNombre = mesa?.catedras?.nombre || 'Cátedra';
  const institucionNombre = mesa?.catedras?.instituciones?.nombre || 'Institución de Educación Superior';

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* =========================================================================
          CABECERA HERO DE LA MESA SELECCIONADA
      ========================================================================= */}
      <div className="backdrop-blur-xl bg-white/75 dark:bg-slate-900/60 rounded-3xl border border-slate-200/80 dark:border-white/10 p-5 sm:p-6 shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="space-y-1.5 min-w-0 flex-1">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-text-muted hover:text-primary transition-colors mb-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver a todas las mesas</span>
          </button>

          <div className="flex items-center gap-2 flex-wrap">
            <Badge 
              variant={
                isPromocional ? 'promo' :
                isRegular ? 'regular' : 'libre'
              }
              className="font-bold text-xs uppercase"
            >
              {isPromocional ? '🎖️ PROMOCIONAL' : isRegular ? '📋 REGULAR' : '🔓 LIBRE'}
            </Badge>

            <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              {formatFechaDMY(mesa.fecha)} • {mesa.turno_llamado}
            </span>

            <span className="text-xs text-text-muted bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-lg border border-slate-200/60 dark:border-white/5">
              Libro: <b>{mesa.libro || '—'}</b> • Folio: <b>{mesa.folio || '—'}</b> • Acta: <b>{mesa.acta_numero || '—'}</b>
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight truncate">
            {catedraNombre}
          </h2>

          <div className="flex items-center gap-2 text-xs text-text-muted flex-wrap">
            <span className="flex items-center gap-1 font-semibold text-text-secondary">
              <Building2 className="w-3.5 h-3.5 text-primary" />
              {institucionNombre}
            </span>
            <span>•</span>
            <span>
              Tribunal: <b>{mesa.presidente || 'Docente Titular'}</b> (Pres.), <b>{mesa.vocal1 || mesa.vocal_1 || '—'}</b> (V1), <b>{mesa.vocal2 || mesa.vocal_2 || '—'}</b> (V2)
            </span>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="flex items-center gap-2 flex-wrap self-stretch sm:self-auto shrink-0">
          <Link
            to="/guias?section=mesas-examen"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/60 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-700/60 text-text-secondary hover:text-text-primary text-xs font-bold transition-all min-h-[44px] cursor-pointer shrink-0"
            title="Ver Guía Paso a Paso de Mesas de Examen"
          >
            <BookMarked className="w-4 h-4 text-primary" />
            <span className="hidden sm:inline">Guía de Uso</span>
          </Link>

          <Button
            variant="outline"
            icon={Printer}
            onClick={() => setIsPrintModalOpen(true)}
            className="text-xs font-bold rounded-2xl min-h-[44px]"
          >
            <span className="hidden sm:inline">Imprimir Acta</span>
            <span className="sm:hidden">Acta</span>
          </Button>

          <Button
            variant="outline"
            icon={UserPlus}
            onClick={() => setIsSelectAlumnosModalOpen(true)}
            className="text-xs font-bold rounded-2xl min-h-[44px] border-primary/30 text-primary hover:bg-primary/5"
          >
            <span className="hidden sm:inline">+ Seleccionar Alumnos</span>
            <span className="sm:hidden">+ Alumnos</span>
          </Button>

          {isPromocional && (
            <Button
              variant="outline"
              icon={Sparkles}
              onClick={handleAcreditarTodos}
              className="text-xs font-bold rounded-2xl min-h-[44px] border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
              title="Asignar dictamen ACREDITADO a todos los alumnos del acta"
            >
              <span>Acreditar Todos</span>
            </Button>
          )}

          <Button
            variant="primary"
            icon={CheckCircle2}
            onClick={handleSaveActa}
            loading={saving}
            className="text-xs font-bold rounded-2xl min-h-[44px] shadow-sm"
          >
            <span>Guardar Notas</span>
          </Button>
        </div>
      </div>

      {/* =========================================================================
          TARJETAS BENTO DE MÉTRICAS DEL ACTA
      ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 backdrop-blur-md">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">Inscriptos</span>
          <strong className="text-xl font-mono font-bold text-text-primary">{stats.total}</strong>
        </div>

        <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 backdrop-blur-md">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">Presentes</span>
          <strong className="text-xl font-mono font-bold text-text-primary">{stats.presentes}</strong>
        </div>

        <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 backdrop-blur-md">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Ausentes</span>
          <strong className="text-xl font-mono font-bold text-slate-600 dark:text-slate-400">{stats.ausentes}</strong>
        </div>

        <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 backdrop-blur-md">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">Acreditados</span>
          <strong className="text-xl font-mono font-bold text-emerald-600 dark:text-emerald-400">{stats.acreditados}</strong>
        </div>

        <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 backdrop-blur-md">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block">Desaprobados</span>
          <strong className="text-xl font-mono font-bold text-rose-600 dark:text-rose-400">{stats.desaprobados}</strong>
        </div>

        <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 backdrop-blur-md">
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary block">% Éxito</span>
          <strong className="text-xl font-mono font-bold text-primary">{stats.pct}%</strong>
        </div>
      </div>

      {/* =========================================================================
          PLANILLA DE CALIFICACIONES INTERACTIVA
      ========================================================================= */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50/75 dark:bg-white/[0.02] text-text-muted font-bold text-[11px] uppercase tracking-wider">
                <th className="py-3 px-3 w-10 text-center">N°</th>
                <th className="py-3 px-3">Estudiante (Nombre y DNI)</th>
                <th className="py-3 px-3 text-center w-28">Condición</th>
                {!isPromocional && (
                  <>
                    <th className="py-3 px-3 text-center w-24">Escrito (1-10)</th>
                    <th className="py-3 px-3 text-center w-24">Oral (1-10)</th>
                  </>
                )}
                <th className="py-3 px-3 text-center w-28">Definitiva</th>
                <th className="py-3 px-3 text-center w-36">Dictamen</th>
                <th className="py-3 px-3">Observaciones</th>
                <th className="py-3 px-3 text-center w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={isPromocional ? 7 : 9} className="py-12 text-center text-text-muted">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2" />
                    <span>Cargando planilla de calificaciones desde Supabase...</span>
                  </td>
                </tr>
              ) : actasAlumnos.length === 0 ? (
                <tr>
                  <td colSpan={isPromocional ? 7 : 9} className="py-12 text-center text-text-muted">
                    <div className="max-w-md mx-auto space-y-3">
                      <Users className="w-10 h-10 mx-auto text-text-muted/40" />
                      <p className="font-semibold text-sm text-text-primary">
                        No hay alumnos inscriptos en esta mesa todavía.
                      </p>
                      <p className="text-xs">
                        Presiona "<b>+ Seleccionar Alumnos</b>" para consultar la nómina de estudiantes elegibles y agregarlos al acta con un solo clic.
                      </p>
                      <Button
                        variant="primary"
                        icon={UserPlus}
                        size="sm"
                        onClick={() => setIsSelectAlumnosModalOpen(true)}
                        className="mt-2"
                      >
                        Seleccionar Alumnos Ahora
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                actasAlumnos.map((alumno, idx) => {
                  const isAcreditado = alumno.dictamen === 'ACREDITADO' || alumno.dictamen === 'APROBADO';
                  const isDesaprobado = alumno.dictamen === 'DESAPROBADO';

                  return (
                    <tr key={alumno.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                      {/* N° Orden */}
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-text-muted">
                        {idx + 1}
                      </td>

                      {/* Estudiante */}
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-text-primary text-xs">
                          {alumno.alumno_nombre_completo}
                        </div>
                        <div className="font-mono text-[11px] text-text-muted">
                          DNI: {alumno.alumno_dni || 'S/D'}
                        </div>
                      </td>

                      {/* Condición */}
                      <td className="py-2.5 px-3 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg uppercase ${
                          alumno.condicion_previa === 'PROMOCIONAL'
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                            : alumno.condicion_previa === 'LIBRE'
                            ? 'bg-purple-500/10 text-purple-700 dark:text-purple-400'
                            : 'bg-primary/10 text-primary'
                        }`}>
                          {alumno.condicion_previa || mesa.condicion_acta}
                        </span>
                      </td>

                      {/* Inputs Escrito y Oral (sólo para Regulares o Libres) */}
                      {!isPromocional && (
                        <>
                          <td className="py-2.5 px-3 text-center">
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
                          </td>

                          <td className="py-2.5 px-3 text-center">
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
                          </td>
                        </>
                      )}

                      {/* Nota Definitiva */}
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={alumno.nota_definitiva ?? ''}
                          placeholder="—"
                          onChange={(e) => handleGradeChange(idx, 'nota_definitiva', e.target.value)}
                          className={`w-16 text-center py-1.5 px-2 rounded-xl border font-mono font-black text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                            isAcreditado
                              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                              : isDesaprobado
                              ? 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-400'
                              : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-text-primary'
                          }`}
                        />
                      </td>

                      {/* Dictamen */}
                      <td className="py-2.5 px-3 text-center">
                        <select
                          value={alumno.dictamen || 'AUSENTE'}
                          onChange={(e) => handleDictamenChange(idx, e.target.value)}
                          className={`text-[11px] font-black py-1.5 px-2.5 rounded-xl border transition-colors cursor-pointer focus:outline-none focus:ring-1 ${
                            isAcreditado
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                              : isDesaprobado
                              ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30'
                              : 'bg-slate-100 dark:bg-white/5 text-text-muted border-slate-200 dark:border-white/10'
                          }`}
                        >
                          <option value="AUSENTE">AUSENTE</option>
                          <option value="ACREDITADO">ACREDITADO</option>
                          <option value="DESAPROBADO">DESAPROBADO</option>
                        </select>
                      </td>

                      {/* Observaciones */}
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          placeholder="Observaciones reglamentarias..."
                          value={alumno.observaciones || ''}
                          onChange={(e) => handleGradeChange(idx, 'observaciones', e.target.value)}
                          className="w-full py-1 px-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-[11px] text-text-secondary focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </td>

                      {/* Acción: Eliminar Alumno de la Mesa */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveAlumno(idx)}
                          className="p-1.5 text-text-muted hover:text-danger rounded-lg hover:bg-danger/10 transition-colors cursor-pointer"
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

      {/* =========================================================================
          MODAL: SELECCIONAR ALUMNOS A EVALUAR
      ========================================================================= */}
      <SeleccionarAlumnosMesaModal
        isOpen={isSelectAlumnosModalOpen}
        onClose={() => setIsSelectAlumnosModalOpen(false)}
        mesa={mesa}
        currentActas={actasAlumnos}
        evaluaciones={evaluaciones}
        notas={notas}
        onConfirmSelection={handleAlumnosSelected}
      />

      {/* =========================================================================
          MODAL: IMPRESIÓN REGLAMENTARIA DE ACTA VOLANTE
      ========================================================================= */}
      <PrintPreviewModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        type="acta-examen"
        title={`Acta Volante de Exámenes — ${mesa.turno_llamado || 'Examen'}`}
        subtitle="Documento oficial para archivo en Secretaría Académica y Libro Matriz"
        defaultOrientation="portrait"
        data={{
          mesa,
          alumnos: actasAlumnos,
          catedra: mesa.catedras || { id: mesa.catedra_id, nombre: catedraNombre },
          institucionNombre,
          cicloAnio: '2026'
        }}
      />

    </div>
  );
}
