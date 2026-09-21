import React from 'react';
import './WaveDniInput.css';

export function WaveDniInput({ value, onChange, onKeyDown, autoFocus = true, onClear }) {
  const labelText = "Documento Nacional de Identidad";
  const hasValue = Boolean(value && String(value).trim().length > 0);

  return (
    <div className="wave-dni-container">
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        autoFocus={autoFocus}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder=" "
        className={`wave-dni-input font-mono text-xl sm:text-2xl tracking-[0.25em] text-slate-900 dark:text-slate-100 ${hasValue ? 'has-value' : ''}`}
        maxLength={10}
      />
      <label className="wave-dni-label">
        {labelText.split('').map((char, index) => (
          <span
            key={index}
            style={{ transitionDelay: `${index * 25}ms` }}
            className="text-slate-400 dark:text-slate-500 font-mono text-xs sm:text-sm uppercase tracking-wider"
          >
            {char === ' ' ? '\u00A0' : char}
          </span>
        ))}
      </label>
      {/* Línea de acento esmeralda animada en foco */}
      <span className="wave-dni-bar" />

      {/* Botón opcional para limpiar */}
      {hasValue && onClear && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-0 top-3 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          title="Limpiar"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      )}
    </div>
  );
}

export default WaveDniInput;
