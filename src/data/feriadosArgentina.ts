export interface Feriado {
  fecha: string; // Formato YYYY-MM-DD
  nombre: string;
  tipo: 'nacional' | 'provincial';
}

export const FERIADOS_ARGENTINA: Feriado[] = [
  // Feriados Nacionales Inamovibles y Trasladables
  { fecha: '2026-01-01', nombre: 'Año Nuevo', tipo: 'nacional' },
  { fecha: '2026-02-16', nombre: 'Carnaval', tipo: 'nacional' },
  { fecha: '2026-02-17', nombre: 'Carnaval', tipo: 'nacional' },
  { fecha: '2026-03-24', nombre: 'Día Nacional de la Memoria por la Verdad y la Justicia', tipo: 'nacional' },
  { fecha: '2026-04-02', nombre: 'Día del Veterano y de los Caídos en Malvinas', tipo: 'nacional' },
  { fecha: '2026-04-03', nombre: 'Viernes Santo', tipo: 'nacional' },
  { fecha: '2026-05-01', nombre: 'Día del Trabajador', tipo: 'nacional' },
  { fecha: '2026-05-25', nombre: 'Día de la Revolución de Mayo', tipo: 'nacional' },
  { fecha: '2026-06-15', nombre: 'Paso a la Inmortalidad del Gral. Güemes', tipo: 'nacional' },
  { fecha: '2026-06-20', nombre: 'Paso a la Inmortalidad del Gral. Manuel Belgrano', tipo: 'nacional' },
  { fecha: '2026-07-09', nombre: 'Día de la Independencia', tipo: 'nacional' },
  { fecha: '2026-08-17', nombre: 'Paso a la Inmortalidad del Gral. José de San Martín', tipo: 'nacional' },
  { fecha: '2026-10-12', nombre: 'Día del Respeto a la Diversidad Cultural', tipo: 'nacional' },
  { fecha: '2026-11-20', nombre: 'Día de la Soberanía Nacional', tipo: 'nacional' },
  { fecha: '2026-12-08', nombre: 'Inmaculada Concepción de María', tipo: 'nacional' },
  { fecha: '2026-12-25', nombre: 'Navidad', tipo: 'nacional' },
  // Feriados Provinciales (Catamarca)
  { fecha: '2026-04-17', nombre: 'Fiesta de la Virgen del Valle (Viernes posterior a Pascua)', tipo: 'provincial' },
  { fecha: '2026-08-25', nombre: 'Autonomía de Catamarca', tipo: 'provincial' },
  { fecha: '2026-12-08', nombre: 'Solemnidad de la Virgen del Valle', tipo: 'provincial' }
];

export default FERIADOS_ARGENTINA;
