import React, { useRef } from 'react';
import { Search } from 'lucide-react';
import './AnimatedSearchBar.css';

export function AnimatedSearchBar({ value, onChange, placeholder = "Buscar...", className = "" }) {
  const inputRef = useRef(null);
  const hasValue = Boolean(value && value.length > 0);

  return (
    <div className={`korum-search-wrapper group ${className}`}>
      <button 
        type="button" 
        className="korum-search-icon" 
        onClick={() => inputRef.current?.focus()}
        title="Buscar"
      >
        <Search className={`w-4 h-4 transition-colors duration-200 ${hasValue ? 'text-emerald-600 dark:text-emerald-400' : 'text-white group-focus-within:text-emerald-600 dark:group-focus-within:text-emerald-400'}`}/>
      </button>
      <input 
        ref={inputRef}
        type="text" 
        value={value} 
        onChange={onChange} 
        className="korum-search-input text-slate-800 dark:text-slate-100 placeholder:text-slate-400" 
        placeholder={placeholder} 
      />
    </div>
  );
}

export default AnimatedSearchBar;
