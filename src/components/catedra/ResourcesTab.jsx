import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  ExternalLink, 
  Upload, 
  Plus, 
  Trash2, 
  FolderOpen, 
  CheckCircle2, 
  Link as LinkIcon, 
  FileCheck, 
  BookOpen, 
  AlertCircle,
  FileCode,
  Download
} from 'lucide-react';
import Button from '../common/Button';
import Card from '../common/Card';
import Badge from '../common/Badge';
import Modal from '../common/Modal';
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
  const [uploadMode, setUploadMode] = useState('link'); // 'file' | 'link'
  
  // Form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('APUNTE');
  const [externalUrl, setExternalUrl] = useState('');
  const [fileToUpload, setFileToUpload] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchResources();
  }, [catedraId]);

  const fetchResources = async () => {
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
              tipo_origen: 'LOCAL',
              titulo: 'Unidad 1 - Fundamentos Teóricos.pdf',
              url_o_path: '#',
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
    if (!title.trim()) {
      setErrorMsg('El título es requerido.');
      return;
    }

    setSaving(true);
    setErrorMsg('');

    try {
      let finalUrl = '';
      let origen = 'GOOGLE_LINK';

      if (uploadMode === 'file') {
        if (!fileToUpload) {
          setErrorMsg('Selecciona un archivo para subir.');
          setSaving(false);
          return;
        }

        if (isSupabaseConfigured && !isDemo) {
          const uploadRes = await uploadCatedraFile(catedraId, fileToUpload);
          if (uploadRes.error) throw uploadRes.error;
          finalUrl = uploadRes.publicUrl;
        } else {
          finalUrl = URL.createObjectURL(fileToUpload);
        }
        origen = 'LOCAL';
      } else {
        if (!externalUrl.trim()) {
          setErrorMsg('La URL o enlace es requerido.');
          setSaving(false);
          return;
        }
        finalUrl = externalUrl.trim();
        origen = 'GOOGLE_LINK';
      }

      const newResource = {
        catedra_id: catedraId,
        categoria: category,
        tipo_origen: origen,
        titulo: title.trim(),
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

      toast.success('Recurso guardado correctamente.');
      // Reset & close
      setTitle('');
      setExternalUrl('');
      setFileToUpload(null);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving resource:', err);
      toast.error('Error al guardar el recurso: ' + (err.message || 'Intente nuevamente'));
      setErrorMsg('Error al guardar el recurso: ' + (err.message || 'Intente nuevamente'));
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
          <h3 className="text-base font-bold text-text-primary">Repositorio Documental y Enlaces</h3>
          <p className="text-xs text-text-muted mt-0.5">
            Archivos locales subidos a Supabase Storage y accesos directos a Google Drive de {catedraName}.
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
          Agregar Recurso
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredResources.length === 0 ? (
        <Card className="text-center py-12">
          <div className="w-12 h-12 rounded-full bg-surface-hover flex items-center justify-center mx-auto mb-3 text-text-muted">
            <FolderOpen className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-semibold text-text-primary mb-1">No hay recursos en esta categoría</h4>
          <p className="text-xs text-text-muted max-w-sm mx-auto mb-4">
            Sube la planificación, guías de trabajos prácticos o vincula carpetas de Google Drive.
          </p>
          <Button variant="outline" size="sm" icon={Plus} onClick={() => setIsModalOpen(true)}>
            Subir primer recurso
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredResources.map((res) => {
            const isExternal = res.tipo_origen === 'GOOGLE_LINK';
            return (
              <Card key={res.id} hover className="flex flex-col justify-between p-4 group">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <Badge variant={getCategoryBadgeVariant(res.categoria)}>
                      {res.categoria}
                    </Badge>
                    <button
                      onClick={() => handleDeleteResource(res.id)}
                      className="text-text-muted hover:text-danger p-1 rounded transition-colors opacity-0 group-hover:opacity-100"
                      title="Eliminar recurso"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-start gap-3 mt-1">
                    <div className={`p-2 rounded-lg shrink-0 ${
                      isExternal ? 'bg-amber-50 text-amber-600' : 'bg-primary/10 text-primary'
                    }`}>
                      {isExternal ? <ExternalLink className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-text-primary leading-snug break-words">
                        {res.titulo}
                      </h4>
                      <p className="text-[11px] text-text-muted mt-1 flex items-center gap-1.5">
                        <span>{isExternal ? 'Enlace Web / Drive' : 'Archivo Local'}</span>
                        <span>•</span>
                        <span>{new Date(res.created_at).toLocaleDateString('es-AR')}</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-surface-border flex items-center justify-between">
                  <span className="text-[10px] font-mono text-text-muted truncate max-w-[140px]">
                    {res.url_o_path.replace(/^https?:\/\//, '')}
                  </span>
                  <a
                    href={res.url_o_path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-hover transition-colors"
                  >
                    <span>{isExternal ? 'Abrir enlace' : 'Descargar'}</span>
                    {isExternal ? <ExternalLink className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                  </a>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Agregar Recurso */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Agregar Recurso a la Cátedra"
      >
        <form onSubmit={handleSaveResource} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-danger text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Type switcher */}
          <div className="flex rounded-lg p-1 bg-surface-hover border border-surface-border">
            <button
              type="button"
              onClick={() => setUploadMode('link')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                uploadMode === 'link' 
                  ? 'bg-surface text-primary shadow-sm' 
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5" />
              Enlace Web / Google Drive
            </button>
            <button
              type="button"
              onClick={() => setUploadMode('file')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                uploadMode === 'file' 
                  ? 'bg-surface text-primary shadow-sm' 
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              Subir Archivo Local
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Título descriptivo *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Guía de TP N° 2 - Modelado de Datos"
              className="w-full px-3 py-2 text-sm border border-surface-border rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Categoría
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-surface-border rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="APUNTE">Apunte Teórico</option>
              <option value="TP">Trabajo Práctico</option>
              <option value="PARCIAL">Parcial / Examen</option>
              <option value="PLANIFICACION">Planificación Anual</option>
              <option value="BIBLIOGRAFIA">Bibliografía</option>
            </select>
          </div>

          {uploadMode === 'link' ? (
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                URL o enlace a Google Drive / Docs *
              </label>
              <input
                type="url"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://drive.google.com/..."
                className="w-full px-3 py-2 text-sm font-mono border border-surface-border rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Seleccionar archivo *
              </label>
              <input
                type="file"
                onChange={(e) => setFileToUpload(e.target.files[0] || null)}
                className="w-full text-xs text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
              />
              <p className="text-[11px] text-text-muted mt-1">
                Soporta PDF, Word, Excel, presentaciones o archivos comprimidos.
              </p>
            </div>
          )}

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
              Guardar Recurso
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
