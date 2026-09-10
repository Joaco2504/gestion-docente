import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Clock, 
  Building, 
  BookOpen, 
  Users, 
  Trash2, 
  AlertCircle,
  CheckCircle2,
  Filter
} from 'lucide-react';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const EVENT_TYPES = [
  { id: 'TODOS', label: 'Todos' },
  { id: 'CLASE', label: 'Clases Regulares', color: 'primary' },
  { id: 'TRIBUNAL_EXAMEN', label: 'Tribunales de Examen', color: 'danger' },
  { id: 'REUNION', label: 'Reuniones de Cátedra / Dpto', color: 'warning' },
  { id: 'PERIODO', label: 'Cierre de Periodo / Entrega', color: 'secondary' },
  { id: 'OTRO', label: 'Otros Eventos', color: 'default' }
];

export default function CalendarPage() {
  const { user, isDemo } = useAuth();
  const { catedras, activeInstitucion } = useApp();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('TODOS');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Event Form State
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState('TRIBUNAL_EXAMEN');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [horaInicio, setHoraInicio] = useState('08:00');
  const [horaFin, setHoraFin] = useState('10:00');
  const [notas, setNotas] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchEvents();
  }, [user]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      if (isSupabaseConfigured && !isDemo) {
        const { data, error } = await supabase
          .from('eventos_calendario')
          .select('*')
          .order('fecha_inicio', { ascending: true });

        if (error) throw error;
        setEvents(data || []);
      } else {
        const stored = localStorage.getItem('demo_eventos_calendario');
        if (stored) {
          setEvents(JSON.parse(stored));
        } else {
          const sample = [
            {
              id: 'ev-1',
              titulo: 'Mesa de Examen Final - Práctica Profesional',
              tipo: 'TRIBUNAL_EXAMEN',
              fecha_inicio: new Date(Date.now() + 86400000 * 2).toISOString(),
              fecha_fin: new Date(Date.now() + 86400000 * 2 + 7200000).toISOString(),
              notas: 'Tribunal: Prof. Martínez, Prof. Gómez. Aula 4.',
              editable: true
            },
            {
              id: 'ev-2',
              titulo: 'Reunión de Departamento de Informática',
              tipo: 'REUNION',
              fecha_inicio: new Date(Date.now() + 86400000 * 5).toISOString(),
              fecha_fin: new Date(Date.now() + 86400000 * 5 + 3600000).toISOString(),
              notas: 'Definición de fechas de parciales y proyectos transversales.',
              editable: true
            }
          ];
          setEvents(sample);
          localStorage.setItem('demo_eventos_calendario', JSON.stringify(sample));
        }
      }
    } catch (err) {
      console.error('Error fetching calendar events:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!titulo.trim()) {
      setErrorMsg('El título del evento es obligatorio.');
      return;
    }

    setSaving(true);
    setErrorMsg('');

    try {
      const startDateTime = new Date(`${fecha}T${horaInicio}:00`).toISOString();
      const endDateTime = new Date(`${fecha}T${horaFin}:00`).toISOString();

      const newEvent = {
        docente_id: user?.id,
        titulo: titulo.trim(),
        tipo,
        fecha_inicio: startDateTime,
        fecha_fin: endDateTime,
        notas: notas.trim(),
        editable: true
      };

      if (isSupabaseConfigured && !isDemo) {
        const { data, error } = await supabase
          .from('eventos_calendario')
          .insert(newEvent)
          .select()
          .single();

        if (error) throw error;
        setEvents([...events, data]);
      } else {
        const withId = { ...newEvent, id: 'ev-' + Date.now() };
        const updated = [...events, withId];
        setEvents(updated);
        localStorage.setItem('demo_eventos_calendario', JSON.stringify(updated));
      }

      setIsModalOpen(false);
      setTitulo('');
      setNotas('');
    } catch (err) {
      console.error('Error creating event:', err);
      setErrorMsg(err.message || 'Error al guardar el evento.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (id) => {
    if (!confirm('¿Eliminar este evento del calendario?')) return;
    try {
      if (isSupabaseConfigured && !isDemo) {
        await supabase.from('eventos_calendario').delete().eq('id', id);
      }
      const updated = events.filter((e) => e.id !== id);
      setEvents(updated);
      if (!isSupabaseConfigured || isDemo) {
        localStorage.setItem('demo_eventos_calendario', JSON.stringify(updated));
      }
    } catch (err) {
      console.error('Error deleting event:', err);
    }
  };

  // Compile weekly schedule from catedras
  const weeklyClassSlots = [];
  catedras.forEach((cat) => {
    if (Array.isArray(cat.horarios_semanales)) {
      cat.horarios_semanales.forEach((slot) => {
        weeklyClassSlots.push({
          catedraNombre: cat.nombre,
          nivel: cat.nivel,
          dia: slot.dia,
          desde: slot.desde,
          hasta: slot.hasta,
          aula: slot.aula
        });
      });
    }
  });

  const getBadgeVariantForType = (t) => {
    switch (t) {
      case 'CLASE': return 'primary';
      case 'TRIBUNAL_EXAMEN': return 'danger';
      case 'REUNION': return 'warning';
      case 'PERIODO': return 'secondary';
      default: return 'default';
    }
  };

  const filteredEvents = filterType === 'TODOS'
    ? events
    : events.filter((e) => e.tipo === filterType);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface p-5 rounded-2xl border border-surface-border shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono uppercase tracking-wider text-text-muted">
              Agenda Docente
            </span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">
            Calendario y Horarios de Cursada
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Cronograma semanal consolidado de todas tus cátedras y registro de mesas de exámenes o reuniones.
          </p>
        </div>

        <Button
          variant="primary"
          icon={Plus}
          onClick={() => {
            setErrorMsg('');
            setIsModalOpen(true);
          }}
        >
          Nuevo Evento / Mesa
        </Button>
      </div>

      {/* Grid: Weekly Schedule Board (Left) & Upcoming Special Events (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Grid (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-surface-border">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-text-primary">
                  Grilla Semanal de Dictado de Clases
                </h3>
              </div>
              <span className="text-xs text-text-muted">
                {weeklyClassSlots.length} módulos semanales
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {DAYS.map((day) => {
                const daySlots = weeklyClassSlots.filter((s) => s.dia === day);
                return (
                  <div
                    key={day}
                    className="p-3 bg-surface-hover/30 rounded-xl border border-surface-border min-h-[140px] flex flex-col"
                  >
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-surface-border">
                      <span className="text-xs font-bold text-text-primary">{day}</span>
                      <span className="text-[10px] font-mono font-bold text-text-muted">
                        {daySlots.length}
                      </span>
                    </div>

                    <div className="space-y-2 flex-1">
                      {daySlots.length === 0 ? (
                        <span className="text-[11px] text-text-muted italic block pt-2">
                          Sin clases
                        </span>
                      ) : (
                        daySlots.map((slot, i) => (
                          <div
                            key={i}
                            className="p-2 rounded-lg bg-surface border border-primary/20 shadow-xs border-l-4 border-l-primary"
                          >
                            <h5 className="text-xs font-bold text-text-primary truncate">
                              {slot.catedraNombre}
                            </h5>
                            <div className="flex items-center justify-between mt-1 text-[11px] font-mono text-text-muted">
                              <span>{slot.desde} - {slot.hasta}</span>
                              {slot.aula && <span className="text-text-secondary">{slot.aula}</span>}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Upcoming Special Events (1 Col) */}
        <div className="space-y-4">
          <Card>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-surface-border">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-text-primary">
                  Mesas y Compromisos
                </h3>
              </div>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-3 scrollbar-thin">
              {EVENT_TYPES.slice(0, 4).map((et) => (
                <button
                  key={et.id}
                  onClick={() => setFilterType(et.id)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all ${
                    filterType === et.id
                      ? 'bg-primary text-white font-semibold'
                      : 'bg-surface-hover text-text-muted hover:text-text-primary'
                  }`}
                >
                  {et.label}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="text-center py-8 text-text-muted">
                <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs">No hay eventos registrados en esta categoría.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredEvents.map((ev) => {
                  const sDate = new Date(ev.fecha_inicio);
                  return (
                    <div
                      key={ev.id}
                      className="p-3 rounded-xl bg-surface-hover/40 border border-surface-border flex flex-col justify-between group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <Badge variant={getBadgeVariantForType(ev.tipo)}>
                          {ev.tipo.replace('_', ' ')}
                        </Badge>
                        <button
                          onClick={() => handleDeleteEvent(ev.id)}
                          className="text-text-muted hover:text-danger p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Eliminar evento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <h4 className="text-xs font-bold text-text-primary mt-2">
                        {ev.titulo}
                      </h4>

                      <div className="flex items-center gap-1.5 text-[11px] font-mono text-text-muted mt-1">
                        <Clock className="w-3 h-3" />
                        <span>
                          {sDate.toLocaleDateString('es-AR')} • {sDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {ev.notas && (
                        <p className="text-[11px] text-text-secondary mt-2 bg-surface p-2 rounded border border-surface-border">
                          {ev.notas}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Modal Nuevo Evento */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Crear Evento en Calendario"
      >
        <form onSubmit={handleCreateEvent} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-danger text-xs rounded-lg">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              Título del Evento o Mesa *
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej: Mesa de Examen Final - Diciembre"
              className="w-full px-3 py-2 text-sm border border-surface-border rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              Tipo de Evento
            </label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-surface-border rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="TRIBUNAL_EXAMEN">Tribunal de Examen / Mesa Final</option>
              <option value="REUNION">Reunión Docente / Institucional</option>
              <option value="PERIODO">Cierre de Periodo / Calificaciones</option>
              <option value="OTRO">Otro Evento</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Fecha *
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-surface-border rounded-lg bg-surface text-text-primary"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Desde *
              </label>
              <input
                type="time"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-surface-border rounded-lg bg-surface text-text-primary"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Hasta *
              </label>
              <input
                type="time"
                value={horaFin}
                onChange={(e) => setHoraFin(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-surface-border rounded-lg bg-surface text-text-primary"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              Notas adicionales / Integrantes del tribunal
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
              placeholder="Ej: Aula 14. Vocales: Prof. López, Prof. Díaz."
              className="w-full px-3 py-2 text-xs border border-surface-border rounded-lg bg-surface text-text-primary"
            />
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
              Guardar Evento
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
