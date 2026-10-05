import { z } from 'zod';

/**
 * Esquema de validación para el modal de Creación de Cátedra
 */
export const nuevaCatedraSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, { message: 'El nombre de la cátedra debe tener al menos 2 caracteres.' })
    .max(100, { message: 'El nombre no puede superar los 100 caracteres.' }),
  institucion_id: z
    .string()
    .min(1, { message: 'Debes seleccionar una institución educativa.' }),
  nivel: z
    .enum(['TERCIARIO', 'SECUNDARIO'], {
      errorMap: () => ({ message: 'Nivel académico no válido.' })
    })
    .default('TERCIARIO'),
  modalidad: z
    .enum(['1° CUATRIMESTRE', '2° CUATRIMESTRE', 'ANUAL', 'CUATRIMESTRAL'], {
      errorMap: () => ({ message: 'Modalidad de cursada no válida.' })
    })
    .default('ANUAL')
});

/**
 * Esquema de validación para el modal de Registro de Clase Rápida
 */
export const quickClassSchema = z.object({
  fecha: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Formato de fecha inválido (debe ser YYYY-MM-DD).' }),
  tema: z
    .string()
    .trim()
    .max(250, { message: 'El tema no puede superar los 250 caracteres.' })
    .default('')
});

/**
 * Esquema de validación para el modal de Evento / Recordatorio en Agenda
 */
export const quickEventSchema = z.object({
  titulo: z
    .string()
    .trim()
    .min(2, { message: 'El título del evento debe tener al menos 2 caracteres.' })
    .max(150, { message: 'El título no puede superar los 150 caracteres.' }),
  tipo: z
    .enum(['TRIBUNAL_EXAMEN', 'REUNION', 'PERIODO', 'CLASE', 'OTRO'], {
      errorMap: () => ({ message: 'Tipo de evento no válido.' })
    })
    .default('TRIBUNAL_EXAMEN'),
  fecha: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Formato de fecha inválido (debe ser YYYY-MM-DD).' }),
  hora: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Formato de hora inválido (HH:MM).' })
    .or(z.literal(''))
    .default('08:00'),
  notas: z
    .string()
    .trim()
    .max(500, { message: 'Las notas no pueden superar los 500 caracteres.' })
    .default('')
});
