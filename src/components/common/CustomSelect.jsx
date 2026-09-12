import React, { useState, useRef, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search, X } from 'lucide-react';

/**
 * CustomSelect - Selector desplegable animado y accesible para reemplazar <select> nativos.
 * 
 * @param {any} value - Valor seleccionado
 * @param {Function} onChange - Función llamada al seleccionar una opción (recibe el valor o evento sintetizado)
 * @param {Array} options - Array de opciones [{ value, label, icon, badge, description }] o array de strings
 * @param {string} placeholder - Texto por defecto
 * @param {boolean} disabled - Si está deshabilitado
 * @param {string} className - Clases para el contenedor exterior
 * @param {string} buttonClassName - Clases personalizadas para el botón disparador
 * @param {string} menuClassName - Clases para el menú desplegable
 * @param {boolean} searchable - Habilita buscador si hay muchas opciones
 * @param {React.Component} icon - Icono opcional a la izquierda del disparador
 * @param {'left'|'right'} align - Alineación del menú desplegable
 */
export default function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Seleccionar opción...',
  disabled = false,
  className = '',
  buttonClassName = '',
  menuClassName = '',
  searchable = undefined,
  icon: IconComponent = null,
  align = 'left'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  const id = useId();

  // Mobile viewport detection (< 768px)
  const [isMobile, setIsMobile] = useState(() => {
    return typeof window !== 'undefined' ? window.innerWidth < 768 : false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Lock body scroll when mobile bottom sheet is open
  useEffect(() => {
    if (isOpen && isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, isMobile]);

  // Normalizar opciones a formato objeto { value, label, icon, badge }
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === 'object' && opt !== null) {
      return {
        value: opt.value,
        label: opt.label ?? String(opt.value),
        icon: opt.icon,
        badge: opt.badge,
        description: opt.description
      };
    }
    return {
      value: opt,
      label: String(opt)
    };
  });

  // Habilitar búsqueda si se especifica o si hay más de 7 opciones
  const isSearchEnabled = searchable ?? normalizedOptions.length > 7;

  // Opción activa
  const selectedOption = normalizedOptions.find((opt) => String(opt.value) === String(value));

  // Filtrado de opciones
  const filteredOptions = normalizedOptions.filter((opt) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      opt.label.toLowerCase().includes(q) ||
      (opt.description && opt.description.toLowerCase().includes(q))
    );
  });

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearch('');
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setSearch('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Autofocus en el input de búsqueda al abrir
  useEffect(() => {
    if (isOpen && isSearchEnabled && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen, isSearchEnabled]);

  const handleSelect = (optionValue) => {
    if (disabled) return;
    setIsOpen(false);
    setSearch('');
    if (onChange) {
      // Soporta tanto onChange(value) como onChange({ target: { value } })
      onChange({ target: { value: optionValue } });
      if (typeof onChange === 'function') {
        onChange(optionValue);
      }
    }
  };

  return (
    <div ref={containerRef} className={`relative inline-block w-full text-left ${className}`}>
      {/* Botón Disparador */}
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`
          w-full flex items-center justify-between gap-2 px-3 py-2 text-xs sm:text-sm font-medium
          rounded-xl border transition-all duration-150 cursor-pointer select-none
          bg-surface text-text-primary border-surface-border
          hover:bg-surface-hover hover:border-primary/40
          focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary
          disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-surface disabled:hover:border-surface-border
          ${isOpen ? 'ring-2 ring-primary/20 border-primary shadow-xs' : ''}
          ${buttonClassName}
        `}
      >
        <div className="flex items-center gap-2 min-w-0 truncate">
          {IconComponent && (
            <IconComponent className="w-4 h-4 text-primary shrink-0" />
          )}
          {selectedOption?.icon && (
            <selectedOption.icon className="w-4 h-4 text-primary shrink-0" />
          )}
          <span className={`truncate ${!selectedOption ? 'text-text-muted' : ''}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-primary/10 text-primary">
              {selectedOption.badge}
            </span>
          )}
        </div>

        <ChevronDown
          className={`w-4 h-4 text-text-muted shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-primary' : ''
          }`}
        />
      </button>

      {/* Mobile Bottom Sheet Modal via Portal */}
      {isOpen && isMobile && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm animate-fadeIn"
            onClick={() => { setIsOpen(false); setSearch(''); }}
            aria-hidden="true"
          />

          {/* Bottom Sheet Modal */}
          <div
            role="listbox"
            className="relative w-full max-w-lg bg-surface border-t border-surface-border rounded-t-3xl shadow-2xl p-4 pb-6 max-h-[82vh] flex flex-col z-10 animate-slideUp overscroll-contain"
          >
            {/* Mobile Drag Indicator */}
            <div className="w-12 h-1.5 bg-text-muted/30 rounded-full mx-auto mb-3 shrink-0" />

            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-surface-border shrink-0">
              <h4 className="text-sm font-bold text-text-primary truncate">
                {placeholder || 'Seleccionar opción'}
              </h4>
              <button
                type="button"
                onClick={() => { setIsOpen(false); setSearch(''); }}
                className="p-2 -mr-1 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-hover touch-target-44 flex items-center justify-center cursor-pointer"
                title="Cerrar"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search if enabled or > 5 items */}
            {(isSearchEnabled || normalizedOptions.length > 5) && (
              <div className="pt-3 pb-2 shrink-0">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar..."
                    className="w-full pl-9 pr-8 py-2.5 text-sm bg-surface-hover text-text-primary rounded-xl border border-surface-border focus:border-primary focus:outline-none placeholder:text-text-muted"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Options List with comfortable touch targets */}
            <div className="overflow-y-auto py-2 divide-y divide-surface-border/40 flex-1 overscroll-contain scrollbar-thin">
              {filteredOptions.length === 0 ? (
                <div className="py-8 text-center text-text-muted text-sm">
                  No se encontraron opciones
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = String(opt.value) === String(value);
                  const ItemIcon = opt.icon;

                  return (
                    <button
                      key={String(opt.value)}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(opt.value)}
                      className={`w-full flex items-center justify-between gap-3 px-3 py-3.5 text-left rounded-xl transition-colors min-h-[48px] touch-target-48 select-none ${
                        isSelected
                          ? 'bg-primary/10 text-primary font-bold'
                          : 'text-text-primary hover:bg-surface-hover active:bg-surface-hover/80'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {ItemIcon && (
                          <ItemIcon className={`w-5 h-5 shrink-0 ${isSelected ? 'text-primary' : 'text-text-muted'}`} />
                        )}
                        <div className="min-w-0">
                          <div className="text-sm truncate">{opt.label}</div>
                          {opt.description && (
                            <div className="text-xs text-text-muted font-normal truncate mt-0.5">
                              {opt.description}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {opt.badge && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-surface-hover text-text-secondary border border-surface-border">
                            {opt.badge}
                          </span>
                        )}
                        {isSelected && (
                          <Check className="w-5 h-5 text-primary shrink-0 animate-fadeIn" />
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Menú Desplegable Flotante para Pantallas Grandes (Desktop) */}
      {isOpen && !isMobile && (
        <div
          role="listbox"
          className={`
            absolute z-50 mt-1.5 w-full min-w-[200px] max-w-sm
            bg-surface border border-surface-border rounded-2xl shadow-elevated
            py-1.5 overflow-hidden animate-fadeIn backdrop-blur-md
            ${align === 'right' ? 'right-0' : 'left-0'}
            ${menuClassName}
          `}
          style={{ transformOrigin: 'top' }}
        >
          {/* Campo de Búsqueda si hay muchas opciones */}
          {isSearchEnabled && (
            <div className="px-2.5 pb-2 pt-1 border-b border-surface-border">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar..."
                  className="w-full pl-8 pr-7 py-1.5 text-xs bg-surface-hover/80 text-text-primary rounded-lg border border-transparent focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-text-muted"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Lista de Opciones */}
          <div className="max-h-60 overflow-y-auto py-1 scrollbar-thin">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-xs text-center text-text-muted">
                No se encontraron opciones
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                const ItemIcon = opt.icon;

                return (
                  <div
                    key={String(opt.value)}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(opt.value)}
                    className={`
                      w-full flex items-center justify-between gap-2.5 px-3 py-2 text-xs sm:text-sm
                      cursor-pointer transition-colors select-none text-left
                      ${isSelected
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'text-text-primary hover:bg-surface-hover hover:text-text-primary'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {ItemIcon && (
                        <ItemIcon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-primary' : 'text-text-muted'}`} />
                      )}
                      <div className="min-w-0 truncate">
                        <div className="truncate">{opt.label}</div>
                        {opt.description && (
                          <div className="text-[11px] text-text-muted font-normal truncate">
                            {opt.description}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {opt.badge && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-surface-hover text-text-secondary">
                          {opt.badge}
                        </span>
                      )}
                      {isSelected && (
                        <Check className="w-4 h-4 text-primary shrink-0 animate-fadeIn" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
