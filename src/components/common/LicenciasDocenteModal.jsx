import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  ShieldAlert, 
  Calendar as CalendarIcon, 
  Plus, 
  X, 
  Search, 
  Check, 
  Edit3, 
  Trash2, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  BookOpen, 
  Building2, 
  CheckCircle2, 
  Info,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import Modal from './Modal';
import Badge from './Badge';
import Button from './Button';
import { toast } from 'sonner';
import { formatFechaDMY, getTodayYMD } from '../../lib/dateUtils';
import { 
  getLicenciasByYear, 
  createOrUpdateLicencia, 
  updateObservacion, 
  deleteLicencia, 
  calcularConsumoLicencias 
} from '../../services/licenciasService';
import { useAuth } from '../../context/AuthContext';

const ARTICULOS_OPTIONS = [
  { id: 'Art. 15° - Razones particulares', label: 'Art. 15° — Razones particulares', cupo: 'Máx. 6/año (2/mes)' },
  { id: 'Art. 9° - Enfermedad de corto tratamiento', label: 'Art. 9° — Enfermedad de corto tratamiento', cupo: 'Con certificado médico' },
  { id: 'Art. 24° - Atención de familiar enfermo', label: 'Art. 24° — Atención de familiar enfermo', cupo: 'Cuidado cónyuge/hijos/padres' },
  { id: 'Art. 28°/29° - Perfeccionamiento / Capacitación docente', label: 'Art. 28° / 29° — Perfeccionamiento / Capacitación', cupo: 'Jornadas / Congresos' },
  { id: 'Art. 32° - Integración de mesa examinadora', label: 'Art. 32° — Integración de mesa examinadora', cupo: 'Tribunal evaluador' },
  { id: 'Art. 45° - Fuerza mayor / Fenómenos climáticos', label: 'Art. 45° — Fuerza mayor / Fenómenos climáticos', cupo: 'Inclemencias / Cortes' },
  { id: 'OTRO', label: 'Otro artículo / Franquicia (especificar)', cupo: 'Régimen general' }
];

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function getDiaSemanaLabel(fechaStr) {
  if (!fechaStr) return '';
  try {
    const parts = fechaStr.split('-');
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return DIAS_SEMANA[d.getDay()] || '';
    }
  } catch (_) {}
  return '';
}

/**
 * LicenciasDocenteModal
 * Centro integral de control y balance anual de licencias docentes (Decreto 1092).
 * Incluye Bento Cards con semáforo preventivo, formulario colapsable y tabla/tarjetas
 * con edición inline de observaciones.
 */
export default function LicenciasDocenteModal({
  isOpen,
  onClose,
  catedras = [],
  docenteId,
  initialCatedraId = null,
  onLicenciaSaved = null
}) {
  const { user, isDemo } = useAuth();
  const effectiveDocenteId = docenteId || user?.id || 'demo';

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [licencias, setLicencias] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [filterArticulo, setFilterArticulo] = useState('TODOS');
  const [searchQuery, setSearchQuery] = useState('');

  // Formulario colapsable
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formFecha, setFormFecha] = useState(getTodayYMD());
  const [formCatedraId, setFormCatedraId] = useState(initialCatedraId || '');
  const [formArticulo, setFormArticulo] = useState(ARTICULOS_OPTIONS[0].id);
  const [formCustomArticulo, setFormCustomArticulo] = useState('');
  const [formEstadoTramite, setFormEstadoTramite] = useState('PENDIENTE_CERTIFICADO');
  const [formObservacion, setFormObservacion] = useState('');

  // Edición inline de observaciones
  const [editingLicenciaId, setEditingLicenciaId] = useState(null);
  const [editObservacionText, setEditObservacionText] = useState('');
  const [editEstadoTramite, setEditEstadoTramite] = useState('PENDIENTE_CERTIFICADO');
  const [savingEdit, setSavingEdit] = useState(false);

  // Cargar datos
  const loadLicencias = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);
    try {
      const data = await getLicenciasByYear(effectiveDocenteId, selectedYear, {
        isDemo,
        catedrasList: catedras
      });
      setLicencias(data);
    } catch (err) {
      console.error('Error cargando licencias:', err);
      toast.error('No se pudieron cargar las licencias.');
    } finally {
      setLoading(false);
    }
  }, [isOpen, effectiveDocenteId, selectedYear, isDemo, catedras]);

  useEffect(() => {
    loadLicencias();
  }, [loadLicencias]);

  // Si cambia initialCatedraId al abrir
  useEffect(() => {
    if (initialCatedraId) {
      setFormCatedraId(initialCatedraId);
    }
  }, [initialCatedraId]);

  // Consumo y métricas calculadas
  const metricas = useMemo(() => {
    return calcularConsumoLicencias(licencias, selectedYear, getTodayYMD());
  }, [licencias, selectedYear]);

  // Filtrado de listado
  const filteredLicencias = useMemo(() => {
    return licencias.filter(item => {
      // Filtro por artículo / chip
      if (filterArticulo !== 'TODOS') {
        const art = item.articulo || '';
        if (filterArticulo === 'Art. 15°' && !art.includes('Art. 15')) return false;
        if (filterArticulo === 'Art. 9°' && !art.includes('Art. 9')) return false;
        if (filterArticulo === 'Art. 24°' && !art.includes('Art. 24')) return false;
        if (filterArticulo === 'Art. 28°/29°' && !(art.includes('Art. 28') || art.includes('Art. 29'))) return false;
        if (filterArticulo === 'Art. 32°' && !art.includes('Art. 32')) return false;
        if (filterArticulo === 'Art. 45°' && !art.includes('Art. 45')) return false;
        if (filterArticulo === 'Otro' && (art.includes('Art. 15') || art.includes('Art. 9') || art.includes('Art. 24') || art.includes('Art. 28') || art.includes('Art. 29') || art.includes('Art. 32') || art.includes('Art. 45'))) return false;
      }

      // Filtro por búsqueda
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchArt = (item.articulo || '').toLowerCase().includes(q);
        const matchObs = (item.observacion || '').toLowerCase().includes(q);
        const matchCat = (item.catedra?.nombre || '').toLowerCase().includes(q);
        const matchInst = (item.catedra?.institucion || '').toLowerCase().includes(q);
        const matchFecha = (item.fecha || '').includes(q);
        return matchArt || matchObs || matchCat || matchInst || matchFecha;
      }

      return true;
    });
  }, [licencias, filterArticulo, searchQuery]);

  // Manejo de envío de nueva licencia
  const handleCreateLicencia = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const finalArticulo = formArticulo === 'OTRO' 
        ? (formCustomArticulo.trim() || 'Otro artículo')
        : formArticulo;

      const payload = {
        fecha: formFecha,
        catedra_id: formCatedraId || null,
        articulo: finalArticulo,
        observacion: formObservacion.trim(),
        estado_tramite: formEstadoTramite,
        docente_id: effectiveDocenteId
      };

      const saved = await createOrUpdateLicencia(payload, {
        isDemo,
        docenteId: effectiveDocenteId
      });

      toast.success('Licencia docente registrada con éxito.');
      
      // Limpiar formulario y colapsar
      setFormObservacion('');
      setFormCustomArticulo('');
      setIsFormOpen(false);

      // Recargar lista
      await loadLicencias();
      onLicenciaSaved?.(saved);
    } catch (err) {
      console.error('Error al registrar licencia:', err);
      toast.error('Ocurrió un error al guardar la licencia.');
    } finally {
      setSubmitting(false);
    }
  };

  // Inicio de edición inline
  const handleStartEdit = (lic) => {
    setEditingLicenciaId(lic.id);
    setEditObservacionText(lic.observacion || '');
    setEditEstadoTramite(lic.estado_tramite || 'PENDIENTE_CERTIFICADO');
  };

  // Guardar edición inline
  const handleSaveEdit = async (licId) => {
    setSavingEdit(true);
    try {
      await updateObservacion(licId, editObservacionText.trim(), editEstadoTramite, {
        isDemo,
        docenteId: effectiveDocenteId
      });

      // Actualizar estado local reactivo
      setLicencias(prev => prev.map(item => {
        if (item.id === licId) {
          return {
            ...item,
            observacion: editObservacionText.trim(),
            estado_tramite: editEstadoTramite
          };
        }
        return item;
      }));

      setEditingLicenciaId(null);
      toast.success('Observación actualizada.');
    } catch (err) {
      console.error('Error actualizando nota:', err);
      toast.error('No se pudo guardar la nota.');
    } finally {
      setSavingEdit(false);
    }
  };

  // Eliminación de licencia
  const handleDelete = async (lic) => {
    const confirmDelete = window.confirm(
      `¿Deseas eliminar el registro de licencia del ${formatFechaDMY(lic.fecha)}? Si estaba asociada a una clase, la jornada será restaurada a DICTADA.`
    );
    if (!confirmDelete) return;

    try {
      await deleteLicencia(lic.id, lic.clase_id, {
        isDemo,
        docenteId: effectiveDocenteId
      });

      setLicencias(prev => prev.filter(item => item.id !== lic.id));
      toast.success('Licencia eliminada y clase restaurada.');
    } catch (err) {
      console.error('Error al eliminar licencia:', err);
      toast.error('Error al eliminar la licencia.');
    }
  };

  // Estilo de semáforo para el Card de Art. 15°
  const getArt15AlertStyles = (alerta) => {
    if (alerta === 'limite') {
      return {
        bg: 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300',
        badge: 'bg-rose-600 text-white',
        bar: 'bg-rose-600',
        desc: 'Cupo mensual o anual alcanzado'
      };
    }
    if (alerta === 'advertencia') {
      return {
        bg: 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300',
        badge: 'bg-amber-600 text-white',
        bar: 'bg-amber-500',
        desc: 'Próximo al límite reglamentario'
      };
    }
    return {
      bg: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-800 dark:text-emerald-300',
      badge: 'bg-emerald-600 text-white',
      bar: 'bg-emerald-500',
      desc: 'Dentro del cupo normativo'
    };
  };

  const art15Styles = getArt15AlertStyles(metricas.art15.alerta);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Control y Registro Anual de Licencias Docentes"
      subtitle="Régimen de Licencias, Justificaciones y Franquicias · Decreto Acuerdo N° 1092/2015"
      maxWidth="max-w-4xl sm:max-w-3xl md:max-w-4xl"
    >
      <div className="space-y-5 p-1 pb-4">
        {/* ================================================================= */}
        {/* 1. BLOQUE SUPERIOR: RESUMEN Y CONTADORES ANUALES (BENTO CARDS)     */}
        {/* ================================================================= */}
        <section aria-label="Resumen de licencias anuales" className="space-y-3">
          {/* Barra de Selector de Año y Filtros */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-text-secondary uppercase">
                Ciclo Lectivo:
              </span>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-surface-border">
                {[currentYear, currentYear - 1].map((y) => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => setSelectedYear(y)}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      selectedYear === y
                        ? 'bg-primary text-white shadow-xs'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsFormOpen(prev => !prev)}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all shadow-xs cursor-pointer touch-target-44 min-h-[40px]"
            >
              <Plus className="w-4 h-4" />
              <span>{isFormOpen ? 'Ocultar Formulario' : '+ Registrar Nueva Licencia'}</span>
            </button>
          </div>

          {/* Bento Grid: 3 Tarjetas de Alto Impacto Visual */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Card 1: Total Anual */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-surface-border flex flex-col justify-between shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  Total Utilizado {selectedYear}
                </span>
                <CalendarIcon className="w-4 h-4 text-primary" />
              </div>
              <div className="my-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-mono font-black text-text-primary">
                    {metricas.totalAnual}
                  </span>
                  <span className="text-xs text-text-muted font-medium">
                    {metricas.totalAnual === 1 ? 'inasistencia registrada' : 'inasistencias registradas'}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-text-muted">
                Días justificados en todas las cátedras de este ciclo.
              </p>
            </div>

            {/* Card 2: Art. 15° (Razones Particulares - Semáforo) */}
            <div className={`p-4 rounded-2xl border flex flex-col justify-between shadow-xs transition-all ${art15Styles.bg}`}>
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wider truncate">
                    Art. 15° (Razones Particulares)
                  </span>
                </div>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${art15Styles.badge}`}>
                  {art15Styles.desc}
                </span>
              </div>

              <div className="my-2 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold">Año {selectedYear}:</span>
                  <span className="font-mono font-bold">
                    {metricas.art15.usadosAnio} / {metricas.art15.maxAnio} días
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700/60 h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${art15Styles.bar}`}
                    style={{ width: `${Math.min(100, (metricas.art15.usadosAnio / metricas.art15.maxAnio) * 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-text-secondary pt-0.5">
                  <span>En este mes:</span>
                  <span className="font-mono font-bold">
                    {metricas.art15.usadosMes} / {metricas.art15.maxMes} días
                  </span>
                </div>
              </div>

              <p className="text-[10px] opacity-80 leading-tight">
                Tope legal Decreto 1092: hasta 6 días anuales y máx. 2 mensuales.
              </p>
            </div>

            {/* Card 3: Desglose por Artículos (Chips) */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-surface-border flex flex-col justify-between shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  Desglose por Causa
                </span>
                <BookOpen className="w-4 h-4 text-blue-500" />
              </div>

              <div className="my-2 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                {Object.keys(metricas.desglose).length === 0 ? (
                  <span className="text-xs text-text-muted italic py-1">Sin registros aún en {selectedYear}</span>
                ) : (
                  Object.entries(metricas.desglose).map(([key, count]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setFilterArticulo(filterArticulo === key ? 'TODOS' : key)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                        filterArticulo === key
                          ? 'bg-primary text-white border-primary shadow-xs'
                          : 'bg-white dark:bg-slate-900 border-surface-border text-text-primary hover:border-primary/50'
                      }`}
                    >
                      <span>{key}</span>
                      <span className="font-mono font-bold px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] text-text-secondary">
                        {count}
                      </span>
                    </button>
                  ))
                )}
              </div>

              <p className="text-[11px] text-text-muted">
                Haz clic en cualquier chip para filtrar el listado inferior.
              </p>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* 2. FORMULARIO COLAPSABLE: REGISTRAR NUEVA LICENCIA                */}
        {/* ================================================================= */}
        {isFormOpen && (
          <form 
            onSubmit={handleCreateLicencia}
            className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-primary/30 shadow-md space-y-4 animate-scaleIn"
          >
            <div className="flex items-center justify-between pb-2 border-b border-surface-border">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-text-primary">
                  Registrar Inasistencia Justificada (Decreto 1092)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-1 text-text-muted hover:text-text-primary rounded-lg cursor-pointer"
                aria-label="Cerrar formulario"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Fecha */}
              <div>
                <label className="block text-xs font-mono font-bold uppercase text-text-secondary mb-1">
                  Fecha de la Inasistencia *
                </label>
                <input
                  type="date"
                  value={formFecha}
                  onChange={(e) => setFormFecha(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-surface-border text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 font-bold"
                />
              </div>

              {/* Cátedra alcanzada */}
              <div>
                <label className="block text-xs font-mono font-bold uppercase text-text-secondary mb-1">
                  Cátedra Alcanzada
                </label>
                <select
                  value={formCatedraId}
                  onChange={(e) => setFormCatedraId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-surface-border text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer font-medium"
                >
                  <option value="">General / Todas las cátedras del día</option>
                  {catedras.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} {c.institucion ? `(${c.institucion})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Artículo Decreto 1092 */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-mono font-bold uppercase text-text-secondary mb-1">
                  Artículo / Causal (Decreto 1092) *
                </label>
                <select
                  value={formArticulo}
                  onChange={(e) => setFormArticulo(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-surface-border text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer font-medium"
                >
                  {ARTICULOS_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label} — [{opt.cupo}]
                    </option>
                  ))}
                </select>
              </div>

              {/* Especificar si es OTRO */}
              {formArticulo === 'OTRO' && (
                <div className="sm:col-span-2 animate-fadeIn">
                  <label className="block text-xs font-mono font-bold text-text-secondary mb-1">
                    Especificar artículo o franquicia:
                  </label>
                  <input
                    type="text"
                    value={formCustomArticulo}
                    onChange={(e) => setFormCustomArticulo(e.target.value)}
                    placeholder="Ej: Art. 50 — Comisión de Servicios Especiales"
                    required
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-surface-border text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              )}

              {/* Estado del trámite */}
              <div>
                <label className="block text-xs font-mono font-bold uppercase text-text-secondary mb-1">
                  Estado del Certificado / Trámite
                </label>
                <select
                  value={formEstadoTramite}
                  onChange={(e) => setFormEstadoTramite(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-surface-border text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer font-medium"
                >
                  <option value="PRESENTADA">Presentada en secretaría / Con aviso</option>
                  <option value="PENDIENTE_CERTIFICADO">Pendiente de certificado médico</option>
                  <option value="APROBADA">Aprobada / Concedida</option>
                </select>
              </div>

              {/* Observación / Nota libre */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-mono font-bold uppercase text-text-secondary mb-1">
                  Observaciones / Notas personales
                </label>
                <textarea
                  value={formObservacion}
                  onChange={(e) => setFormObservacion(e.target.value)}
                  placeholder="Escribí una observación (ej: Entregué certificado al preceptor, mesa de examen en IES, reposo médico por 48hs...)"
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-surface-border text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none font-medium"
                />
              </div>
            </div>

            {/* Botones de acción del formulario */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-surface-border">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 rounded-xl border border-surface-border text-xs font-semibold text-text-secondary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{submitting ? 'Guardando...' : 'Asentar Licencia'}</span>
              </button>
            </div>
          </form>
        )}

        {/* ================================================================= */}
        {/* 3. BLOQUE INFERIOR: LISTADO CRONOLÓGICO DE LICENCIAS              */}
        {/* ================================================================= */}
        <section aria-label="Historial de licencias" className="space-y-3">
          {/* Herramientas de filtrado y búsqueda */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por artículo, cátedra u observación..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-surface-border rounded-xl focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none text-text-primary transition-all placeholder:text-text-muted font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-text-muted hover:text-text-primary"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-text-muted">
              <span>Mostrando {filteredLicencias.length} de {licencias.length} registros</span>
              {filterArticulo !== 'TODOS' && (
                <button
                  type="button"
                  onClick={() => setFilterArticulo('TODOS')}
                  className="text-primary hover:underline font-semibold"
                >
                  (Quitar filtro)
                </button>
              )}
            </div>
          </div>

          {/* Loading state */}
          {loading ? (
            <div className="py-8 text-center text-xs text-text-muted animate-pulse">
              Cargando historial de licencias...
            </div>
          ) : filteredLicencias.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-surface-border bg-slate-50/50 dark:bg-slate-900/30 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto opacity-70" />
              <p className="text-xs font-semibold text-text-primary">
                No hay licencias registradas para los filtros aplicados en {selectedYear}.
              </p>
              <p className="text-[11px] text-text-muted">
                Para asentar una inasistencia justificada, presiona "+ Registrar Nueva Licencia".
              </p>
            </div>
          ) : (
            <>
              {/* 3.A VISTA ESCRITORIO (>= 768px): TABLA LIMPIA */}
              <div className="hidden md:block overflow-x-auto rounded-2xl border border-surface-border bg-white dark:bg-slate-900 shadow-xs">
                <table className="w-full text-left border-collapse" aria-label="Historial de licencias docentes">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-surface-border text-[11px] uppercase tracking-wider text-text-muted font-bold">
                      <th scope="col" className="py-3 px-3.5 w-32">Fecha</th>
                      <th scope="col" className="py-3 px-3.5 w-44">Cátedra / Institución</th>
                      <th scope="col" className="py-3 px-3.5 w-48">Artículo / Encuadre</th>
                      <th scope="col" className="py-3 px-3.5">Observaciones</th>
                      <th scope="col" className="py-3 px-3.5 text-right w-44">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border text-xs">
                    {filteredLicencias.map((lic) => {
                      const isEditing = editingLicenciaId === lic.id;
                      const diaSemana = getDiaSemanaLabel(lic.fecha);

                      return (
                        <tr key={lic.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                          {/* Col 1: Fecha */}
                          <td className="py-3 px-3.5 align-top whitespace-nowrap">
                            <div className="font-mono font-bold text-text-primary">
                              {formatFechaDMY(lic.fecha)}
                            </div>
                            <span className="text-[10px] font-mono uppercase text-text-muted">
                              {diaSemana}
                            </span>
                          </td>

                          {/* Col 2: Cátedra */}
                          <td className="py-3 px-3.5 align-top">
                            {lic.catedra ? (
                              <div>
                                <span className="font-bold text-text-primary block leading-tight">
                                  {lic.catedra.nombre}
                                </span>
                                {lic.catedra.institucion && (
                                  <span className="text-[11px] text-text-muted block truncate max-w-[160px]">
                                    {lic.catedra.institucion}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <Badge variant="default" size="sm">
                                General (Todas)
                              </Badge>
                            )}
                          </td>

                          {/* Col 3: Artículo */}
                          <td className="py-3 px-3.5 align-top">
                            <Badge 
                              variant={lic.articulo.includes('Art. 15') ? 'warning' : 'primary'}
                              size="sm"
                              className="font-semibold"
                            >
                              {lic.articulo}
                            </Badge>
                            <div className="mt-1">
                              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                                lic.estado_tramite === 'APROBADA'
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : lic.estado_tramite === 'PRESENTADA'
                                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                              }`}>
                                {lic.estado_tramite === 'APROBADA' ? '✓ Aprobada' : lic.estado_tramite === 'PRESENTADA' ? '📋 Presentada' : '⏳ Pendiente Cert.'}
                              </span>
                            </div>
                          </td>

                          {/* Col 4: Observaciones con edición inline */}
                          <td className="py-3 px-3.5 align-top">
                            {isEditing ? (
                              <div className="space-y-2 animate-fadeIn">
                                <textarea
                                  value={editObservacionText}
                                  onChange={(e) => setEditObservacionText(e.target.value)}
                                  rows={2}
                                  placeholder="Escribí una observación..."
                                  className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-primary/50 text-text-primary focus:outline-none"
                                />
                                <div className="flex items-center gap-2">
                                  <select
                                    value={editEstadoTramite}
                                    onChange={(e) => setEditEstadoTramite(e.target.value)}
                                    className="text-[11px] px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-surface-border text-text-primary"
                                  >
                                    <option value="PRESENTADA">Presentada</option>
                                    <option value="PENDIENTE_CERTIFICADO">Pendiente Cert.</option>
                                    <option value="APROBADA">Aprobada</option>
                                  </select>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEdit(lic.id)}
                                    disabled={savingEdit}
                                    className="px-2.5 py-1 rounded-md bg-primary text-white text-[11px] font-bold hover:bg-primary-hover cursor-pointer"
                                  >
                                    {savingEdit ? 'Guardando...' : 'Guardar'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingLicenciaId(null)}
                                    className="px-2 py-1 rounded-md text-text-muted hover:text-text-primary text-[11px] cursor-pointer"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="group relative">
                                <p className="text-text-secondary italic text-xs leading-relaxed pr-6">
                                  {lic.observacion ? `"${lic.observacion}"` : <span className="opacity-40 not-italic">Sin observaciones registradas</span>}
                                </p>
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(lic)}
                                  className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-semibold mt-1 cursor-pointer"
                                  title="Editar observación"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  <span>Editar nota</span>
                                </button>
                              </div>
                            )}
                          </td>

                          {/* Col 5: Acciones */}
                          <td className="py-3 px-3.5 align-top text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleDelete(lic)}
                              className="p-1.5 rounded-lg text-text-muted hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                              title="Eliminar registro de licencia"
                              aria-label="Eliminar licencia"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* 3.B VISTA MÓVIL (< 768px): TARJETAS TÁCTILES APILADAS */}
              <div className="md:hidden space-y-3">
                {filteredLicencias.map((lic) => {
                  const isEditing = editingLicenciaId === lic.id;
                  const diaSemana = getDiaSemanaLabel(lic.fecha);

                  return (
                    <div
                      key={lic.id}
                      className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-surface-border shadow-xs space-y-2.5"
                    >
                      {/* Cabecera Tarjeta: Fecha & Badge de Artículo */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="font-mono font-bold text-sm text-text-primary">
                              {formatFechaDMY(lic.fecha)}
                            </span>
                            <span className="text-xs font-mono text-text-muted uppercase">
                              ({diaSemana})
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-text-secondary mt-0.5">
                            {lic.catedra ? lic.catedra.nombre : 'General (Todas las cátedras)'}
                          </p>
                        </div>

                        <Badge 
                          variant={lic.articulo.includes('Art. 15') ? 'warning' : 'primary'}
                          size="xs"
                          className="font-bold shrink-0"
                        >
                          {lic.articulo.split(' - ')[0]}
                        </Badge>
                      </div>

                      {/* Recuadro de Observación */}
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-surface-border text-xs">
                        {isEditing ? (
                          <div className="space-y-2 animate-fadeIn">
                            <textarea
                              value={editObservacionText}
                              onChange={(e) => setEditObservacionText(e.target.value)}
                              rows={2}
                              className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-900 border border-primary/50 text-text-primary focus:outline-none"
                            />
                            <div className="flex items-center justify-between gap-2">
                              <select
                                value={editEstadoTramite}
                                onChange={(e) => setEditEstadoTramite(e.target.value)}
                                className="text-xs px-2 py-1 rounded-md bg-white dark:bg-slate-900 border border-surface-border text-text-primary"
                              >
                                <option value="PRESENTADA">Presentada</option>
                                <option value="PENDIENTE_CERTIFICADO">Pendiente Cert.</option>
                                <option value="APROBADA">Aprobada</option>
                              </select>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleSaveEdit(lic.id)}
                                  disabled={savingEdit}
                                  className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold touch-target-44 min-h-[36px]"
                                >
                                  {savingEdit ? '...' : 'Guardar'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingLicenciaId(null)}
                                  className="px-2 py-1 text-xs text-text-muted"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <span className="text-[10px] font-mono uppercase text-text-muted block font-semibold mb-0.5">
                              Nota Docente:
                            </span>
                            <p className="text-text-secondary italic">
                              {lic.observacion || 'Sin observaciones.'}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Botonera táctil (44px) */}
                      {!isEditing && (
                        <div className="flex items-center justify-between pt-1 border-t border-surface-border text-xs">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            lic.estado_tramite === 'APROBADA'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : lic.estado_tramite === 'PRESENTADA'
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          }`}>
                            {lic.estado_tramite === 'APROBADA' ? '✓ Aprobada' : lic.estado_tramite === 'PRESENTADA' ? '📋 Presentada' : '⏳ Pendiente'}
                          </span>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(lic)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-primary font-bold text-xs touch-target-44 min-h-[40px] cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Editar nota</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(lic)}
                              className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 touch-target-44 min-h-[40px] flex items-center justify-center cursor-pointer"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>
    </Modal>
  );
}
