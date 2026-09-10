import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Clock, 
  Sliders, 
  Plus, 
  Trash2, 
  Save, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import Button from '../common/Button';
import Card from '../common/Card';
import Badge from '../common/Badge';
import { toast } from 'sonner';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

const DAYS_OF_WEEK = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function SettingsTab({ catedra, onCatedraUpdated }) {
  const { user, isDemo } = useAuth();
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

  useEffect(() => {
    if (catedra) {
      setNombre(catedra.nombre || '');
      setModalidad(catedra.modalidad || 'ANUAL');
      setNivel(catedra.nivel || 'TERCIARIO');
      setHorarios(Array.isArray(catedra.horarios_semanales) ? catedra.horarios_semanales : []);
      fetchCriterios();
    }
  }, [catedra]);

  const fetchCriterios = async () => {
    try {
      if (isSupabaseConfigured && !isDemo) {
        const { data, error } = await supabase
          .from('criterios_evaluacion')
          .select('*')
          .eq('catedra_id', catedra.id)
          .single();

        if (data) {
          setCriterios({
            min_asist_promo: Number(data.min_asist_promo) || 80,
            min_asist_reg: Number(data.min_asist_reg) || 70,
            nota_min_promo: Number(data.nota_min_promo) || 7,
            nota_min_reg: Number(data.nota_min_reg) || 4,
            nota_min_sec: Number(data.nota_min_sec) || 6
          });
        }
      } else {
        const stored = localStorage.getItem(`criterios_${catedra.id}`);
        if (stored) {
          setCriterios(JSON.parse(stored));
        }
      }
    } catch (err) {
      console.warn('Could not fetch criteria:', err);
    }
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

  const handleSaveAll = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSaveSuccess(false);
    setErrorMessage('');

    try {
      if (isSupabaseConfigured && !isDemo) {
        // 1. Update cátedra
        const { data: updatedCatedra, error: catError } = await supabase
          .from('catedras')
          .update({
            nombre: nombre.trim(),
            modalidad,
            horarios_semanales: horarios
          })
          .eq('id', catedra.id)
          .select()
          .single();

        if (catError) throw catError;

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
        if (onCatedraUpdated) onCatedraUpdated(updatedCat);
      }

      setSaveSuccess(true);
      toast.success('Configuración y criterios guardados exitosamente.');
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
            <select
              value={modalidad}
              onChange={(e) => setModalidad(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-surface-border rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="ANUAL">Anual</option>
              <option value="CUATRIMESTRAL">Cuatrimestral</option>
            </select>
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
                  <select
                    value={slot.dia}
                    onChange={(e) => handleHorarioChange(index, 'dia', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs font-semibold border border-surface-border rounded-lg bg-surface text-text-primary"
                  >
                    {DAYS_OF_WEEK.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
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

      {/* Academic Evaluation Thresholds */}
      <Card>
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-surface-border">
          <Sliders className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-text-primary">
            Criterios de Evaluación y Condiciones Académicas
          </h3>
        </div>

        <p className="text-xs text-text-muted mb-4">
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
    </form>
  );
}
