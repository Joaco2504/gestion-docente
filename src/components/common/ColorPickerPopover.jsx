import React, { useState, useRef, useEffect } from 'react';
import { 
  Check, 
  RotateCcw, 
  Sparkles, 
  Palette, 
  ShieldCheck, 
  GraduationCap, 
  BookOpen,
  X
} from 'lucide-react';
import { 
  CATEDRA_PALETTE, 
  COLOR_NAMES, 
  getContrastTextColor, 
  hexToRgba, 
  isColorLight 
} from '../../lib/colorTokens';

/**
 * ColorPickerPopover - Selector de color accesible con paleta curada, input HEX,
 * cálculo automático de contraste WCAG AA y previsualización en vivo de chip.
 * 
 * @param {string} color - Color actual en formato HEX (ej: '#10B981')
 * @param {Function} onChange - Callback al seleccionar o tipear nuevo color (hex)
 * @param {string} defaultColor - Color para el botón "Restaurar por defecto"
 * @param {string} title - Título del popover (ej: "Color de Cátedra" o "Color de Mesa")
 * @param {string} previewLabel - Texto de muestra en el chip (ej: "Programación II")
 * @param {boolean} isMesa - Si es verdadero, previsualiza con la estética de Mesa de Examen
 * @param {string} catedraColor - Color de la cátedra asociada (para indicador de mesa)
 */
export default function ColorPickerPopover({
  color = '#10B981',
  onChange,
  defaultColor = '#10B981',
  title = 'Personalizar Color',
  previewLabel = 'Vista Previa del Chip',
  isMesa = false,
  catedraColor = null,
  palette = CATEDRA_PALETTE,
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [hexInput, setHexInput] = useState(color || defaultColor);
  const popoverRef = useRef(null);
  const triggerRef = useRef(null);

  // Sincronizar input cuando cambia la prop color externa
  useEffect(() => {
    if (color) {
      setHexInput(color.toUpperCase());
    }
  }, [color]);

  // Manejo de clic afuera y tecla Escape
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e) {
      if (
        popoverRef.current && 
        !popoverRef.current.contains(e.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const currentColor = color || defaultColor;
  const contrastText = getContrastTextColor(currentColor);
  const isLight = isColorLight(currentColor);

  const handleSelectPalette = (c) => {
    setHexInput(c.toUpperCase());
    if (onChange) onChange(c);
  };

  const handleHexInputChange = (e) => {
    let val = e.target.value.trim().toUpperCase();
    if (!val.startsWith('#')) {
      val = '#' + val;
    }
    setHexInput(val);
    if (/^#[0-9A-F]{6}$/i.test(val)) {
      if (onChange) onChange(val);
    }
  };

  const handleResetDefault = () => {
    setHexInput(defaultColor.toUpperCase());
    if (onChange) onChange(defaultColor);
  };

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Botón Disparador (Trigger) */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={`${title}: actual ${currentColor}`}
        title={`${title} (Clic para modificar)`}
        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-surface-border bg-surface hover:bg-surface-hover text-xs font-semibold text-text-primary transition-[transform,background-color,border-color,box-shadow] duration-150 shadow-xs cursor-pointer min-h-[44px] touch-target-44 active:scale-98"
      >
        <span 
          className="w-5 h-5 rounded-lg border border-black/15 dark:border-white/20 shrink-0 shadow-xs flex items-center justify-center transition-transform"
          style={{ backgroundColor: currentColor }}
        >
          <span 
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: contrastText }}
          />
        </span>
        <span className="font-mono text-xs">{currentColor}</span>
        <Palette className="w-3.5 h-3.5 text-text-muted ml-0.5" />
      </button>

      {/* Popover Flotante */}
      {isOpen && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label={title}
          className="absolute z-50 left-0 sm:left-auto sm:right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl animate-scaleIn space-y-4"
        >
          {/* Cabecera del Popover */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-2">
              <span 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: currentColor }}
              />
              <span className="text-xs font-bold text-text-primary">{title}</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Cerrar selector de color"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Previsualización en Vivo del Chip de Calendario */}
          <div>
            <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block mb-1.5">
              Vista Previa en Calendario
            </span>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/80 space-y-2">
              {/* Chip en Modo Sol */}
              <div 
                className={`p-2.5 rounded-xl transition-colors duration-150 flex items-center justify-between gap-2 ${
                  isMesa 
                    ? 'border-2 border-dashed shadow-xs' 
                    : 'border-l-4 shadow-2xs'
                }`}
                style={{
                  backgroundColor: hexToRgba(currentColor, 0.15),
                  borderColor: currentColor,
                  color: isLight ? '#0F172A' : currentColor
                }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {isMesa ? (
                    <GraduationCap className="w-4 h-4 shrink-0" style={{ color: currentColor }} />
                  ) : (
                    <BookOpen className="w-4 h-4 shrink-0" style={{ color: currentColor }} />
                  )}
                  <span className="text-xs font-bold truncate">
                    {previewLabel}
                  </span>
                </div>

                {/* Si es mesa, muestra el dot del color de la cátedra */}
                {isMesa && catedraColor && (
                  <span 
                    className="w-3 h-3 rounded-full shrink-0 border-2 border-white dark:border-slate-900 shadow-xs"
                    style={{ backgroundColor: catedraColor }}
                    title="Color de la Cátedra correspondiente"
                  />
                )}
              </div>

              {/* Indicador de contraste WCAG AA */}
              <div className="flex items-center justify-between text-[10px] text-text-muted pt-1 px-1">
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Contraste AA: {contrastText === '#FFFFFF' ? 'Texto Claro' : 'Texto Oscuro'}</span>
                </span>
                <span className="font-mono text-slate-400">Luminancia: {isLight ? 'Alta' : 'Profunda'}</span>
              </div>
            </div>
          </div>

          {/* Grilla de Paleta Curada */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                Paleta Curada Korum
              </span>
              <span className="text-[10px] font-mono text-text-muted">
                {palette.length} tonos
              </span>
            </div>

            <div className="grid grid-cols-6 gap-2">
              {palette.map((palColor) => {
                const isSelected = currentColor.toUpperCase() === palColor.toUpperCase();
                const iconColor = getContrastTextColor(palColor);
                const colorName = COLOR_NAMES[palColor.toUpperCase()] || palColor;

                return (
                  <button
                    key={palColor}
                    type="button"
                    onClick={() => handleSelectPalette(palColor)}
                    title={colorName}
                    aria-label={`Seleccionar color ${colorName} (${palColor})`}
                    className={`relative w-9 h-9 rounded-xl transition-[transform,border-color,box-shadow] duration-150 cursor-pointer flex items-center justify-center [@media(hover:hover)]:hover:scale-110 active:scale-95 shadow-xs border ${
                      isSelected 
                        ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-slate-900 border-white/40' 
                        : 'border-black/10 dark:border-white/10 hover:border-black/30'
                    }`}
                    style={{ backgroundColor: palColor }}
                  >
                    {isSelected && (
                      <Check className="w-4 h-4" style={{ color: iconColor }} strokeWidth={3} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Input HEX Manual y Botón Restaurar */}
          <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-text-muted select-none">
                  HEX
                </span>
                <input
                  type="text"
                  maxLength={7}
                  value={hexInput}
                  onChange={handleHexInputChange}
                  aria-label="Código hexadecimal de color"
                  placeholder="#10B981"
                  className="w-full pl-11 pr-3 py-2 rounded-xl border border-surface-border bg-surface text-text-primary font-mono text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
                />
              </div>

              {/* Botón Restaurar Color por Defecto */}
              <button
                type="button"
                onClick={handleResetDefault}
                className="px-3 py-2 rounded-xl border border-surface-border hover:bg-surface-hover text-text-secondary hover:text-text-primary text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer min-h-[44px] touch-target-44 shrink-0"
                title={`Restaurar color por defecto (${defaultColor})`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Defecto</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
