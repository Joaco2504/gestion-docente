import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, 
  Calendar as CalendarIcon, 
  Clock, 
  Plus, 
  Edit3, 
  Trash2, 
  Printer, 
  Paperclip, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  X, 
  Layers, 
  FileText,
  Sparkles,
  ArrowUpDown,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Card from '../common/Card';
import Modal from '../common/Modal';
import CustomSelect from '../common/CustomSelect';
import EmptyState from '../common/EmptyState';
import ExpandableSearch from '../common/ExpandableSearch';
import { SkeletonTable } from '../common/SkeletonLoader';
import PrintPreviewModal from '../common/PrintPreviewModal';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { formatFechaDMY, getTodayYMD } from '../../lib/dateUtils';
import { handleAppError } from '../../utils/handleAppError';

const CARACTER_OPTIONS = [
  { value: 'TEORICA', label: 'Teórica' },
  { value: 'PRACTICA', label: 'Práctica' },
  { value: 'TEORICO_PRACTICA', label: 'Teórico - Práctica' },
  { value: 'TALLER', label: 'Taller / Laboratorio' },
  { value: 'EVALUACION', label: 'Evaluación / Examen' }
];

export default function LibroTemasTab({ catedraId, catedraName }) {
  const { user, isDemo } = useAuth();
  const { activeCiclo, catedras } = useApp();

  const [clases, setClases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [caracterFilter, setCaracterFilter] = useState('ALL');
  const [unidadFilter, setUnidadFilter] = useState('ALL');
  const [sortAsc, setSortAsc] = useState(false); // false = cronológico inverso (recientes primero en pantalla)

  // Unidades Temáticas del Programa
  const [unidades, setUnidades] = useState([]);
  const [modalUnidadId, setModalUnidadId] = useState('');
  const [isQuickCreatingUnidad, setIsQuickCreatingUnidad] = useState(false);
  const [quickUnidadNum, setQuickUnidadNum] = useState(1);
  const [quickUnidadTitulo, setQuickUnidadTitulo] = useState('');
  const [savingQuickUnit, setSavingQuickUnit] = useState(false);

  // Modales
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [modalFecha, setModalFecha] = useState(getTodayYMD());
  const [modalTema, setModalTema] = useState('');
  const [modalHoras, setModalHoras] = useState(2);
  const [modalCaracter, setModalCaracter] = useState('TEORICA');
  const [modalObservaciones, setModalObservaciones] = useState('');
  const [modalArchivo, setModalArchivo] = useState('');
  const [savingClass, setSavingClass] = useState(false);

  // Modal Adjuntar Material
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
  const [targetClassForAttach, setTargetClassForAttach] = useState(null);
  const [attachUrl, setAttachUrl] = useState('');
  const [savingAttach, setSavingAttach] = useState(false);

  // Modal Eliminar Clase
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [classToDelete, setClassToDelete] = useState(null);
  const [deletingClass, setDeletingClass] = useState(false);

  // Modal de Impresión Oficial
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Obtener info de la cátedra para el membrete
  const currentCatedra = useMemo(() => {
    return catedras?.find(c => c.id === catedraId) || {
      id: catedraId,
      nombre: catedraName,
      nivel: 'TERCIARIO',
      modalidad: 'ANUAL'
    };
  }, [catedras, catedraId, catedraName]);

  useEffect(() => {
    fetchClases();
  }, [catedraId]);

  const handleQuickCreateUnidad = async ({ numero, titulo }) => {
    try {
      const payload = {
        catedra_id: catedraId,
        docente_id: user?.id || 'demo-user',
        numero: Number(numero) || (unidades.length + 1),
        titulo: titulo.trim(),
        descripcion: ''
      };

      let newUnit = null;
      if (isSupabaseConfigured && !isDemo) {
        const { data, error } = await supabase
          .from('unidades_tematicas')
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        newUnit = data;
      } else {
        newUnit = { ...payload, id: 'unit-' + Date.now() };
      }

      const updated = [...unidades, newUnit].sort((a, b) => Number(a.numero) - Number(b.numero));
      setUnidades(updated);
      localStorage.setItem(`unidades_tematicas_${catedraId}`, JSON.stringify(updated));
      toast.success(`Unidad ${newUnit.numero}: ${newUnit.titulo} creada.`);
      return newUnit;
    } catch (err) {
      console.warn('Fallback quick create unit in LibroTemasTab:', err);
      const fallbackUnit = {
        id: 'unit-' + Date.now(),
        catedra_id: catedraId,
        numero: Number(numero) || (unidades.length + 1),
        titulo: titulo.trim(),
        descripcion: ''
      };
      const updated = [...unidades, fallbackUnit].sort((a, b) => Number(a.numero) - Number(b.numero));
      setUnidades(updated);
      localStorage.setItem(`unidades_tematicas_${catedraId}`, JSON.stringify(updated));
      toast.success(`Unidad ${fallbackUnit.numero} creada (Modo Local).`);
      return fallbackUnit;
    }
  };

  async function fetchClases() {
    setLoading(true);
    try {
      let loadedU = [];
      if (isSupabaseConfigured && !isDemo) {
        // Cargar unidades y clases en paralelo para eliminar cascada N+1 de red
        const [uRes, cRes] = await Promise.all([
          supabase
            .from('unidades_tematicas')
            .select('*')
            .eq('catedra_id', catedraId)
            .order('numero', { ascending: true }),
          supabase
            .from('clases')
            .select('*')
            .eq('catedra_id', catedraId)
            .order('fecha', { ascending: true })
        ]);

        if (!uRes.error && uRes.data) {
          loadedU = uRes.data;
        } else {
          const storedU = localStorage.getItem(`unidades_tematicas_${catedraId}`);
          if (storedU) try { loadedU = JSON.parse(storedU); } catch (e) {}
        }
        setUnidades(loadedU);

        if (cRes.error) throw cRes.error;
        setClases(cRes.data || []);
      } else {
        const storedU = localStorage.getItem(`unidades_tematicas_${catedraId}`);
        if (storedU) try { loadedU = JSON.parse(storedU); } catch (e) {}
        setUnidades(loadedU);
        const stored = localStorage.getItem(`clases_${catedraId}`);
        if (stored) {
          setClases(JSON.parse(stored));
        } else {
          // Demo fallback
          setClases([
            {
              id: 'cls-demo-1',
              catedra_id: catedraId,
              fecha: '2026-03-09',
              tema: 'Presentación de la cátedra, pautas de cursada y marco metodológico general.',
              horas_catedra: 2,
              caracter: 'TEORICA',
              unidad_id: loadedU[0]?.id || null,
              observaciones: 'Buena participación del alumnado. Se conformaron los grupos de trabajo.',
              archivo_adjunto: 'https://drive.google.com/programa-2026'
            },
            {
              id: 'cls-demo-2',
              catedra_id: catedraId,
              fecha: '2026-03-16',
              tema: 'Fundamentos conceptuales, arquitectura de datos y principios de diseño.',
              horas_catedra: 3,
              caracter: 'TEORICO_PRACTICA',
              unidad_id: loadedU[0]?.id || null,
              observaciones: 'Se resolvieron ejercicios de aplicación práctica en pizarrón.',
              archivo_adjunto: ''
            }
          ]);
        }
      }
    } catch (err) {
      handleAppError(err, 'LibroTemasTab / Cargar Clases', user);
    } finally {
      setLoading(false);
    }
  };

  // Abrir modal de creación
  const handleOpenCreate = () => {
    setEditingClass(null);
    setModalFecha(getTodayYMD());
    setModalTema('');
    setModalUnidadId('');
    setIsQuickCreatingUnidad(false);
    setModalHoras(2);
    setModalCaracter('TEORICA');
    setModalObservaciones('');
    setModalArchivo('');
    setIsClassModalOpen(true);
  };

  // Abrir modal de edición
  const handleOpenEdit = (cls) => {
    setEditingClass(cls);
    setModalFecha(cls.fecha || getTodayYMD());
    setModalTema(cls.tema || '');
    setModalUnidadId(cls.unidad_id || '');
    setIsQuickCreatingUnidad(false);
    setModalHoras(cls.horas_catedra || 2);
    setModalCaracter(cls.caracter || 'TEORICA');
    setModalObservaciones(cls.observaciones || '');
    setModalArchivo(cls.archivo_adjunto || '');
    setIsClassModalOpen(true);
  };

  // Abrir modal para adjuntar material
  const handleOpenAttach = (cls) => {
    setTargetClassForAttach(cls);
    setAttachUrl(cls.archivo_adjunto || '');
    setIsAttachModalOpen(true);
  };

  // Guardar creación o edición
  const handleSaveClass = async (e) => {
    e.preventDefault();
    if (!modalTema.trim()) {
      toast.error('Debes ingresar el tema o contenido desarrollado.');
      return;
    }

    setSavingClass(true);
    try {
      const payload = {
        catedra_id: catedraId,
        fecha: modalFecha,
        tema: modalTema.trim(),
        unidad_id: modalUnidadId || null,
        horas_catedra: Number(modalHoras) || 2,
        caracter: modalCaracter,
        observaciones: modalObservaciones.trim(),
        archivo_adjunto: modalArchivo.trim()
      };

      if (isSupabaseConfigured && !isDemo) {
        if (editingClass) {
          // Intentar actualizar con todos los campos
          const { error } = await supabase
            .from('clases')
            .update(payload)
            .eq('id', editingClass.id);

          if (error) {
            // Fallback si columnas adicionales aún no existen en Supabase
            console.warn('Fallback update clases:', error);
            await supabase
              .from('clases')
              .update({ fecha: modalFecha, tema: modalTema.trim() })
              .eq('id', editingClass.id);
          }
          toast.success('Clase actualizada en el Libro de Temas.');
        } else {
          // Insertar nueva clase
          const { error } = await supabase
            .from('clases')
            .insert([payload]);

          if (error) {
            console.warn('Fallback insert clases:', error);
            await supabase
              .from('clases')
              .insert([{ catedra_id: catedraId, fecha: modalFecha, tema: modalTema.trim() }]);
          }
          toast.success('Clase registrada en el Libro de Temas.');
        }
        await fetchClases();
      } else {
        // LocalStorage / Demo Mode
        let updated;
        if (editingClass) {
          updated = clases.map(c => c.id === editingClass.id ? { ...c, ...payload } : c);
          toast.success('Clase actualizada en el Libro de Temas.');
        } else {
          const newCls = { id: 'cls-' + Date.now(), ...payload };
          updated = [...clases, newCls];
          toast.success('Clase registrada en el Libro de Temas.');
        }
        updated.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
        setClases(updated);
        localStorage.setItem(`clases_${catedraId}`, JSON.stringify(updated));
      }

      setIsClassModalOpen(false);
    } catch (err) {
      handleAppError(err, 'LibroTemasTab / Guardar Clase', user);
    } finally {
      setSavingClass(false);
    }
  };

  // Guardar material adjunto
  const handleSaveAttach = async (e) => {
    e.preventDefault();
    if (!targetClassForAttach) return;

    setSavingAttach(true);
    try {
      if (isSupabaseConfigured && !isDemo) {
        await supabase
          .from('clases')
          .update({ archivo_adjunto: attachUrl.trim() })
          .eq('id', targetClassForAttach.id);
        await fetchClases();
      } else {
        const updated = clases.map(c => 
          c.id === targetClassForAttach.id ? { ...c, archivo_adjunto: attachUrl.trim() } : c
        );
        setClases(updated);
        localStorage.setItem(`clases_${catedraId}`, JSON.stringify(updated));
      }

      toast.success('Material de estudio adjuntado a la clase.');
      setIsAttachModalOpen(false);
    } catch (err) {
      handleAppError(err, 'LibroTemasTab / Adjuntar Material', user);
    } finally {
      setSavingAttach(false);
    }
  };

  // Confirmar eliminación
  const handleDeleteClass = async () => {
    if (!classToDelete) return;
    setDeletingClass(true);
    try {
      if (isSupabaseConfigured && !isDemo) {
        const { error } = await supabase
          .from('clases')
          .delete()
          .eq('id', classToDelete.id);
        if (error) throw error;
        await fetchClases();
      } else {
        const updated = clases.filter(c => c.id !== classToDelete.id);
        setClases(updated);
        localStorage.setItem(`clases_${catedraId}`, JSON.stringify(updated));
      }

      toast.success('Registro de clase eliminado del Libro de Temas.');
      setIsDeleteModalOpen(false);
      setClassToDelete(null);
    } catch (err) {
      handleAppError(err, 'LibroTemasTab / Eliminar Clase', user);
    } finally {
      setDeletingClass(false);
    }
  };

  // Orden cronológico estricto para correlatividad (#1, #2...)
  const chronologicallyIndexedClases = useMemo(() => {
    const sorted = [...clases].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    return sorted.map((c, idx) => ({ ...c, classNumber: idx + 1 }));
  }, [clases]);

  // Filtrado y orden de visualización para la UI
  const displayClases = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let filtered = chronologicallyIndexedClases.filter(c => {
      if (caracterFilter !== 'ALL' && c.caracter !== caracterFilter) return false;
      if (unidadFilter !== 'ALL') {
        if (unidadFilter === 'NONE') {
          if (c.unidad_id) return false;
        } else if (c.unidad_id !== unidadFilter) {
          return false;
        }
      }
      if (q) {
        const matchTema = (c.tema || '').toLowerCase().includes(q);
        const matchObs = (c.observaciones || '').toLowerCase().includes(q);
        const matchFecha = (c.fecha || '').includes(q);
        if (!matchTema && !matchObs && !matchFecha) return false;
      }
      return true;
    });

    if (!sortAsc) {
      filtered.reverse(); // Más recientes arriba en la vista de pantalla
    }
    return filtered;
  }, [chronologicallyIndexedClases, searchQuery, caracterFilter, unidadFilter, sortAsc]);

  const totalHoras = useMemo(() => {
    return clases.reduce((acc, c) => acc + Number(c.horas_catedra || 2), 0);
  }, [clases]);

  const getCaracterBadge = (caracter) => {
    switch (caracter) {
      case 'PRACTICA':
        return <Badge variant="info" className="text-[10px]">Práctica</Badge>;
      case 'TEORICO_PRACTICA':
        return <Badge variant="primary" className="text-[10px]">Teórico-Práctica</Badge>;
      case 'TALLER':
        return <Badge variant="warning" className="text-[10px]">Taller / Lab</Badge>;
      case 'EVALUACION':
        return <Badge variant="danger" className="text-[10px]">Evaluación</Badge>;
      case 'TEORICA':
      default:
        return <Badge variant="default" className="text-[10px]">Teórica</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12 sm:pb-0">
      
      {/* 1. TOP CONTROL BAR BENTO */}
      <div className="bg-surface p-4 sm:p-5 rounded-3xl border border-surface-border shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary flex items-center justify-center shrink-0 border border-primary/20 shadow-xs">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-text-primary tracking-tight">
                Libro de Temas Digital
              </h2>
              <Badge variant="primary" className="font-mono text-[11px]">
                {(clases ?? []).length} {(clases ?? []).length === 1 ? 'clase' : 'clases'}
              </Badge>
              <Badge variant="default" className="font-mono text-[11px]">
                {totalHoras ?? 0} hs dictadas
              </Badge>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Registro cronológico oficial de contenidos curriculares, horas cátedra y observaciones pedagógicas.
            </p>
          </div>
        </div>

        {/* Acciones principales de cabecera */}
        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap sm:flex-nowrap">
          <button
            type="button"
            onClick={() => setIsPrintModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 hover:border-emerald-500/50 hover:bg-emerald-50/40 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-medium shadow-sm active:scale-95 transition-all duration-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 flex-1 sm:flex-initial"
            title="Generar formato membretado oficial para firma"
          >
            <Printer className="w-4 h-4 text-emerald-500" />
            <span className="hidden sm:inline">Exportar Libro (PDF / Imprimir)</span>
            <span className="sm:hidden">🖨️ Libro</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs sm:text-sm shadow-lg shadow-emerald-600/20 active:scale-95 transition-all duration-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 flex-1 sm:flex-initial"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Registrar Clase</span>
            <span className="sm:hidden">+ Clase</span>
          </button>
        </div>
      </div>

      {/* 2. FILTROS Y BÚSQUEDA REACTIVA */}
      <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-2.5 flex-1 min-w-0 flex-wrap sm:flex-nowrap">
          <ExpandableSearch
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery('')}
            placeholder="Buscar por tema o contenido..."
            widthClass="w-full sm:w-80 md:w-96"
          />

          {/* Filtro por Unidad Temática */}
          {unidades.length > 0 && (
            <div className="w-full sm:w-48 shrink-0">
              <CustomSelect
                value={unidadFilter}
                onChange={(val) => setUnidadFilter(typeof val === 'object' ? val.target.value : val)}
                options={[
                  { value: 'ALL', label: 'Todas las unidades' },
                  ...unidades.map(u => ({
                    value: u.id,
                    label: `Unidad ${u.numero}: ${u.titulo}`,
                    badge: `U${u.numero}`
                  })),
                  { value: 'NONE', label: 'Sin unidad asignada' }
                ]}
                placeholder="Filtrar por unidad..."
                buttonClassName="py-1 px-2.5 text-xs bg-surface-hover/70"
              />
            </div>
          )}

          {/* Filtro por Carácter */}
          <div className="hidden sm:flex items-center bg-surface-hover/50 p-1 rounded-xl border border-surface-border text-xs">
            <button
              type="button"
              onClick={() => setCaracterFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                caracterFilter === 'ALL'
                  ? 'bg-surface text-primary shadow-xs'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Todas
            </button>
            <button
              type="button"
              onClick={() => setCaracterFilter('TEORICA')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                caracterFilter === 'TEORICA'
                  ? 'bg-surface text-primary shadow-xs'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Teóricas
            </button>
            <button
              type="button"
              onClick={() => setCaracterFilter('PRACTICA')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                caracterFilter === 'PRACTICA'
                  ? 'bg-surface text-primary shadow-xs'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Prácticas
            </button>
            <button
              type="button"
              onClick={() => setCaracterFilter('EVALUACION')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                caracterFilter === 'EVALUACION'
                  ? 'bg-surface text-primary shadow-xs'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Exámenes
            </button>
          </div>
        </div>

        {/* Toggle de Orden Cronológico */}
        <button
          type="button"
          onClick={() => setSortAsc(!sortAsc)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-surface-border bg-surface hover:bg-surface-hover text-text-primary transition-all shadow-xs cursor-pointer touch-target-44 shrink-0"
          title={sortAsc ? 'Orden ascendente activo. Clic para recientes primero' : 'Recientes primero. Clic para cronológico antiguo primero'}
        >
          <ArrowUpDown className="w-3.5 h-3.5 text-primary" />
          <span>{sortAsc ? 'Cronológico (Antiguas primero)' : 'Cronológico (Recientes primero)'}</span>
        </button>
      </div>

      {/* 3. TIMELINE INTERACTIVA / FEED VIEW */}
      {loading ? (
        <div className="py-6 space-y-4">
          <SkeletonTable rows={4} cols={4} />
        </div>
      ) : clases.length === 0 ? (
        <EmptyState
          illustration="folder"
          title="Aún no hay clases registradas en el Libro de Temas"
          description="Comienza registrando la primera clase con fecha, horas cátedra y temas impartidos."
          actionLabel="Registrar Primera Clase"
          actionIcon={Plus}
          onAction={handleOpenCreate}
        />
      ) : displayClases.length === 0 ? (
        <EmptyState
          illustration="search"
          title={`No se encontraron clases para "${searchQuery}"`}
          description="Intenta con otro término de búsqueda o limpia el filtro para ver todas las sesiones."
          actionLabel="Restablecer Filtro"
          actionIcon={X}
          onAction={() => { setSearchQuery(''); setCaracterFilter('ALL'); }}
        />
      ) : (
        <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-2.5 sm:before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
          {displayClases.map((cls) => (
            <div key={cls.id} className="relative group">
              {/* Nodo Circular en la Línea de Tiempo */}
              <div className="absolute -left-6 sm:-left-8 top-4 w-5 h-5 rounded-full border-2 border-surface bg-primary text-white flex items-center justify-center text-[9px] font-mono font-bold shadow-xs transition-transform group-hover:scale-125">
                {cls.classNumber}
              </div>

              {/* Tarjeta Bento de Clase */}
              <div className="backdrop-blur-xl bg-white/80 dark:bg-slate-900/60 rounded-3xl border border-slate-200/80 dark:border-white/10 p-5 sm:p-6 shadow-xs hover:shadow-md hover:border-primary/40 transition-all duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-3 border-b border-surface-border">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                      Clase #{cls.classNumber}
                    </span>
                    <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                      <CalendarIcon className="w-3.5 h-3.5 text-text-muted" />
                      <span>{formatFechaDMY(cls.fecha)}</span>
                    </span>
                    <span className="text-xs text-text-muted flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{cls.horas_catedra || 2} hs cátedra</span>
                    </span>
                    {getCaracterBadge(cls.caracter)}

                    {/* Badge Semántico de Unidad Temática */}
                    {(() => {
                      const matchedUnit = (unidades ?? []).find(u => u?.id === cls?.unidad_id);
                      const unitTitle = cls?.unidades_tematicas?.titulo ?? cls?.unidad_texto ?? matchedUnit?.titulo;
                      const unitNum = cls?.unidades_tematicas?.numero ?? matchedUnit?.numero ?? cls?.unidad_numero;
                      if (!unitTitle && !unitNum && !cls?.unidad_id) return null;
                      return (
                        <span className="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 font-semibold text-xs px-2 py-0.5 rounded-md border border-indigo-200/50 dark:border-indigo-800/40 inline-flex items-center gap-1">
                          <Layers className="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0" />
                          <span>{unitNum ? `Unidad ${unitNum}: ` : ''}{unitTitle ?? 'Sin Unidad'}</span>
                        </span>
                      );
                    })()}
                  </div>

                  {/* Acciones Rápidas */}
                  <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenAttach(cls)}
                      className="p-1.5 text-text-muted hover:text-primary rounded-xl hover:bg-surface-hover transition-colors"
                      title={cls.archivo_adjunto ? 'Ver o editar material adjunto' : 'Adjuntar material o enlace Drive'}
                    >
                      <Paperclip className={`w-4 h-4 ${cls.archivo_adjunto ? 'text-primary font-bold' : ''}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(cls)}
                      className="p-1.5 text-text-muted hover:text-primary rounded-xl hover:bg-surface-hover transition-colors"
                      title="Editar contenido de la clase"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => { setClassToDelete(cls); setIsDeleteModalOpen(true); }}
                      className="p-1.5 text-text-muted hover:text-danger rounded-xl hover:bg-danger/10 transition-colors"
                      title="Eliminar registro de clase"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Contenido / Tema Desarrollado */}
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-text-primary leading-relaxed">
                    {cls.tema || 'Sin contenidos detallados.'}
                  </p>

                  {/* Observaciones Pedagógicas */}
                  {cls.observaciones && (
                    <div className="p-3 rounded-2xl bg-surface-hover/50 border border-surface-border text-xs text-text-secondary leading-relaxed">
                      <span className="font-bold text-text-primary block text-[11px] uppercase tracking-wider mb-0.5">
                        Observaciones Pedagógicas:
                      </span>
                      {cls.observaciones}
                    </div>
                  )}

                  {/* Enlace de Material Adjunto */}
                  {cls.archivo_adjunto && (
                    <div className="pt-1">
                      <a
                        href={cls.archivo_adjunto}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline bg-primary/10 px-3 py-1 rounded-xl border border-primary/20"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span className="truncate max-w-xs sm:max-w-md">Material Adjunto: {cls.archivo_adjunto}</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. MODAL: REGISTRAR / EDITAR CLASE */}
      <Modal
        isOpen={isClassModalOpen}
        onClose={() => setIsClassModalOpen(false)}
        title={editingClass ? `Editar Clase #${editingClass.classNumber || ''}` : 'Registrar Clase en Libro de Temas'}
        icon={BookOpen}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSaveClass} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Fecha */}
            <div>
              <label className="block text-xs font-bold uppercase text-text-muted mb-1">
                Fecha de la Clase *
              </label>
              <input
                type="date"
                required
                value={modalFecha}
                onChange={(e) => setModalFecha(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm font-mono border border-surface-border rounded-xl bg-surface text-text-primary outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Horas Cátedra */}
            <div>
              <label className="block text-xs font-bold uppercase text-text-muted mb-1">
                Horas Cátedra *
              </label>
              <input
                type="number"
                min="1"
                max="10"
                required
                value={modalHoras}
                onChange={(e) => setModalHoras(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm font-mono border border-surface-border rounded-xl bg-surface text-text-primary outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* Carácter */}
          <div>
            <label className="block text-xs font-bold uppercase text-text-muted mb-1">
              Carácter de la Clase
            </label>
            <CustomSelect
              value={modalCaracter}
              onChange={(val) => setModalCaracter(typeof val === 'object' ? val.target.value : val)}
              options={CARACTER_OPTIONS}
              buttonClassName="py-2 text-xs font-semibold"
            />
          </div>

          {/* Selector de Unidad Temática / Didáctica */}
          <div className="p-3 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Unidad Temática / Didáctica</span>
              </label>
              {!isQuickCreatingUnidad && (
                <button
                  type="button"
                  onClick={() => {
                    setQuickUnidadNum(unidades.length + 1);
                    setIsQuickCreatingUnidad(true);
                  }}
                  className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  + Crear Unidad al vuelo
                </button>
              )}
            </div>

            {!isQuickCreatingUnidad ? (
              <CustomSelect
                value={modalUnidadId}
                onChange={(val) => setModalUnidadId(typeof val === 'object' ? val.target.value : val)}
                options={[
                  { value: '', label: 'Sin Unidad Asignada' },
                  ...unidades.map(u => ({
                    value: u.id,
                    label: `Unidad ${u.numero}: ${u.titulo}`,
                    badge: `U${u.numero}`
                  }))
                ]}
                placeholder="Seleccionar unidad temática..."
                buttonClassName="py-2 text-xs font-semibold"
              />
            ) : (
              <div className="p-2.5 rounded-xl bg-surface border border-surface-border space-y-2 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-text-primary">Nueva Unidad Rápida</span>
                  <button
                    type="button"
                    onClick={() => setIsQuickCreatingUnidad(false)}
                    className="text-[11px] text-text-muted hover:text-text-primary"
                  >
                    Cancelar
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <div className="col-span-1">
                    <input
                      type="number"
                      min="1"
                      placeholder="N°"
                      value={quickUnidadNum}
                      onChange={(e) => setQuickUnidadNum(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs font-mono font-bold border border-surface-border rounded-lg bg-surface text-text-primary outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="text"
                      placeholder="Título de la unidad..."
                      value={quickUnidadTitulo}
                      onChange={(e) => setQuickUnidadTitulo(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-surface-border rounded-lg bg-surface text-text-primary outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    onClick={async () => {
                      if (!quickUnidadTitulo.trim()) return;
                      setSavingQuickUnit(true);
                      try {
                        const created = await handleQuickCreateUnidad({
                          numero: quickUnidadNum,
                          titulo: quickUnidadTitulo
                        });
                        if (created?.id) setModalUnidadId(created.id);
                        setIsQuickCreatingUnidad(false);
                        setQuickUnidadTitulo('');
                      } finally {
                        setSavingQuickUnit(false);
                      }
                    }}
                    loading={savingQuickUnit}
                    disabled={!quickUnidadTitulo.trim()}
                    className="text-xs py-1 px-3"
                  >
                    Crear y Asignar
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Tema y Contenidos Desarrollados */}
          <div>
            <label className="block text-xs font-bold uppercase text-text-muted mb-1">
              Tema y Contenidos Desarrollados *
            </label>
            <textarea
              required
              rows={3}
              value={modalTema}
              onChange={(e) => setModalTema(e.target.value)}
              placeholder="Ej: Unidad 2: Modelado Relacional, Normalización 1FN, 2FN y 3FN. Ejercitación guiada..."
              className="w-full px-3.5 py-2 text-xs sm:text-sm border border-surface-border rounded-xl bg-surface text-text-primary outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </div>

          {/* Observaciones Pedagógicas */}
          <div>
            <label className="block text-xs font-bold uppercase text-text-muted mb-1">
              Observaciones Pedagógicas (Opcional)
            </label>
            <textarea
              rows={2}
              value={modalObservaciones}
              onChange={(e) => setModalObservaciones(e.target.value)}
              placeholder="Pautas sobre dinámica del grupo, dificultades detectadas, tareas encomendadas..."
              className="w-full px-3.5 py-2 text-xs sm:text-sm border border-surface-border rounded-xl bg-surface text-text-primary outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </div>

          {/* Enlace o Archivo de Material */}
          <div>
            <label className="block text-xs font-bold uppercase text-text-muted mb-1">
              Enlace a Material o Drive (Opcional)
            </label>
            <input
              type="text"
              value={modalArchivo}
              onChange={(e) => setModalArchivo(e.target.value)}
              placeholder="https://drive.google.com/... o enlace de lectura"
              className="w-full px-3.5 py-2 text-xs sm:text-sm border border-surface-border rounded-xl bg-surface text-text-primary outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end items-center gap-2 pt-3 border-t border-surface-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsClassModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={savingClass}
            >
              {editingClass ? 'Guardar Cambios' : 'Registrar en Libro'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 5. MODAL: ADJUNTAR MATERIAL RÁPIDO */}
      <Modal
        isOpen={isAttachModalOpen}
        onClose={() => setIsAttachModalOpen(false)}
        title="Adjuntar Material de Estudio"
        icon={Paperclip}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveAttach} className="space-y-4">
          <p className="text-xs text-text-muted">
            Ingresa el enlace público de Drive, Dropbox o repositorio bibliográfico para la sesión de clase.
          </p>

          <div>
            <label className="block text-xs font-bold uppercase text-text-muted mb-1">
              URL del Material
            </label>
            <input
              type="url"
              required
              value={attachUrl}
              onChange={(e) => setAttachUrl(e.target.value)}
              placeholder="https://drive.google.com/..."
              className="w-full px-3 py-2 text-xs sm:text-sm border border-surface-border rounded-xl bg-surface text-text-primary outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAttachModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={savingAttach}
            >
              Guardar Enlace
            </Button>
          </div>
        </form>
      </Modal>

      {/* 6. MODAL: CONFIRMAR ELIMINACIÓN */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirmar Eliminación"
        icon={Trash2}
        maxWidth="max-w-sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-text-secondary leading-relaxed">
            ¿Estás seguro de que deseas eliminar este registro de clase? Esta acción recalculará los números de clase correlativos del Libro de Temas.
          </p>

          <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              loading={deletingClass}
              onClick={handleDeleteClass}
            >
              Eliminar Clase
            </Button>
          </div>
        </div>
      </Modal>

      {/* 7. VISOR UNIFICADO DE IMPRESIÓN OFICIAL DEL LIBRO DE TEMAS */}
      <PrintPreviewModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        type="libro-temas"
        title="Libro de Temas Digital — Registro Oficial"
        subtitle="Formato reglamentario para rúbrica y archivo en Secretaría Académica"
        defaultOrientation="portrait"
        data={{
          catedra: currentCatedra,
          clases: clases,
          unidades: unidades,
          docenteNombre: user?.user_metadata?.nombre_completo || user?.user_metadata?.nombre || user?.email?.split('@')[0] || 'Docente Titular',
          institucionNombre: currentCatedra.instituciones?.nombre || currentCatedra.institucion_nombre || 'INSTITUTO DE EDUCACIÓN SUPERIOR',
          cicloAnio: activeCiclo?.anio || '2026'
        }}
      />

    </div>
  );
}
