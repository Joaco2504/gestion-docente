import React, { createContext, useContext, useState, useEffect } from 'react';

export const PALETTES = {
  'azul-francia': {
    id: 'azul-francia',
    name: 'Azul Francia',
    description: 'Elegante, académico y sobrio (Predeterminado)',
    primary: '#1a56db',
    primaryHover: '#1e429f',
    primaryLight: '#ebf5ff',
    primaryMuted: '#d0e1fd',
    rgb: '26 86 219',
    hoverRgb: '30 66 159',
    previewHex: '#1a56db',
    badgeClass: 'bg-[#1a56db] text-white'
  },
  'indigo': {
    id: 'indigo',
    name: 'Índigo Real',
    description: 'Vibrante y moderno',
    primary: '#4f46e5',
    primaryHover: '#4338ca',
    primaryLight: '#eef2ff',
    primaryMuted: '#c7d2fe',
    rgb: '79 70 229',
    hoverRgb: '67 56 202',
    previewHex: '#4f46e5',
    badgeClass: 'bg-[#4f46e5] text-white'
  },
  'esmeralda': {
    id: 'esmeralda',
    name: 'Verde Esmeralda',
    description: 'Fresco y armónico',
    primary: '#059669',
    primaryHover: '#047857',
    primaryLight: '#ecfdf5',
    primaryMuted: '#a7f3d0',
    rgb: '5 150 105',
    hoverRgb: '4 120 87',
    previewHex: '#059669',
    badgeClass: 'bg-[#059669] text-white'
  },
  'purpura': {
    id: 'purpura',
    name: 'Púrpura Académico',
    description: 'Distintivo y creativo',
    primary: '#7c3aed',
    primaryHover: '#6d28d9',
    primaryLight: '#f5f3ff',
    primaryMuted: '#ddd6fe',
    rgb: '124 58 237',
    hoverRgb: '109 40 217',
    previewHex: '#7c3aed',
    badgeClass: 'bg-[#7c3aed] text-white'
  },
  'pizarra': {
    id: 'pizarra',
    name: 'Pizarra Grafito',
    description: 'Minimalista y neutro de alto contraste',
    primary: '#334155',
    primaryHover: '#1e293b',
    primaryLight: '#f1f5f9',
    primaryMuted: '#cbd5e1',
    rgb: '51 65 85',
    hoverRgb: '30 41 59',
    previewHex: '#334155',
    badgeClass: 'bg-[#334155] text-white'
  }
};

const ThemeContext = createContext({
  theme: 'system',
  setTheme: () => {},
  isDark: false,
  toggleTheme: () => {},
  colorPalette: 'azul-francia',
  setColorPalette: () => {},
  currentPalette: PALETTES['azul-francia'],
  palettes: PALETTES
});

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }) {
  // Theme Mode: 'light' | 'dark' | 'system'
  const [theme, setThemeState] = useState(() => {
    try {
      const saved = localStorage.getItem('docentepro_theme');
      return saved || 'system';
    } catch {
      return 'system';
    }
  });

  // Color Palette: 'azul-francia' | 'indigo' | 'esmeralda' | 'purpura' | 'pizarra'
  const [colorPalette, setColorPaletteState] = useState(() => {
    try {
      const saved = localStorage.getItem('docentepro_color_palette');
      return saved && PALETTES[saved] ? saved : 'azul-francia';
    } catch {
      return 'azul-francia';
    }
  });

  const [isDark, setIsDark] = useState(false);

  // Apply theme mode (dark class on <html>)
  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      let resolvedDark = false;

      if (theme === 'system') {
        resolvedDark = mediaQuery.matches;
      } else {
        resolvedDark = theme === 'dark';
      }

      setIsDark(resolvedDark);

      if (resolvedDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyTheme();

    const handleMediaChange = () => {
      if (theme === 'system') {
        applyTheme();
      }
    };

    mediaQuery.addEventListener('change', handleMediaChange);
    return () => mediaQuery.removeEventListener('change', handleMediaChange);
  }, [theme]);

  // Apply color palette CSS variables
  useEffect(() => {
    const root = document.documentElement;
    const pal = PALETTES[colorPalette] || PALETTES['azul-francia'];

    root.style.setProperty('--color-primary-rgb', pal.rgb);
    root.style.setProperty('--color-primary-hover-rgb', pal.hoverRgb);
    root.style.setProperty('--color-primary-light', pal.primaryLight);
    root.style.setProperty('--color-primary-muted', pal.primaryMuted);
  }, [colorPalette]);

  const setTheme = (newTheme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('docentepro_theme', newTheme);
    } catch (e) {
      console.warn('Could not save theme to localStorage:', e);
    }
  };

  const setColorPalette = (newPaletteId) => {
    if (PALETTES[newPaletteId]) {
      setColorPaletteState(newPaletteId);
      try {
        localStorage.setItem('docentepro_color_palette', newPaletteId);
      } catch (e) {
        console.warn('Could not save color palette to localStorage:', e);
      }
    }
  };

  const toggleTheme = () => {
    if (theme === 'system') {
      setTheme(isDark ? 'light' : 'dark');
    } else if (theme === 'dark') {
      setTheme('light');
    } else {
      setTheme('dark');
    }
  };

  const currentPalette = PALETTES[colorPalette] || PALETTES['azul-francia'];

  return (
    <ThemeContext.Provider value={{
      theme,
      setTheme,
      isDark,
      toggleTheme,
      colorPalette,
      setColorPalette,
      currentPalette,
      palettes: PALETTES
    }}>
      {children}
    </ThemeContext.Provider>
  );
}
