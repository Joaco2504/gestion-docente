import React from 'react';
import { CreditCard, X } from 'lucide-react';
import './WaveDniInput.css';

/**
 * WaveDniInput - Campo de entrada animado con Floating Label en onda (Wave Animation)
 * e indicador de foco esmeralda con resplandor glow.
 */
export function WaveDniInput({ value, onChange, onKeyDown, autoFocus = true, onClear }) {
  const labelText = "Documento Nacional de Identidad";
  const hasValue = Boolean(value && String(value).trim().length > 0);

  return (
    <div className="wave-dni-group group">
      <div className="wave-dni-icon">
        <CreditCard className="w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
      </div>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        autoFocus={autoFocus}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder=" "
        maxLength={10}
        className={`wave-dni-field font-mono font-bold tracking-widest text-slate-900 dark:text-white ${hasValue ? 'has-value' : ''}`}
      />
      <label className="wave-dni-floating-label">
        {labelText.split('').map((char, index) => (
          <span
            key={index}
            style={{ transitionDelay: `${index * 25}ms` }}
            className="text-slate-400 dark:text-slate-500 font-mono text-xs uppercase"
          >
            {char === ' ' ? '\u00A0' : char}
          </span>
        ))}
      </label>
      <div className="wave-dni-glow-line" />

      {/* Botón opcional para limpiar el campo */}
      {hasValue && onClear && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-0 top-3 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          title="Limpiar"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export default WaveDniInput;
