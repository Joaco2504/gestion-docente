/**
 * Paleta canónica de tokens de diseño y colores para gráficos en Korum.
 * Alineada con las pautas de accesibilidad WCAG 2.1 AA y el Design System del proyecto.
 */

export const CHART_PALETTE = {
  // Estados académicos
  promocion: '#10b981',    // Emerald 500
  regular: '#0284c7',      // Sky 600
  recuperatorio: '#f59e0b',// Amber 500
  libre: '#ef4444',        // Rose 500

  // Jerarquía y temas
  primary: '#3b82f6',      // Blue 500
  secondary: '#8b5cf6',    // Violet 500
  accent: '#06b6d4',       // Cyan 500
  neutral: '#64748b',      // Slate 500

  // Ejes y grillas
  gridLight: '#e2e8f0',    // Slate 200
  gridDark: 'rgba(255, 255, 255, 0.08)',
  textLight: '#64748b',    // Slate 500
  textDark: '#94a3b8',     // Slate 400

  // Secuencia de colores para series categóricas
  series: [
    '#3b82f6', // Blue
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#8b5cf6', // Violet
    '#06b6d4', // Cyan
    '#ef4444', // Rose
    '#ec4899', // Pink
  ]
} as const;

/**
 * Resuelve el color accesible correspondiente a una etiqueta de datos
 */
export function resolveColorForLabel(label: string, defaultColor?: string, index: number = 0): string {
  if (defaultColor && defaultColor.startsWith('#')) return defaultColor;
  
  const lower = (label || '').toLowerCase();
  if (lower.includes('promo')) return CHART_PALETTE.promocion;
  if (lower.includes('regu')) return CHART_PALETTE.regular;
  if (lower.includes('recup') || lower.includes('obser')) return CHART_PALETTE.recuperatorio;
  if (lower.includes('libre') || lower.includes('crit') || lower.includes('desap')) return CHART_PALETTE.libre;
  if (lower.includes('aprob')) return CHART_PALETTE.promocion;
  if (lower.includes('ausent')) return CHART_PALETTE.neutral;

  return CHART_PALETTE.series[index % CHART_PALETTE.series.length];
}
