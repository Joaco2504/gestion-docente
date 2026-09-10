import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Check, 
  X, 
  Calendar as CalendarIcon, 
  Users, 
  CheckCheck, 
  Clock, 
  AlertCircle,
  Save
} from 'lucide-react';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Card from '../common/Card';
import Modal from '../common/Modal';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

export default function AttendanceTab({
  catedraId,
  catedraName
}) {
  const { user, isDemo } = useAuth();
  
  const [clases, setClases] = useState([]);
  const [estudiantes, setEstudiantes] = useState([]);
  const [asistencias, setAsistencias] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedClaseId, setSelectedClaseId] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nuevaFecha, setNuevaFecha] = useState(new Date().toISOString().split('T')[0]);
  const [nuevoTema, setNuevoTema] = useState('');
  const [savingClase, setSavingClase] = useState(false);

  useEffect(() => {
    fetchData();
  }, [catedraId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (isSupabaseConfigured && !isDemo) {
        // 1. Clases
        const { data: cData } = await supabase
          .from('clases')
          .select('*')
          .eq('catedra_id', catedraId)
          .order('fecha', { ascending: false });

        // 2. Estudiantes inscriptos
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

        // 3. Asistencias
        const { data: aData } = await supabase
          .from('asistencias')
          .select('*')
          .in('clase_id', (cData || []).map(c => c.id));

        const cls = cData || [];
        setClases(cls);
        setEstudiantes(estList);
        setAsistencias(aData || []);
        if (cls.length > 0 && !selectedClaseId) {
          setSelectedClaseId(cls[0].id);
        }
      } else {
        // Demo mode fallback
        const storedClases = localStorage.getItem(`clases_${catedraId}`);
        const storedEst = localStorage.getItem(`estudiantes_${catedraId}`);
        const storedAsist = localStorage.getItem(`asistencias_${catedraId}`);

        let cls = storedClases ? JSON.parse(storedClases) : [
          { id: 'clase-1', catedra_id: catedraId, fecha: '2026-03-02', tema: 'Presentación de la Cátedra y Pautas' },
          { id: 'clase-2', catedra_id: catedraId, fecha: '2026-03-09', tema: 'Unidad 1 - Fundamentos y Arquitectura' }
        ];

        let estList = storedEst ? JSON.parse(storedEst) : [
          { id: 'est-1', dni: '40111222', apellido: 'Álvarez', nombre: 'Martín' },
          { id: 'est-2', dni: '39444555', apellido: 'Benítez', nombre: 'Lucía' },
          { id: 'est-3', dni: '41888999', apellido: 'Castillo', nombre: 'Ignacio' },
          { id: 'est-4', dni: '38222333', apellido: 'Domínguez', nombre: 'Valentina' },
          { id: 'est-5', dni: '42333444', apellido: 'Fernández', nombre: 'Santiago' }
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

        setClases(cls);
        setEstudiantes(estList);
        setAsistencias(asist);
        if (cls.length > 0) setSelectedClaseId(cls[0].id);

        localStorage.setItem(`clases_${catedraId}`, JSON.stringify(cls));
        localStorage.setItem(`estudiantes_${catedraId}`, JSON.stringify(estList));
        localStorage.setItem(`asistencias_${catedraId}`, JSON.stringify(asist));
      }
    } catch (err) {
      console.error('Error fetching attendance data:', err);
    } finally {
      setLoading(false);
    }
  };

  const activeClase = clases.find(c => c.id === selectedClaseId) || clases[0];

  const handleCreateClase = async (e) => {
    e.preventDefault();
    if (!nuevaFecha) return;
    setSavingClase(true);
    try {
      const newClaseObj = {
        catedra_id: catedraId,
        fecha: nuevaFecha,
        tema: nuevoTema.trim()
      };

      if (isSupabaseConfigured && !isDemo) {
        const { data, error } = await supabase
          .from('clases')
          .insert(newClaseObj)
          .select()
          .single();

        if (error) throw error;
        const updated = [data, ...clases];
        setClases(updated);
        setSelectedClaseId(data.id);
      } else {
        const created = { ...newClaseObj, id: 'clase-' + Date.now() };
        const updated = [created, ...clases];
        setClases(updated);
        setSelectedClaseId(created.id);
        localStorage.setItem(`clases_${catedraId}`, JSON.stringify(updated));
      }

      setIsModalOpen(false);
      setNuevoTema('');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSavingClase(false);
    }
  };

  // Toggle or set state
  const handleToggle = async (estudianteId, nuevoEstado) => {
    if (!activeClase) return;

    // Optimistic local update
    const filtered = asistencias.filter(
      a => !(a.clase_id === activeClase.id && a.estudiante_id === estudianteId)
    );
    const updated = [...filtered, { clase_id: activeClase.id, estudiante_id: estudianteId, estado: nuevoEstado }];
    setAsistencias(updated);

    if (isSupabaseConfigured && !isDemo) {
      await supabase
        .from('asistencias')
        .upsert({
          clase_id: activeClase.id,
          estudiante_id: estudianteId,
          estado: nuevoEstado
        }, { onConflict: 'clase_id,estudiante_id' });
    } else {
      localStorage.setItem(`asistencias_${catedraId}`, JSON.stringify(updated));
    }
  };

  const handleMarcarTodosPresentes = async () => {
    if (!activeClase || estudiantes.length === 0) return;

    const newRecords = estudiantes.map(e => ({
      clase_id: activeClase.id,
      estudiante_id: e.id,
      estado: 'PRESENTE'
    }));

    const otherClases = asistencias.filter(a => a.clase_id !== activeClase.id);
    const updated = [...otherClases, ...newRecords];
    setAsistencias(updated);

    if (isSupabaseConfigured && !isDemo) {
      await supabase
        .from('asistencias')
        .upsert(newRecords, { onConflict: 'clase_id,estudiante_id' });
    } else {
      localStorage.setItem(`asistencias_${catedraId}`, JSON.stringify(updated));
    }
  };

  const getEstado = (estudianteId) => {
    if (!activeClase) return 'AUSENTE';
    const record = asistencias.find(
      a => a.clase_id === activeClase.id && a.estudiante_id === estudianteId
    );
    return record?.estado || 'AUSENTE';
  };

  const presentesCount = estudiantes.filter(e => getEstado(e.id) === 'PRESENTE').length;
  const ausentesCount = estudiantes.length - presentesCount;
  const presentismoPct = estudiantes.length > 0 
    ? ((presentesCount / estudiantes.length) * 100).toFixed(1) 
    : 0;

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top selector & action bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-surface p-4 rounded-xl border border-surface-border shadow-xs">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <Clock className="w-5 h-5 text-primary shrink-0" />
          <div className="flex-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-0.5">
              Sesión de Clase Seleccionada
            </label>
            {clases.length === 0 ? (
              <span className="text-xs font-medium text-text-muted">No hay clases registradas aún</span>
            ) : (
              <select
                value={activeClase?.id || ''}
                onChange={(e) => setSelectedClaseId(e.target.value)}
                className="w-full text-xs sm:text-sm font-semibold text-text-primary bg-transparent border-0 focus:ring-0 p-0 cursor-pointer"
              >
                {clases.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.fecha} — {c.tema || 'Sin tema especificado'}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeClase && estudiantes.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              icon={CheckCheck}
              onClick={handleMarcarTodosPresentes}
              title="Marcar todos como presentes"
            >
              Todos Presentes
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => setIsModalOpen(true)}
          >
            Nueva Clase
          </Button>
        </div>
      </div>

      {/* Attendance summary cards */}
      {activeClase && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-text-muted">Presentes</p>
              <p className="text-2xl font-mono font-bold text-emerald-600 mt-1">{presentesCount}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Check className="w-5 h-5" />
            </div>
          </Card>
          <Card className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-text-muted">Ausentes</p>
              <p className="text-2xl font-mono font-bold text-rose-600 mt-1">{ausentesCount}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
              <X className="w-5 h-5" />
            </div>
          </Card>
          <Card className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-text-muted">% Presentismo</p>
              <p className="text-2xl font-mono font-bold text-primary mt-1">{presentismoPct}%</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </Card>
        </div>
      )}

      {/* Students list */}
      {estudiantes.length === 0 ? (
        <Card className="text-center py-12">
          <Users className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-50" />
          <h4 className="text-base font-semibold text-text-primary">No hay estudiantes inscriptos en esta cátedra</h4>
          <p className="text-xs text-text-muted mt-1 mb-4">
            Ve a la pestaña "Cargar Alumnos (Excel)" para importar la nómina de estudiantes.
          </p>
        </Card>
      ) : !activeClase ? (
        <Card className="text-center py-12">
          <CalendarIcon className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-50" />
          <h4 className="text-base font-semibold text-text-primary">No se ha creado ninguna clase</h4>
          <p className="text-xs text-text-muted mt-1 mb-4">
            Haz clic en "Nueva Clase" arriba para registrar la primera fecha y comenzar a tomar asistencia.
          </p>
          <Button variant="primary" size="sm" icon={Plus} onClick={() => setIsModalOpen(true)}>
            Crear Primera Clase
          </Button>
        </Card>
      ) : (
        <div className="bg-surface rounded-xl border border-surface-border overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-surface-hover/60 text-text-secondary font-semibold border-b border-surface-border">
                <tr>
                  <th className="px-4 py-3 w-12 text-center">#</th>
                  <th className="px-4 py-3 font-mono">DNI</th>
                  <th className="px-4 py-3">Estudiante (Apellido y Nombre)</th>
                  <th className="px-4 py-3 text-center">Estado de Asistencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {estudiantes.map((est, index) => {
                  const estado = getEstado(est.id);
                  const isPresente = estado === 'PRESENTE';

                  return (
                    <tr key={est.id} className="hover:bg-surface-hover/40 transition-colors">
                      <td className="px-4 py-3 text-center text-text-muted font-mono">{index + 1}</td>
                      <td className="px-4 py-3 font-mono text-text-secondary">{est.dni}</td>
                      <td className="px-4 py-3 font-semibold text-text-primary">
                        {est.apellido}, {est.nombre}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggle(est.id, 'PRESENTE')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                              isPresente
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-surface-hover text-text-muted hover:text-emerald-700 border border-surface-border'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Presente</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggle(est.id, 'AUSENTE')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                              !isPresente
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'bg-surface-hover text-text-muted hover:text-rose-700 border border-surface-border'
                            }`}
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Ausente</span>
                          </button>
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

      {/* Modal Nueva Clase */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Crear Nueva Sesión de Clase"
        subtitle="Registra la fecha y tema para pasar asistencia"
      >
        <form onSubmit={handleCreateClase} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-text-secondary mb-1.5">
              Fecha de la Clase
            </label>
            <input
              type="date"
              required
              value={nuevaFecha}
              onChange={(e) => setNuevaFecha(e.target.value)}
              className="w-full px-3.5 py-2 text-sm font-mono border border-surface-border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none bg-surface text-text-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-text-secondary mb-1.5">
              Tema o Contenido Dictado
            </label>
            <input
              type="text"
              placeholder="Ej: Unidad 2 - Modelado Relacional y Normalización"
              value={nuevoTema}
              onChange={(e) => setNuevoTema(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-surface-border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none bg-surface text-text-primary"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} type="button">
              Cancelar
            </Button>
            <Button type="submit" loading={savingClase}>
              Crear Sesión
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
