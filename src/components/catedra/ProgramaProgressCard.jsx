import React, { useState, useEffect, useMemo } from 'react';
import { Layers, ChevronRight, BookOpen, Clock, Sparkles, AlertCircle } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { formatFechaDMY } from '../../lib/dateUtils';

export default function ProgramaProgressCard({
  catedraId,
  onSelectTab,
  clasesProp = null,
  unidadesProp = null
}) {
  const { isDemo } = useAuth();

  const [unidades, setUnidades] = useState(unidadesProp || []);
  const [clases, setClases] = useState(clasesProp || []);
  const [loading, setLoading] = useState(!unidadesProp || !clasesProp);

  useEffect(() => {
    if (unidadesProp) setUnidades(unidadesProp);
    if (clasesProp) setClases(clasesProp);
  }, [unidadesProp, clasesProp]);

  useEffect(() => {
    if (!unidadesProp || !clasesProp) {
      loadCardData();
    }
  }, [catedraId]);

  async function loadCardData() {
    if (!catedraId) return;
    try {
      // 1. Cargar unidades
      let loadedU = [];
      if (isSupabaseConfigured && !isDemo) {
        const { data, error } = await supabase
          .from('unidades_tematicas')
          .select('*')
          .eq('catedra_id', catedraId)
          .order('numero', { ascending: true });
        if (!error && data) loadedU = data;
        else {
          const stored = localStorage.getItem(`unidades_tematicas_${catedraId}`);
          if (stored) try { loadedU = JSON.parse(stored); } catch (e) {}
        }
      } else {
        const stored = localStorage.getItem(`unidades_tematicas_${catedraId}`);
        if (stored) try { loadedU = JSON.parse(stored); } catch (e) {}
      }
      setUnidades(loadedU);

      // 2. Cargar clases
      let loadedC = [];
      if (isSupabaseConfigured && !isDemo) {
        const { data, error } = await supabase
          .from('clases')
          .select('*')
          .eq('catedra_id', catedraId)
          .order('fecha', { ascending: true });
        if (!error && data) loadedC = data;
        else {
          const stored = localStorage.getItem(`clases_${catedraId}`);
          if (stored) try { loadedC = JSON.parse(stored); } catch (e) {}
        }
      } else {
        const stored = localStorage.getItem(`clases_${catedraId}`);
        if (stored) try { loadedC = JSON.parse(stored); } catch (e) {}
      }
      setClases(loadedC);
    } catch (err) {
      console.warn('Error loading ProgramaProgressCard data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Cálculo de unidad actualmente en dictado según la última clase registrada cronológicamente
  const currentUnitInfo = useMemo(() => {
    if (!clases.length || !unidades.length) return null;

    // Orden cronológico inverso (última clase registrada primero)
    const sortedDesc = [...clases].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    const lastClassWithUnit = sortedDesc.find(c => Boolean(c.unidad_id));

    if (!lastClassWithUnit) return null;

    const matchedUnit = unidades.find(u => u.id === lastClassWithUnit.unidad_id);
    if (!matchedUnit) return null;

    return {
      unidad: matchedUnit,
      lastClass: lastClassWithUnit
    };
  }, [clases, unidades]);

  // Unidades abordadas (con al menos una clase dictada)
  const coveredUnitsCount = useMemo(() => {
    if (!unidades.length || !clases.length) return 0;
    return unidades.filter(u => clases.some(c => c.unidad_id === u.id)).length;
  }, [unidades, clases]);

  const progressPercentage = useMemo(() => {
    if (!unidades.length) return 0;
    return Math.min(100, Math.round((coveredUnitsCount / unidades.length) * 100));
  }, [coveredUnitsCount, unidades.length]);

  return (
    <div className="backdrop-blur-xl bg-white/80 dark:bg-slate-900/60 rounded-3xl border border-slate-200/80 dark:border-white/10 p-4 sm:p-5 shadow-xs hover:border-indigo-500/30 transition-all duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        
        {/* Lado Izquierdo: Icono + Título + Estado de Dictado */}
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20 shadow-xs">
            <Layers className="w-5 h-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted">
                Avance del Programa Didáctico
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.2 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/40">
                {unidades.length} {unidades.length === 1 ? 'Unidad' : 'Unidades'}
              </span>
            </div>

            <div className="mt-0.5">
              {currentUnitInfo ? (
                <div className="flex items-center gap-2 truncate">
                  <span className="text-xs font-bold text-text-primary truncate">
                    Dictando: <strong className="text-indigo-600 dark:text-indigo-400">Unidad {currentUnitInfo.unidad.numero}</strong> — {currentUnitInfo.unidad.titulo}
                  </span>
                </div>
              ) : unidades.length > 0 ? (
                <span className="text-xs font-medium text-text-muted">
                  Programa cargado • Aún no se han asociado clases a las unidades
                </span>
              ) : (
                <span className="text-xs font-medium text-text-muted">
                  Sin unidades definidas en el programa de cátedra
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Lado Derecho: Progreso y Botón de Navegación */}
        <div className="flex items-center gap-3 sm:gap-4 self-stretch sm:self-auto justify-between sm:justify-end shrink-0 border-t sm:border-t-0 pt-2.5 sm:pt-0 border-surface-border">
          <div className="text-left sm:text-right">
            <div className="flex items-center gap-1.5 sm:justify-end">
              <span className="text-xs font-mono font-bold text-text-primary">
                {coveredUnitsCount} de {unidades.length}
              </span>
              <span className="text-[11px] text-text-muted">
                ({progressPercentage}%)
              </span>
            </div>
            {/* Barra de progreso miniatura */}
            <div className="w-24 sm:w-28 h-1.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden mt-1">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-primary rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {onSelectTab && (
            <button
              type="button"
              onClick={() => onSelectTab('unidades')}
              className="px-3 py-1.5 rounded-xl bg-surface-hover hover:bg-surface-border/50 text-text-primary text-xs font-semibold flex items-center gap-1 transition-all touch-target-44 cursor-pointer border border-surface-border shadow-xs hover:border-indigo-500/40"
              title="Abrir el gestor de unidades del programa"
            >
              <span>{unidades.length > 0 ? 'Programa' : '+ Unidades'}</span>
              <ChevronRight className="w-3.5 h-3.5 text-primary" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
