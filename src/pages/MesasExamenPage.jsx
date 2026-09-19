import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  Award, 
  Plus, 
  Calendar, 
  Search, 
  BookOpen, 
  BookMarked, 
  ShieldCheck, 
  Printer, 
  Trash2, 
  Building2, 
  GraduationCap, 
  Filter, 
  Users, 
  CheckCircle2, 
  XCircle,
  AlertCircle,
  Clock,
  Sparkles,
  FileSpreadsheet
} from 'lucide-react';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import EmptyState from '../components/common/EmptyState';
import ExpandableSearch from '../components/common/ExpandableSearch';
import ConstituirMesaModal from '../components/mesas/ConstituirMesaModal';
import MesaDetalleView from '../components/mesas/MesaDetalleView';
import PrintPreviewModal from '../components/common/PrintPreviewModal';
import { toast } from 'sonner';
import { handleAppError } from '../utils/handleAppError';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { formatFechaDMY, getTodayYMD } from '../lib/dateUtils';

const CONDICION_BADGE_STYLES = {
  PROMOCIONAL: {
    badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
    label: '🎖️ PROMOCIONAL',
    cardBorder: 'hover:border-emerald-500/40'
  },
  REGULAR: {
    badge: 'bg-primary/10 text-primary-dark dark:text-primary-light border-primary/30',
    label: '📋 REGULAR',
    cardBorder: 'hover:border-primary/40'
  },
  LIBRE: {
    badge: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30',
    label: '🔓 LIBRE',
    cardBorder: 'hover:border-purple-500/40'
  }
};

export default function MesasExamenPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isDemo } = useAuth();
  const { catedras, activeCiclo } = useApp();

  const [mesas, setMesas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filtros
  const [selectedCatedraFilter, setSelectedCatedraFilter] = useState(
    () => searchParams.get('catedraId') || 'TODAS'
  );
  const [selectedCondicionFilter, setSelectedCondicionFilter] = useState('TODAS'); // 'TODAS' | 'PROMOCIONAL' | 'REGULAR' | 'LIBRE'

  // Mesa activa para carga de notas / detalle
  const [selectedMesa, setSelectedMesa] = useState(null);

  // Modales
  const [isConstituirModalOpen, setIsConstituirModalOpen] = useState(false);
  const [mesaToPrint, setMesaToPrint] = useState(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  useEffect(() => {
    fetchMesas();
  }, [user?.id, catedras]);

  // Si llega ?mesaId= en URL, abrir esa mesa automáticamente
  useEffect(() => {
    const mesaIdParam = searchParams.get('mesaId');
    if (mesaIdParam && mesas.length > 0) {
      const found = mesas.find(m => m.id === mesaIdParam);
      if (found) setSelectedMesa(found);
    }
  }, [searchParams, mesas]);

  // Si llega ?catedraId= en URL, sincronizar filtro
  useEffect(() => {
    const catIdParam = searchParams.get('catedraId');
    if (catIdParam) {
      setSelectedCatedraFilter(catIdParam);
    }
  }, [searchParams]);

  async function fetchMesas() {
    setLoading(true);
    try {
      if (isSupabaseConfigured && !isDemo) {
        const { data, error } = await supabase
          .from('mesas_examen')
          .select(`
            *,
            catedras (
              id,
              nombre,
              nivel,
              instituciones (
                id,
                nombre
              )
            ),
            actas_examen_alumnos (
              id,
              dictamen,
              nota_definitiva
            )
          `)
          .order('fecha', { ascending: false });

        if (!error && data) {
          const mapped = data.map(m => {
            const actas = m.actas_examen_alumnos || [];
            const totalAlumnos = actas.length;
            const acreditados = actas.filter(a => a.dictamen === 'ACREDITADO' || a.dictamen === 'APROBADO').length;
            const desaprobados = actas.filter(a => a.dictamen === 'DESAPROBADO').length;
            const ausentes = actas.filter(a => a.dictamen === 'AUSENTE').length;

            return {
              ...m,
              condicion_acta: m.condicion_acta || (m.tipo_mesa === 'PROMOCIONAL' ? 'PROMOCIONAL' : 'REGULAR'),
              totalAlumnos,
              acreditados,
              desaprobados,
              ausentes
            };
          });

          setMesas(mapped);
          try {
            localStorage.setItem('mesas_examen_all', JSON.stringify(mapped));
          } catch (_) {}
          setLoading(false);
          return;
        }
      }

      // Fallback local y modo demo
      loadFallbackMesas();
    } catch (err) {
      handleAppError(err, 'MesasExamenPage / fetchMesas', user);
      loadFallbackMesas();
    } finally {
      setLoading(false);
    }
  }

  function loadFallbackMesas() {
    try {
      const stored = localStorage.getItem('mesas_examen_all');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMesas(parsed);
          return;
        }
      }
    } catch (_) {}

    // Semilla inicial por defecto
    const sampleCat = catedras[0] || { id: 'cat-demo', nombre: 'Práctica Profesional', nivel: 'TERCIARIO' };
    const initialSamples = [
      {
        id: 'mesa-demo-promo-1',
        catedra_id: sampleCat.id,
        fecha: getTodayYMD(),
        turno_llamado: 'PROMOCIONAL DIRECTA',
        condicion_acta: 'PROMOCIONAL',
        tipo_mesa: 'PROMOCIONAL',
        libro: 'IX',
        tomo: '1',
        folio: '45',
        acta_numero: '2026-P01',
        presidente: user?.user_metadata?.nombre_completo || 'Prof. Titular',
        vocal1: 'Lic. García',
        vocal2: 'Prof. Romero',
        catedras: {
          id: sampleCat.id,
          nombre: sampleCat.nombre,
          nivel: sampleCat.nivel,
          instituciones: { nombre: 'I.E.S. Belén' }
        },
        totalAlumnos: 4,
        acreditados: 4,
        desaprobados: 0,
        ausentes: 0
      },
      {
        id: 'mesa-demo-reg-1',
        catedra_id: sampleCat.id,
        fecha: getTodayYMD(),
        turno_llamado: '1° LLAMADO',
        condicion_acta: 'REGULAR',
        tipo_mesa: 'FINAL',
        libro: 'VIII',
        tomo: '1',
        folio: '142',
        acta_numero: '2026-09',
        presidente: user?.user_metadata?.nombre_completo || 'Prof. Titular',
        vocal1: 'Lic. García',
        vocal2: 'Prof. Romero',
        catedras: {
          id: sampleCat.id,
          nombre: sampleCat.nombre,
          nivel: sampleCat.nivel,
          instituciones: { nombre: 'I.E.S. Belén' }
        },
        totalAlumnos: 5,
        acreditados: 4,
        desaprobados: 1,
        ausentes: 0
      }
    ];

    setMesas(initialSamples);
    try {
      localStorage.setItem('mesas_examen_all', JSON.stringify(initialSamples));
    } catch (_) {}
  }

  const handleDeleteMesa = async (mesaItem, e) => {
    if (e) e.stopPropagation();
    const catName = mesaItem.catedras?.nombre || 'Cátedra';
    if (!window.confirm(`¿Estás seguro de eliminar la mesa de "${catName}" del ${formatFechaDMY(mesaItem.fecha)} y todas sus notas asociadas?`)) {
      return;
    }

    try {
      if (isSupabaseConfigured && !isDemo) {
        const { error } = await supabase
          .from('mesas_examen')
          .delete()
          .eq('id', mesaItem.id);
        if (error) throw error;
      }

      const updated = mesas.filter(m => m.id !== mesaItem.id);
      setMesas(updated);
      localStorage.setItem('mesas_examen_all', JSON.stringify(updated));

      if (selectedMesa?.id === mesaItem.id) {
        setSelectedMesa(null);
      }
      toast.success('Mesa de examen eliminada.');
    } catch (err) {
      handleAppError(err, 'MesasExamenPage / Eliminar mesa');
    }
  };

  const handleOpenPrintModal = (mesaItem, e) => {
    if (e) e.stopPropagation();
    setMesaToPrint(mesaItem);
    setIsPrintModalOpen(true);
  };

  // Filtrado reactivo de mesas
  const filteredMesas = useMemo(() => {
    return mesas.filter(m => {
      // Filtro por Cátedra
      if (selectedCatedraFilter !== 'TODAS' && m.catedra_id !== selectedCatedraFilter) {
        return false;
      }

      // Filtro por Condición de Acta
      const cond = (m.condicion_acta || (m.tipo_mesa === 'PROMOCIONAL' ? 'PROMOCIONAL' : 'REGULAR')).toUpperCase();
      if (selectedCondicionFilter !== 'TODAS' && cond !== selectedCondicionFilter) {
        return false;
      }

      // Filtro por Buscador
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const catName = (m.catedras?.nombre || '').toLowerCase();
        const instName = (m.catedras?.instituciones?.nombre || '').toLowerCase();
        const turno = (m.turno_llamado || '').toLowerCase();
        const acta = (m.acta_numero || '').toLowerCase();
        const pres = (m.presidente || '').toLowerCase();

        return (
          catName.includes(q) ||
          instName.includes(q) ||
          turno.includes(q) ||
          acta.includes(q) ||
          pres.includes(q) ||
          (m.fecha && m.fecha.includes(q))
        );
      }

      return true;
    });
  }, [mesas, selectedCatedraFilter, selectedCondicionFilter, searchQuery]);

  return (
    <div className="space-y-6">
      
      {/* =========================================================================
          SI HAY UNA MESA SELECCIONADA: VISTA DETALLE & PLANILLA DE CALIFICACIONES
      ========================================================================= */}
      {selectedMesa ? (
        <MesaDetalleView
          mesa={selectedMesa}
          onBack={() => {
            setSelectedMesa(null);
            fetchMesas();
          }}
          onMesaUpdated={fetchMesas}
          onMesaDeleted={() => {
            setSelectedMesa(null);
            fetchMesas();
          }}
        />
      ) : (
        /* =========================================================================
            VISTA PRINCIPAL: HISTORIAL Y GESTIÓN GENERAL DE MESAS
        ========================================================================= */
        <div className="space-y-6 animate-fadeIn">
          
          {/* Cabecera Hero */}
          <div className="backdrop-blur-xl bg-white/75 dark:bg-slate-900/60 rounded-3xl border border-slate-200/80 dark:border-white/10 p-6 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    Mesas de Examen & Actas de Acreditación
                  </h1>
                  <p className="text-xs text-text-muted">
                    Registro histórico de exámenes finales y acreditaciones por cohorte.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-stretch sm:self-auto">
              <Link
                to="/guias?section=mesas-examen"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/60 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-700/60 text-text-secondary hover:text-text-primary text-xs font-bold transition-all min-h-[44px] cursor-pointer shrink-0"
                title="Ver Guía de Uso de Mesas de Examen y Actas"
              >
                <BookMarked className="w-4 h-4 text-primary" />
                <span className="hidden xs:inline">Guía Paso a Paso</span>
              </Link>

              <Button
                variant="primary"
                icon={Plus}
                onClick={() => setIsConstituirModalOpen(true)}
                className="text-xs font-bold rounded-2xl min-h-[44px] shadow-sm whitespace-nowrap flex-1 sm:flex-initial"
              >
                + Nueva Mesa de Examen
              </Button>
            </div>
          </div>

          {/* Barra de Filtros Bento */}
          <div className="p-4 rounded-3xl bg-white/75 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              
              {/* Buscador Rápido */}
              <div className="flex-1 min-w-[240px]">
                <ExpandableSearch
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Buscar por cátedra, llamado, número de acta o tribunal..."
                />
              </div>

              {/* Selector Desplegable de Cátedra */}
              <div className="w-full md:w-72">
                <select
                  value={selectedCatedraFilter}
                  onChange={(e) => {
                    setSelectedCatedraFilter(e.target.value);
                    if (e.target.value === 'TODAS') {
                      searchParams.delete('catedraId');
                    } else {
                      searchParams.set('catedraId', e.target.value);
                    }
                    setSearchParams(searchParams);
                  }}
                  className="w-full py-2 px-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-xs font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                >
                  <option value="TODAS">-- Todas las Cátedras ({catedras.length}) --</option>
                  {catedras.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} • ({c.instituciones?.nombre || 'Institución'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Píldoras de Filtro por Condición de Acta */}
            <div className="flex items-center gap-1.5 pt-1 overflow-x-auto scrollbar-none">
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider mr-1 shrink-0">
                Condición:
              </span>

              <button
                type="button"
                onClick={() => setSelectedCondicionFilter('TODAS')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${
                  selectedCondicionFilter === 'TODAS'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'text-text-muted hover:text-text-primary hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
              >
                Todas ({mesas.length})
              </button>

              <button
                type="button"
                onClick={() => setSelectedCondicionFilter('PROMOCIONAL')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedCondicionFilter === 'PROMOCIONAL'
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'text-text-muted hover:text-text-primary hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
              >
                <span>🎖️ Promocionales</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCondicionFilter('REGULAR')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedCondicionFilter === 'REGULAR'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-text-muted hover:text-text-primary hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
              >
                <span>📋 Regulares</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCondicionFilter('LIBRE')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedCondicionFilter === 'LIBRE'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-text-muted hover:text-text-primary hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
              >
                <span>🔓 Libres</span>
              </button>
            </div>
          </div>

          {/* Grilla Bento de Mesas Constituidas */}
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              <span className="text-xs text-text-muted">Cargando mesas examinadoras...</span>
            </div>
          ) : filteredMesas.length === 0 ? (
            searchQuery || selectedCatedraFilter !== 'TODAS' || selectedCondicionFilter !== 'TODAS' ? (
              <EmptyState
                illustration="search"
                title="No se encontraron mesas de examen"
                description="Intenta restableciendo los filtros o buscando con otros términos."
                actionLabel="Restablecer Filtros"
                onAction={() => {
                  setSearchQuery('');
                  setSelectedCatedraFilter('TODAS');
                  setSelectedCondicionFilter('TODAS');
                }}
              />
            ) : (
              <EmptyState
                tipo="mesas"
                actionLabel="+ Nueva Mesa de Examen"
                onAction={() => setIsConstituirModalOpen(true)}
              />
            )
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMesas.map((m) => {
                const cond = (m.condicion_acta || (m.tipo_mesa === 'PROMOCIONAL' ? 'PROMOCIONAL' : 'REGULAR')).toUpperCase();
                const style = CONDICION_BADGE_STYLES[cond] || CONDICION_BADGE_STYLES.REGULAR;
                const catName = m.catedras?.nombre || 'Cátedra';
                const instName = m.catedras?.instituciones?.nombre || 'Instituto de Educación Superior';

                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedMesa(m)}
                    className={`group cursor-pointer backdrop-blur-xl bg-white/75 dark:bg-slate-900/60 rounded-3xl border border-slate-200/80 dark:border-white/10 p-5 shadow-xs hover:shadow-md ${style.cardBorder} transition-all duration-200 flex flex-col justify-between gap-4`}
                  >
                    <div className="space-y-3">
                      {/* Fila 1: Badge Condición y Fecha */}
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${style.badge}`}>
                          {style.label}
                        </span>

                        <span className="text-xs font-mono font-bold text-text-muted flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-primary" />
                          {formatFechaDMY(m.fecha)}
                        </span>
                      </div>

                      {/* Fila 2: Cátedra e Institución */}
                      <div>
                        <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight truncate group-hover:text-primary transition-colors">
                          {catName}
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs text-text-muted truncate mt-0.5">
                          <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span className="truncate">{instName}</span>
                          <span>•</span>
                          <span className="font-semibold text-text-secondary truncate">{m.turno_llamado}</span>
                        </div>
                      </div>

                      {/* Fila 3: Matriz Institucional */}
                      <div className="grid grid-cols-4 gap-1 p-2 bg-slate-100/70 dark:bg-white/[0.03] rounded-xl border border-slate-200/60 dark:border-white/5 text-center text-[10px] font-mono">
                        <div>
                          <span className="text-[9px] uppercase text-text-muted block">Libro</span>
                          <strong className="text-text-primary">{m.libro || '—'}</strong>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase text-text-muted block">Tomo</span>
                          <strong className="text-text-primary">{m.tomo || '—'}</strong>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase text-text-muted block">Folio</span>
                          <strong className="text-text-primary">{m.folio || '—'}</strong>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase text-text-muted block">Acta</span>
                          <strong className="text-text-primary">{m.acta_numero || '—'}</strong>
                        </div>
                      </div>

                      {/* Fila 4: Contador de Estudiantes Evaluados */}
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-white/5 text-xs flex items-center justify-between">
                        <span className="text-text-secondary font-medium">
                          {m.totalAlumnos > 0 ? (
                            <>
                              <b>{m.totalAlumnos}</b> alumnos cargados
                            </>
                          ) : (
                            <span className="text-text-muted">Sin alumnos cargados</span>
                          )}
                        </span>

                        {m.totalAlumnos > 0 && (
                          <div className="flex items-center gap-2 font-mono text-[11px]">
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                              ✓ {m.acreditados}
                            </span>
                            {m.desaprobados > 0 && (
                              <span className="text-rose-600 dark:text-rose-400 font-bold">
                                ✗ {m.desaprobados}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer de Tarjeta */}
                    <div className="pt-3 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setSelectedMesa(m)}
                        className="text-xs font-bold rounded-xl flex-1"
                      >
                        Abrir Planilla de Calificación
                      </Button>

                      <button
                        type="button"
                        onClick={(e) => handleOpenPrintModal(m, e)}
                        className="p-2 text-text-muted hover:text-primary rounded-xl hover:bg-primary/10 transition-colors"
                        title="Imprimir Acta Volante"
                      >
                        <Printer className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleDeleteMesa(m, e)}
                        className="p-2 text-text-muted hover:text-danger rounded-xl hover:bg-danger/10 transition-colors"
                        title="Eliminar Mesa de Examen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          MODAL: CONSTITUIR NUEVA MESA DE EXAMEN
      ========================================================================= */}
      <ConstituirMesaModal
        isOpen={isConstituirModalOpen}
        onClose={() => setIsConstituirModalOpen(false)}
        onMesaCreated={(newMesa) => {
          fetchMesas();
          setSelectedMesa(newMesa);
        }}
        catedras={catedras}
        initialCatedraId={selectedCatedraFilter !== 'TODAS' ? selectedCatedraFilter : null}
      />

      {/* =========================================================================
          MODAL: IMPRESIÓN REGLAMENTARIA DESDE LISTA
      ========================================================================= */}
      {mesaToPrint && (
        <PrintPreviewModal
          isOpen={isPrintModalOpen}
          onClose={() => {
            setIsPrintModalOpen(false);
            setMesaToPrint(null);
          }}
          type="acta-examen"
          title={`Acta Volante de Exámenes — ${mesaToPrint.turno_llamado || 'Examen'}`}
          subtitle="Documento oficial para archivo en Secretaría Académica y Libro Matriz"
          defaultOrientation="portrait"
          data={{
            mesa: mesaToPrint,
            alumnos: JSON.parse(localStorage.getItem(`actas_examen_${mesaToPrint.id}`) || '[]'),
            catedra: mesaToPrint.catedras || { id: mesaToPrint.catedra_id, nombre: 'Cátedra' },
            institucionNombre: mesaToPrint.catedras?.instituciones?.nombre || 'INSTITUTO DE EDUCACIÓN SUPERIOR',
            cicloAnio: activeCiclo?.anio || '2026'
          }}
        />
      )}

    </div>
  );
}
