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
  File
} from 'lucide-react';
import Button from '../common/Button';
import Card from '../common/Card';
import Badge from '../common/Badge';
import Modal from '../common/Modal';
import CustomSelect from '../common/CustomSelect';
import EmptyState from '../common/EmptyState';
import MinimalSpinner from '../common/MinimalSpinner';
import CloudUploadIllustration from '../illustrations/CloudUploadIllustration';
import { toast } from 'sonner';
import { supabase, isSupabaseConfigured, uploadCatedraFile } from '../../lib/supabase';
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
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form state
  const [originType, setOriginType] = useState('LOCAL'); // 'LOCAL' | 'GOOGLE_LINK'
  const [selectedFile, setSelectedFile] = useState(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('APUNTE');
  const [externalUrl, setExternalUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchResources();
  }, [catedraId]);

  async function fetchResources() {
    setLoading(true);
    try {
      if (isSupabaseConfigured && !isDemo) {
        const { data, error } = await supabase
          .from('recursos')
          .select('*')
          .eq('catedra_id', catedraId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setResources(data || []);
      } else {
        // Mock data for demo mode
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
    } catch (err) {
      console.error('Error fetching resources:', err);
    } finally {
      setLoading(false);
    }
  };

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
          // Fallback para modo demo / sin supabase
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
      // Reset & close
      setTitle('');
      setExternalUrl('');
      setSelectedFile(null);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving resource:', err);
      const friendlyMsg = err.message || 'Intente nuevamente';
      toast.error(friendlyMsg);
      setErrorMsg(friendlyMsg);
    } finally {
      setSaving(false);
    }
  };

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
      console.error('Error deleting resource:', err);
      toast.error('No se pudo eliminar el recurso.');
    }
  };

  const filteredResources = selectedCategory === 'ALL'
    ? resources
    : resources.filter(r => r.categoria === selectedCategory);

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
      {/* Action bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface p-4 rounded-xl border border-surface-border">
        <div>
          <h3 className="text-base font-bold text-text-primary">Repositorio Documental de la Cátedra</h3>
          <p className="text-xs text-text-muted mt-0.5">
            Archivos locales subidos a Supabase Storage y carpetas compartidas de Google Drive para {catedraName}.
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
          Agregar Material / Recurso
        </Button>
      </div>

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
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                isSelected 
                  ? 'bg-primary text-white shadow-sm font-semibold' 
                  : 'bg-surface hover:bg-surface-hover text-text-secondary border border-surface-border'
              }`}
            >
              {cat.label}
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                isSelected ? 'bg-white/20 text-white' : 'bg-surface-hover text-text-muted'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

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
              <Card key={res.id} hover className="flex flex-col justify-between p-4 group">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <Badge variant={getCategoryBadgeVariant(res.categoria)}>
                      {res.categoria}
                    </Badge>
                    <button
                      onClick={() => handleDeleteResource(res.id)}
                      className="text-text-muted hover:text-danger p-1 rounded transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
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
                      <p className="text-[11px] text-text-muted mt-1 flex items-center gap-1.5">
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

                <div className="mt-4 pt-3 border-t border-surface-border flex items-center justify-between">
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

      {/* Modal Agregar Recurso (Storage Local o Google Drive) */}
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
                      <p className="text-[11px] text-text-muted">
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
    </div>
  );
}
