import React, { useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

/**
 * ExpandableSearch - Barra de búsqueda interactiva con animación fluida de expansión.
 * Pasa de botón circular compacto (w-11 h-11) a cápsula horizontal completa (w-64 md:w-72).
 *
 * @param {string} value - Valor del texto de búsqueda
 * @param {function} onChange - Handler de cambio en el input
 * @param {function} onClear - Handler opcional para limpiar el campo
 * @param {string} placeholder - Texto descriptivo del placeholder
 * @param {string} className - Clases adicionales para el contenedor
 * @param {string} widthClass - Ancho cuando está expandido (default 'w-64 md:w-72')
 */
export default function ExpandableSearch({
  value = '',
  onChange,
  onClear,
  placeholder = 'Buscar...',
  className = '',
  widthClass = 'w-64 md:w-72'
}) {
  const inputRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const hasValue = Boolean(value && String(value).length > 0);
  const isExpanded = isFocused || isHovered || hasValue;

  const handleContainerClick = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleClear = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onClear) {
      onClear();
    } else if (onChange) {
      onChange({ target: { value: '' } });
    }
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div
      onClick={handleContainerClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group relative h-11 rounded-full flex items-center shadow-xs cursor-text select-none transition-all duration-300 ease-in-out border ${
        isExpanded ? `${widthClass} px-3.5` : 'w-11 justify-center p-2.5'
      } bg-slate-100/90 text-slate-800 border-slate-200 dark:bg-slate-800/80 dark:text-slate-200 dark:border-white/10 focus-within:bg-indigo-600 focus-within:text-white focus-within:border-transparent focus-within:shadow-md focus-within:shadow-indigo-500/25 ${className}`}
    >
      {/* Icono de Lupa: Se mantiene siempre visible y alineado */}
      <Search
        className={`w-4 h-4 shrink-0 transition-colors duration-300 ${
          isFocused
            ? 'text-white'
            : 'text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
        }`}
      />

      {/* Input de búsqueda interior: Aparece suavemente al expandirse */}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={isExpanded ? placeholder : ''}
        aria-label={placeholder}
        className={`w-full bg-transparent border-none outline-none text-xs sm:text-sm font-medium transition-all duration-300 ease-in-out ml-2.5 ${
          isExpanded
            ? 'opacity-100 max-w-full pointer-events-auto'
            : 'opacity-0 max-w-0 pointer-events-none p-0 m-0'
        } ${
          isFocused
            ? 'text-white placeholder:text-indigo-200'
            : 'text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500'
        }`}
      />

      {/* Botón para limpiar campo con icono X */}
      {isExpanded && hasValue && (
        <button
          type="button"
          onClick={handleClear}
          title="Limpiar búsqueda"
          className={`p-1 rounded-full shrink-0 transition-all duration-200 active:scale-90 cursor-pointer ${
            isFocused
              ? 'text-white/80 hover:text-white hover:bg-white/20'
              : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
          }`}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
