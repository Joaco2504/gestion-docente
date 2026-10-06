import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  X, 
  User, 
  BookOpen, 
  Calendar, 
  GraduationCap, 
  Building2, 
  Settings, 
  CheckSquare, 
  ArrowRight, 
  CornerDownLeft, 
  Plus, 
  Sparkles,
  Command,
  Compass
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

export default function CommandPalette({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { user, isDemo } = useAuth();
  const { catedras, setOpenNewCatedraModal } = useApp();

  const [query, setQuery] = useState('');
  const [matchedStudents, setMatchedStudents] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Reset al abrir/cerrar
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setMatchedStudents([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Búsqueda de alumnos en Supabase y localStorage
  useEffect(() => {
    const q = query.trim();
    if (!q || q.length < 2) {
      setMatchedStudents([]);
      return;
    }

    let isMounted = true;
    const cleanDni = q.replace(/\D/g, '');

    const runSearch = async () => {
      setIsSearching(true);
      try {
        let found = [];
        if (!isDemo && isSupabaseConfigured && supabase && user?.id) {
          let req = supabase
            .from('estudiantes')
            .select('id, nombre, apellido, dni, catedra_id')
            .limit(8);

          if (cleanDni && cleanDni.length >= 2) {
            req = req.or(`dni.ilike.%${cleanDni}%,nombre.ilike.%${q}%,apellido.ilike.%${q}%`);
          } else {
            req = req.or(`nombre.ilike.%${q}%,apellido.ilike.%${q}%`);
          }

          const { data, error } = await req;
          if (!error && data) {
            found = data;
          }
        }

        // Fallback a localStorage (modo demo o complementario)
        if (found.length === 0) {
          const localList = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('estudiantes_')) {
              try {
                const catIdFromKey = k.replace('estudiantes_', '');
                const parsed = JSON.parse(localStorage.getItem(k) || '[]');
                if (Array.isArray(parsed)) {
                  parsed.forEach(st => {
                    localList.push({ ...st, catedra_id: st.catedra_id || catIdFromKey });
                  });
                }
              } catch (_) {}
            }
          }
          const lowerQ = q.toLowerCase();
          found = localList.filter(s => {
            const fullName = `${s.apellido || ''} ${s.nombre || ''}`.toLowerCase();
            const matchName = fullName.includes(lowerQ);
            const matchDni = cleanDni && String(s.dni || '').replace(/\D/g, '').includes(cleanDni);
            return matchName || matchDni;
          }).slice(0, 8);
        }

        if (isMounted) {
          setMatchedStudents(found);
          setSelectedIndex(0);
        }
      } catch (err) {
        console.warn('[CommandPalette] Error en búsqueda de alumnos:', err);
      } finally {
        if (isMounted) setIsSearching(false);
      }
    };

    const timer = setTimeout(runSearch, 120);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [query, user?.id]);

  // Cátedras filtradas
  const matchedCatedras = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return (catedras || []).slice(0, 5);
    return (catedras || []).filter(c => 
      c.nombre.toLowerCase().includes(q) || 
      (c.institucion_nombre && c.institucion_nombre.toLowerCase().includes(q))
    ).slice(0, 5);
  }, [catedras, query]);

  // Acciones rápidas del sistema
  const quickActions = useMemo(() => {
    const all = [
      {
        id: 'act-dashboard',
        label: 'Ir al Inicio',
        hint: 'Panel principal',
        icon: Compass,
        action: () => navigate('/dashboard')
      },
      {
        id: 'act-calendar',
        label: 'Abrir Calendario Académico',
        hint: 'Horarios y eventos',
        icon: Calendar,
        action: () => navigate('/calendario')
      },
      {
        id: 'act-mesas',
        label: 'Mesas de Examen',
        hint: 'Tribunales y actas',
        icon: GraduationCap,
        action: () => navigate('/mesas-examen')
      },
      {
        id: 'act-new-catedra',
        label: 'Nueva Cátedra',
        hint: 'Crear aula virtual',
        icon: Plus,
        action: () => {
          onClose();
          setOpenNewCatedraModal(true);
        }
      },
      {
        id: 'act-institutions',
        label: 'Instituciones y Sedes',
        hint: 'Organización académica',
        icon: Building2,
        action: () => navigate('/instituciones')
      },
      {
        id: 'act-settings',
        label: 'Configuración de Usuario',
        hint: 'Perfil y preferencias',
        icon: Settings,
        action: () => navigate('/configuracion')
      }
    ];

    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter(a => a.label.toLowerCase().includes(q) || a.hint.toLowerCase().includes(q));
  }, [query, navigate, onClose, setOpenNewCatedraModal]);

  // Lista unificada para selección por teclado
  const totalItems = useMemo(() => {
    const items = [];
    matchedStudents.forEach(st => {
      items.push({
        type: 'student',
        id: `st-${st.id}`,
        title: `${st.apellido || ''} ${st.nombre || ''}`.trim() || 'Estudiante',
        subtitle: st.dni ? `DNI: ${st.dni}` : 'Sin DNI',
        onSelect: () => {
          onClose();
          if (st.catedra_id) {
            navigate(`/catedra/${st.catedra_id}?tab=asistencias&estudianteId=${st.id}`);
          } else {
            navigate('/dashboard');
          }
        }
      });
    });

    matchedCatedras.forEach(cat => {
      items.push({
        type: 'catedra',
        id: `cat-${cat.id}`,
        title: cat.nombre,
        subtitle: cat.institucion_nombre || 'Cátedra Activa',
        color: cat.color,
        onSelect: () => {
          onClose();
          navigate(`/catedra/${cat.id}`);
        }
      });
    });

    quickActions.forEach(act => {
      items.push({
        type: 'action',
        id: act.id,
        title: act.label,
        subtitle: act.hint,
        Icon: act.icon,
        onSelect: () => {
          onClose();
          act.action();
        }
      });
    });

    return items;
  }, [matchedStudents, matchedCatedras, quickActions, navigate, onClose]);

  // Navegación por teclado
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, totalItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + totalItems.length) % Math.max(1, totalItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (totalItems[selectedIndex]) {
        totalItems[selectedIndex].onSelect();
      }
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm animate-in fade-in-0 duration-150" />
        <Dialog.Content 
          className="fixed left-1/2 top-[12%] -translate-x-1/2 z-50 w-[calc(100vw-2rem)] max-w-2xl bg-surface border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden focus:outline-hidden animate-in fade-in-0 zoom-in-95 duration-150 flex flex-col max-h-[75vh]"
          onKeyDown={handleKeyDown}
        >
          {/* Campo de búsqueda */}
          <div className="flex items-center gap-3 px-4 sm:px-5 py-4 border-b border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 shrink-0">
            <Search className="w-5 h-5 text-text-muted shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="Buscar estudiantes (DNI o nombre), cátedras o acciones..."
              className="w-full bg-transparent border-none text-sm sm:text-base font-medium text-text-primary placeholder:text-text-muted focus:outline-hidden"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover"
                aria-label="Borrar búsqueda"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-200/60 dark:bg-slate-800 text-[11px] font-mono font-bold text-text-muted border border-slate-300/40 dark:border-white/5">
              ESC
            </kbd>
          </div>

          {/* Contenedor scrolleable de resultados */}
          <div ref={listRef} className="flex-1 overflow-y-auto p-2 sm:p-3 divide-y divide-slate-100 dark:divide-slate-800/40">
            {isSearching && (
              <div className="p-4 text-center text-xs text-text-muted flex items-center justify-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <span>Buscando coincidencias...</span>
              </div>
            )}

            {totalItems.length === 0 && !isSearching ? (
              <div className="py-12 px-4 text-center">
                <p className="text-sm font-semibold text-text-primary mb-1">
                  Sin resultados
                </p>
                <p className="text-xs text-text-muted max-w-sm mx-auto">
                  No encontramos estudiantes, cátedras ni acciones que coincidan con &ldquo;{query}&rdquo;.
                </p>
              </div>
            ) : (
              <>
                {/* 1. SECCIÓN ESTUDIANTES */}
                {matchedStudents.length > 0 && (
                  <div className="py-2">
                    <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                      Estudiantes encontrados ({matchedStudents.length})
                    </span>
                    <div className="space-y-1 mt-1">
                      {matchedStudents.map((st) => {
                        const globalIdx = totalItems.findIndex(it => it.id === `st-${st.id}`);
                        const isSelected = selectedIndex === globalIdx;
                        return (
                          <div
                            key={st.id}
                            onClick={() => {
                              totalItems[globalIdx]?.onSelect();
                            }}
                            className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors text-xs ${
                              isSelected
                                ? 'bg-primary text-white shadow-xs'
                                : 'hover:bg-surface-hover text-text-primary'
                            }`}
                          >
                            <div className="flex items-center gap-3 truncate">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                isSelected ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'
                              }`}>
                                <User className="w-4 h-4" />
                              </div>
                              <div className="truncate">
                                <p className="font-bold truncate">
                                  {st.apellido}, {st.nombre}
                                </p>
                                <p className={`text-[11px] font-mono ${isSelected ? 'text-white/80' : 'text-text-muted'}`}>
                                  {st.dni ? `DNI: ${st.dni}` : 'Alumno'}
                                </p>
                              </div>
                            </div>
                            <span className={`text-[10px] font-mono ${isSelected ? 'text-white/80' : 'text-text-muted'}`}>
                              Ver legajo →
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. SECCIÓN CÁTEDRAS */}
                {matchedCatedras.length > 0 && (
                  <div className="py-2">
                    <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                      Cátedras
                    </span>
                    <div className="space-y-1 mt-1">
                      {matchedCatedras.map((cat) => {
                        const globalIdx = totalItems.findIndex(it => it.id === `cat-${cat.id}`);
                        const isSelected = selectedIndex === globalIdx;
                        return (
                          <div
                            key={cat.id}
                            onClick={() => {
                              totalItems[globalIdx]?.onSelect();
                            }}
                            className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors text-xs ${
                              isSelected
                                ? 'bg-primary text-white shadow-xs'
                                : 'hover:bg-surface-hover text-text-primary'
                            }`}
                          >
                            <div className="flex items-center gap-3 truncate">
                              <span 
                                className="w-3.5 h-3.5 rounded-full shrink-0 ring-1 ring-black/10 dark:ring-white/20"
                                style={{ backgroundColor: cat.color || '#10B981' }}
                              />
                              <div className="truncate">
                                <p className="font-bold truncate">
                                  {cat.nombre}
                                </p>
                                <p className={`text-[11px] truncate ${isSelected ? 'text-white/80' : 'text-text-muted'}`}>
                                  {cat.institucion_nombre || 'Nivel Superior'}
                                </p>
                              </div>
                            </div>
                            <CornerDownLeft className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-text-muted'}`} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 3. SECCIÓN ACCIONES RÁPIDAS */}
                {quickActions.length > 0 && (
                  <div className="py-2">
                    <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                      Accesos Rápidos
                    </span>
                    <div className="space-y-1 mt-1">
                      {quickActions.map((act) => {
                        const globalIdx = totalItems.findIndex(it => it.id === act.id);
                        const isSelected = selectedIndex === globalIdx;
                        const ActionIcon = act.icon;
                        return (
                          <div
                            key={act.id}
                            onClick={() => {
                              totalItems[globalIdx]?.onSelect();
                            }}
                            className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors text-xs ${
                              isSelected
                                ? 'bg-primary text-white shadow-xs'
                                : 'hover:bg-surface-hover text-text-primary'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-text-muted'
                              }`}>
                                <ActionIcon className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="font-semibold">
                                  {act.label}
                                </p>
                                <p className={`text-[11px] ${isSelected ? 'text-white/80' : 'text-text-muted'}`}>
                                  {act.hint}
                                </p>
                              </div>
                            </div>
                            <CornerDownLeft className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-text-muted'}`} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Pie informativo de atajos */}
          <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-200/70 dark:border-slate-800 text-[11px] text-text-muted flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono font-bold text-[10px]">↑</kbd>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono font-bold text-[10px]">↓</kbd>
                Navegar
              </span>
              <span className="inline-flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono font-bold text-[10px]">↵</kbd>
                Seleccionar
              </span>
            </div>
            <span className="font-mono text-[10px]">Korum ⌘K</span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
