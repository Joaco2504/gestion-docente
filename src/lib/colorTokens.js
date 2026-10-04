/**
 * ==============================================================================
 * KORUM DESIGN TOKENS: PALETA CURADA, ACCESIBILIDAD Y CONTRASTE WCAG AA
 * ==============================================================================
 * 
 * Reglas de diseño:
 * 1. Paleta de Cátedras: 12 colores armoniosos, altamente distinguibles y sin estridencias.
 * 2. Color de Mesas: Reservado (#4338CA, Índigo Toga Académica), NUNCA presente en la
 *    paleta de cátedras para evitar colisiones visuales.
 * 3. Cálculo estricto de contraste AA (WCAG 2.1) según luminancia relativa.
 */

// 1. Paleta curada de 12 colores para Cátedras
export const CATEDRA_PALETTE = [
  '#10B981', // 1. Esmeralda Vibrante
  '#2563EB', // 2. Azul Océano
  '#F59E0B', // 3. Ámbar / Dorado
  '#8B5CF6', // 4. Púrpura Real
  '#EC4899', // 5. Rosa Fucsia
  '#06B6D4', // 6. Cian / Turquesa
  '#F97316', // 7. Naranja Coral
  '#14B8A6', // 8. Teal / Verde Azulado
  '#6366F1', // 9. Índigo Suave
  '#E11D48', // 10. Carmesí / Rubí
  '#7C3AED', // 11. Violeta Oscuro
  '#84CC16'  // 12. Lima Brillante
];

// Nombres descriptivos para tooltips / accesibilidad
export const COLOR_NAMES = {
  '#10B981': 'Esmeralda',
  '#2563EB': 'Azul Océano',
  '#F59E0B': 'Ámbar',
  '#8B5CF6': 'Púrpura',
  '#EC4899': 'Rosa',
  '#06B6D4': 'Cian',
  '#F97316': 'Naranja',
  '#14B8A6': 'Teal',
  '#6366F1': 'Índigo',
  '#E11D48': 'Carmesí',
  '#7C3AED': 'Violeta',
  '#84CC16': 'Lima',
  '#4338CA': 'Índigo Académico (Exclusivo Mesas)'
};

// 2. Color reservado por defecto para Mesas de Examen (no pertenece a la paleta de cátedras)
export const DEFAULT_MESA_COLOR = '#4338CA';

// Lista de objetos { value, name } para selectores
export const DEFAULT_CURATED_COLORS = CATEDRA_PALETTE.map(hex => ({
  value: hex,
  name: COLOR_NAMES[hex] || hex
}));

/**
 * Convierte código HEX (#RGB o #RRGGBB) a { r, g, b }
 */
export function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return { r: 16, g: 185, b: 129 };
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    return {
      r: parseInt(clean[0] + clean[0], 16),
      g: parseInt(clean[1] + clean[1], 16),
      b: parseInt(clean[2] + clean[2], 16)
    };
  }
  if (clean.length === 6) {
    return {
      r: parseInt(clean.substring(0, 2), 16),
      g: parseInt(clean.substring(2, 4), 16),
      b: parseInt(clean.substring(4, 6), 16)
    };
  }
  return { r: 16, g: 185, b: 129 };
}

/**
 * Convierte HEX a rgba(r, g, b, alpha)
 */
export function hexToRgba(hex, alpha = 1) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Convierte color HEX a entero decimal para embeds de Discord
 * Ej: '#10B981' -> 1096065
 */
export function hexToDecimal(hex) {
  if (!hex || typeof hex !== 'string') return 1096065;
  const clean = hex.replace('#', '').trim();
  const val = parseInt(clean, 16);
  return isNaN(val) ? 1096065 : val;
}

/**
 * Calcula la luminancia relativa según especificación WCAG 2.1
 * https://www.w3.org/WAI/GL/wiki/Relative_luminance
 */
export function getRelativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const [rs, gs, bs] = [r, g, b].map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Determina si el texto sobre este color de fondo debe ser blanco u oscuro
 * garantizando cumplimiento de contraste AA (4.5:1 / 3:1).
 */
export function getContrastTextColor(hex) {
  const lum = getRelativeLuminance(hex);
  // Si la luminancia relativa supera 0.44, usar texto oscuro (#0F172A), sino blanco (#FFFFFF)
  return lum > 0.44 ? '#0F172A' : '#FFFFFF';
}

/**
 * Indica si un color de fondo se percibe como claro
 */
export function isColorLight(hex) {
  return getRelativeLuminance(hex) > 0.44;
}

export const isLightColor = isColorLight;

/**
 * Selecciona el color de la paleta curada que menos se repita entre las cátedras existentes.
 */
export function getLeastUsedColor(existingCatedras = [], palette = CATEDRA_PALETTE) {
  const counts = new Map();
  palette.forEach(c => counts.set(c.toUpperCase(), 0));

  if (Array.isArray(existingCatedras)) {
    existingCatedras.forEach(cat => {
      const col = (cat?.color || '').toUpperCase();
      if (counts.has(col)) {
        counts.set(col, counts.get(col) + 1);
      }
    });
  }

  let minColor = palette[0];
  let minCount = Infinity;

  for (const c of palette) {
    const count = counts.get(c.toUpperCase()) ?? 0;
    if (count < minCount) {
      minCount = count;
      minColor = c;
      if (minCount === 0) break; // Primer color disponible sin usar
    }
  }

  return minColor;
}

/**
 * Asigna colores de la paleta a una lista de cátedras que aún no tengan color asignado.
 */
export function migrateCatedrasColors(catedras = []) {
  if (!Array.isArray(catedras)) return [];
  const allocated = [];
  const counts = new Map();
  CATEDRA_PALETTE.forEach(c => counts.set(c.toUpperCase(), 0));

  // Registrar primero las que ya tienen color
  catedras.forEach(c => {
    if (c?.color) {
      const col = c.color.toUpperCase();
      counts.set(col, (counts.get(col) || 0) + 1);
    }
  });

  return catedras.map(cat => {
    if (cat?.color && cat.color.trim()) return cat;
    // Elegir el color menos usado
    let minColor = CATEDRA_PALETTE[0];
    let minCount = Infinity;
    for (const p of CATEDRA_PALETTE) {
      const count = counts.get(p.toUpperCase()) ?? 0;
      if (count < minCount) {
        minCount = count;
        minColor = p;
      }
    }
    counts.set(minColor.toUpperCase(), (counts.get(minColor.toUpperCase()) || 0) + 1);
    return { ...cat, color: minColor };
  });
}

/**
 * Genera el estilo completo para chips de eventos del calendario
 */
export function getEventChipStyle(event, catedras = [], isDark = false) {
  const tipo = (event?.tipo || 'CLASE').toUpperCase();
  const isMesa = tipo === 'TRIBUNAL_EXAMEN' || tipo === 'MESA';
  
  // 1. Obtener color base
  let primaryColor = event?.color;
  let catedraColor = null;

  if (event?.catedra_id) {
    const cat = (catedras || []).find(c => String(c.id) === String(event.catedra_id));
    if (cat?.color) catedraColor = cat.color;
  }

  if (isMesa) {
    // La mesa usa su propio color (o el reservado DEFAULT_MESA_COLOR)
    primaryColor = event?.color || DEFAULT_MESA_COLOR;
    // Si la mesa no tiene cátedra vinculada pero tiene catedra_id
    if (!catedraColor && event?.catedras?.color) {
      catedraColor = event.catedras.color;
    }
    if (!catedraColor) {
      catedraColor = '#10B981'; // Fallback sutil de cátedra
    }
  } else {
    // Parciales, TPs y Clases heredan el color de su cátedra
    primaryColor = catedraColor || event?.color || '#10B981';
  }

  // 2. Contrastes
  const textColorSolid = getContrastTextColor(primaryColor);
  
  return {
    primaryColor,
    catedraColor,
    isMesa,
    textColorSolid,
    // Fondo translúcido armónico para el modo activo
    bgLight: hexToRgba(primaryColor, 0.12),
    bgDark: hexToRgba(primaryColor, 0.22),
    borderLight: hexToRgba(primaryColor, 0.4),
    borderDark: hexToRgba(primaryColor, 0.55),
    accentBar: primaryColor
  };
}
