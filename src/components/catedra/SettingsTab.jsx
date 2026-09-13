import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Settings, 
  Clock, 
  Sliders, 
  Plus, 
  Trash2, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle,
  Calendar as CalendarIcon,
  ChevronDown
} from 'lucide-react';
import Button from '../common/Button';
import Card from '../common/Card';
import Badge from '../common/Badge';
import CustomSelect from '../common/CustomSelect';
import { toast } from 'sonner';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';

const DAYS_OF_WEEK = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const normalizePeriodTipo = (tipo, nombre = '', index = 0) => {
  const norm = String(tipo || '').toUpperCase().trim();
  if (norm === 'PRIMER_CUATRIMESTRE' || norm === '1_CUATRIMESTRE' || norm === '1ER_CUATRIMESTRE') {
    return 'PRIMER_CUATRIMESTRE';
  }
  if (norm === 'RECESO_INVERNAL' || norm === 'RECESO' || norm === 'INVIERNO') {
    return 'RECESO_INVERNAL';
  }
  if (norm === 'SEGUNDO_CUATRIMESTRE' || norm === '2_CUATRIMESTRE' || norm === '2DO_CUATRIMESTRE') {
    return 'SEGUNDO_CUATRIMESTRE';
  }
  const n = String(nombre).toLowerCase();
  if (n.includes('receso') || n.includes('invernal') || n.includes('invierno')) {
    return 'RECESO_INVERNAL';
  }
  if (n.includes('1') || n.includes('primer')) {
    return 'PRIMER_CUATRIMESTRE';
  }
  if (n.includes('2') || n.includes('segundo')) {
    return 'SEGUNDO_CUATRIMESTRE';
  }
  if (index === 0) return 'PRIMER_CUATRIMESTRE';
  if (index === 1) return 'RECESO_INVERNAL';
  if (index === 2) return 'SEGUNDO_CUATRIMESTRE';
  return norm || 'PRIMER_CUATRIMESTRE';
};

const formatToIsoDate = (dateVal) => {
  if (!dateVal) return '';
  if (typeof dateVal === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
    return dateVal;
  }
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  } catch {
    return '';
  }
};

export default function SettingsTab({ catedra, onCatedraUpdated }) {
  const { user, isDemo } = useAuth();
  const { setPeriodosAcademicos } = useApp();
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Form states: Cátedra info
  const [nombre, setNombre] = useState(catedra?.nombre || '');
  const [modalidad, setModalidad] = useState(catedra?.modalidad || 'ANUAL');
  const [nivel, setNivel] = useState(catedra?.nivel || 'TERCIARIO');

  // Schedules state
  const [horarios, setHorarios] = useState(
    Array.isArray(catedra?.horarios_semanales) ? catedra.horarios_semanales : []
  );

  // Criteria state
  const [criterios, setCriterios] = useState({
    min_asist_promo: 80,
    min_asist_reg: 70,
    nota_min_promo: 7,
    nota_min_reg: 4,
    nota_min_sec: 6
  });

  // Periodos state con tipos canónicos
  const [periodos, setPeriodos] = useState([
    { id: 'per-1', nombre: '1° Cuatrimestre', tipo: 'PRIMER_CUATRIMESTRE', fecha_inicio: '2026-03-09', fecha_fin: '2026-07-10' },
    { id: 'per-2', nombre: 'Receso Invernal', tipo: 'RECESO_INVERNAL', fecha_inicio: '2026-07-13', fecha_fin: '2026-07-24' },
    { id: 'per-3', nombre: '2° Cuatrimestre', tipo: 'SEGUNDO_CUATRIMESTRE', fecha_inicio: '2026-08-03', fecha_fin: '2026-11-20' }
  ]);

  // Accordion collapse states (OBLIGATORIAMENTE CERRADOS / COLAPSADOS por defecto)
  const [isPeriodosOpen, setIsPeriodosOpen] = useState(false);
  const [isCriteriosOpen, setIsCriteriosOpen] = useState(false);

  // Initial snapshot to automatically detect dirty/modified state
  const [initialSnapshot, setInitialSnapshot] = useState(null);

  useEffect(() => {
    if (catedra) {
      const initNombre = catedra.nombre || '';
      const initMod = catedra.modalidad || 'ANUAL';
      const initNivel = catedra.nivel || 'TERCIARIO';
      const initHorarios = Array.isArray(catedra.horarios_semanales) ? catedra.horarios_semanales : [];
      setNombre(initNombre);
      setModalidad(initMod);
      setNivel(initNivel);
      setHorarios(initHorarios);
      loadAllSettings(initNombre, initMod, initNivel, initHorarios);
    }
  }, [catedra]);

  async function loadAllSettings(initNombre, initMod, initNivel, initHorarios) {
    let loadedCrit = {
      min_asist_promo: 80,
      min_asist_reg: 70,
      nota_min_promo: 7,
      nota_min_reg: 4,
      nota_min_sec: 6
    };
    let loadedPers = [
      { id: 'per-1', nombre: '1° Cuatrimestre', tipo: 'PRIMER_CUATRIMESTRE', fecha_inicio: '2026-03-09', fecha_fin: '2026-07-10' },
      { id: 'per-2', nombre: 'Receso Invernal', tipo: 'RECESO_INVERNAL', fecha_inicio: '2026-07-13', fecha_fin: '2026-07-24' },
      { id: 'per-3', nombre: '2° Cuatrimestre', tipo: 'SEGUNDO_CUATRIMESTRE', fecha_inicio: '2026-08-03', fecha_fin: '2026-11-20' }
    ];

    try {
      if (isSupabaseConfigured && !isDemo) {
        const { data: critData } = await supabase
          .from('criterios_evaluacion')
          .select('*')
          .eq('catedra_id', catedra.id)
          .single();

        if (critData) {
          loadedCrit = {
            min_asist_promo: Number(critData.min_asist_promo) || 80,
            min_asist_reg: Number(critData.min_asist_reg) || 70,
            nota_min_promo: Number(critData.nota_min_promo) || 7,
            nota_min_reg: Number(critData.nota_min_reg) || 4,
            nota_min_sec: Number(critData.nota_min_sec) || 6
          };
        }

        if (catedra?.ciclo_id) {
          const { data: perData } = await supabase
            .from('periodos_academicos')
            .select('*')
            .eq('ciclo_id', catedra.ciclo_id)
            .order('fecha_inicio', { ascending: true });

          if (perData && perData.length > 0) {
            loadedPers = perData.map((p, idx) => ({
              ...p,
              tipo: normalizePeriodTipo(p.tipo, p.nombre, idx),
              fecha_inicio: formatToIsoDate(p.fecha_inicio),
              fecha_fin: formatToIsoDate(p.fecha_fin)
            }));
          }
        }
      } else {
        const storedCrit = localStorage.getItem(`criterios_${catedra.id}`);
        if (storedCrit) {
          loadedCrit = JSON.parse(storedCrit);
        }
        const storedPer = localStorage.getItem(`periodos_${catedra?.ciclo_id || catedra?.id}`);
        if (storedPer) {
          try {
            const parsedPer = JSON.parse(storedPer);
            if (Array.isArray(parsedPer) && parsedPer.length > 0) {
              loadedPers = parsedPer.map((p, idx) => ({
                ...p,
                tipo: normalizePeriodTipo(p.tipo, p.nombre, idx),
                fecha_inicio: formatToIsoDate(p.fecha_inicio),
                fecha_fin: formatToIsoDate(p.fecha_fin)
              }));
            }
          } catch (e) {
            console.warn('Error parsing storedPer:', e);
          }
        }
      }
    } catch (err) {
      console.warn('Could not fetch settings data:', err);
    } finally {
      setCriterios(loadedCrit);
      setPeriodos(loadedPers);
      setInitialSnapshot(JSON.stringify({
        nombre: (initNombre || '').trim(),
        modalidad: initMod,
        nivel: initNivel,
        horarios: initHorarios,
        criterios: loadedCrit,
        periodos: loadedPers
      }));
    }
  };

  const handleAddPeriodo = () => {
    setPeriodos([
      ...periodos,
      { id: 'per-' + Date.now(), nombre: 'Nuevo Período', tipo: 'PRIMER_CUATRIMESTRE', fecha_inicio: '', fecha_fin: '' }
    ]);
  };

  const handleRemovePeriodo = (index) => {
    setPeriodos(periodos.filter((_, i) => i !== index));
  };

  const handlePeriodoChange = (index, field, value) => {
    const updated = [...periodos];
    const val = (field === 'fecha_inicio' || field === 'fecha_fin') ? formatToIsoDate(value) : value;
    updated[index][field] = val;
    setPeriodos(updated);
  };

  const handleAddHorario = () => {
    setHorarios([
      ...horarios,
      { dia: 'Lunes', desde: '18:00', hasta: '20:00', aula: 'Aula 10' }
    ]);
  };

  const handleRemoveHorario = (index) => {
    setHorarios(horarios.filter((_, i) => i !== index));
  };

  const handleHorarioChange = (index, field, value) => {
    const updated = [...horarios];
    updated[index][field] = value;
    setHorarios(updated);
  };

  const currentSnapshot = JSON.stringify({
    nombre: (nombre || '').trim(),
    modalidad,
    nivel,
    horarios,
    criterios,
    periodos
  });

  const isDirty = Boolean(initialSnapshot && initialSnapshot !== currentSnapshot);

  const handleSaveAll = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    setLoading(true);
    setSaveSuccess(false);
    setErrorMessage('');

    try {
      if (isSupabaseConfigured && !isDemo) {
        // 1. Update cátedra
        let { data: updatedCatedra, error: catError } = await supabase
          .from('catedras')
          .update({
            nombre: nombre.trim(),
            modalidad,
            horarios_semanales: horarios
          })
          .eq('id', catedra.id)
          .select()
          .single();

        if (catError && (catError.message?.includes('violates check constraint') || catError.message?.includes('catedras_modalidad_check'))) {
          const fallbackRes = await supabase
            .from('catedras')
            .update({
              nombre: nombre.trim(),
              modalidad: 'CUATRIMESTRAL',
              horarios_semanales: horarios
            })
            .eq('id', catedra.id)
            .select()
            .single();
          if (fallbackRes.error) throw fallbackRes.error;
          updatedCatedra = fallbackRes.data;
          toast.info(`Modalidad guardada. Ejecuta 'supabase/update_modalidad_check.sql' en el SQL Editor para guardar el valor exacto.`);
        } else if (catError) {
          throw catError;
        }

        // 2. Upsert criterios
        const { error: critError } = await supabase
          .from('criterios_evaluacion')
          .upsert({
            catedra_id: catedra.id,
            min_asist_promo: criterios.min_asist_promo,
            min_asist_reg: criterios.min_asist_reg,
            nota_min_promo: criterios.nota_min_promo,
            nota_min_reg: criterios.nota_min_reg,
            nota_min_sec: criterios.nota_min_sec
          }, { onConflict: 'catedra_id' });

        if (critError) throw critError;

        // 3. Upsert / update periodos
        if (catedra.ciclo_id) {
          const today = new Date().toISOString().split('T')[0];
          const payload = periodos.map((p, idx) => {
            const normalizedTipo = normalizePeriodTipo(p.tipo, p.nombre, idx);
            const isoStart = formatToIsoDate(p.fecha_inicio) || today;
            const isoEnd = formatToIsoDate(p.fecha_fin) || isoStart;
            return {
              ciclo_id: catedra.ciclo_id,
              docente_id: user?.id,
              nombre: (p.nombre || '').trim() || (
                normalizedTipo === 'PRIMER_CUATRIMESTRE' ? '1° Cuatrimestre' :
                normalizedTipo === 'RECESO_INVERNAL' ? 'Receso Invernal' :
                normalizedTipo === 'SEGUNDO_CUATRIMESTRE' ? '2° Cuatrimestre' : 'Período Académico'
              ),
              tipo: normalizedTipo,
              fecha_inicio: isoStart,
              fecha_fin: isoEnd
            };
          });

          try {
            const { data: upsertData, error: pErr } = await supabase
              .from('periodos_academicos')
              .upsert(payload, { onConflict: 'ciclo_id,tipo' })
              .select();

            if (pErr) throw pErr;
            if (upsertData && upsertData.length > 0) {
              setPeriodos(upsertData);
              if (setPeriodosAcademicos) setPeriodosAcademicos(upsertData);
              window.dispatchEvent(new CustomEvent('periodos_academicos_updated', { detail: upsertData }));
              window.dispatchEvent(new CustomEvent('docentepro:periodos_updated', { detail: upsertData }));
            }
          } catch (pErr) {
            console.warn('Aviso guardando períodos en SettingsTab:', pErr);
            const payloadNoDocente = payload.map(({ docente_id, ...rest }) => rest);
            const { data: fbData } = await supabase
              .from('periodos_academicos')
              .upsert(payloadNoDocente, { onConflict: 'ciclo_id,tipo' })
              .select();
            if (fbData && fbData.length > 0) {
              setPeriodos(fbData);
              if (setPeriodosAcademicos) setPeriodosAcademicos(fbData);
              window.dispatchEvent(new CustomEvent('periodos_academicos_updated', { detail: fbData }));
              window.dispatchEvent(new CustomEvent('docentepro:periodos_updated', { detail: fbData }));
            }
          }
        }

        if (onCatedraUpdated) onCatedraUpdated(updatedCatedra);
      } else {
        // Demo mode fallback
        const updatedCat = {
          ...catedra,
          nombre: nombre.trim(),
          modalidad,
          horarios_semanales: horarios
        };
        localStorage.setItem(`criterios_${catedra.id}`, JSON.stringify(criterios));
        localStorage.setItem(`periodos_${catedra?.ciclo_id || catedra?.id}`, JSON.stringify(periodos));
        if (setPeriodosAcademicos) setPeriodosAcademicos(periodos);
        window.dispatchEvent(new CustomEvent('periodos_academicos_updated', { detail: periodos }));
        window.dispatchEvent(new CustomEvent('docentepro:periodos_updated', { detail: periodos }));
        if (onCatedraUpdated) onCatedraUpdated(updatedCat);
      }

      setInitialSnapshot(JSON.stringify({
        nombre: (nombre || '').trim(),
        modalidad,
        nivel,
        horarios,
        criterios,
        periodos
      }));

      setSaveSuccess(true);
      toast.success('Configuración, criterios y períodos guardados exitosamente.');
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err) {
      console.error('Error saving catedra settings:', err);
      toast.error('Error al guardar configuración: ' + (err.message || 'Error desconocido'));
      setErrorMessage('Error al guardar configuración: ' + (err.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSaveAll} className="space-y-6 animate-fadeIn">
      {saveSuccess && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-success" />
          <span className="font-semibold">¡Configuración y criterios guardados exitosamente!</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 text-danger text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Basic info */}
      <Card>
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-surface-border">
          <Settings className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-text-primary">Información General de la Cátedra</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Nombre de la Asignatura / Cátedra *
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-surface-border rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Régimen / Modalidad
            </label>
            <CustomSelect
              value={modalidad}
              onChange={(val) => setModalidad(typeof val === 'object' ? val.target.value : val)}
              options={[
                { value: '1° CUATRIMESTRE', label: '1° Cuatrimestre', badge: '1° Cuat.' },
                { value: '2° CUATRIMESTRE', label: '2° Cuatrimestre', badge: '2° Cuat.' },
                { value: 'ANUAL', label: 'Anual', badge: 'Anual' },
                { value: 'CUATRIMESTRAL', label: 'Cuatrimestral (Genérico)', badge: 'Cuat.' }
              ]}
            />
          </div>
        </div>
      </Card>

      {/* Weekly Schedule */}
      <Card>
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-surface-border">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-text-primary">Horarios Semanales de Dictado</h3>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            icon={Plus}
            onClick={handleAddHorario}
          >
            Agregar Franja Horaria
          </Button>
        </div>

        <p className="text-xs text-text-muted mb-4">
          Configura los días y horarios en los que se dicta esta cátedra. Se utilizarán para calendarizar clases y verificar solapamientos.
        </p>

        {horarios.length === 0 ? (
          <div className="text-center py-6 bg-surface-hover/50 rounded-xl border border-dashed border-surface-border">
            <Clock className="w-6 h-6 text-text-muted mx-auto mb-1 opacity-50" />
            <p className="text-xs text-text-muted">No se han configurado días ni horarios aún.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {horarios.map((slot, index) => (
              <div
                key={index}
                className="flex flex-col sm:flex-row items-center gap-3 p-3 rounded-lg bg-surface-hover/40 border border-surface-border"
              >
                <div className="w-full sm:w-36">
                  <CustomSelect
                    value={slot.dia}
                    onChange={(val) => handleHorarioChange(index, 'dia', typeof val === 'object' ? val.target.value : val)}
                    options={DAYS_OF_WEEK.map((d) => ({ value: d, label: d }))}
                    buttonClassName="py-1.5 px-2.5 text-xs font-semibold"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-xs text-text-muted">De</span>
                  <input
                    type="time"
                    value={slot.desde}
                    onChange={(e) => handleHorarioChange(index, 'desde', e.target.value)}
                    className="px-2 py-1 text-xs font-mono border border-surface-border rounded-lg bg-surface text-text-primary"
                  />
                  <span className="text-xs text-text-muted">a</span>
                  <input
                    type="time"
                    value={slot.hasta}
                    onChange={(e) => handleHorarioChange(index, 'hasta', e.target.value)}
                    className="px-2 py-1 text-xs font-mono border border-surface-border rounded-lg bg-surface text-text-primary"
                  />
                </div>

                <div className="flex-1 w-full sm:w-auto">
                  <input
                    type="text"
                    value={slot.aula || ''}
                    placeholder="Aula / Laboratorio (opcional)"
                    onChange={(e) => handleHorarioChange(index, 'aula', e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-surface-border rounded-lg bg-surface text-text-primary placeholder:text-text-muted"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveHorario(index)}
                  className="p-1.5 text-text-muted hover:text-danger rounded-md hover:bg-red-50 transition-colors shrink-0"
                  title="Eliminar horario"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Límites de Períodos Académicos y Receso (Acordeón Bento) */}
      <Card>
        <div 
          onClick={() => setIsPeriodosOpen(!isPeriodosOpen)}
          className={`flex items-center justify-between cursor-pointer select-none transition-all ${
            isPeriodosOpen ? 'pb-3 mb-4 border-b border-surface-border' : ''
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-text-primary">
                  Límites de Períodos Académicos y Receso Invernal
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface-hover text-text-muted border border-surface-border">
                  {periodos.length} {periodos.length === 1 ? 'período' : 'períodos'}
                </span>
              </div>
              {!isPeriodosOpen && (
                <p className="text-xs text-text-muted mt-0.5 truncate hidden sm:block">
                  {periodos.length > 0 ? periodos.map(p => p.nombre).join(' • ') : 'Sin períodos configurados'}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isPeriodosOpen && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon={Plus}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddPeriodo();
                }}
                className="text-xs hidden sm:inline-flex"
              >
                Agregar Período
              </Button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsPeriodosOpen(!isPeriodosOpen);
              }}
              aria-label={isPeriodosOpen ? "Colapsar sección" : "Desplegar sección"}
              className="w-9 h-9 rounded-full flex items-center justify-center border border-slate-200/80 dark:border-white/10 bg-surface hover:bg-primary/10 hover:text-primary transition-all duration-200 cursor-pointer shrink-0 active:scale-95 shadow-xs"
            >
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-300 ease-in-out transform ${
                  isPeriodosOpen ? 'rotate-180 text-primary' : 'rotate-0 text-text-muted'
                }`}
              />
            </button>
          </div>
        </div>

        {isPeriodosOpen && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex sm:hidden justify-end">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon={Plus}
                onClick={handleAddPeriodo}
                className="text-xs w-full"
              >
                Agregar Período
              </Button>
            </div>

            <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl text-xs text-primary leading-relaxed">
              <strong>Regla Estricta:</strong> Las clases proyectadas y recurrentes en el calendario se limitan a este rango de fechas y se excluyen automáticamente durante los días del Receso Invernal.
            </div>

            <div className="space-y-3">
              {periodos.map((p, index) => (
                <div
                  key={p.id || index}
                  className="p-3 bg-surface-hover/30 rounded-xl border border-surface-border flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
                >
                  <div className="w-full sm:w-44">
                    <label className="block text-[10px] font-bold uppercase text-text-muted mb-1">
                      Nombre del Período
                    </label>
                    <input
                      type="text"
                      value={p.nombre}
                      onChange={(e) => handlePeriodoChange(index, 'nombre', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs font-semibold border border-surface-border rounded-lg bg-surface text-text-primary"
                      placeholder="Ej: 1° Cuatrimestre"
                    />
                  </div>

                  <div className="w-full sm:w-36">
                    <label className="block text-[10px] font-bold uppercase text-text-muted mb-1">
                      Tipo
                    </label>
                    <CustomSelect
                      value={p.tipo}
                      onChange={(val) => handlePeriodoChange(index, 'tipo', typeof val === 'object' ? val.target.value : val)}
                      options={[
                        { value: 'PRIMER_CUATRIMESTRE', label: '1° Cuatrimestre' },
                        { value: 'RECESO_INVERNAL', label: 'Receso Invernal' },
                        { value: 'SEGUNDO_CUATRIMESTRE', label: '2° Cuatrimestre' },
                        { value: 'OTRO', label: 'Otro Período' }
                      ]}
                      buttonClassName="py-1.5 px-2.5 text-xs font-medium"
                    />
                  </div>

                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-text-muted mb-1">
                        Fecha Inicio
                      </label>
                      <input
                        type="date"
                        value={formatToIsoDate(p.fecha_inicio)}
                        onChange={(e) => handlePeriodoChange(index, 'fecha_inicio', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-mono border border-surface-border rounded-lg bg-surface text-text-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-text-muted mb-1">
                        Fecha Fin
                      </label>
                      <input
                        type="date"
                        value={formatToIsoDate(p.fecha_fin)}
                        onChange={(e) => handlePeriodoChange(index, 'fecha_fin', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-mono border border-surface-border rounded-lg bg-surface text-text-primary"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemovePeriodo(index)}
                    className="p-1.5 text-text-muted hover:text-danger rounded-md hover:bg-danger/10 transition-colors self-end sm:self-center"
                    title="Eliminar período"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Criterios de Evaluación y Condiciones Académicas (Acordeón Bento) */}
      <Card>
        <div 
          onClick={() => setIsCriteriosOpen(!isCriteriosOpen)}
          className={`flex items-center justify-between cursor-pointer select-none transition-all ${
            isCriteriosOpen ? 'pb-3 mb-4 border-b border-surface-border' : ''
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Sliders className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-text-primary">
                  Criterios de Evaluación y Condiciones Académicas
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  Nivel {nivel}
                </span>
              </div>
              {!isCriteriosOpen && (
                <p className="text-xs text-text-muted mt-0.5 truncate hidden sm:block">
                  Regularidad ({criterios.min_asist_reg}% asist. / nota {criterios.nota_min_reg}) • Promoción ({criterios.min_asist_promo}% asist. / nota {criterios.nota_min_promo})
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsCriteriosOpen(!isCriteriosOpen);
              }}
              aria-label={isCriteriosOpen ? "Colapsar sección" : "Desplegar sección"}
              className="w-9 h-9 rounded-full flex items-center justify-center border border-slate-200/80 dark:border-white/10 bg-surface hover:bg-primary/10 hover:text-primary transition-all duration-200 cursor-pointer shrink-0 active:scale-95 shadow-xs"
            >
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-300 ease-in-out transform ${
                  isCriteriosOpen ? 'rotate-180 text-primary' : 'rotate-0 text-text-muted'
                }`}
              />
            </button>
          </div>
        </div>

        {isCriteriosOpen && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <p className="text-xs text-text-muted">
              Parámetros para el cálculo automático de regularidad, promoción y aprobación según el nivel {nivel}.
            </p>

            {nivel === 'TERCIARIO' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-3 bg-surface-hover/30 rounded-xl border border-surface-border">
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    % Asistencia Promoción
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={criterios.min_asist_promo}
                      onChange={(e) => setCriterios({ ...criterios, min_asist_promo: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 text-sm font-mono font-bold border border-surface-border rounded-lg bg-surface text-text-primary"
                    />
                    <span className="text-xs font-bold text-text-muted">%</span>
                  </div>
                  <p className="text-[10px] text-text-muted mt-1">Reglamentario: 80%</p>
                </div>

                <div className="p-3 bg-surface-hover/30 rounded-xl border border-surface-border">
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    % Asistencia Regularidad
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={criterios.min_asist_reg}
                      onChange={(e) => setCriterios({ ...criterios, min_asist_reg: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 text-sm font-mono font-bold border border-surface-border rounded-lg bg-surface text-text-primary"
                    />
                    <span className="text-xs font-bold text-text-muted">%</span>
                  </div>
                  <p className="text-[10px] text-text-muted mt-1">Reglamentario: 70%</p>
                </div>

                <div className="p-3 bg-surface-hover/30 rounded-xl border border-surface-border">
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    Nota Mín. Promoción
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    step="0.5"
                    value={criterios.nota_min_promo}
                    onChange={(e) => setCriterios({ ...criterios, nota_min_promo: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 text-sm font-mono font-bold border border-surface-border rounded-lg bg-surface text-text-primary"
                  />
                  <p className="text-[10px] text-text-muted mt-1">Por parcial (7 o más)</p>
                </div>

                <div className="p-3 bg-surface-hover/30 rounded-xl border border-surface-border">
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    Nota Mín. Regularidad
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    step="0.5"
                    value={criterios.nota_min_reg}
                    onChange={(e) => setCriterios({ ...criterios, nota_min_reg: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 text-sm font-mono font-bold border border-surface-border rounded-lg bg-surface text-text-primary"
                  />
                  <p className="text-[10px] text-text-muted mt-1">Por parcial (4 o más)</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-surface-hover/30 rounded-xl border border-surface-border">
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    Nota Mínima de Aprobación (Secundario)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    step="0.5"
                    value={criterios.nota_min_sec}
                    onChange={(e) => setCriterios({ ...criterios, nota_min_sec: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 text-sm font-mono font-bold border border-surface-border rounded-lg bg-surface text-text-primary"
                  />
                  <p className="text-[10px] text-text-muted mt-1">Por periodo (6 o 7 según jurisdicción)</p>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Bottom Save Bar */}
      <div className="flex justify-end items-center gap-3 pt-4">
        <Button
          type="submit"
          variant="primary"
          icon={Save}
          loading={loading}
          size="lg"
        >
          Guardar Cambios de Configuración
        </Button>
      </div>

      {/* Botón Circular Flotante (FAB) renderizado directamente en document.body mediante Portal */}
      {isDirty && typeof document !== 'undefined' && createPortal(
        <div className="fixed bottom-20 md:bottom-8 right-6 md:right-8 z-[9999] flex items-center gap-3 animate-fadeIn pointer-events-auto">
          {/* Badge informativo lateral */}
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface/95 dark:bg-[#0c1322]/95 backdrop-blur-md border border-primary/40 shadow-xl text-xs font-bold text-text-primary">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping shrink-0" />
            <span>Cambios sin guardar</span>
          </div>

          {/* Botón circular con icono de guardar */}
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={loading}
            title="Guardar cambios pendientes (detectados automáticamente)"
            aria-label="Guardar cambios de configuración"
            className="relative group w-14 h-14 rounded-full bg-gradient-to-r from-primary to-primary-hover hover:brightness-110 active:scale-95 text-white shadow-2xl shadow-primary/50 flex items-center justify-center transition-all duration-200 border-2 border-white/30 focus:outline-hidden cursor-pointer"
          >
            {/* Distintivo animado en la esquina */}
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500 border border-white text-[9px] font-black text-white items-center justify-center">
                !
              </span>
            </span>

            {loading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-6 h-6 drop-shadow-md group-hover:scale-110 transition-transform" />
            )}
          </button>
        </div>,
        document.body
      )}
    </form>
  );
}
