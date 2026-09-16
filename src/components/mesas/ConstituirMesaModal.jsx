import React, { useState, useEffect } from 'react';
import { 
  Award, 
  Calendar, 
  BookOpen, 
  ShieldCheck, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  Building2,
  GraduationCap
} from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import CustomSelect from '../common/CustomSelect';
import { toast } from 'sonner';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { getTodayYMD } from '../../lib/dateUtils';
import { handleAppError } from '../../utils/handleAppError';

const TURNO_OPTIONS_REGULARES = [
  { value: '1° LLAMADO', label: '1° Llamado (Turno Ordinario)' },
  { value: '2° LLAMADO', label: '2° Llamado (Turno Ordinario)' },
  { value: 'TURNO ESPECIAL MAYO', label: 'Turno Especial (Mayo)' },
  { value: 'TURNO ESPECIAL SEPTIEMBRE', label: 'Turno Especial (Septiembre)' },
  { value: 'TURNO EXTRAORDINARIO', label: 'Turno Extraordinario' }
];

const TURNO_OPTIONS_PROMOCIONAL = [
  { value: 'PROMOCIONAL DIRECTA', label: '🎖️ Promoción Directa (Cierre Cursada)' },
  { value: '1° LLAMADO', label: '1° Llamado (Asiento Promocional)' },
  { value: '2° LLAMADO', label: '2° Llamado (Asiento Promocional)' }
];

export default function ConstituirMesaModal({
  isOpen,
  onClose,
  onMesaCreated,
  catedras = [],
  initialCatedraId = null,
  initialCondicionActa = 'REGULAR'
}) {
  const { user, isDemo } = useAuth();

  const [catedraId, setCatedraId] = useState('');
  const [condicionActa, setCondicionActa] = useState('REGULAR'); // 'PROMOCIONAL' | 'REGULAR' | 'LIBRE'
  const [fecha, setFecha] = useState(getTodayYMD());
  const [turnoLlamado, setTurnoLlamado] = useState('1° LLAMADO');
  const [presidente, setPresidente] = useState('');
  const [libro, setLibro] = useState('');
  const [tomo, setTomo] = useState('');
  const [folio, setFolio] = useState('');
  const [actaNumero, setActaNumero] = useState('');
  const [vocal1, setVocal1] = useState('');
  const [vocal2, setVocal2] = useState('');
  const [isAccordionOpen, setIsAccordionOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Inicializar o resetear formulario cuando abre
  useEffect(() => {
    if (isOpen) {
      const defaultCatId = initialCatedraId || (catedras.length > 0 ? catedras[0].id : '');
      setCatedraId(defaultCatId);
      setCondicionActa(initialCondicionActa || 'REGULAR');
      setFecha(getTodayYMD());
      setTurnoLlamado(initialCondicionActa === 'PROMOCIONAL' ? 'PROMOCIONAL DIRECTA' : '1° LLAMADO');
      
      const teacherName = user?.perfil?.nombre_docente ||
                          user?.perfil?.nombre ||
                          user?.user_metadata?.nombre_completo || 
                          user?.user_metadata?.full_name || 
                          user?.user_metadata?.nombre || 
                          user?.email?.split('@')[0] || 
                          'Prof. Docente Titular';
      setPresidente(teacherName);
      
      setLibro('');
      setTomo('');
      setFolio('');
      setActaNumero('');
      setVocal1('');
      setVocal2('');
      setIsAccordionOpen(false);
    }
  }, [isOpen, initialCatedraId, initialCondicionActa, catedras, user]);

  // Al cambiar condición de acta, adaptar turno por defecto si es promocional
  const handleCondicionChange = (newCond) => {
    setCondicionActa(newCond);
    if (newCond === 'PROMOCIONAL') {
      setTurnoLlamado('PROMOCIONAL DIRECTA');
    } else if (turnoLlamado === 'PROMOCIONAL DIRECTA') {
      setTurnoLlamado('1° LLAMADO');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!catedraId) {
      toast.error('Por favor selecciona la cátedra.');
      return;
    }
    if (!fecha) {
      toast.error('Indica la fecha de la mesa examinadora.');
      return;
    }
    if (!presidente.trim()) {
      toast.error('Indica el nombre del Presidente de Mesa.');
      return;
    }

    setSubmitting(true);

    const mesaPayload = {
      catedra_id: catedraId,
      docente_id: user?.id,
      fecha,
      turno_llamado: turnoLlamado,
      condicion_acta: condicionActa,
      tipo_mesa: condicionActa === 'PROMOCIONAL' ? 'PROMOCIONAL' : 'FINAL',
      libro: (libro || '').trim(),
      tomo: (tomo || '').trim(),
      folio: (folio || '').trim(),
      acta_numero: (actaNumero || '').trim(),
      presidente: presidente.trim(),
      vocal_1: (vocal1 || '').trim(),
      vocal_2: (vocal2 || '').trim()
    };

    try {
      let createdMesa = null;

      if (isSupabaseConfigured && !isDemo) {
        // Intento 1: Inserción directa con condicion_acta y vocal_1
        let { data, error } = await supabase
          .from('mesas_examen')
          .insert([mesaPayload])
          .select(`
            *,
            catedras (
              id,
              nombre,
              nivel,
              instituciones (
                id,
                nombre
              )
            )
          `)
          .single();

        // Fallback si la columna condicion_acta o vocal_1 no están en la tabla
        if (error && (error.code === '42703' || error.message?.includes('condicion_acta') || error.message?.includes('vocal_1'))) {
          const fallbackPayload = {
            ...mesaPayload,
            vocal1: mesaPayload.vocal_1,
            vocal2: mesaPayload.vocal_2
          };
          delete fallbackPayload.vocal_1;
          delete fallbackPayload.vocal_2;
          if (error.message?.includes('condicion_acta')) delete fallbackPayload.condicion_acta;

          const res = await supabase
            .from('mesas_examen')
            .insert([fallbackPayload])
            .select(`
              *,
              catedras (
                id,
                nombre,
                nivel,
                instituciones (
                  id,
                  nombre
                )
              )
            `)
            .single();
          data = res.data;
          error = res.error;
        }

        if (error) throw error;
        createdMesa = {
          ...data,
          condicion_acta: data.condicion_acta || condicionActa
        };
      } else {
        // Modo Local / Demo
        const catFound = catedras.find(c => c.id === catedraId);
        createdMesa = {
          id: `mesa-${Date.now()}`,
          ...mesaPayload,
          created_at: new Date().toISOString(),
          catedras: catFound ? {
            id: catFound.id,
            nombre: catFound.nombre,
            nivel: catFound.nivel,
            instituciones: catFound.instituciones || { nombre: catFound.institucion_nombre || 'Instituto Superior' }
          } : null
        };
      }

      // Persistencia en localStorage
      try {
        const storedAll = JSON.parse(localStorage.getItem('mesas_examen_all') || '[]');
        localStorage.setItem('mesas_examen_all', JSON.stringify([createdMesa, ...storedAll]));

        const storedCat = JSON.parse(localStorage.getItem(`mesas_examen_${catedraId}`) || '[]');
        localStorage.setItem(`mesas_examen_${catedraId}`, JSON.stringify([createdMesa, ...storedCat]));
      } catch (_) {}

      toast.success(
        condicionActa === 'PROMOCIONAL'
          ? 'Mesa Promocional constituida con éxito.'
          : 'Mesa de Examen constituida exitosamente.'
      );

      if (onMesaCreated) {
        onMesaCreated(createdMesa);
      }
      onClose();
    } catch (err) {
      handleAppError(err, 'ConstituirMesaModal / Constituir Mesa', user);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCatedra = catedras.find(c => c.id === catedraId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Constituir Nueva Mesa de Examen"
      subtitle="Confecciona un acta volante con registro matriz para acreditaciones o exámenes finales"
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        
        {/* =========================================================================
            PASO 1: SELECCIÓN DE CÁTEDRA Y CONDICIÓN DE ACTA
        ========================================================================= */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-white/5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold text-[11px] flex items-center justify-center shrink-0">
              1
            </span>
            <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
              Cátedra y Condición Reglamentaria del Acta
            </h4>
          </div>

          {/* Selector de Cátedra */}
          <div>
            <label className="block font-semibold text-text-secondary mb-1">
              Cátedra / Espacio Curricular *
            </label>
            <select
              value={catedraId}
              onChange={(e) => setCatedraId(e.target.value)}
              required
              className="w-full py-2.5 px-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-xs font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
            >
              <option value="" disabled>-- Selecciona una cátedra --</option>
              {catedras.map((c) => {
                const instName = c.instituciones?.nombre || c.institucion_nombre || 'Institución';
                return (
                  <option key={c.id} value={c.id}>
                    {c.nombre} • ({instName} - {c.nivel || 'Terciario'})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Selector Exclusivo de Condición del Acta */}
          <div>
            <label className="block font-semibold text-text-secondary mb-1.5">
              Condición del Acta Examinadora *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Opción 1: Promocionales */}
              <button
                type="button"
                onClick={() => handleCondicionChange('PROMOCIONAL')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  condicionActa === 'PROMOCIONAL'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-900 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-text-secondary hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs">🎖️ Promocionales</span>
                  {condicionActa === 'PROMOCIONAL' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  )}
                </div>
                <span className="text-[10px] text-text-muted leading-tight">
                  Acreditación directa de cursado aprobada
                </span>
              </button>

              {/* Opción 2: Regulares */}
              <button
                type="button"
                onClick={() => handleCondicionChange('REGULAR')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  condicionActa === 'REGULAR'
                    ? 'border-primary bg-primary/10 text-primary-dark dark:text-primary-light ring-2 ring-primary/20'
                    : 'border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-text-secondary hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs">📋 Regulares</span>
                  {condicionActa === 'REGULAR' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                  )}
                </div>
                <span className="text-[10px] text-text-muted leading-tight">
                  Examen final oral y/o escrito regular
                </span>
              </button>

              {/* Opción 3: Libres */}
              <button
                type="button"
                onClick={() => handleCondicionChange('LIBRE')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  condicionActa === 'LIBRE'
                    ? 'border-purple-500 bg-purple-500/10 text-purple-900 dark:text-purple-300 ring-2 ring-purple-500/20'
                    : 'border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-text-secondary hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs">🔓 Libres</span>
                  {condicionActa === 'LIBRE' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-500" />
                  )}
                </div>
                <span className="text-[10px] text-text-muted leading-tight">
                  Examen programa completo (Escrito eliminatorio)
                </span>
              </button>
            </div>

            {condicionActa === 'PROMOCIONAL' && (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                Permite asentar la promoción directa y calificación definitiva en libro matriz con acta volante reglamentaria.
              </p>
            )}
          </div>
        </div>

        {/* =========================================================================
            PASO 2: DATOS DE LA MESA Y TRIBUNAL
        ========================================================================= */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-white/5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold text-[11px] flex items-center justify-center shrink-0">
              2
            </span>
            <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
              Fecha, Turno y Tribunal Evaluador
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-text-secondary mb-1">
                Fecha de la Mesa *
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
                className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-text-secondary mb-1">
                Turno / Llamado *
              </label>
              <CustomSelect
                value={turnoLlamado}
                onChange={setTurnoLlamado}
                options={condicionActa === 'PROMOCIONAL' ? TURNO_OPTIONS_PROMOCIONAL : TURNO_OPTIONS_REGULARES}
              />
            </div>
          </div>

          {/* Presidente de Mesa (Autocompletado con Docente a cargo) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-text-secondary">
                Presidente de Mesa (Docente Titular) *
              </label>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                ✓ Docente a cargo
              </span>
            </div>
            <input
              type="text"
              placeholder="Nombre del docente presidente de mesa..."
              value={presidente}
              onChange={(e) => setPresidente(e.target.value)}
              required
              className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Acordeón Opcional: Matriz y Vocales */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden mt-2">
            <button
              type="button"
              onClick={() => setIsAccordionOpen(!isAccordionOpen)}
              className="w-full py-2.5 px-3 bg-white dark:bg-slate-900 hover:bg-slate-100/60 dark:hover:bg-white/[0.03] transition-colors flex items-center justify-between text-left cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-text-primary">
                  Datos Institucionales (Libro Matriz y Vocales)
                </span>
                <span className="text-[10px] text-text-muted bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded-md font-normal">
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
              <div className="p-3.5 space-y-3 bg-slate-50/75 dark:bg-slate-950/40 border-t border-slate-200/80 dark:border-white/10 animate-fadeIn">
                {/* Matriz */}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block mb-1.5">
                    Registro Matriz Institucional
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="text-[10px] text-text-muted block">Libro N°</label>
                      <input
                        type="text"
                        placeholder="Ej. IX"
                        value={libro}
                        onChange={(e) => setLibro(e.target.value)}
                        className="w-full py-1.5 px-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-text-muted block">Tomo N°</label>
                      <input
                        type="text"
                        placeholder="Ej. 1"
                        value={tomo}
                        onChange={(e) => setTomo(e.target.value)}
                        className="w-full py-1.5 px-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-text-muted block">Folio N°</label>
                      <input
                        type="text"
                        placeholder="Ej. 142"
                        value={folio}
                        onChange={(e) => setFolio(e.target.value)}
                        className="w-full py-1.5 px-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-text-muted block">Acta N°</label>
                      <input
                        type="text"
                        placeholder="Ej. 2026-09"
                        value={actaNumero}
                        onChange={(e) => setActaNumero(e.target.value)}
                        className="w-full py-1.5 px-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Vocales */}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block mb-1.5">
                    Vocales Examinadores (Triple Rúbrica)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-text-muted block">Primer Vocal (Vocal 1)</label>
                      <input
                        type="text"
                        placeholder="Nombre de Vocal 1..."
                        value={vocal1}
                        onChange={(e) => setVocal1(e.target.value)}
                        className="w-full py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-xs text-text-primary"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-text-muted block">Segundo Vocal (Vocal 2)</label>
                      <input
                        type="text"
                        placeholder="Nombre de Vocal 2..."
                        value={vocal2}
                        onChange={(e) => setVocal2(e.target.value)}
                        className="w-full py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-xs text-text-primary"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={submitting}
            icon={CheckCircle2}
          >
            Constituir Mesa
          </Button>
        </div>
      </form>
    </Modal>
  );
}
