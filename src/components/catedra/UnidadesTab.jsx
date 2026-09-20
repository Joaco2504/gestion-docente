import React, { useState, useEffect, useMemo } from 'react';
import { 
  Layers, 
  Plus, 
  Edit3, 
  Trash2, 
  BookOpen, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Clock,
  FileText,
  ChevronRight,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Card from '../common/Card';
import Modal from '../common/Modal';
import EmptyState from '../common/EmptyState';
import { SkeletonCard } from '../common/SkeletonLoader';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { handleAppError } from '../../utils/handleAppError';

export default function UnidadesTab({ catedraId, catedraName, onNavigateToLibroTemas }) {
  const { user, isDemo } = useAuth();

  const [unidades, setUnidades] = useState([]);
  const [clases, setClases] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUnidad, setEditingUnidad] = useState(null);
  const [formNumero, setFormNumero] = useState(1);
  const [formTitulo, setFormTitulo] = useState('');
  const [formDescripcion, setFormDescripcion] = useState('');
  const [saving, setSaving] = useState(false);

  // Modal Borrado Seguro
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [unidadToDelete, setUnidadToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (catedraId) {
      loadData();
    }
  }, [catedraId]);

  async function loadData() {
    setLoading(true);
    try {
      let loadedUnidades = [];
      let loadedClases = [];

      // 1. Cargar Clases de la cátedra para contabilizar por unidad
      if (isSupabaseConfigured && !isDemo) {
        const { data: cData, error: cErr } = await supabase
          .from('clases')
          .select('*')
          .eq('catedra_id', catedraId);
        if (!cErr && cData) {
          loadedClases = cData;
        }
      } else {
        const storedClases = localStorage.getItem(`clases_${catedraId}`);
        if (storedClases) {
          try { loadedClases = JSON.parse(storedClases); } catch (e) { loadedClases = []; }
        }
      }
      setClases(loadedClases);

      // 2. Cargar Unidades Temáticas
      if (isSupabaseConfigured && !isDemo) {
        const { data, error } = await supabase
          .from('unidades_tematicas')
          .select('*')
          .eq('catedra_id', catedraId)
          .order('numero', { ascending: true });

        if (error) {
          console.warn('Error fetching unidades_tematicas from Supabase, checking local fallback:', error);
          const stored = localStorage.getItem(`unidades_tematicas_${catedraId}`);
          if (stored) {
            loadedUnidades = JSON.parse(stored);
          }
        } else {
          loadedUnidades = data || [];
        }
      } else {
        const stored = localStorage.getItem(`unidades_tematicas_${catedraId}`);
        if (stored) {
          try { loadedUnidades = JSON.parse(stored); } catch (e) { loadedUnidades = []; }
        } else {
          // Demo seed inicial para cátedras nuevas
          loadedUnidades = [
            {
              id: 'unit-demo-1',
              catedra_id: catedraId,
              numero: 1,
              titulo: 'Introducción al Espacio Curricular y Marco Teórico',
              descripcion: 'Fundamentos epistemológicos, pautas de cursada y conceptos nucleares de la disciplina.'
            },
            {
              id: 'unit-demo-2',
              catedra_id: catedraId,
              numero: 2,
              titulo: 'Modelado y Desarrollo de Casos Prácticos',
              descripcion: 'Técnicas de análisis, diseño procedimental y resolución de problemáticas situadas en contexto.'
            }
          ];
          localStorage.setItem(`unidades_tematicas_${catedraId}`, JSON.stringify(loadedUnidades));
        }
      }

      setUnidades(loadedUnidades);
    } catch (err) {
      handleAppError(err, 'UnidadesTab / Cargar unidades');
    } finally {
      setLoading(false);
    }
  };

  // Mapeo de conteo de clases asociadas a cada unidad
  const classCountByUnit = useMemo(() => {
    const map = {};
    unidades.forEach(u => {
      map[u.id] = clases.filter(c => c.unidad_id === u.id).length;
    });
    return map;
  }, [unidades, clases]);

  // Total de clases asociadas al programa
  const totalClasesEnPrograma = useMemo(() => {
    return clases.filter(c => Boolean(c.unidad_id)).length;
  }, [clases]);

  // Abrir modal de creación
  const handleOpenCreate = () => {
    setEditingUnidad(null);
    const nextNum = unidades.length > 0 
      ? Math.max(...unidades.map(u => Number(u.numero) || 0)) + 1 
      : 1;
    setFormNumero(nextNum);
    setFormTitulo('');
    setFormDescripcion('');
    setIsModalOpen(true);
  };

  // Abrir modal de edición
  const handleOpenEdit = (u) => {
    setEditingUnidad(u);
    setFormNumero(u.numero);
    setFormTitulo(u.titulo || '');
    setFormDescripcion(u.descripcion || '');
    setIsModalOpen(true);
  };

  // Guardar creación o edición
  const handleSaveUnidad = async (e) => {
    e.preventDefault();
    if (!formTitulo.trim()) {
      toast.error('Debes ingresar el título de la unidad.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        catedra_id: catedraId,
        docente_id: user?.id || 'demo-user',
        numero: Number(formNumero) || 1,
        titulo: formTitulo.trim(),
        descripcion: formDescripcion.trim()
      };

      let savedItem = null;

      if (isSupabaseConfigured && !isDemo) {
        if (editingUnidad) {
          const { data, error } = await supabase
            .from('unidades_tematicas')
            .update({
              numero: payload.numero,
              titulo: payload.titulo,
              descripcion: payload.descripcion
            })
            .eq('id', editingUnidad.id)
            .select()
            .single();

          if (error) throw error;
          savedItem = data;
          toast.success('Unidad temática actualizada correctamente.');
        } else {
          const { data, error } = await supabase
            .from('unidades_tematicas')
            .insert([payload])
            .select()
            .single();

          if (error) throw error;
          savedItem = data;
          toast.success(`Unidad ${payload.numero} añadida al programa.`);
        }
      } else {
        // Modo local
        if (editingUnidad) {
          savedItem = { ...editingUnidad, ...payload };
          toast.success('Unidad temática actualizada (Modo Local).');
        } else {
          savedItem = { ...payload, id: 'unit-' + Date.now() };
          toast.success(`Unidad ${payload.numero} añadida (Modo Local).`);
        }
      }

      // Actualizar estado reactivo
      let updatedList = [];
      if (editingUnidad) {
        updatedList = unidades.map(u => u.id === editingUnidad.id ? savedItem : u);
      } else {
        updatedList = [...unidades, savedItem];
      }
      updatedList.sort((a, b) => Number(a.numero) - Number(b.numero));

      setUnidades(updatedList);
      localStorage.setItem(`unidades_tematicas_${catedraId}`, JSON.stringify(updatedList));
      setIsModalOpen(false);
    } catch (err) {
      handleAppError(err, 'UnidadesTab / guardarUnidad', user, { mostrarToast: false });
      // Fallback si la tabla Supabase aún no fue migrada
      if (err.message?.includes('relation') || err.code === '42P01') {
        const localItem = editingUnidad 
          ? { ...editingUnidad, numero: Number(formNumero), titulo: formTitulo.trim(), descripcion: formDescripcion.trim() }
          : { id: 'unit-' + Date.now(), catedra_id: catedraId, numero: Number(formNumero), titulo: formTitulo.trim(), descripcion: formDescripcion.trim() };
        
        const updatedList = editingUnidad 
          ? unidades.map(u => u.id === editingUnidad.id ? localItem : u)
          : [...unidades, localItem];
        updatedList.sort((a, b) => Number(a.numero) - Number(b.numero));

        setUnidades(updatedList);
        localStorage.setItem(`unidades_tematicas_${catedraId}`, JSON.stringify(updatedList));
        toast.info('Guardado en caché local (ejecuta la migración SQL en Supabase para sincronizar).');
        setIsModalOpen(false);
      } else {
        handleAppError(err, 'UnidadesTab / Guardar Unidad Temática', user);
      }
    } finally {
      setSaving(false);
    }
  };

  // Abrir confirmación de borrado
  const handleOpenDelete = (u) => {
    setUnidadToDelete(u);
    setIsDeleteModalOpen(true);
  };

  // Confirmar eliminación de unidad (desvinculando clases de forma segura)
  const handleConfirmDelete = async () => {
    if (!unidadToDelete) return;
    setDeleting(true);
    try {
      const unitId = unidadToDelete.id;

      if (isSupabaseConfigured && !isDemo) {
        // Desvincular clases que apuntaban a esta unidad
        await supabase
          .from('clases')
          .update({ unidad_id: null })
          .eq('unidad_id', unitId);

        // Eliminar la unidad temática
        const { error } = await supabase
          .from('unidades_tematicas')
          .delete()
          .eq('id', unitId);

        if (error) throw error;
      }

      // Actualizar clases locales desvinculadas
      const updatedClases = clases.map(c => c.unidad_id === unitId ? { ...c, unidad_id: null } : c);
      setClases(updatedClases);
      localStorage.setItem(`clases_${catedraId}`, JSON.stringify(updatedClases));

      // Actualizar listado de unidades
      const updatedList = unidades.filter(u => u.id !== unitId);
      setUnidades(updatedList);
      localStorage.setItem(`unidades_tematicas_${catedraId}`, JSON.stringify(updatedList));

      toast.success(`Unidad ${unidadToDelete.numero} eliminada. Las clases asociadas han sido desvinculadas sin perder su contenido.`);
      setIsDeleteModalOpen(false);
      setUnidadToDelete(null);
    } catch (err) {
      handleAppError(err, 'UnidadesTab / Eliminar Unidad Temática', user);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12 sm:pb-0">
      
      {/* 1. TOP CONTROL BAR BENTO */}
      <div className="bg-surface p-4 sm:p-5 rounded-3xl border border-surface-border shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20 shadow-xs">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-text-primary tracking-tight">
                Programa Didáctico & Unidades Temáticas
              </h2>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/40">
                {unidades.length} {unidades.length === 1 ? 'unidad' : 'unidades'}
              </span>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-surface-hover text-text-muted border border-surface-border">
                {totalClasesEnPrograma} de {clases.length} clases asignadas
              </span>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Estructura curricular de la cátedra para seguimiento pedagógico y trazabilidad en el Libro de Temas.
            </p>
          </div>
        </div>

        {/* Acciones principales */}
        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap sm:flex-nowrap">
          {onNavigateToLibroTemas && (
            <button
              type="button"
              onClick={onNavigateToLibroTemas}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 hover:border-emerald-500/50 hover:bg-emerald-50/40 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-medium shadow-sm active:scale-95 transition-all duration-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 flex-1 sm:flex-initial"
              title="Ir a la Línea de Tiempo del Libro de Temas"
            >
              <BookOpen className="w-4 h-4 text-emerald-500" />
              <span className="hidden sm:inline">Ver Libro de Temas</span>
              <span className="sm:hidden">Libro</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs sm:text-sm shadow-lg shadow-emerald-600/20 active:scale-95 transition-all duration-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 flex-1 sm:flex-initial"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nueva Unidad Temática</span>
            <span className="sm:hidden">+ Unidad</span>
          </button>
        </div>
      </div>

      {/* 2. LISTA DE UNIDADES TEMÁTICAS */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : unidades.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="Aún no se han definido unidades temáticas"
          description="Estructura los bloques de contenidos mínimos de tu materia para asociar cada clase dictada con su unidad correspondiente."
          actionText="Crear Primera Unidad"
          actionIcon={Plus}
          onAction={handleOpenCreate}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {unidades.map((u) => {
            const classCount = classCountByUnit[u.id] || 0;
            const hasClasses = classCount > 0;

            return (
              <div
                key={u.id}
                className="backdrop-blur-xl bg-white/80 dark:bg-slate-900/60 rounded-3xl border border-slate-200/80 dark:border-white/10 p-5 shadow-xs hover:shadow-md hover:border-indigo-500/40 transition-all duration-200 flex flex-col justify-between group"
              >
                <div>
                  {/* Encabezado de la Tarjeta */}
                  <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-surface-border">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40 shadow-xs">
                        Unidad {u.numero}
                      </span>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                        hasClasses 
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-slate-100 dark:bg-white/5 text-text-muted border border-surface-border'
                      }`}>
                        {hasClasses ? 'Dictándose' : 'Sin iniciar'}
                      </span>
                    </div>

                    {/* Acciones de Edición / Borrado */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(u)}
                        className="p-1.5 text-text-muted hover:text-primary rounded-xl hover:bg-surface-hover transition-colors"
                        title="Editar título y contenidos de la unidad"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenDelete(u)}
                        className="p-1.5 text-text-muted hover:text-danger rounded-xl hover:bg-danger/10 transition-colors"
                        title="Eliminar unidad temática"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Título y Ejes Temáticos */}
                  <div className="space-y-2">
                    <h3 className="text-base font-bold text-text-primary leading-snug">
                      {u.titulo}
                    </h3>
                    {u.descripcion ? (
                      <p className="text-xs text-text-secondary leading-relaxed line-clamp-3">
                        {u.descripcion}
                      </p>
                    ) : (
                      <p className="text-xs text-text-muted italic">
                        Sin ejes temáticos o contenidos mínimos detallados.
                      </p>
                    )}
                  </div>
                </div>

                {/* Pie de Tarjeta Bento: Métrica de Clases y Enlace */}
                <div className="pt-4 mt-4 border-t border-surface-border/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-text-muted font-mono">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {classCount} {classCount === 1 ? 'clase dictada' : 'clases dictadas'}
                    </span>
                  </div>

                  {onNavigateToLibroTemas && (
                    <button
                      type="button"
                      onClick={onNavigateToLibroTemas}
                      className="text-primary hover:underline font-semibold inline-flex items-center gap-1 text-[11px]"
                    >
                      <span>Ver en Libro</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. MODAL: CREAR / EDITAR UNIDAD TEMÁTICA */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUnidad ? `Editar Unidad ${editingUnidad.numero}` : 'Nueva Unidad Temática del Programa'}
        icon={Layers}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveUnidad} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {/* Número de Unidad */}
            <div className="sm:col-span-1">
              <label className="block text-xs font-bold uppercase text-text-muted mb-1">
                N° Unidad *
              </label>
              <input
                type="number"
                min="1"
                max="99"
                required
                value={formNumero}
                onChange={(e) => setFormNumero(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono font-bold border border-surface-border rounded-xl bg-surface text-text-primary outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Título de la Unidad */}
            <div className="sm:col-span-3">
              <label className="block text-xs font-bold uppercase text-text-muted mb-1">
                Título de la Unidad *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Estadística Descriptiva y Probabilidad"
                value={formTitulo}
                onChange={(e) => setFormTitulo(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-surface-border rounded-xl bg-surface text-text-primary outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* Ejes Temáticos / Contenidos Mínimos */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold uppercase text-text-muted">
                Ejes Temáticos y Contenidos Mínimos
              </label>
              <span className="text-[11px] text-text-muted">Opcional</span>
            </div>
            <textarea
              rows="4"
              placeholder="Detalla los núcleos conceptuales, bibliografía de referencia o actividades previstas para esta unidad..."
              value={formDescripcion}
              onChange={(e) => setFormDescripcion(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm border border-surface-border rounded-xl bg-surface text-text-primary outline-none focus:ring-2 focus:ring-primary/20 leading-relaxed placeholder:text-text-muted/60"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-surface-border">
            <Button
              variant="outline"
              type="button"
              onClick={() => setIsModalOpen(false)}
              disabled={saving}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              type="submit"
              loading={saving}
              className="text-xs font-bold"
            >
              {editingUnidad ? 'Guardar Cambios' : 'Registrar Unidad'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 4. MODAL: ELIMINAR UNIDAD CON IMPACTO SEGURO */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="¿Eliminar esta Unidad Temática?"
        icon={AlertCircle}
        maxWidth="max-w-md"
      >
        {unidadToDelete && (
          <div className="space-y-4 animate-fadeIn">
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
              Estás a punto de eliminar la <strong>Unidad {unidadToDelete.numero}: {unidadToDelete.titulo}</strong>.
            </div>

            <div className="p-3 rounded-xl bg-surface-hover/50 border border-surface-border text-xs text-text-secondary space-y-1.5">
              <p>
                • Clases actualmente vinculadas: <strong>{classCountByUnit[unidadToDelete.id] || 0}</strong>.
              </p>
              <p className="text-text-muted">
                • Las clases registradas <strong>no se borrarán</strong>: simplemente quedarán catalogadas como <em>"Sin Unidad Asignada"</em> para que puedas reasignarlas cuando desees.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-surface-border">
              <Button
                variant="outline"
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={deleting}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                type="button"
                onClick={handleConfirmDelete}
                loading={deleting}
                icon={Trash2}
                className="text-xs font-bold"
              >
                Sí, Eliminar Unidad
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
