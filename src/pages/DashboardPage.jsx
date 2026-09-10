import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  BookOpen, 
  Users, 
  CheckCircle2, 
  Clock, 
  Plus, 
  ArrowRight, 
  Calendar, 
  FileSpreadsheet, 
  GraduationCap, 
  Building, 
  Layers,
  ChevronRight,
  ClipboardList
} from 'lucide-react';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import { SkeletonCatedraCard } from '../components/common/SkeletonLoader';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, isDemo } = useAuth();
  const { 
    instituciones, 
    activeInstitucion, 
    activeCiclo, 
    catedras, 
    loadingApp, 
    refreshData 
  } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newNombre, setNewNombre] = useState('');
  const [newNivel, setNewNivel] = useState('TERCIARIO');
  const [newModalidad, setNewModalidad] = useState('ANUAL');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Set default level based on active institution
  useEffect(() => {
    if (activeInstitucion) {
      setNewNivel(activeInstitucion.nivel || 'TERCIARIO');
    }
  }, [activeInstitucion]);

  const handleCreateCatedra = async (e) => {
    e.preventDefault();
    if (!newNombre.trim()) {
      setErrorMsg('El nombre de la cátedra es obligatorio.');
      return;
    }
    if (!activeInstitucion || !activeCiclo) {
      setErrorMsg('Debes seleccionar una institución y un ciclo lectivo activo.');
      return;
    }

    setSaving(true);
    setErrorMsg('');

    try {
      if (isSupabaseConfigured && !isDemo) {
        const { data, error } = await supabase
          .from('catedras')
          .insert({
            docente_id: user.id,
            institucion_id: activeInstitucion.id,
            ciclo_id: activeCiclo.id,
            nombre: newNombre.trim(),
            nivel: newNivel,
            modalidad: newModalidad,
            horarios_semanales: []
          })
          .select()
          .single();

        if (error) throw error;
        await refreshData();
        setIsModalOpen(false);
        setNewNombre('');
        toast.success(`Cátedra "${data.nombre}" creada con éxito`);
        navigate(`/catedra/${data.id}`);
      } else {
        // Demo mode fallback
        const newCat = {
          id: 'cat-' + Date.now(),
          docente_id: user?.id || 'demo-user',
          institucion_id: activeInstitucion.id,
          ciclo_id: activeCiclo.id,
          nombre: newNombre.trim(),
          nivel: newNivel,
          modalidad: newModalidad,
          horarios_semanales: [{ dia: 'Lunes', desde: '18:00', hasta: '20:00', aula: 'Aula 10' }],
          estudiantes_count: 0
        };
        const currentCats = JSON.parse(localStorage.getItem('demo_catedras') || '[]');
        currentCats.push(newCat);
        localStorage.setItem('demo_catedras', JSON.stringify(currentCats));
        await refreshData();
        setIsModalOpen(false);
        setNewNombre('');
        toast.success(`Cátedra "${newCat.nombre}" creada (Modo Demo)`);
        navigate(`/catedra/${newCat.id}`);
      }
    } catch (err) {
      console.error('Error creating cátedra:', err);
      setErrorMsg(err.message || 'Error al crear la cátedra');
      toast.error('Error al crear la cátedra: ' + (err.message || 'Error desconocido'));
    } finally {
      setSaving(false);
    }
  };

  // Filter catedras by active institution and ciclo
  const filteredCatedras = catedras.filter(
    (c) => 
      (!activeInstitucion || c.institucion_id === activeInstitucion.id) &&
      (!activeCiclo || c.ciclo_id === activeCiclo.id)
  );

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-surface rounded-2xl p-6 border border-surface-border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono uppercase tracking-wider text-text-muted">
              Panel de Control
            </span>
            <Badge variant="primary">Ciclo {activeCiclo?.anio || '2026'}</Badge>
            {activeInstitucion && (
              <Badge variant="secondary">{activeInstitucion.nombre}</Badge>
            )}
          </div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">
            Bienvenido, {user?.user_metadata?.nombre || user?.email?.split('@')[0] || 'Docente'}
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            Gestión administrativa centralizada de tus cátedras, asistencias, notas y nóminas de alumnos.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button
            variant="primary"
            icon={Plus}
            onClick={() => {
              setErrorMsg('');
              setIsModalOpen(true);
            }}
            className="w-full md:w-auto"
          >
            Nueva Cátedra
          </Button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-text-muted block">Cátedras Activas</span>
            <span className="text-2xl font-mono font-bold text-text-primary">
              {filteredCatedras.length}
            </span>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-text-muted block">Total Estudiantes</span>
            <span className="text-2xl font-mono font-bold text-text-primary">
              {filteredCatedras.reduce((acc, c) => acc + (c.estudiantes_count || 0), 0) || (isDemo ? 38 : 0)}
            </span>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-text-muted block">Asistencia Global</span>
            <span className="text-2xl font-mono font-bold text-text-primary">
              86.4%
            </span>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-text-muted block">Ciclo Lectivo</span>
            <span className="text-2xl font-mono font-bold text-text-primary">
              {activeCiclo?.anio || '2026'}
            </span>
          </div>
        </Card>
      </div>

      {/* Cátedras Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-text-primary">
              Cátedras en {activeInstitucion ? activeInstitucion.nombre : 'Todas las Instituciones'}
            </h2>
            <span className="text-xs text-text-muted">({filteredCatedras.length})</span>
          </div>
          {filteredCatedras.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              icon={Plus}
              onClick={() => setIsModalOpen(true)}
            >
              Agregar Cátedra
            </Button>
          )}
        </div>

        {loadingApp ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <SkeletonCatedraCard count={3} />
          </div>
        ) : filteredCatedras.length === 0 ? (
          <Card className="text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-surface-hover flex items-center justify-center mx-auto mb-4 text-text-muted">
              <BookOpen className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-text-primary mb-1">
              No tienes cátedras registradas en esta institución
            </h3>
            <p className="text-xs text-text-muted max-w-md mx-auto mb-6">
              Comienza creando una nueva cátedra para gestionar asistencias, calificaciones y cargar nóminas por Excel.
            </p>
            <Button
              variant="primary"
              icon={Plus}
              onClick={() => setIsModalOpen(true)}
            >
              Crear mi primera Cátedra
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCatedras.map((cat) => {
              const schedules = Array.isArray(cat.horarios_semanales) ? cat.horarios_semanales : [];
              return (
                <Card 
                  key={cat.id} 
                  hover 
                  className="flex flex-col justify-between group transition-all duration-200 hover:border-primary/40 hover:shadow-md"
                >
                  <div>
                    {/* Badges row */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant={cat.nivel === 'TERCIARIO' ? 'primary' : 'warning'}>
                          {cat.nivel}
                        </Badge>
                        <Badge variant="default">
                          {cat.modalidad}
                        </Badge>
                      </div>
                      <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-primary transition-transform group-hover:translate-x-1" />
                    </div>

                    {/* Cátedra Name */}
                    <h3 
                      onClick={() => navigate(`/catedra/${cat.id}`)}
                      className="text-lg font-bold text-text-primary group-hover:text-primary cursor-pointer transition-colors leading-snug mb-2"
                    >
                      {cat.nombre}
                    </h3>

                    {/* Institution */}
                    <p className="text-xs text-text-muted flex items-center gap-1.5 mb-4">
                      <Building className="w-3.5 h-3.5" />
                      <span>{cat.institucion_nombre || activeInstitucion?.nombre || 'Institución'}</span>
                    </p>

                    {/* Schedules Preview */}
                    <div className="bg-surface-hover/50 rounded-lg p-2.5 space-y-1 mb-4 border border-surface-border">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted block">
                        Horarios de Cursada:
                      </span>
                      {schedules.length > 0 ? (
                        schedules.map((s, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs text-text-secondary">
                            <span className="font-semibold">{s.dia}</span>
                            <span className="font-mono text-[11px] text-text-muted">
                              {s.desde} - {s.hasta} {s.aula ? `(${s.aula})` : ''}
                            </span>
                          </div>
                        ))
                      ) : (
                        <span className="text-xs text-text-muted italic">Sin horarios configurados</span>
                      )}
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="pt-3 border-t border-surface-border flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 text-xs text-text-muted font-mono">
                      <Users className="w-3.5 h-3.5" />
                      <span>{cat.estudiantes_count ?? 18} alumnos</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate(`/catedra/${cat.id}`)}
                      >
                        Abrir Cátedra
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Nueva Cátedra */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Crear Nueva Cátedra"
      >
        <form onSubmit={handleCreateCatedra} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-danger/10 border border-danger/30 text-danger text-xs rounded-lg">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              Institución y Ciclo Lectivo
            </label>
            <div className="p-2.5 bg-surface-hover rounded-lg text-xs font-medium text-text-primary flex items-center justify-between">
              <span>{activeInstitucion?.nombre || 'Seleccione una institución'}</span>
              <span className="font-mono text-primary font-bold">Ciclo {activeCiclo?.anio || '2026'}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              Nombre de la Asignatura / Cátedra *
            </label>
            <input
              type="text"
              value={newNombre}
              onChange={(e) => setNewNombre(e.target.value)}
              placeholder="Ej: Base de Datos II, Historia Argentina"
              className="w-full px-3 py-2 text-sm border border-surface-border rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Nivel Académico
              </label>
              <select
                value={newNivel}
                onChange={(e) => setNewNivel(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-surface-border rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="TERCIARIO">Terciario / Superior</option>
                <option value="SECUNDARIO">Secundario</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Modalidad
              </label>
              <select
                value={newModalidad}
                onChange={(e) => setNewModalidad(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-surface-border rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="ANUAL">Anual</option>
                <option value="CUATRIMESTRAL">Cuatrimestral</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-surface-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={saving}
            >
              Crear Cátedra
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
