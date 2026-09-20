import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  ExternalLink, 
  Plus, 
  Trash2, 
  FolderOpen, 
  Link as LinkIcon, 
  FileCheck, 
  BookOpen, 
  AlertCircle,
  FileCode,
  Sparkles,
  UploadCloud,
  File,
  SlidersHorizontal,
  Scale,
  Calendar,
  GraduationCap,
  Pencil
} from 'lucide-react';
import Button from '../common/Button';
import Card from '../common/Card';
import Badge from '../common/Badge';
import Modal from '../common/Modal';
import CustomSelect from '../common/CustomSelect';
import EmptyState from '../common/EmptyState';
import MinimalSpinner from '../common/MinimalSpinner';
import CloudUploadIllustration from '../illustrations/CloudUploadIllustration';
import EditEvaluacionParamsModal from './EditEvaluacionParamsModal';
import { toast } from 'sonner';
import { handleAppError } from '../../utils/handleAppError';
import { supabase, isSupabaseConfigured, uploadCatedraFile } from '../../lib/supabase';
import { formatFechaDMY } from '../../lib/dateUtils';
import { useAuth } from '../../context/AuthContext';

const CATEGORIES = [
  { id: 'ALL', label: 'Todos' },
  { id: 'APUNTE', label: 'Apuntes', icon: BookOpen },
  { id: 'TP', label: 'Trabajos Prácticos', icon: FileCheck },
  { id: 'PARCIAL', label: 'Parciales y Exámenes', icon: FileText },
  { id: 'PLANIFICACION', label: 'Planificación Anual', icon: FileCode },
  { id: 'BIBLIOGRAFIA', label: 'Bibliografía', icon: FolderOpen }
];

export default function ResourcesTab({ catedraId, catedraName }) {
  const { user, isDemo } = useAuth();
  
  // Selector de vista principal: 'materials' (Archivos y Repositorio) | 'evaluaciones' (Evaluaciones y Parámetros)
  const [activeMainView, setActiveMainView] = useState('materials');

  // Estado de recursos de la cátedra
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Estado de evaluaciones vinculadas
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [selectedEvalCategory, setSelectedEvalCategory] = useState('ALL');
  const [isEditEvalModalOpen, setIsEditEvalModalOpen] = useState(false);
  const [editingEval, setEditingEval] = useState(null);

  // Form state para nuevo recurso general
  const [originType, setOriginType] = useState('LOCAL'); // 'LOCAL' | 'GOOGLE_LINK'
  const [selectedFile, setSelectedFile] = useState(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('APUNTE');
  const [externalUrl, setExternalUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchAllData();
  }, [catedraId]);

  async function fetchAllData() {
    setLoading(true);
    try {
      // 1. Cargar recursos
      if (isSupabaseConfigured && !isDemo) {
        const { data, error } = await supabase
          .from('recursos')
          .select('*')
          .eq('catedra_id', catedraId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setResources(data || []);
      } else {
        // Mock data para modo demo
        const stored = localStorage.getItem(`recursos_${catedraId}`);
        if (stored) {
          setResources(JSON.parse(stored));
        } else {
          const sample = [
            {
              id: 'rec-1',
              catedra_id: catedraId,
              categoria: 'PLANIFICACION',
              tipo_origen: 'GOOGLE_LINK',
              titulo: 'Programa de la Materia y Cronograma 2026',
              url_o_path: 'https://docs.google.com/document/d/sample-doc',
              created_at: new Date().toISOString()
            },
            {
              id: 'rec-2',
              catedra_id: catedraId,
              categoria: 'APUNTE',
              tipo_origen: 'GOOGLE_LINK',
              titulo: 'Carpeta de Apuntes Unidad 1 (Google Drive)',
              url_o_path: 'https://drive.google.com/drive/folders/sample-unidad-1',
              created_at: new Date(Date.now() - 86400000 * 3).toISOString()
            },
            {
              id: 'rec-3',
              catedra_id: catedraId,
              categoria: 'TP',
              tipo_origen: 'GOOGLE_LINK',
              titulo: 'Consignas TP N°1 - Caso de Estudio',
              url_o_path: 'https://drive.google.com/sample-tp1',
              created_at: new Date(Date.now() - 86400000 * 7).toISOString()
            }
          ];
          setResources(sample);
          localStorage.setItem(`recursos_${catedraId}`, JSON.stringify(sample));
        }
      }

      // 2. Cargar evaluaciones vinculadas con fusión resiliente local/remota
      if (isSupabaseConfigured && !isDemo) {
        const { data: evalData } = await supabase
          .from('evaluaciones')
          .select('*')
          .eq('catedra_id', catedraId)
          .order('created_at', { ascending: true });

        const localKey = `evaluaciones_${catedraId}`;
        let localEvals = [];
        try {
          localEvals = JSON.parse(localStorage.getItem(localKey) || '[]');
        } catch {
          localEvals = [];
        }

        const combinedMap = new Map();
        (evalData || []).forEach(e => combinedMap.set(e.id, e));
        localEvals.forEach(localEv => {
          if (!combinedMap.has(localEv.id)) {
            const match = (evalData || []).find(e => 
              e.titulo?.trim().toLowerCase() === localEv.titulo?.trim().toLowerCase() &&
              String(e.catedra_id) === String(localEv.catedra_id)
            );
            if (!match) {
              combinedMap.set(localEv.id, localEv);
            }
          }
        });

        setEvaluaciones(Array.from(combinedMap.values()));
      } else {
        const storedEval = localStorage.getItem(`evaluaciones_${catedraId}`);
        if (storedEval) {
          setEvaluaciones(JSON.parse(storedEval));
        } else {
          const sampleEvals = [
            {
              id: 'eval-1',
              catedra_id: catedraId,
              titulo: 'Trabajo Práctico N° 1 - Introducción y Marco Teórico',
              tipo: 'TP',
              fecha_entrega: '2026-04-20',
              ponderacion: 20,
              escala_notas: 'NUMERICA_1_10',
              archivo_url: 'https://drive.google.com/sample-tp1',
              archivo_nombre: 'Consignas TP N°1 en Google Drive',
              created_at: new Date().toISOString()
            },
            {
              id: 'eval-2',
              catedra_id: catedraId,
              titulo: 'Primer Examen Parcial Teórico-Práctico',
              tipo: 'PARCIAL',
              fecha_entrega: '2026-06-15',
              ponderacion: 40,
              escala_notas: 'NUMERICA_1_10',
              archivo_url: null,
              archivo_nombre: null,
              created_at: new Date().toISOString()
            },
            {
              id: 'eval-3',
              catedra_id: catedraId,
              titulo: 'Segundo Examen Parcial Integrador',
              tipo: 'PARCIAL',
              fecha_entrega: '2026-10-24',
              ponderacion: 40,
              escala_notas: 'NUMERICA_1_10',
              archivo_url: null,
              archivo_nombre: null,
              created_at: new Date().toISOString()
            }
          ];
          setEvaluaciones(sampleEvals);
          localStorage.setItem(`evaluaciones_${catedraId}`, JSON.stringify(sampleEvals));
        }
      }
    } catch (err) {
      handleAppError(err, 'ResourcesTab / fetchAllData', user);
    } finally {
      setLoading(false);
    }
  }

  // Guardar nuevo material en el repositorio general
  const handleSaveResource = async (e) => {
    e.preventDefault();

    const cleanTitle = title.trim();
    if (!cleanTitle && (!selectedFile || originType === 'GOOGLE_LINK')) {
      setErrorMsg('El título es requerido.');
      return;
    }

    if (originType === 'LOCAL' && !selectedFile) {
      setErrorMsg('Debes seleccionar un archivo para subir a Supabase Storage.');
      return;
    }

    if (originType === 'GOOGLE_LINK' && !externalUrl.trim()) {
      setErrorMsg('Debes ingresar la URL o enlace de Google Drive / Docs.');
      return;
    }

    setSaving(true);
    setErrorMsg('');

    try {
      let finalUrl = '';
      const finalTitle = cleanTitle || (selectedFile ? selectedFile.name.replace(/\.[^/.]+$/, '') : 'Recurso');

      if (originType === 'LOCAL') {
        if (isSupabaseConfigured && !isDemo) {
          const uploadRes = await uploadCatedraFile(user?.id, catedraId, selectedFile);
          if (uploadRes.error) {
            throw uploadRes.error;
          }
          finalUrl = uploadRes.publicUrl || uploadRes.url || uploadRes.path;
        } else {
          finalUrl = URL.createObjectURL(selectedFile);
        }
      } else {
        finalUrl = externalUrl.trim();
      }

      const newResource = {
        catedra_id: catedraId,
        categoria: category,
        tipo_origen: originType,
        titulo: finalTitle,
        url_o_path: finalUrl,
        created_at: new Date().toISOString()
      };

      if (isSupabaseConfigured && !isDemo) {
        const { data, error } = await supabase
          .from('recursos')
          .insert(newResource)
          .select()
          .single();

        if (error) throw error;
        setResources([data, ...resources]);
      } else {
        const itemWithId = { ...newResource, id: 'rec-' + Date.now() };
        const updated = [itemWithId, ...resources];
        setResources(updated);
        localStorage.setItem(`recursos_${catedraId}`, JSON.stringify(updated));
      }

      toast.success(originType === 'LOCAL' ? 'Archivo subido a Supabase Storage con éxito.' : 'Documento de Google Drive vinculado correctamente.');
      setTitle('');
      setExternalUrl('');
      setSelectedFile(null);
      setIsModalOpen(false);
    } catch (err) {
      handleAppError(err, 'ResourcesTab / Guardar recurso');
    } finally {
      setSaving(false);
    }
  };

  // Eliminar recurso general
  const handleDeleteResource = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este recurso?')) return;

    try {
      if (isSupabaseConfigured && !isDemo) {
        const { error } = await supabase.from('recursos').delete().eq('id', id);
        if (error) throw error;
      }
      const updated = resources.filter(r => r.id !== id);
      setResources(updated);
      if (!isSupabaseConfigured || isDemo) {
        localStorage.setItem(`recursos_${catedraId}`, JSON.stringify(updated));
      }
      toast.success('Recurso eliminado.');
    } catch (err) {
      handleAppError(err, 'ResourcesTab / Eliminar recurso');
    }
  };

  // Guardar edición de parámetros de evaluación (Nombre, Fecha, Ponderación, Escala, Drive/Adjunto)
  const handleSaveEvaluacionParams = async (updatedEval) => {
    try {
      if (isSupabaseConfigured && !isDemo && !String(updatedEval.id).startsWith('eval-')) {
        try {
          const { error } = await supabase
            .from('evaluaciones')
            .update({
              titulo: updatedEval.titulo,
              tipo: updatedEval.tipo,
              fecha_entrega: updatedEval.fecha_entrega,
              ponderacion: updatedEval.ponderacion,
              escala_notas: updatedEval.escala_notas,
              archivo_url: updatedEval.archivo_url,
              archivo_nombre: updatedEval.archivo_nombre
            })
            .eq('id', updatedEval.id);

          if (error) {
            // Fallback en caso de que la tabla remota aún no cuente con las columnas ponderacion o escala_notas
            await supabase
              .from('evaluaciones')
              .update({
                titulo: updatedEval.titulo,
                tipo: updatedEval.tipo,
                fecha_entrega: updatedEval.fecha_entrega,
                archivo_url: updatedEval.archivo_url,
                archivo_nombre: updatedEval.archivo_nombre
              })
              .eq('id', updatedEval.id);
          }
        } catch (dbErr) {
          console.warn('Evaluación actualizada localmente. Aviso Supabase:', dbErr);
        }
      }

      // Actualizar estado local y localStorage de evaluaciones
      const updatedEvals = evaluaciones.map(ev => ev.id === updatedEval.id ? updatedEval : ev);
      setEvaluaciones(updatedEvals);
      localStorage.setItem(`evaluaciones_${catedraId}`, JSON.stringify(updatedEvals));

      // Sincronizar con el repositorio de recursos si la evaluación tiene un archivo o enlace a Drive
      if (updatedEval.archivo_url) {
        try {
          const matchingRec = resources.find(r => r.url_o_path === updatedEval.archivo_url);
          if (!matchingRec) {
            const newRec = {
              catedra_id: catedraId,
              categoria: updatedEval.tipo === 'PARCIAL' ? 'PARCIAL' : 'TP',
              tipo_origen: updatedEval.archivo_url.includes('drive.google.com') || updatedEval.archivo_url.includes('docs.google.com') ? 'GOOGLE_LINK' : 'LOCAL',
              titulo: `Consignas: ${updatedEval.titulo}`,
              url_o_path: updatedEval.archivo_url,
              created_at: new Date().toISOString()
            };

            if (isSupabaseConfigured && !isDemo) {
              const { data: recData } = await supabase.from('recursos').insert(newRec).select().single();
              if (recData) {
                setResources(prev => [recData, ...prev]);
              }
            } else {
              const recWithId = { ...newRec, id: 'rec-' + Date.now() };
              const prevRecs = JSON.parse(localStorage.getItem(`recursos_${catedraId}`) || '[]');
              const updatedRecs = [recWithId, ...prevRecs];
              setResources(updatedRecs);
              localStorage.setItem(`recursos_${catedraId}`, JSON.stringify(updatedRecs));
            }
          }
        } catch (syncErr) {
          console.warn('Aviso sincronización recursos:', syncErr);
        }
      }

      toast.success(`Parámetros de "${updatedEval.titulo}" actualizados correctamente.`);
      setIsEditEvalModalOpen(false);
      setEditingEval(null);
    } catch (err) {
      handleAppError(err, 'ResourcesTab / Guardar parámetros de evaluación', user);
      throw err;
    }
  };

  // Filtrado de materiales
  const filteredResources = selectedCategory === 'ALL'
    ? resources
    : resources.filter(r => r.categoria === selectedCategory);

  // Filtrado de evaluaciones
  const filteredEvaluaciones = selectedEvalCategory === 'ALL'
    ? evaluaciones
    : evaluaciones.filter(e => e.tipo === selectedEvalCategory);

  const getCategoryBadgeVariant = (cat) => {
    switch (cat) {
      case 'APUNTE': return 'info';
      case 'TP': return 'secondary';
      case 'PARCIAL': return 'warning';
      case 'PLANIFICACION': return 'primary';
      case 'BIBLIOGRAFIA': return 'default';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* 1. SELECTOR SUPERIOR DE VISTA: MATERIALES VS EVALUACIONES Y PARÁMETROS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-3.5 sm:p-4 rounded-2xl border border-surface-border shadow-xs">
        <div className="p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl flex items-center gap-1 border border-slate-200/60 dark:border-white/5">
          <button
            type="button"
            onClick={() => setActiveMainView('materials')}
            className={`transition-all cursor-pointer select-none ${
              activeMainView === 'materials'
                ? 'px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 font-medium text-xs shadow-sm flex items-center gap-2'
                : 'px-3 py-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-medium text-xs flex items-center gap-2'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            <span>Materiales y Archivos</span>
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/10 border border-emerald-500/20 font-mono text-[10px]">
              {resources.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainView('evaluaciones')}
            className={`transition-all cursor-pointer select-none ${
              activeMainView === 'evaluaciones'
                ? 'px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 font-medium text-xs shadow-sm flex items-center gap-2'
                : 'px-3 py-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-medium text-xs flex items-center gap-2'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Evaluaciones y Parámetros</span>
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/10 border border-emerald-500/20 font-mono text-[10px]">
              {evaluaciones.length}
            </span>
          </button>
        </div>

        {activeMainView === 'materials' ? (
          <button
            type="button"
            onClick={() => {
              setErrorMsg('');
              setIsModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs sm:text-sm shadow-lg shadow-emerald-600/20 active:scale-95 transition-all duration-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap self-stretch sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Material / Recurso</span>
          </button>
        ) : (
          <div className="text-xs text-text-muted flex items-center gap-1.5 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>Edición de consignas, fechas y ponderación</span>
          </div>
        )}
      </div>

      {/* 2. VISTA A: MATERIALES Y REPOSITORIO GENERAL */}
      {activeMainView === 'materials' && (
        <div className="space-y-5">
          {/* Category Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              const count = cat.id === 'ALL' 
                ? resources.length 
                : resources.filter(r => r.categoria === cat.id).length;

              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-primary text-white shadow-sm font-semibold' 
                      : 'bg-surface hover:bg-surface-hover text-text-secondary border border-surface-border'
                  }`}
                >
                  {cat.label}
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-surface-hover text-text-muted'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Banner contextual si se seleccionan TPs o Parciales */}
          {(selectedCategory === 'TP' || selectedCategory === 'PARCIAL') && evaluaciones.length > 0 && (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-text-primary">
                <SlidersHorizontal className="w-4 h-4 text-primary shrink-0" />
                <span>
                  ¿Deseas configurar las fechas, ponderación o enlaces de las evaluaciones?
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveMainView('evaluaciones')}
                className="font-bold text-primary hover:underline inline-flex items-center gap-1 cursor-pointer shrink-0"
              >
                <span>Ir a Evaluaciones y Parámetros</span>
                <span>→</span>
              </button>
            </div>
          )}

          {/* Resource Grid / List */}
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <MinimalSpinner size="lg" color="primary" />
            </div>
          ) : filteredResources.length === 0 ? (
            <EmptyState
              illustration="folder"
              title="No hay recursos en esta categoría"
              description="Sube archivos a Supabase Storage o vincula carpetas compartidas de Google Drive."
              actionLabel="Agregar primer recurso"
              actionIcon={Plus}
              onAction={() => setIsModalOpen(true)}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredResources.map((res) => {
                const isLocal = res.tipo_origen === 'LOCAL';

                return (
                  <Card key={res.id} hover className="flex flex-col justify-between p-4.5 group space-y-4">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <Badge variant={getCategoryBadgeVariant(res.categoria)}>
                          {res.categoria}
                        </Badge>
                        <button
                          onClick={() => handleDeleteResource(res.id)}
                          className="text-text-muted hover:text-danger p-1 rounded-lg hover:bg-danger/10 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                          title="Eliminar recurso"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-start gap-3 mt-1">
                        <div className={`p-2.5 rounded-xl shrink-0 ${
                          isLocal 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        }`}>
                          {isLocal ? <FileText className="w-5 h-5" /> : <ExternalLink className="w-5 h-5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-bold text-text-primary leading-snug break-words">
                            {res.titulo}
                          </h4>
                          <p className="text-[11px] text-text-muted mt-1 flex items-center gap-1.5 font-mono">
                            <span className={`font-semibold ${
                              isLocal ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                            }`}>
                              {isLocal ? 'Supabase Storage' : 'Google Drive'}
                            </span>
                            <span>•</span>
                            <span>{new Date(res.created_at).toLocaleDateString('es-AR')}</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-surface-border flex items-center justify-between">
                      <span className="text-[10px] font-mono text-text-muted truncate max-w-[140px]">
                        {res.url_o_path?.replace(/^https?:\/\//, '')}
                      </span>
                      <a
                        href={res.url_o_path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-hover transition-colors"
                      >
                        <span>{isLocal ? 'Ver / Descargar' : 'Abrir en Drive'}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. VISTA B: EVALUACIONES Y PARÁMETROS VINCULADOS */}
      {activeMainView === 'evaluaciones' && (
        <div className="space-y-5">
          {/* Subheader & filter pills */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h4 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-primary" />
                Parámetros Académicos y Consignas de Evaluaciones
              </h4>
              <p className="text-xs text-text-muted mt-0.5">
                Edita nombres, fechas límites, escalas de calificación, ponderaciones y enlaces a Google Drive.
              </p>
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              {[
                { id: 'ALL', label: 'Todas', count: evaluaciones.length },
                { id: 'TP', label: 'Trabajos Prácticos', count: evaluaciones.filter(e => e.tipo === 'TP').length },
                { id: 'PARCIAL', label: 'Parciales', count: evaluaciones.filter(e => e.tipo === 'PARCIAL').length },
                { id: 'RECUPERATORIO', label: 'Recuperatorios', count: evaluaciones.filter(e => e.tipo === 'RECUPERATORIO').length }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedEvalCategory(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs transition-all cursor-pointer whitespace-nowrap ${
                    selectedEvalCategory === tab.id
                      ? 'bg-primary text-white font-bold shadow-2xs'
                      : 'bg-surface hover:bg-surface-hover text-text-secondary border border-surface-border'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    selectedEvalCategory === tab.id ? 'bg-white/20 text-white' : 'bg-surface-hover text-text-muted'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Grid de evaluaciones */}
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <MinimalSpinner size="lg" color="primary" />
            </div>
          ) : filteredEvaluaciones.length === 0 ? (
            <EmptyState
              illustration="folder"
              title="No hay evaluaciones en esta categoría"
              description="Las evaluaciones creadas en la cátedra se sincronizan automáticamente con sus parámetros."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEvaluaciones.map(ev => {
                const isDrive = ev.archivo_url && (ev.archivo_url.includes('drive.google.com') || ev.archivo_url.includes('docs.google.com'));

                return (
                  <Card key={ev.id} hover className="flex flex-col justify-between p-4.5 group space-y-4">
                    <div>
                      {/* Top bar: Badge & Action */}
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant={ev.tipo === 'PARCIAL' ? 'warning' : ev.tipo === 'TP' ? 'info' : 'secondary'}>
                          {ev.tipo === 'TP' ? 'TRABAJO PRÁCTICO' : ev.tipo === 'PARCIAL' ? 'PARCIAL' : 'RECUPERATORIO'}
                        </Badge>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingEval(ev);
                            setIsEditEvalModalOpen(true);
                          }}
                          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-primary hover:text-white bg-primary/10 hover:bg-primary rounded-xl transition-all cursor-pointer shadow-2xs"
                          title="Editar parámetros, fecha, ponderación o archivo"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>
                      </div>

                      {/* Title */}
                      <h4 className="text-sm font-bold text-text-primary mt-2.5 leading-snug line-clamp-2">
                        {ev.titulo}
                      </h4>

                      {/* Parámetros: Fecha y Ponderación */}
                      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                        {/* Fecha */}
                        <div className="p-2 rounded-xl bg-surface border border-surface-border">
                          <span className="text-[10px] uppercase font-bold text-text-muted flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-primary" />
                            Fecha Límite
                          </span>
                          <span className="font-semibold text-text-primary mt-0.5 block truncate">
                            {ev.fecha_entrega ? formatFechaDMY(ev.fecha_entrega) : 'Sin fecha fijada'}
                          </span>
                        </div>

                        {/* Ponderación */}
                        <div className="p-2 rounded-xl bg-surface border border-surface-border">
                          <span className="text-[10px] uppercase font-bold text-text-muted flex items-center gap-1">
                            <Scale className="w-3 h-3 text-primary" />
                            Ponderación
                          </span>
                          <span className="font-bold text-primary mt-0.5 block font-mono">
                            {ev.ponderacion !== undefined && ev.ponderacion !== null ? `${ev.ponderacion}%` : '100%'}
                          </span>
                        </div>
                      </div>

                      {/* Escala de Calificación */}
                      <div className="mt-2 px-2.5 py-1.5 rounded-xl bg-surface/50 border border-surface-border text-[11px] flex items-center justify-between text-text-muted">
                        <span className="text-[10px] uppercase font-bold text-text-muted">Escala:</span>
                        <span className="font-semibold text-text-secondary truncate">
                          {ev.escala_notas === 'NUMERICA_1_100' ? 'Porcentual (0 a 100 pts)' :
                           ev.escala_notas === 'CONCEPTUAL' ? 'Conceptual (Sobresaliente/Bueno/Insuf.)' :
                           ev.escala_notas === 'APROBADO_DESAPROBADO' ? 'Binaria (Aprobado / Desaprobado)' :
                           'Numérica Oficial (1 a 10)'}
                        </span>
                      </div>
                    </div>

                    {/* Consignas y Archivo Adjunto */}
                    <div className="pt-3 border-t border-surface-border">
                      {ev.archivo_url ? (
                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20">
                          <div className="flex items-center gap-2 min-w-0">
                            {isDrive ? (
                              <ExternalLink className="w-4 h-4 text-amber-500 shrink-0" />
                            ) : (
                              <FileCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-text-primary block truncate max-w-[140px] sm:max-w-[170px]">
                                {ev.archivo_nombre || (isDrive ? 'Google Drive' : 'Consignas adjuntas')}
                              </span>
                              <span className="text-[10px] text-text-muted block">
                                {isDrive ? 'Google Docs / Drive' : 'Supabase Storage'}
                              </span>
                            </div>
                          </div>

                          <a
                            href={ev.archivo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-primary-hover transition-colors shrink-0 ml-2"
                            title="Abrir consignas de la evaluación"
                          >
                            <span>Abrir</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      ) : (
                        <div 
                          onClick={() => {
                            setEditingEval(ev);
                            setIsEditEvalModalOpen(true);
                          }}
                          className="p-2.5 rounded-xl border border-dashed border-surface-border hover:border-primary/40 bg-surface/30 hover:bg-surface transition-all text-center cursor-pointer group/btn"
                        >
                          <span className="text-xs text-text-muted group-hover/btn:text-primary font-medium flex items-center justify-center gap-1.5">
                            <Plus className="w-3.5 h-3.5" />
                            Vincular consignas / Drive
                          </span>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal Agregar Recurso General (Storage Local o Google Drive) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Agregar Material a la Cátedra"
        subtitle={`Repositorio institucional de ${catedraName}`}
      >
        <form onSubmit={handleSaveResource} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-danger/10 border border-danger/30 text-danger text-xs rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed font-medium">{errorMsg}</span>
            </div>
          )}

          {/* Selector de Tipo de Origen */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-surface-hover/70 rounded-xl border border-surface-border">
            <button
              type="button"
              onClick={() => {
                setOriginType('LOCAL');
                setErrorMsg('');
              }}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                originType === 'LOCAL'
                  ? 'bg-surface text-primary shadow-sm border border-surface-border'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              <span>Subir Archivo Local</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setOriginType('GOOGLE_LINK');
                setErrorMsg('');
              }}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                originType === 'GOOGLE_LINK'
                  ? 'bg-surface text-primary shadow-sm border border-surface-border'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <ExternalLink className="w-4 h-4" />
              <span>Google Drive</span>
            </button>
          </div>

          {originType === 'LOCAL' ? (
            <div>
              <label className="block text-xs font-semibold uppercase text-text-secondary mb-1">
                Seleccionar Archivo *
              </label>
              <div className="p-4 border-2 border-dashed border-surface-border rounded-xl text-center hover:border-primary/50 transition-colors bg-surface-hover/20">
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setSelectedFile(f);
                    if (f && !title) {
                      setTitle(f.name.replace(/\.[^/.]+$/, ''));
                    }
                  }}
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center justify-center gap-2 group py-2"
                >
                  <CloudUploadIllustration className="w-28 h-28 sm:w-32 sm:h-32 shrink-0 transition-transform duration-200 group-hover:scale-105" />
                  {selectedFile ? (
                    <div>
                      <p className="text-xs font-bold text-text-primary break-all">{selectedFile.name}</p>
                      <p className="text-[11px] text-text-muted font-mono">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-medium text-text-primary">
                        Haz clic para seleccionar o arrastra un archivo
                      </p>
                      <p className="text-[10px] text-text-muted mt-0.5">
                        PDF, DOCX, XLSX, imágenes, etc.
                      </p>
                    </div>
                  )}
                </label>
              </div>
              <p className="text-[11px] text-text-muted mt-1.5">
                Se almacenará de forma segura en el bucket <strong>archivos-docentes</strong> de Supabase Storage.
              </p>
            </div>
          ) : (
            <>
              {/* Google Drive Informative Helper */}
              <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-primary">
                    <Sparkles className="w-4 h-4" />
                    <span>Google Drive / Docs</span>
                  </div>
                  <a
                    href="https://drive.google.com"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Abrir Google Drive</span>
                  </a>
                </div>
                <p className="text-text-secondary leading-relaxed">
                  Sube tu PDF, Word o carpeta a tu cuenta de Google Drive y pega el enlace aquí. No ocupará cuota en Supabase.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold uppercase text-text-secondary">
                    Enlace a Google Drive o Docs *
                  </label>
                  <span className="text-[11px] font-mono text-text-muted">drive.google.com / docs.google.com</span>
                </div>
                <div className="relative">
                  <input
                    type="url"
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    placeholder="https://drive.google.com/file/d/..."
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm font-mono border border-surface-border rounded-xl bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <LinkIcon className="w-4 h-4 text-text-muted absolute left-3 top-3" />
                </div>
                <p className="text-[11px] text-text-muted mt-1.5">
                  Asegúrate de que en Google Drive el enlace esté configurado como <em>"Cualquiera con el enlace"</em>.
                </p>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase text-text-secondary mb-1">
              Título Descriptivo *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Guía de TP N° 2 - Modelado de Datos"
              className="w-full px-3.5 py-2.5 text-sm border border-surface-border rounded-xl bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-text-secondary mb-1">
              Categoría
            </label>
            <CustomSelect
              value={category}
              onChange={(val) => setCategory(typeof val === 'object' ? val.target.value : val)}
              options={[
                { value: 'APUNTE', label: 'Apunte Teórico' },
                { value: 'TP', label: 'Trabajo Práctico' },
                { value: 'PARCIAL', label: 'Parcial / Examen' },
                { value: 'PLANIFICACION', label: 'Planificación Anual' },
                { value: 'BIBLIOGRAFIA', label: 'Bibliografía' }
              ]}
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
              {originType === 'LOCAL' ? 'Subir a Supabase Storage' : 'Vincular Documento Drive'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal para Editar Parámetros de la Evaluación */}
      <EditEvaluacionParamsModal
        isOpen={isEditEvalModalOpen}
        onClose={() => {
          setIsEditEvalModalOpen(false);
          setEditingEval(null);
        }}
        evaluacion={editingEval}
        onSave={handleSaveEvaluacionParams}
        catedraId={catedraId}
      />
    </div>
  );
}
