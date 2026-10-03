export interface Feriado {
  fecha: string; // Formato ISO YYYY-MM-DD
  nombre: string;
  tipo: 'nacional' | 'provincial';
  descripcion?: string;
}

export const FERIADOS_ARGENTINA: Feriado[] = [
  // --- FERIADOS NACIONALES ---
  { fecha: '2026-01-01', nombre: 'Año Nuevo', tipo: 'nacional' },
  { fecha: '2026-02-16', nombre: 'Carnaval', tipo: 'nacional' },
  { fecha: '2026-02-17', nombre: 'Carnaval', tipo: 'nacional' },
  { fecha: '2026-03-24', nombre: 'Día Nacional de la Memoria por la Verdad y la Justicia', tipo: 'nacional' },
  { fecha: '2026-04-02', nombre: 'Día del Veterano y de los Caídos en la Guerra de Malvinas', tipo: 'nacional' },
  { fecha: '2026-04-03', nombre: 'Viernes Santo', tipo: 'nacional' },
  { fecha: '2026-05-01', nombre: 'Día del Trabajador', tipo: 'nacional' },
  { fecha: '2026-05-25', nombre: 'Día de la Revolución de Mayo', tipo: 'nacional' },
  { fecha: '2026-06-15', nombre: 'Paso a la Inmortalidad del Gral. Martín Miguel de Güemes', tipo: 'nacional' },
  { fecha: '2026-06-20', nombre: 'Paso a la Inmortalidad del Gral. Manuel Belgrano', tipo: 'nacional' },
  { fecha: '2026-07-09', nombre: 'Día de la Independencia', tipo: 'nacional' },
  { fecha: '2026-08-17', nombre: 'Paso a la Inmortalidad del Gral. José de San Martín', tipo: 'nacional' },
  { fecha: '2026-10-12', nombre: 'Día del Respeto a la Diversidad Cultural', tipo: 'nacional' },
  { fecha: '2026-11-20', nombre: 'Día de la Soberanía Nacional', tipo: 'nacional' },
  { fecha: '2026-12-08', nombre: 'Inmaculada Concepción de María', tipo: 'nacional' },
  { fecha: '2026-12-25', nombre: 'Navidad', tipo: 'nacional' },

  // --- FERIADOS PROVINCIALES OFICIALES DE CATAMARCA ---
  { 
    fecha: '2026-04-17', 
    nombre: 'Fiesta de la Protección de la Virgen del Valle', 
    tipo: 'provincial',
    descripcion: 'Viernes posterior a la Pascua de Resurrección - Feriado y asueto escolar en toda la Provincia de Catamarca.'
  },
  { 
    fecha: '2026-05-11', 
    nombre: 'Natalicio del Beato Fray Mamerto Esquiú', 
    tipo: 'provincial',
    descripcion: 'Conmemoración del ilustre prócer y obispo catamarqueño (Ley Provincial 5.701).'
  },
  { 
    fecha: '2026-08-25', 
    nombre: 'Autonomía de Catamarca', 
    tipo: 'provincial',
    descripcion: 'Feriado provincial inamovible por la Declaración de la Autonomía de Catamarca (1821).'
  },
  { 
    fecha: '2026-09-07', 
    nombre: 'Día del Milagro de la Virgen del Valle', 
    tipo: 'provincial',
    descripcion: 'Conmemoración de la protección durante el sismo de 2004 en Catamarca (Ley Provincial 5.122).'
  }
];

export default FERIADOS_ARGENTINA;
