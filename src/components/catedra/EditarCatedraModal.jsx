import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Pencil, 
  Building2, 
  Calendar, 
  Clock, 
  Plus, 
  Trash2, 
  GraduationCap, 
  Hourglass, 
  AlertCircle,
  CheckCircle2,
  MapPin,
  Sparkles
} from 'lucide-react';
import Button from '../common/Button';
import CustomSelect from '../common/CustomSelect';
import Badge from '../common/Badge';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { handleAppError } from '../../utils/handleAppError';
import { toast } from 'sonner';

const DAYS_OF_WEEK = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const NIVEL_OPTIONS = [
  { value: 'TERCIARIO', label: 'Terciario / Superior', badge: 'Terciario' },
  { value: 'SECUNDARIO', label: 'Secundario', badge: 'Secundario' }
];

const MODALIDAD_OPTIONS = [
  { value: 'ANUAL', label: 'Anual (Todo el año)', badge: 'Anual' },
  { value: '1° CUATRIMESTRE', label: '1° Cuatrimestre', badge: '1° Cuat.' },
  { value: '2° CUATRIMESTRE', label: '2° Cuatrimestre', badge: '2° Cuat.' },
  { value: 'CUATRIMESTRAL', label: 'Cuatrimestral (Genérico)', badge: 'Cuat.' }
];

/**
 * EditarCatedraModal - Modal para modificar datos institucionales, ciclo,
 * nombre, nivel, régimen y horarios de una cátedra.
 */
export default function EditarCatedraModal({
  isOpen,
  onClose,
  catedra,
  onCatedraUpdated
}) {
  const { user, isDemo } = useAuth();
  const { 
    instituciones: contextInstituciones = [], 
    ciclosLectivos: contextCiclos = [], 
    activeCiclo,
    refreshData,
    setCatedras 
  } = useApp();

  // Estados de carga de datos auxiliares
  const [institucionesList, setInstitucionesList] = useState(contextInstituciones);
  const [ciclosList, setCiclosList] = useState(contextCiclos);

  // Estados del Formulario
  const [nombre, setNombre] = useState('');
  const [institucionId, setInstitucionId] = useState('');
  const [cicloId, setCicloId] = useState('');
  const [nivel, setNivel] = useState('TERCIARIO');
  const [modalidad, setModalidad] = useState('ANUAL');
  const [horarios, setHorarios] = useState([]);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Cargar o sincronizar instituciones y ciclos disponibles
  useEffect(() => {
    if (!isOpen) return;

    if (contextInstituciones.length > 0) {
      setInstitucionesList(contextInstituciones);
    } else {
      loadInstitucionesFallback();
    }

    if (contextCiclos.length > 0) {
      setCiclosList(contextCiclos);
    } else {
      loadCiclosFallback();
    }
  }, [isOpen, contextInstituciones, contextCiclos]);

  async function loadInstitucionesFallback() {
    try {
      if (isSupabaseConfigured && !isDemo && user) {
        const { data } = await supabase
          .from('instituciones')
          .select('id, nombre, nivel')
          .eq('docente_id', user.id)
          .order('nombre', { ascending: true });
        if (data && data.length > 0) {
          setInstitucionesList(data);
        }
      }
    } catch (_) {}
  }

  async function loadCiclosFallback() {
    try {
      if (isSupabaseConfigured && !isDemo && user) {
        const { data } = await supabase
          .from('ciclos_lectivos')
          .select('id, anio, nombre, activo')
          .eq('docente_id', user.id)
          .order('anio', { ascending: false });
        if (data && data.length > 0) {
          setCiclosList(data);
        }
      }
    } catch (_) {}
  }

  // 2. Pre-poblar formulario con los valores existentes de la cátedra
  useEffect(() => {
    if (isOpen && catedra) {
      setErrorMsg('');
      setNombre(catedra.nombre || '');
      
      const targetInstId = 
        catedra.institucion_id || 
        catedra.instituciones?.id || 
        (institucionesList[0]?.id || '');
      setInstitucionId(targetInstId);

      const targetCicloId = 
        catedra.ciclo_id || 
        catedra.ciclos_lectivos?.id || 
        activeCiclo?.id || 
        (ciclosList[0]?.id || '');
      setCicloId(targetCicloId);

      setNivel(catedra.nivel || 'TERCIARIO');
      setModalidad(catedra.modalidad || 'ANUAL');

      const rawHorarios = Array.isArray(catedra.horarios_semanales) ? catedra.horarios_semanales : [];
      setHorarios(rawHorarios.map((h, i) => ({
        id: h.id || `h-${i}-${Date.now()}`,
        dia: h.dia || 'Lunes',
        desde: h.desde || '18:00',
        hasta: h.hasta || '20:00',
        aula: h.aula || ''
      })));
    }
  }, [isOpen, catedra, activeCiclo]);

  // Manejo de Horarios Semanales
  const handleAddHorario = () => {
    setHorarios(prev => [
      ...prev,
      {
        id: `h-${Date.now()}`,
        dia: 'Lunes',
        desde: '18:00',
        hasta: '20:00',
        aula: ''
      }
    ]);
  };

  const handleUpdateHorario = (index, field, value) => {
    setHorarios(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleRemoveHorario = (index) => {
    setHorarios(prev => prev.filter((_, i) => i !== index));
  };

  // Cambio de institución en 1 clic
  const handleInstitucionChange = (newId) => {
    setInstitucionId(newId);
    const found = institucionesList.find(i => i.id === newId);
    if (found?.nivel) {
      setNivel(found.nivel);
    }
  };

  // Guardar Cambios
  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!nombre.trim()) {
      setErrorMsg('El nombre de la cátedra es obligatorio.');
      return;
    }
    if (!institucionId) {
      setErrorMsg('Debes seleccionar una institución educativa.');
      return;
    }

    setSaving(true);
    setErrorMsg('');

    try {
      const cleanHorarios = horarios.map(({ id, ...rest }) => rest);
      let updatedCatedra = null;

      if (isSupabaseConfigured && !isDemo && user && !String(catedra.id).startsWith('cat-demo-')) {
        const updatePayload = {
          institucion_id: institucionId,
          ciclo_id: cicloId || null,
          nombre: nombre.trim(),
          nivel,
          modalidad,
          horarios_semanales: cleanHorarios,
          updated_at: new Date().toISOString()
        };

        let { data, error } = await supabase
          .from('catedras')
          .update(updatePayload)
          .eq('id', catedra.id)
          .select('*, instituciones(*), ciclos_lectivos(*)');

        // Fallback defensivo si la columna 'updated_at' aún no existe en el esquema PostgreSQL (código 42703)
        if (error && (error.code === '42703' || error.message?.includes('updated_at'))) {
          const { updated_at, ...payloadWithoutUpdatedAt } = updatePayload;
          const retryRes = await supabase
            .from('catedras')
            .update(payloadWithoutUpdatedAt)
            .eq('id', catedra.id)
            .select('*, instituciones(*), ciclos_lectivos(*)');
          data = retryRes.data;
          error = retryRes.error;
        }

        // Fallback defensivo ante restricciones check de modalidad heredadas
        if (error && (error.message?.includes('violates check constraint') || error.message?.includes('catedras_modalidad_check'))) {
          const fallbackRes = await supabase
            .from('catedras')
            .update({ ...updatePayload, modalidad: 'CUATRIMESTRAL' })
            .eq('id', catedra.id)
            .select('*, instituciones(*), ciclos_lectivos(*)');
          if (!fallbackRes.error) {
            data = fallbackRes.data;
            error = null;
          }
        }

        if (error) {
          handleAppError(error, 'Catedra / Editar Catedra', user);
          setErrorMsg(error.message || 'Error al actualizar la cátedra.');
          return;
        }

        const rawUpdated = Array.isArray(data) ? data[0] : data;
        const instObj = Array.isArray(rawUpdated?.instituciones) 
          ? rawUpdated.instituciones[0] 
          : rawUpdated?.instituciones;
        const instFound = institucionesList.find(i => i.id === institucionId) || instObj;
        const cicloObj = Array.isArray(rawUpdated?.ciclos_lectivos) 
          ? rawUpdated.ciclos_lectivos[0] 
          : rawUpdated?.ciclos_lectivos;
        const cicloFound = ciclosList.find(c => c.id === cicloId) || cicloObj;

        updatedCatedra = {
          ...rawUpdated,
          institucion_id: institucionId,
          institucion_nombre: instObj?.nombre || instFound?.nombre || '',
          institucion_nivel: instObj?.nivel || instFound?.nivel || nivel,
          instituciones: instObj || instFound || null,
          ciclo_id: cicloId || null,
          ciclos_lectivos: cicloObj || cicloFound || null
        };
      } else {
        // Modo Demostración / Local
        const instFound = institucionesList.find(i => i.id === institucionId);
        const cicloFound = ciclosList.find(c => c.id === cicloId);

        updatedCatedra = {
          ...catedra,
          nombre: nombre.trim(),
          institucion_id: institucionId,
          institucion_nombre: instFound?.nombre || catedra.institucion_nombre || 'Institución',
          institucion_nivel: nivel,
          instituciones: instFound || catedra.instituciones,
          ciclo_id: cicloId || null,
          ciclos_lectivos: cicloFound || catedra.ciclos_lectivos,
          nivel,
          modalidad,
          horarios_semanales: cleanHorarios,
          updated_at: new Date().toISOString()
        };

        // Actualizar almacenamiento local en demo
        const demoCats = JSON.parse(localStorage.getItem('demo_catedras') || '[]');
        const updatedList = demoCats.map(c => c.id === catedra.id ? { ...c, ...updatedCatedra } : c);
        localStorage.setItem('demo_catedras', JSON.stringify(updatedList));

        // Actualizar caché de cátedras
        const cachedCats = JSON.parse(localStorage.getItem('cached_catedras') || '[]');
        if (cachedCats.length > 0) {
          const newCached = cachedCats.map(c => c.id === catedra.id ? { ...c, ...updatedCatedra } : c);
          localStorage.setItem('cached_catedras', JSON.stringify(newCached));
        }
      }

      // 1. Sincronizar inmediatamente el estado global de cátedras en memoria (AppContext)
      if (setCatedras && updatedCatedra) {
        setCatedras(prev => (prev || []).map(c => c.id === catedra.id ? { ...c, ...updatedCatedra } : c));
      }

      // 2. Actualizar el estado local de la cátedra activa en la vista (currentCatedra)
      if (onCatedraUpdated && updatedCatedra) {
        onCatedraUpdated(updatedCatedra);
      }

      // 3. Refrescar lista de cátedras y datos en AppContext en segundo plano
      if (refreshData) {
        refreshData().catch(err => console.warn('Aviso refrescando estado global:', err));
      }

      toast.success('Cátedra actualizada correctamente');
      onClose();
    } catch (err) {
      handleAppError(err, 'Catedra / Editar Catedra', user);
      setErrorMsg(err.message || 'Ocurrió un error inesperado al actualizar la cátedra.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div 
        className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-scaleIn text-text-primary"
        onClick={(e) => e.stopPropagation()}
      >
        {/* CABECERA DEL MODAL */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-200/80 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-indigo-500/20 text-primary flex items-center justify-center shadow-xs border border-primary/20 shrink-0">
              <Pencil className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-text-primary tracking-tight">
                Modificar Cátedra
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Corrige la institución, ciclo lectivo, nombre, modalidad y horarios de cursada
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CUERPO DEL FORMULARIO CON SCROLL SUAVE */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 scrollbar-thin">
          {errorMsg && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs rounded-2xl flex items-center gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-semibold">{errorMsg}</span>
            </div>
          )}

          {/* 1. SECCIÓN: CONTEXTO INSTITUCIONAL Y CICLO */}
          <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/80 space-y-3.5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-muted">
              <Building2 className="w-3.5 h-3.5 text-primary" />
              <span>Institución y Ciclo Lectivo</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Selector de Institución (1 clic) */}
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                  Institución Educativa *
                </label>
                <CustomSelect
                  value={institucionId}
                  onChange={(val) => {
                    const targetId = typeof val === 'object' ? val.target.value : val;
                    handleInstitucionChange(targetId);
                  }}
                  options={institucionesList.map(inst => ({
                    value: inst.id,
                    label: inst.nombre,
                    badge: inst.nivel === 'TERCIARIO' ? 'Terciario' : 'Secundario'
                  }))}
                  placeholder="Seleccionar institución..."
                  buttonClassName="py-2.5 px-3 text-xs sm:text-sm font-medium rounded-xl"
                  menuClassName="z-50 max-h-48 overflow-y-auto shadow-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl"
                />
              </div>

              {/* Selector de Ciclo Lectivo */}
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                  Ciclo Lectivo
                </label>
                <CustomSelect
                  value={cicloId}
                  onChange={(val) => {
                    const targetId = typeof val === 'object' ? val.target.value : val;
                    setCicloId(targetId);
                  }}
                  options={ciclosList.length > 0 ? ciclosList.map(c => ({
                    value: c.id,
                    label: c.nombre ? `${c.nombre} (${c.anio})` : `Ciclo ${c.anio}`,
                    badge: c.activo ? 'Activo' : undefined
                  })) : [
                    { value: '', label: 'Ciclo 2026 (Predeterminado)' }
                  ]}
                  placeholder="Seleccionar ciclo lectivo..."
                  buttonClassName="py-2.5 px-3 text-xs sm:text-sm font-medium rounded-xl"
                  menuClassName="z-50 max-h-48 overflow-y-auto shadow-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* 2. SECCIÓN: NOMBRE DE LA CÁTEDRA */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
              Nombre de la Asignatura / Cátedra *
            </label>
            <div className="relative">
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Programación y Algoritmos II, Historia Americana..."
                className="w-full px-3.5 py-2.5 sm:py-3 text-sm font-medium border border-slate-200 dark:border-slate-700/80 rounded-2xl bg-white dark:bg-slate-800/80 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-xs"
                required
                autoFocus
              />
            </div>
          </div>

          {/* 3. SECCIÓN: NIVEL ACADÉMICO Y RÉGIMEN */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
                Nivel Académico
              </label>
              <CustomSelect
                value={nivel}
                onChange={(val) => setNivel(typeof val === 'object' ? val.target.value : val)}
                options={NIVEL_OPTIONS}
                buttonClassName="py-2.5 px-3 text-xs sm:text-sm font-medium rounded-xl"
                menuClassName="z-50 max-h-48 overflow-y-auto shadow-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
                Régimen de Cursado
              </label>
              <CustomSelect
                value={modalidad}
                onChange={(val) => setModalidad(typeof val === 'object' ? val.target.value : val)}
                options={MODALIDAD_OPTIONS}
                buttonClassName="py-2.5 px-3 text-xs sm:text-sm font-medium rounded-xl"
                menuClassName="z-50 max-h-48 overflow-y-auto shadow-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl"
              />
            </div>
          </div>

          {/* 4. SECCIÓN: HORARIOS SEMANALES Y AULA */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-primary">
                  Horarios Semanales y Aula
                </label>
                <p className="text-[11px] text-text-muted">
                  Días y franjas horarias de dictado presencial o virtual
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                icon={Plus}
                onClick={handleAddHorario}
                className="text-xs font-bold rounded-xl"
              >
                Agregar Franja
              </Button>
            </div>

            {horarios.length === 0 ? (
              <div className="p-6 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                <Clock className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-50" />
                <p className="text-xs font-semibold text-text-muted">
                  No hay horarios asignados todavía
                </p>
                <button
                  type="button"
                  onClick={handleAddHorario}
                  className="mt-2 text-xs font-bold text-primary hover:underline cursor-pointer"
                >
                  + Asignar primer día y horario
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {horarios.map((slot, index) => (
                  <div
                    key={slot.id || index}
                    className="flex flex-col sm:flex-row items-center gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 transition-all hover:border-slate-300 dark:hover:border-slate-600"
                  >
                    {/* Día de la semana */}
                    <div className="w-full sm:w-36 shrink-0">
                      <CustomSelect
                        value={slot.dia}
                        onChange={(val) => handleUpdateHorario(index, 'dia', typeof val === 'object' ? val.target.value : val)}
                        options={DAYS_OF_WEEK.map(d => ({ value: d, label: d }))}
                        buttonClassName="py-1.5 px-2.5 text-xs font-bold rounded-xl"
                        menuClassName="z-50 max-h-48 overflow-y-auto shadow-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl"
                      />
                    </div>

                    {/* Franja Horaria */}
                    <div className="flex items-center gap-1.5 w-full sm:w-auto">
                      <span className="text-xs text-text-muted font-medium">De</span>
                      <input
                        type="time"
                        value={slot.desde || '18:00'}
                        onChange={(e) => handleUpdateHorario(index, 'desde', e.target.value)}
                        className="px-2.5 py-1.5 text-xs font-mono font-semibold border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <span className="text-xs text-text-muted font-medium">a</span>
                      <input
                        type="time"
                        value={slot.hasta || '20:00'}
                        onChange={(e) => handleUpdateHorario(index, 'hasta', e.target.value)}
                        className="px-2.5 py-1.5 text-xs font-mono font-semibold border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    {/* Aula / Espacio */}
                    <div className="flex-1 w-full sm:w-auto">
                      <input
                        type="text"
                        value={slot.aula || ''}
                        onChange={(e) => handleUpdateHorario(index, 'aula', e.target.value)}
                        placeholder="Aula, Laboratorio, Virtual..."
                        className="w-full px-3 py-1.5 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    {/* Eliminar Franja */}
                    <button
                      type="button"
                      onClick={() => handleRemoveHorario(index)}
                      className="p-1.5 rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 transition-colors self-end sm:self-center shrink-0 cursor-pointer"
                      title="Eliminar este horario"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* PIE DE FORMULARIO CON BOTONES DE ACCIÓN */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200/80 dark:border-slate-800">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={saving}
              className="text-xs sm:text-sm font-semibold rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={saving}
              className="text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-primary/20"
            >
              Guardar Modificaciones
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
