import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  ExternalLink, 
  Link as LinkIcon, 
  Link2, 
  Globe, 
  FileText, 
  Layers, 
  Sparkles,
  Info
} from 'lucide-react';
import Modal from '../../common/Modal';
import Button from '../../common/Button';
import CustomSelect from '../../common/CustomSelect';
import { supabase, isSupabaseConfigured } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { toast } from 'sonner';
import { 
  TIPO_EVALUACION, 
  FORMATO_EVALUACION, 
  LABELS_TIPO_EVALUACION, 
  CATEGORIA_RECURSO, 
  normalizeTipoEvaluacion 
} from '../../../lib/enums';

export function NuevaEvaluacionModal({
  isOpen,
  onClose,
  onSave,
  periodos = [],
  evaluaciones = [],
  saving = false,
  catedraId = null,
  onEvaluacionCreada = null
}) {
  const { user, isDemo } = useAuth();

  // Estados del formulario principal
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState(TIPO_EVALUACION.PARCIAL);
  const [formato, setFormato] = useState(FORMATO_EVALUACION.ESCRITO);
  const [fecha, setFecha] = useState('');
  const [periodoId, setPeriodoId] = useState('');
  const [evalOrigenId, setEvalOrigenId] = useState('');

  // Estados para recursos y consignas vinculadas
  const [modoRecurso, setModoRecurso] = useState('nuevo'); // 'nuevo' | 'existente'
  const [recursosDisponibles, setRecursosDisponibles] = useState([]);
  const [loadingRecursos, setLoadingRecursos] = useState(false);
  const [selectedRecursoId, setSelectedRecursoId] = useState('');
  const [nuevoRecursoUrl, setNuevoRecursoUrl] = useState('');
  const [nuevoRecursoTitulo, setNuevoRecursoTitulo] = useState('');
  const [autoGuardarEnRecursos, setAutoGuardarEnRecursos] = useState(true);

  // Cargar recursos vigentes de la cátedra
  const cargarRecursosCatedra = async (targetId) => {
    if (!targetId) return;
    setLoadingRecursos(true);
    let items = [];
    try {
      if (isSupabaseConfigured && !isDemo) {
        const { data, error } = await supabase
          .from('recursos')
          .select('*')
          .eq('catedra_id', targetId)
          .order('created_at', { ascending: false });

        if (!error && data) {
          items = data;
        }
      }

      // Fusión con caché de localStorage para soporte offline y modo demo
      const localStored = localStorage.getItem(`recursos_${targetId}`);
      if (localStored) {
        const localItems = JSON.parse(localStored);
        const map = new Map();
        items.forEach(it => map.set(it.id, it));
        localItems.forEach(it => {
          if (!map.has(it.id)) map.set(it.id, it);
        });
        items = Array.from(map.values());
      }
    } catch (err) {
      console.warn('Aviso cargando recursos para el modal de evaluación:', err);
      try {
        const localStored = localStorage.getItem(`recursos_${targetId}`);
        if (localStored) items = JSON.parse(localStored);
      } catch (_) {}
    } finally {
      setRecursosDisponibles(items);
      setLoadingRecursos(false);
    }
  };

  // Reset y carga al abrir
  useEffect(() => {
    if (isOpen) {
      setTitulo('');
      setTipo(TIPO_EVALUACION.PARCIAL);
      setFormato(FORMATO_EVALUACION.ESCRITO);
      setFecha('');
      setPeriodoId('');
      setEvalOrigenId('');
      setModoRecurso('nuevo');
      setSelectedRecursoId('');
      setNuevoRecursoUrl('');
      setNuevoRecursoTitulo('');
      setAutoGuardarEnRecursos(true);

      if (catedraId) {
        cargarRecursosCatedra(catedraId);
      }
    }
  }, [isOpen, catedraId]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!titulo.trim()) return;

    let recursoIdFinal = null;
    let urlConsignaFinal = null;
    let archivoNombreFinal = null;

    // Caso A: Se seleccionó un recurso existente previamente cargado
    if (modoRecurso === 'existente' && selectedRecursoId) {
      recursoIdFinal = selectedRecursoId;
      const rec = recursosDisponibles.find(r => r.id === selectedRecursoId);
      if (rec) {
        urlConsignaFinal = rec.url || rec.url_o_path || null;
        archivoNombreFinal = rec.titulo || 'Consignas de la evaluación';
      }
    } 
    // Caso B: Se ingresó una nueva URL de Drive o Consigna
    else if (modoRecurso === 'nuevo' && nuevoRecursoUrl.trim()) {
      urlConsignaFinal = nuevoRecursoUrl.trim();
      const tituloRecurso = nuevoRecursoTitulo.trim() || `Consigna: ${titulo.trim()} (${tipo})`;
      archivoNombreFinal = tituloRecurso;

      // Alta automática en la tabla recursos de la cátedra si está tildado
      if (autoGuardarEnRecursos && catedraId) {
        const isTP = normalizeTipoEvaluacion(tipo) === TIPO_EVALUACION.TP;
        const categoriaAuto = isTP ? CATEGORIA_RECURSO.TP : CATEGORIA_RECURSO.PARCIAL;
        const isDrive = urlConsignaFinal.includes('drive.google.com') || urlConsignaFinal.includes('docs.google.com');

        const nuevoRecursoPayload = {
          catedra_id: catedraId,
          titulo: tituloRecurso,
          descripcion: `Material / Consigna vinculada a la evaluación: ${titulo.trim()} (${tipo})`,
          url: urlConsignaFinal,
          url_o_path: urlConsignaFinal,
          tipo: isDrive ? 'drive' : 'enlace',
          tipo_origen: isDrive ? 'GOOGLE_LINK' : 'LOCAL',
          categoria: categoriaAuto,
          visible_alumnos: true,
          created_at: new Date().toISOString()
        };

        if (isSupabaseConfigured && !isDemo) {
          try {
            const { data: recCreado, error: errorRec } = await supabase
              .from('recursos')
              .insert(nuevoRecursoPayload)
              .select()
              .single();

            if (!errorRec && recCreado) {
              recursoIdFinal = recCreado.id;
              try {
                const prevRec = JSON.parse(localStorage.getItem(`recursos_${catedraId}`) || '[]');
                localStorage.setItem(`recursos_${catedraId}`, JSON.stringify([recCreado, ...prevRec]));
              } catch (_) {}
            } else {
              // Fallback con categoría canónica breve ('TP' | 'PARCIAL') por si el CHECK restrictivo aún no migró
              const fallbackCat = isTP ? 'TP' : 'PARCIAL';
              const { data: recFallback } = await supabase
                .from('recursos')
                .insert({ ...nuevoRecursoPayload, categoria: fallbackCat })
                .select()
                .single();

              if (recFallback) {
                recursoIdFinal = recFallback.id;
                try {
                  const prevRec = JSON.parse(localStorage.getItem(`recursos_${catedraId}`) || '[]');
                  localStorage.setItem(`recursos_${catedraId}`, JSON.stringify([recFallback, ...prevRec]));
                } catch (_) {}
              }
            }
          } catch (recErr) {
            console.warn('Aviso al insertar recurso en Supabase:', recErr);
          }
        } else {
          // Persistencia en entorno Local / Demo
          const localRecId = 'rec-' + Date.now();
          recursoIdFinal = localRecId;
          try {
            const prevRec = JSON.parse(localStorage.getItem(`recursos_${catedraId}`) || '[]');
            localStorage.setItem(
              `recursos_${catedraId}`,
              JSON.stringify([{ ...nuevoRecursoPayload, id: localRecId }, ...prevRec])
            );
          } catch (_) {}
        }

        // Notificar en tiempo real a ResourcesTab para refrescar sin recarga
        window.dispatchEvent(new CustomEvent('recursos_updated', {
          detail: { catedraId, recursoId: recursoIdFinal }
        }));
        toast.info('Consigna agregada automáticamente a la pestaña Recursos.');
      }
    }

    const tipoCanonico = normalizeTipoEvaluacion(tipo);
    const payloadEvaluacion = {
      titulo: titulo.trim(),
      tipo: tipoCanonico,
      formato,
      fecha: fecha || null,
      fecha_entrega: fecha || null,
      periodo_id: periodoId || null,
      evaluacion_origen_id: tipoCanonico === TIPO_EVALUACION.RECUPERATORIO ? (evalOrigenId || null) : null,
      drive_url: urlConsignaFinal,
      archivo_url: urlConsignaFinal,
      link_consigna: urlConsignaFinal,
      archivo_nombre: archivoNombreFinal,
      recurso_id: recursoIdFinal,
      recurso_creado: Boolean(recursoIdFinal && autoGuardarEnRecursos)
    };

    if (onSave) {
      onSave(payloadEvaluacion);
    }
    if (onEvaluacionCreada) {
      onEvaluacionCreada(payloadEvaluacion);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Crear Nueva Evaluación"
      subtitle="Registra un Parcial, Trabajo Práctico o Recuperatorio con fecha estipulada y consignas"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 bg-emerald-500/10 dark:bg-emerald-500/5 border border-emerald-500/20 rounded-2xl text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <span>
            Registra los datos de la evaluación para habilitar la columna de calificaciones en la sábana de notas. Puedes vincular consignas digitales o Drive.
          </span>
        </div>

        {/* Título o Nombre */}
        <div>
          <label className="block text-xs font-mono uppercase font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Título o Nombre de la Evaluación *
          </label>
          <input
            type="text"
            required
            placeholder="Ej: Parcial N° 1, TP N° 1 - Modelado Relacional..."
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all font-medium"
          />
        </div>

        {/* Tipo y Formato */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-mono uppercase font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Tipo de Evaluación *
            </label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all cursor-pointer font-medium"
            >
              <option value={TIPO_EVALUACION.PARCIAL}>{LABELS_TIPO_EVALUACION.PARCIAL}</option>
              <option value={TIPO_EVALUACION.TP}>{LABELS_TIPO_EVALUACION.TP}</option>
              <option value={TIPO_EVALUACION.RECUPERATORIO}>{LABELS_TIPO_EVALUACION.RECUPERATORIO}</option>
              <option value={TIPO_EVALUACION.PRUEBA}>{LABELS_TIPO_EVALUACION.PRUEBA}</option>
              <option value={TIPO_EVALUACION.FINAL}>{LABELS_TIPO_EVALUACION.FINAL}</option>
              <option value={TIPO_EVALUACION.COLOQUIO}>{LABELS_TIPO_EVALUACION.COLOQUIO}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Formato
            </label>
            <select
              value={formato}
              onChange={(e) => setFormato(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all cursor-pointer font-medium"
            >
              <option value={FORMATO_EVALUACION.ESCRITO}>{FORMATO_EVALUACION.ESCRITO}</option>
              <option value={FORMATO_EVALUACION.ORAL}>{FORMATO_EVALUACION.ORAL}</option>
            </select>
          </div>
        </div>

        {/* Fecha con etiqueta dinámica */}
        <div>
          <label className="block text-xs font-mono uppercase font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            {normalizeTipoEvaluacion(tipo) === TIPO_EVALUACION.TP
              ? 'Fecha de Entrega'
              : 'Fecha Estipulada'}
          </label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm font-mono focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all"
          />
        </div>

        {/* Período Académico (Opcional) */}
        {periodos.length > 0 && (
          <div>
            <label className="block text-xs font-mono uppercase font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Período Académico (Opcional)
            </label>
            <CustomSelect
              value={periodoId}
              onChange={(val) => setPeriodoId(typeof val === 'object' ? val.target.value : val)}
              options={[
                { value: '', label: '-- General / Todo el Ciclo --' },
                ...periodos.map(p => ({
                  value: p.id,
                  label: p.nombre || `Período ${p.numero}`
                }))
              ]}
              placeholder="Seleccionar período académico..."
            />
          </div>
        )}

        {/* Vinculación al Parcial Original si es Recuperatorio */}
        {normalizeTipoEvaluacion(tipo) === TIPO_EVALUACION.RECUPERATORIO && (
          <div>
            <label className="block text-xs font-mono uppercase font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Vincular al Parcial Original (Opcional)
            </label>
            <CustomSelect
              value={evalOrigenId}
              onChange={(val) => setEvalOrigenId(typeof val === 'object' ? val.target.value : val)}
              options={[
                { value: '', label: '-- Sin vinculación directa --' },
                ...evaluaciones
                  .filter(e => {
                    const t = (e.tipo || '').toUpperCase();
                    return t === 'PARCIAL' || t.includes('PARCIAL') || t === 'PRUEBA';
                  })
                  .map(e => ({
                    value: e.id,
                    label: `${e.titulo || e.nombre} (${e.tipo})`
                  }))
              ]}
              placeholder="Seleccionar evaluación original..."
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* BLOQUE BENTO: CONSIGNAS / ENLACE A DRIVE Y RECURSOS                       */}
        {/* ========================================================================= */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="text-xs font-mono uppercase font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Consignas / Enlace a Drive (Opcional)</span>
            </label>

            {/* Selector de Modo (Tabs pastilla) */}
            <div className="flex items-center p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800 text-[11px] font-medium self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setModoRecurso('nuevo')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer font-medium ${
                  modoRecurso === 'nuevo'
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Nuevo Enlace
              </button>
              <button
                type="button"
                disabled={recursosDisponibles.length === 0}
                onClick={() => setModoRecurso('existente')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer font-medium disabled:opacity-40 disabled:cursor-not-allowed ${
                  modoRecurso === 'existente'
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title={recursosDisponibles.length === 0 ? 'No hay recursos cargados previamente en la cátedra' : ''}
              >
                Elegir de Recursos ({recursosDisponibles.length})
              </button>
            </div>
          </div>

          {/* Opción B: Cargar nuevo enlace / Drive */}
          {modoRecurso === 'nuevo' && (
            <div className="space-y-2.5 animate-fadeIn">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Globe className="w-4 h-4" />
                </div>
                <input
                  type="url"
                  value={nuevoRecursoUrl}
                  onChange={(e) => setNuevoRecursoUrl(e.target.value)}
                  placeholder="https://drive.google.com/... o enlace de consignas"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs font-mono focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all"
                />
              </div>

              {nuevoRecursoUrl.trim() && (
                <div className="space-y-2 pt-1 animate-fadeIn">
                  <div>
                    <label className="block text-[11px] font-mono text-slate-600 dark:text-slate-400 mb-1">
                      Título o Nombre del Material en Recursos (Opcional)
                    </label>
                    <input
                      type="text"
                      value={nuevoRecursoTitulo}
                      onChange={(e) => setNuevoRecursoTitulo(e.target.value)}
                      placeholder={titulo.trim() ? `Consigna: ${titulo.trim()} (${tipo})` : 'Ej: Consigna Parcial 1'}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all"
                    />
                  </div>

                  <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer pt-0.5 select-none">
                    <input
                      type="checkbox"
                      checked={autoGuardarEnRecursos}
                      onChange={(e) => setAutoGuardarEnRecursos(e.target.checked)}
                      className="rounded border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                    />
                    <span>
                      Agregar automáticamente a la pestaña <strong>Recursos y Materiales</strong> de la cátedra
                    </span>
                  </label>
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>Puedes pegar el enlace compartido de Google Drive, Docs o PDF.</span>
                <a
                  href="https://drive.google.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 font-semibold"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Abrir Drive</span>
                </a>
              </div>
            </div>
          )}

          {/* Opción A: Seleccionar de Recursos existentes */}
          {modoRecurso === 'existente' && (
            <div className="space-y-2 animate-fadeIn">
              <select
                value={selectedRecursoId}
                onChange={(e) => setSelectedRecursoId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all cursor-pointer font-medium"
              >
                <option value="">-- Seleccionar un recurso ya cargado --</option>
                {recursosDisponibles.map((rec) => (
                  <option key={rec.id} value={rec.id}>
                    [{rec.categoria || 'General'}] {rec.titulo}
                  </option>
                ))}
              </select>

              {selectedRecursoId && (() => {
                const rec = recursosDisponibles.find(r => r.id === selectedRecursoId);
                const recLink = rec?.url || rec?.url_o_path;
                return rec ? (
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/5 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300">
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="font-medium truncate">{rec.titulo}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 font-bold uppercase shrink-0">
                        {rec.categoria || 'RECURSO'}
                      </span>
                    </div>
                    {recLink && (
                      <a
                        href={recLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 hover:underline shrink-0 inline-flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Ver</span>
                      </a>
                    )}
                  </div>
                ) : null;
              })()}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button
            variant="secondary"
            onClick={onClose}
            type="button"
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button type="submit" loading={saving} variant="primary">
            Guardar Evaluación
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default NuevaEvaluacionModal;
