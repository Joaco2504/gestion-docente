import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Palette, 
  Calendar as CalendarIcon, 
  Sliders, 
  Save, 
  Check, 
  Sun, 
  Moon, 
  Laptop, 
  Plus, 
  Trash2, 
  AlertCircle,
  Sparkles,
  ShieldCheck,
  GraduationCap,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';
import Button from '../components/common/Button';
import CustomSelect from '../components/common/CustomSelect';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export default function SettingsPage() {
  const { user, isDemo } = useAuth();
  const { selectedCiclo } = useApp();
  const { 
    theme, 
    setTheme, 
    colorPalette, 
    setColorPalette, 
    palettes 
  } = useTheme();

  const [savingPeriods, setSavingPeriods] = useState(false);
  const [savingCriteria, setSavingCriteria] = useState(false);
  const [isPeriodsOpen, setIsPeriodsOpen] = useState(false);

  // Límites de Períodos Académicos y Receso Invernal
  const [periodos, setPeriodos] = useState([
    { 
      id: 'per-1', 
      nombre: '1° Cuatrimestre', 
      tipo: 'CUATRIMESTRE', 
      fecha_inicio: '2026-03-09', 
      fecha_fin: '2026-07-10' 
    },
    { 
      id: 'per-2', 
      nombre: 'Receso Invernal', 
      tipo: 'RECESO', 
      fecha_inicio: '2026-07-13', 
      fecha_fin: '2026-07-24' 
    },
    { 
      id: 'per-3', 
      nombre: '2° Cuatrimestre', 
      tipo: 'CUATRIMESTRE', 
      fecha_inicio: '2026-08-03', 
      fecha_fin: '2026-11-20' 
    }
  ]);

  // Criterios Académicos Globales
  const [criterios, setCriterios] = useState({
    min_asist_promo: 80,
    min_asist_reg: 70,
    nota_min_promo: 7,
    nota_min_reg: 4,
    nota_min_sec: 6
  });

  useEffect(() => {
    fetchAcademicSettings();
  }, [selectedCiclo]);

  const fetchAcademicSettings = async () => {
    try {
      // 1. Fetch periodos
      if (isSupabaseConfigured && !isDemo && selectedCiclo?.id) {
        const { data: pData } = await supabase
          .from('periodos_academicos')
          .select('*')
          .eq('ciclo_id', selectedCiclo.id)
          .order('fecha_inicio', { ascending: true });

        if (pData && pData.length > 0) {
          setPeriodos(pData);
        } else {
          loadStoredPeriods();
        }
      } else {
        loadStoredPeriods();
      }

      // 2. Fetch criteria
      const storedCrit = localStorage.getItem('docentepro_default_criteria');
      if (storedCrit) {
        setCriterios(JSON.parse(storedCrit));
      }
    } catch (err) {
      console.warn('Error cargando configuración académica:', err);
      loadStoredPeriods();
    }
  };

  const loadStoredPeriods = () => {
    const stored = localStorage.getItem('docentepro_academic_periods');
    if (stored) {
      setPeriodos(JSON.parse(stored));
    }
  };

  const handlePeriodChange = (index, field, value) => {
    const updated = [...periodos];
    updated[index][field] = value;
    setPeriodos(updated);
  };

  const handleAddPeriod = () => {
    const newPeriod = {
      id: 'per-' + Date.now(),
      nombre: 'Nuevo Período',
      tipo: 'CUATRIMESTRE',
      fecha_inicio: new Date().toISOString().split('T')[0],
      fecha_fin: new Date().toISOString().split('T')[0]
    };
    setPeriodos([...periodos, newPeriod]);
  };

  const handleRemovePeriod = (index) => {
    if (periodos.length <= 1) {
      toast.error('Debe mantenerse al menos un período configurado.');
      return;
    }
    setPeriodos(periodos.filter((_, i) => i !== index));
  };

  const handleSavePeriods = async () => {
    // Validar orden cronológico
    for (const p of periodos) {
      if (p.fecha_inicio && p.fecha_fin && p.fecha_inicio > p.fecha_fin) {
        toast.error(`En "${p.nombre}": La fecha de inicio no puede ser posterior a la fecha de cierre.`);
        return;
      }
    }

    setSavingPeriods(true);
    try {
      if (isSupabaseConfigured && !isDemo && selectedCiclo?.id && user) {
        const toUpsert = periodos.map(p => ({
          ...(p.id.startsWith('per-') ? {} : { id: p.id }),
          ciclo_id: selectedCiclo.id,
          docente_id: user.id,
          nombre: p.nombre,
          tipo: p.tipo,
          fecha_inicio: p.fecha_inicio,
          fecha_fin: p.fecha_fin
        }));

        const { error } = await supabase
          .from('periodos_academicos')
          .upsert(toUpsert);

        if (error) throw error;
      }

      localStorage.setItem('docentepro_academic_periods', JSON.stringify(periodos));
      toast.success('Límites de períodos académicos y receso guardados correctamente.');
    } catch (err) {
      console.error('Error saving periods:', err);
      toast.error('Error al guardar períodos: ' + err.message);
    } finally {
      setSavingPeriods(false);
    }
  };

  const handleSaveCriteria = () => {
    setSavingCriteria(true);
    try {
      localStorage.setItem('docentepro_default_criteria', JSON.stringify(criterios));
      toast.success('Criterios de evaluación predeterminados guardados.');
    } catch (err) {
      toast.error('Error al guardar criterios.');
    } finally {
      setSavingCriteria(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-16">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Settings className="w-4 h-4" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">
            Configuración del Sistema
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-text-muted">
          Personaliza la gama de colores, ajusta los límites de períodos del ciclo lectivo y define criterios de aprobación.
        </p>
      </div>

      {/* SECCIÓN 1: PERSONALIZACIÓN Y COLORES */}
      <Card className="p-5 sm:p-6 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-surface-border">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-text-primary">
              Personalización de Gama de Colores
            </h2>
            <p className="text-xs text-text-muted">
              Elige el esquema visual que mejor se adapte a tu estilo de trabajo docente.
            </p>
          </div>
        </div>

        {/* Selector de Paletas */}
        <div className="space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
            Paleta de Color Primario
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.values(palettes).map((p) => {
              const isSelected = colorPalette === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setColorPalette(p.id);
                    toast.success(`Paleta cambiada a "${p.name}".`);
                  }}
                  className={`flex items-center gap-3.5 p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-xs'
                      : 'border-surface-border bg-surface hover:bg-surface-hover/80'
                  }`}
                >
                  {/* Swatch color bubble */}
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0 font-bold"
                    style={{ backgroundColor: p.primary }}
                  >
                    {isSelected ? <Check className="w-5 h-5 stroke-[3]" /> : null}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-text-primary truncate">
                        {p.name}
                      </span>
                      {p.id === 'azul-francia' && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                          Recomendado
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-text-muted truncate mt-0.5">
                      {p.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Modo de Visualización (Claro / Oscuro / Sistema) */}
        <div className="space-y-3 pt-4 border-t border-surface-border">
          <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
            Modo de Visualización
          </label>
          <div className="grid grid-cols-3 gap-3 max-w-md">
            <button
              type="button"
              onClick={() => {
                setTheme('light');
                toast.success('Modo Claro activado.');
              }}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold gap-2 transition-all ${
                theme === 'light'
                  ? 'border-primary ring-2 ring-primary/20 bg-primary/5 text-primary'
                  : 'border-surface-border text-text-secondary hover:bg-surface-hover'
              }`}
            >
              <Sun className="w-5 h-5 text-amber-500" />
              <span>Modo Claro</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTheme('dark');
                toast.success('Modo Oscuro activado.');
              }}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold gap-2 transition-all ${
                theme === 'dark'
                  ? 'border-primary ring-2 ring-primary/20 bg-primary/5 text-primary'
                  : 'border-surface-border text-text-secondary hover:bg-surface-hover'
              }`}
            >
              <Moon className="w-5 h-5 text-blue-400" />
              <span>Modo Oscuro</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTheme('system');
                toast.success('Modo Automático del Sistema activado.');
              }}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold gap-2 transition-all ${
                theme === 'system'
                  ? 'border-primary ring-2 ring-primary/20 bg-primary/5 text-primary'
                  : 'border-surface-border text-text-secondary hover:bg-surface-hover'
              }`}
            >
              <Laptop className="w-5 h-5 text-text-muted" />
              <span>Sistema</span>
            </button>
          </div>
        </div>
      </Card>

      {/* SECCIÓN 2: LÍMITES DE PERÍODOS ACADÉMICOS Y RECESO INVERNAL (DESPLEGABLE) */}
      <Card className="p-0 overflow-hidden border-surface-border">
        {/* Encabezado Desplegable */}
        <button
          type="button"
          onClick={() => setIsPeriodsOpen(prev => !prev)}
          className="w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-left hover:bg-surface-hover/50 transition-colors cursor-pointer group"
          aria-expanded={isPeriodsOpen}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-text-primary">
                  Límites de Períodos Académicos y Receso Invernal
                </h2>
                <Badge variant="primary" className="text-[10px] font-mono">
                  {periodos.length} {periodos.length === 1 ? 'período' : 'períodos'}
                </Badge>
              </div>
              <p className="text-xs text-text-muted mt-0.5 truncate max-w-md sm:max-w-xl">
                {isPeriodsOpen 
                  ? 'Establece con precisión los rangos de fechas donde se proyectan las clases y descansos lectivos.' 
                  : (periodos.length > 0 ? periodos.map(p => p.nombre).join(' • ') : 'Sin períodos configurados')
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-primary hidden sm:inline">
              {isPeriodsOpen ? 'Ocultar' : 'Configurar'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-surface-hover flex items-center justify-center text-text-secondary group-hover:text-primary transition-colors">
              {isPeriodsOpen ? (
                <ChevronUp className="w-4 h-4 transition-transform" />
              ) : (
                <ChevronDown className="w-4 h-4 transition-transform" />
              )}
            </div>
          </div>
        </button>

        {/* Contenido Desplegable */}
        {isPeriodsOpen && (
          <div className="p-4 sm:p-6 border-t border-surface-border space-y-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
              <p className="text-xs text-text-muted">
                Configura los rangos de fechas para el ciclo lectivo <strong>{selectedCiclo?.anio || '2026'}</strong>.
              </p>
              <Button
                variant="outline"
                size="sm"
                icon={Plus}
                onClick={handleAddPeriod}
                type="button"
                className="text-xs self-start sm:self-auto"
              >
                Añadir Período
              </Button>
            </div>

            {/* Informative Callout */}
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/15 text-xs text-text-secondary flex items-start gap-3 leading-relaxed">
              <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <strong>Regla Académica Estricta:</strong> La agenda proyectará clases regulares únicamente dentro de las fechas de los cuatrimestres o trimestres habilitados. Durante el <strong>Receso Invernal</strong> no se computarán clases dictadas ni inasistencias docentes.
              </div>
            </div>

            {/* Períodos List */}
            <div className="space-y-4">
              {periodos.map((p, index) => (
                <div 
                  key={p.id || index}
                  className={`p-4 rounded-2xl border transition-all ${
                    p.tipo === 'RECESO'
                      ? 'bg-amber-500/5 border-amber-500/20'
                      : 'bg-surface border-surface-border'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      {/* Nombre */}
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-text-muted mb-1">
                          Nombre del Período
                        </label>
                        <input
                          type="text"
                          required
                          value={p.nombre}
                          onChange={(e) => handlePeriodChange(index, 'nombre', e.target.value)}
                          className="w-full px-3 py-2 text-xs sm:text-sm font-semibold border border-surface-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none bg-surface text-text-primary"
                        />
                      </div>

                      {/* Tipo */}
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-text-muted mb-1">
                          Tipo de Período
                        </label>
                        <CustomSelect
                          value={p.tipo}
                          onChange={(val) => handlePeriodChange(index, 'tipo', typeof val === 'object' ? val.target.value : val)}
                          options={[
                            { value: 'CUATRIMESTRE', label: 'Cuatrimestre' },
                            { value: 'TRIMESTRE', label: 'Trimestre' },
                            { value: 'RECESO', label: 'Receso Invernal (Vacaciones)' },
                            { value: 'EXAMENES', label: 'Turno de Exámenes Finales' }
                          ]}
                          buttonClassName="py-2 text-xs font-semibold"
                        />
                      </div>

                      {/* Fecha Inicio */}
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-text-muted mb-1">
                          Fecha de Inicio
                        </label>
                        <input
                          type="date"
                          required
                          value={p.fecha_inicio}
                          onChange={(e) => handlePeriodChange(index, 'fecha_inicio', e.target.value)}
                          className="w-full px-3 py-2 text-xs sm:text-sm font-mono border border-surface-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none bg-surface text-text-primary"
                        />
                      </div>

                      {/* Fecha Fin */}
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-text-muted mb-1">
                          Fecha de Cierre
                        </label>
                        <input
                          type="date"
                          required
                          value={p.fecha_fin}
                          onChange={(e) => handlePeriodChange(index, 'fecha_fin', e.target.value)}
                          className="w-full px-3 py-2 text-xs sm:text-sm font-mono border border-surface-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none bg-surface text-text-primary"
                        />
                      </div>
                    </div>

                    {/* Remove button */}
                    <div className="flex items-end justify-end">
                      <button
                        type="button"
                        onClick={() => handleRemovePeriod(index)}
                        className="p-2 text-text-muted hover:text-danger hover:bg-danger/10 rounded-xl transition-all touch-target-44 cursor-pointer"
                        title="Eliminar este período"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3 border-t border-surface-border">
              <Button
                variant="primary"
                icon={Save}
                loading={savingPeriods}
                onClick={handleSavePeriods}
                type="button"
              >
                Guardar Períodos Académicos
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* SECCIÓN 3: CRITERIOS ACADÉMICOS PREDETERMINADOS */}
      <Card className="p-5 sm:p-6 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-surface-border">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-text-primary">
              Criterios de Evaluación y Promoción Predeterminados
            </h2>
            <p className="text-xs text-text-muted">
              Pautas base aplicables a las nuevas cátedras (pueden ajustarse por cátedra individual).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-text-secondary mb-1">
              Asistencia Mín. Promoción (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={criterios.min_asist_promo}
              onChange={(e) => setCriterios({ ...criterios, min_asist_promo: Number(e.target.value) })}
              className="w-full px-3.5 py-2 text-sm font-mono border border-surface-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none bg-surface text-text-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-text-secondary mb-1">
              Asistencia Mín. Regularidad (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={criterios.min_asist_reg}
              onChange={(e) => setCriterios({ ...criterios, min_asist_reg: Number(e.target.value) })}
              className="w-full px-3.5 py-2 text-sm font-mono border border-surface-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none bg-surface text-text-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-text-secondary mb-1">
              Nota Mínima Promoción (Terciario)
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={criterios.nota_min_promo}
              onChange={(e) => setCriterios({ ...criterios, nota_min_promo: Number(e.target.value) })}
              className="w-full px-3.5 py-2 text-sm font-mono border border-surface-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none bg-surface text-text-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-text-secondary mb-1">
              Nota Mínima Regularidad (Terciario)
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={criterios.nota_min_reg}
              onChange={(e) => setCriterios({ ...criterios, nota_min_reg: Number(e.target.value) })}
              className="w-full px-3.5 py-2 text-sm font-mono border border-surface-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none bg-surface text-text-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-text-secondary mb-1">
              Nota Mínima Aprobación (Secundario)
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={criterios.nota_min_sec}
              onChange={(e) => setCriterios({ ...criterios, nota_min_sec: Number(e.target.value) })}
              className="w-full px-3.5 py-2 text-sm font-mono border border-surface-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none bg-surface text-text-primary"
            />
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-surface-border">
          <Button
            variant="primary"
            icon={Save}
            loading={savingCriteria}
            onClick={handleSaveCriteria}
            type="button"
          >
            Guardar Criterios Base
          </Button>
        </div>
      </Card>
    </div>
  );
}