import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  ExternalLink, 
  UploadCloud, 
  Link as LinkIcon, 
  Calendar, 
  SlidersHorizontal, 
  Scale, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  Trash2,
  FileCheck,
  FileCode
} from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import CustomSelect from '../common/CustomSelect';
import CloudUploadIllustration from '../illustrations/CloudUploadIllustration';
import { uploadCatedraFile, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';

const ESCALA_OPTIONS = [
  { value: 'NUMERICA_1_10', label: 'Numérica 1 a 10 (Aprobación 4 / Promo 7)' },
  { value: 'NUMERICA_1_100', label: 'Porcentual 0 a 100 pts (Aprobación 60)' },
  { value: 'CONCEPTUAL', label: 'Conceptual (Sobresaliente / Aprobado / Insuf.)' },
  { value: 'APROBADO_DESAPROBADO', label: 'Binaria (Aprobado / Desaprobado)' }
];

const TIPO_OPTIONS = [
  { value: 'TP', label: 'Trabajo Práctico (TP)' },
  { value: 'PARCIAL', label: 'Examen Parcial' },
  { value: 'RECUPERATORIO', label: 'Recuperatorio' }
];

export default function EditEvaluacionParamsModal({
  isOpen,
  onClose,
  evaluacion,
  onSave,
  catedraId
}) {
  const { user, isDemo } = useAuth();

  // Estados del formulario
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState('TP');
  const [fechaEntrega, setFechaEntrega] = useState('');
  const [ponderacion, setPonderacion] = useState(100);
  const [escalaNotas, setEscalaNotas] = useState('NUMERICA_1_10');

  // Consigna y archivos
  const [consignaType, setConsignaType] = useState('NONE'); // 'GOOGLE_LINK' | 'LOCAL' | 'NONE'
  const [driveUrl, setDriveUrl] = useState('');
  const [driveNombre, setDriveNombre] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [existingFileUrl, setExistingFileUrl] = useState('');
  const [existingFileName, setExistingFileName] = useState('');

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen && evaluacion) {
      setTitulo(evaluacion.titulo || '');
      setTipo(evaluacion.tipo || 'TP');
      setFechaEntrega(evaluacion.fecha_entrega ? evaluacion.fecha_entrega.split('T')[0] : '');
      setPonderacion(evaluacion.ponderacion !== undefined && evaluacion.ponderacion !== null ? Number(evaluacion.ponderacion) : 100);
      setEscalaNotas(evaluacion.escala_notas || 'NUMERICA_1_10');

      if (evaluacion.archivo_url) {
        setExistingFileUrl(evaluacion.archivo_url);
        setExistingFileName(evaluacion.archivo_nombre || 'Archivo adjunto');
        
        // Determinar si es Drive o local
        const isDrive = evaluacion.archivo_url.includes('drive.google.com') || evaluacion.archivo_url.includes('docs.google.com');
        if (isDrive) {
          setConsignaType('GOOGLE_LINK');
          setDriveUrl(evaluacion.archivo_url);
          setDriveNombre(evaluacion.archivo_nombre || 'Consignas en Google Drive');
        } else {
          setConsignaType('LOCAL');
        }
      } else {
        setConsignaType('NONE');
        setDriveUrl('');
        setDriveNombre('');
        setExistingFileUrl('');
        setExistingFileName('');
      }

      setSelectedFile(null);
      setErrorMsg('');
    }
  }, [isOpen, evaluacion]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!titulo.trim()) {
      setErrorMsg('El nombre de la evaluación es requerido.');
      return;
    }

    if (consignaType === 'GOOGLE_LINK' && !driveUrl.trim()) {
      setErrorMsg('Debes ingresar la URL de Google Drive o Docs.');
      return;
    }

    setSaving(true);
    setErrorMsg('');

    try {
      let finalArchivoUrl = null;
      let finalArchivoNombre = null;

      if (consignaType === 'GOOGLE_LINK') {
        finalArchivoUrl = driveUrl.trim();
        finalArchivoNombre = driveNombre.trim() || 'Consignas en Google Drive';
      } else if (consignaType === 'LOCAL') {
        if (selectedFile) {
          // Subir archivo a Supabase Storage
          if (isSupabaseConfigured && !isDemo) {
            const uploadRes = await uploadCatedraFile(user?.id, catedraId, selectedFile);
            if (uploadRes.error) throw uploadRes.error;
            finalArchivoUrl = uploadRes.publicUrl || uploadRes.url || uploadRes.path;
            finalArchivoNombre = selectedFile.name;
          } else {
            finalArchivoUrl = URL.createObjectURL(selectedFile);
            finalArchivoNombre = selectedFile.name;
          }
        } else if (existingFileUrl) {
          // Mantener archivo previo
          finalArchivoUrl = existingFileUrl;
          finalArchivoNombre = existingFileName;
        }
      }

      const updatedPayload = {
        ...evaluacion,
        titulo: titulo.trim(),
        tipo,
        fecha_entrega: fechaEntrega ? fechaEntrega : null,
        ponderacion: Number(ponderacion) || 100,
        escala_notas: escalaNotas,
        archivo_url: finalArchivoUrl,
        archivo_nombre: finalArchivoNombre,
        updated_at: new Date().toISOString()
      };

      await onSave(updatedPayload);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Error al guardar los parámetros de la evaluación.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Editar Parámetros de la Evaluación"
      subtitle={`Configuración académica y consignas para "${evaluacion?.titulo || 'Evaluación'}"`}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 overflow-y-auto max-h-[75vh]">
        {errorMsg && (
          <div className="p-3 bg-danger/10 border border-danger/30 text-danger text-xs rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">{errorMsg}</span>
          </div>
        )}

        {/* 1. INFORMACIÓN BÁSICA */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
            Identificación de la Evaluación
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Título de la evaluación */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase text-text-secondary mb-1">
                Nombre del Trabajo o Parcial *
              </label>
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ej: Parcial N° 1 / TP 2: Caso de Estudio"
                className="w-full px-3.5 py-2.5 text-sm font-semibold border border-surface-border rounded-xl bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                required
              />
            </div>

            {/* Tipo */}
            <div>
              <label className="block text-xs font-semibold uppercase text-text-secondary mb-1">
                Tipo
              </label>
              <CustomSelect
                value={tipo}
                onChange={(val) => setTipo(typeof val === 'object' ? val.target.value : val)}
                options={TIPO_OPTIONS}
              />
            </div>
          </div>
        </div>

        {/* 2. FECHA Y PONDERACIÓN / ESCALA */}
        <div className="space-y-3 pt-2 border-t border-surface-border">
          <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5 text-primary" />
            Fechas y Criterio de Calificación
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Fecha de Entrega o Realización */}
            <div>
              <label className="block text-xs font-semibold uppercase text-text-secondary mb-1">
                Fecha de Entrega / Examen
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={fechaEntrega}
                  onChange={(e) => setFechaEntrega(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs font-mono border border-surface-border rounded-xl bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <Calendar className="w-4 h-4 text-text-muted absolute left-3 top-2.5" />
              </div>
            </div>

            {/* Ponderación */}
            <div>
              <label className="block text-xs font-semibold uppercase text-text-secondary mb-1">
                Ponderación (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={ponderacion}
                  onChange={(e) => setPonderacion(e.target.value)}
                  className="w-full pr-8 pl-3.5 py-2 text-xs font-mono font-bold border border-surface-border rounded-xl bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="100"
                />
                <span className="absolute right-3 top-2.5 text-xs font-mono text-text-muted select-none">
                  %
                </span>
              </div>
              <span className="text-[10px] text-text-muted block mt-0.5">Peso en la cursada</span>
            </div>

            {/* Escala de Notas */}
            <div>
              <label className="block text-xs font-semibold uppercase text-text-secondary mb-1">
                Escala de Calificación
              </label>
              <CustomSelect
                value={escalaNotas}
                onChange={(val) => setEscalaNotas(typeof val === 'object' ? val.target.value : val)}
                options={ESCALA_OPTIONS}
              />
            </div>
          </div>
        </div>

        {/* 3. CONSIGNAS Y ARCHIVOS (GOOGLE DRIVE / STORAGE) */}
        <div className="space-y-3 pt-2 border-t border-surface-border">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
              <ExternalLink className="w-3.5 h-3.5 text-primary" />
              Consignas y Archivo Adjunto
            </h4>
            <span className="text-[11px] text-text-muted">
              Vincula el documento para consulta docente y estudiantil
            </span>
          </div>

          {/* Selector de Modo de Consigna */}
          <div className="grid grid-cols-3 gap-2 p-1 bg-surface-hover/70 rounded-xl border border-surface-border">
            <button
              type="button"
              onClick={() => setConsignaType('GOOGLE_LINK')}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
                consignaType === 'GOOGLE_LINK'
                  ? 'bg-surface text-primary shadow-xs border border-surface-border'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Google Drive</span>
            </button>
            <button
              type="button"
              onClick={() => setConsignaType('LOCAL')}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
                consignaType === 'LOCAL'
                  ? 'bg-surface text-primary shadow-xs border border-surface-border'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Subir Archivo</span>
            </button>
            <button
              type="button"
              onClick={() => setConsignaType('NONE')}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
                consignaType === 'NONE'
                  ? 'bg-surface text-text-primary shadow-xs border border-surface-border'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <span>Sin Archivo</span>
            </button>
          </div>

          {/* Campos según el tipo de consigna */}
          {consignaType === 'GOOGLE_LINK' && (
            <div className="space-y-3 p-3.5 rounded-2xl bg-surface/50 border border-surface-border">
              <div className="flex items-center justify-between text-xs text-primary font-bold">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Enlace Compartido de Google Drive / Docs</span>
                </div>
                <a
                  href="https://drive.google.com"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-primary hover:underline text-[11px]"
                >
                  Abrir Drive ↗
                </a>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-text-secondary mb-1">
                  URL del Documento / Carpeta en Drive *
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={driveUrl}
                    onChange={(e) => setDriveUrl(e.target.value)}
                    placeholder="https://drive.google.com/file/d/... o https://docs.google.com/..."
                    className="w-full pl-9 pr-3.5 py-2 text-xs font-mono border border-surface-border rounded-xl bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    required
                  />
                  <LinkIcon className="w-4 h-4 text-text-muted absolute left-3 top-2.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-text-secondary mb-1">
                  Nombre descriptivo del enlace
                </label>
                <input
                  type="text"
                  value={driveNombre}
                  onChange={(e) => setDriveNombre(e.target.value)}
                  placeholder="Ej: Consignas TP N° 1 en Google Docs"
                  className="w-full px-3.5 py-2 text-xs border border-surface-border rounded-xl bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>
          )}

          {consignaType === 'LOCAL' && (
            <div className="space-y-3 p-3.5 rounded-2xl bg-surface/50 border border-surface-border">
              {existingFileUrl && !selectedFile && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileCheck className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-semibold truncate">{existingFileName || 'Archivo cargado actualmente'}</span>
                  </div>
                  <a
                    href={existingFileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold underline text-[11px] shrink-0 ml-2"
                  >
                    Ver archivo ↗
                  </a>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase text-text-secondary mb-1">
                  {existingFileUrl ? 'Reemplazar Archivo' : 'Seleccionar Archivo (PDF, DOCX, etc.)'}
                </label>
                <div className="p-4 border-2 border-dashed border-surface-border rounded-xl text-center hover:border-primary/50 transition-colors bg-surface-hover/20">
                  <input
                    type="file"
                    id="eval-file-upload"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      setSelectedFile(f);
                    }}
                  />
                  <label
                    htmlFor="eval-file-upload"
                    className="cursor-pointer flex flex-col items-center justify-center gap-2 group py-1"
                  >
                    <CloudUploadIllustration className="w-20 h-20 shrink-0 transition-transform duration-200 group-hover:scale-105" />
                    {selectedFile ? (
                      <div>
                        <p className="text-xs font-bold text-text-primary break-all">{selectedFile.name}</p>
                        <p className="text-[10px] text-text-muted font-mono">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-medium text-text-primary">
                          Haz clic aquí para seleccionar un archivo
                        </p>
                        <p className="text-[10px] text-text-muted mt-0.5">
                          PDF, DOCX, XLSX, etc. Se guardará en Supabase Storage
                        </p>
                      </div>
                    )}
                  </label>
                </div>
              </div>
            </div>
          )}

          {consignaType === 'NONE' && (
            <div className="p-3 bg-surface rounded-xl border border-surface-border text-xs text-text-muted text-center italic">
              Esta evaluación no tendrá ningún archivo ni enlace de Google Drive vinculado.
            </div>
          )}
        </div>

        {/* FOOTER ACTIONS */}
        <div className="flex items-center justify-between pt-4 border-t border-surface-border">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={saving}
            className="font-bold shadow-xs"
          >
            Guardar Parámetros
          </Button>
        </div>
      </form>
    </Modal>
  );
}
