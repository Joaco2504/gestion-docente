import React from 'react';
import './WaveAnimatedInput.css';

export function WaveAnimatedInput({ 
  label, 
  type = 'text', 
  value, 
  onChange, 
  required = true, 
  name,
  minLength,
  placeholder = ' '
}) {
  const letters = label.split('');

  return (
    <div className="wave-form-control">
      <input 
        type={type} 
        name={name}
        required={required} 
        value={value} 
        onChange={onChange} 
        autoComplete="off"
        minLength={minLength}
        placeholder={placeholder}
        className="wave-input text-slate-900 dark:text-slate-100"
      />
      <label className="wave-label">
        {letters.map((char, index) => (
          <span 
            key={index} 
            style={{ transitionDelay: `${index * 40}ms` }}
            className="text-slate-400 dark:text-slate-500"
          >
            {char === ' ' ? '\u00A0' : char}
          </span>
        ))}
      </label>
    </div>
  );
}

export default WaveAnimatedInput;
