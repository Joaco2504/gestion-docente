import React, { useState, useEffect } from 'react';
import { Pencil, Link2, FileText, Globe, X, Check, Eye } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../../lib/supabase';
import { toast } from 'sonner';

export function EditarRecursoModal({ isOpen, onClose, recurso, onResourceUpdated }) {
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [url, setUrl] = useState('');
  const [tipo, setTipo] = useState('enlace');
  const [categoria, setCategoria] = useState('General');
  const [visibleAlumnos, setVisibleAlumnos] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sincronizar datos al abrir o seleccionar otro recurso
  useEffect(() => {
    if (recurso) {
      setTitulo(recurso.titulo || recurso.nombre || '');
      setDescripcion(recurso.descripcion || '');
      setUrl(recurso.url || recurso.url_o_path || recurso.link || '');
      setTipo(recurso.tipo || (recurso.tipo_origen === 'GOOGLE_LINK' ? 'drive' : 'enlace'));

      // Normalizar categoría previa si viene en formato legado
      const catOrig = recurso.categoria || 'General';
      if (catOrig === 'APUNTE') setCategoria('Apunte de Cátedra');
      else if (catOrig === 'BIBLIOGRAFIA') setCategoria('Bibliografía');
      else if (catOrig === 'TP') setCategoria('Trabajo Práctico');
      else if (catOrig === 'PLANIFICACION') setCategoria('Planificación');
      else setCategoria(catOrig);

      setVisibleAlumnos(recurso.visible_alumnos ?? recurso.es_publico ?? true);
    }
  }, [recurso]);

  if (!isOpen || !recurso) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!titulo.trim()) {
      toast.error('El título del recurso es obligatorio');
      return;
    }

    setIsSubmitting(true);
    try {
      const cleanUrl = url.trim();
      const catCompat = (() => {
        if (categoria === 'General' || categoria === 'Apunte de Cátedra') return 'APUNTE';
        if (categoria === 'Bibliografía') return 'BIBLIOGRAFIA';
        if (categoria === 'Trabajo Práctico') return 'TP';
        if (categoria === 'Planificación') return 'PLANIFICACION';
        if (categoria === 'Parciales y Exámenes') return 'PARCIAL';
        return categoria || 'APUNTE';
      })();

      const payload = {
        titulo: titulo.trim(),
        url: cleanUrl,
        url_o_path: cleanUrl,
        tipo_origen: tipo === 'drive' || tipo === 'enlace' ? 'GOOGLE_LINK' : 'LOCAL',
        tipo,
        categoria: catCompat,
        visible_alumnos: visibleAlumnos
      };

      let updatedData = { ...recurso, ...payload };

      // Si Supabase está configurado y no es un ID ficticio demo
      if (isSupabaseConfigured && !String(recurso.id).startsWith('rec-')) {
        try {
          const { data, error } = await supabase
            .from('recursos')
            .update(payload)
            .eq('id', recurso.id)
            .select()
            .single();

          if (error) {
            console.warn('[EditarRecursoModal] Error al actualizar con esquema extendido, intentando payload compatible:', error.message);
            // Mapear categoría interna compatible con restricción previa de base de datos
            let catCompat = categoria;
            if (categoria === 'General' || categoria === 'Apunte de Cátedra') catCompat = 'APUNTE';
            else if (categoria === 'Bibliografía') catCompat = 'BIBLIOGRAFIA';
            else if (categoria === 'Trabajo Práctico') catCompat = 'TP';
            else if (categoria === 'Planificación') catCompat = 'PLANIFICACION';

            const compatPayload = {
              titulo: titulo.trim(),
              url_o_path: cleanUrl,
              categoria: catCompat
            };

            const { data: compatData, error: compatErr } = await supabase
              .from('recursos')
              .update(compatPayload)
              .eq('id', recurso.id)
              .select()
              .single();

            if (compatErr) throw compatErr;
            if (compatData) updatedData = { ...updatedData, ...compatData };
          } else if (data) {
            updatedData = data;
          }
        } catch (dbErr) {
          console.warn('[EditarRecursoModal] Advertencia de actualización remota:', dbErr);
        }
      }

      toast.success('Recurso actualizado correctamente');
      if (onResourceUpdated) onResourceUpdated(updatedData);
      onClose();
    } catch (err) {
      console.error('Error al editar recurso:', err);
      toast.error('No se pudo guardar la modificación del recurso.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5">
        
        {/* Cabecera */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <Pencil className="w-5 h-5"/>
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Editar Recurso / Material</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Modificá los datos del archivo o enlace compartido</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            type="button"
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Cerrar modal"
          >
            <X className="w-4 h-4"/>
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Título */}
          <div>
            <label className="block text-xs font-mono uppercase font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Título del Material *
            </label>
            <input
              type="text"
              required
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej. Guía Práctica de Ejercicios N° 2"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all font-medium"
            />
          </div>

          {/* Categoría y Tipo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono uppercase font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Categoría
              </label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all cursor-pointer font-medium"
              >
                <option value="General">General</option>
                <option value="Bibliografía">Bibliografía Obligatoria</option>
                <option value="Trabajo Práctico">Trabajo Práctico</option>
                <option value="Apunte de Cátedra">Apunte de Cátedra</option>
                <option value="Planificación">Programa / Planificación</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Tipo de Enlace
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all cursor-pointer font-medium"
              >
                <option value="enlace">Enlace Web / Webpage</option>
                <option value="drive">Google Drive</option>
                <option value="pdf">Documento PDF</option>
                <option value="video">Video / YouTube</option>
              </select>
            </div>
          </div>

          {/* Enlace o URL */}
          <div>
            <label className="block text-xs font-mono uppercase font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Enlace URL / Ubicación en Drive
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Link2 className="w-4 h-4"/>
              </div>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://drive.google.com/..."
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm font-mono focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all"
              />
            </div>
          </div>

          {/* Descripción / Notas */}
          <div>
            <label className="block text-xs font-mono uppercase font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Descripción o Instrucciones (Opcional)
            </label>
            <textarea
              rows={2}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Instrucciones para los alumnos, capítulos recomendados..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all resize-none"
            />
          </div>

          {/* Switch de visibilidad en el portal del estudiante */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Eye className="w-4 h-4 text-emerald-500"/>
              <div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Visible en Portal Alumnos</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Permite que los estudiantes vean y descarguen este archivo.</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={visibleAlumnos}
                onChange={(e) => setVisibleAlumnos(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-6 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Botones */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 active:scale-95 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5"/>
              {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}

export default EditarRecursoModal;
