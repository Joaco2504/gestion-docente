import { describe, it, expect, beforeEach } from 'vitest';
import { 
  getDiasNumerosCatedra, 
  calcularClasesPendientes 
} from '../scheduledClassesHelper';
import { 
  getOfflineQueue, 
  saveOfflineQueue, 
  enqueueOfflineMutation, 
  OFFLINE_QUEUE_KEY 
} from '../../services/offlineSyncService';

// Mock defensivo de localStorage y window para entorno Node en Vitest
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

globalThis.localStorage = localStorageMock;
if (typeof globalThis.window === 'undefined') {
  globalThis.window = {
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {}
  };
}

describe('Suite: Autogeneración de Clases y Cola Offline (Modo Aula PWA)', () => {

  describe('1. Mapeo de Horarios Semanales de Cátedra', () => {
    it('Convierte nombres de días en español a índices numéricos (0 = Dom, 1 = Lun, etc.)', () => {
      const horarios = [
        { dia: 'Lunes', desde: '18:00', hasta: '20:00' },
        { dia: 'Miércoles', desde: '20:00', hasta: '22:00' }
      ];
      const dias = getDiasNumerosCatedra(horarios);
      expect(dias.has(1)).toBe(true); // Lunes
      expect(dias.has(3)).toBe(true); // Miércoles
      expect(dias.has(2)).toBe(false); // Martes
      expect(dias.has(5)).toBe(false); // Viernes
    });

    it('Tolera días con y sin tildes (Miercoles vs Miércoles, Sabado vs Sábado)', () => {
      const horarios = [
        { dia: 'miercoles' },
        { dia: 'Sabado' }
      ];
      const dias = getDiasNumerosCatedra(horarios);
      expect(dias.has(3)).toBe(true);
      expect(dias.has(6)).toBe(true);
    });
  });

  describe('2. Cálculo Inteligente de Clases Pendientes', () => {
    const horarios = [
      { dia: 'Lunes' },
      { dia: 'Miércoles' }
    ];

    it('Genera clases únicamente para los días configurados de la cátedra en el período', () => {
      // Del lunes 2026-04-06 al viernes 2026-04-10:
      // Lunes 06/04: Clase
      // Martes 07/04: No cursada
      // Miércoles 08/04: Clase
      // Jueves 09/04: No cursada
      // Viernes 10/04: No cursada
      const pendientes = calcularClasesPendientes({
        catedraId: 'cat-test-1',
        horariosSemanales: horarios,
        clasesExistentes: [],
        fechaInicio: '2026-04-06',
        fechaFin: '2026-04-10'
      });

      expect(pendientes.length).toBe(2);
      expect(pendientes[0].fecha).toBe('2026-04-06');
      expect(pendientes[1].fecha).toBe('2026-04-08');
      expect(pendientes[0].estado).toBe('DICTADA');
      expect(pendientes[0].autogenerada).toBe(true);
    });

    it('No duplica clases que ya existen registradas en clasesExistentes (idempotencia)', () => {
      const existentes = [
        { id: 'c1', fecha: '2026-04-06', tema: 'Tema ya dictado', numero_clase: 1 }
      ];

      const pendientes = calcularClasesPendientes({
        catedraId: 'cat-test-1',
        horariosSemanales: horarios,
        clasesExistentes: existentes,
        fechaInicio: '2026-04-06',
        fechaFin: '2026-04-10'
      });

      // Solo debe generar la del miércoles 08/04, porque la del 06/04 ya existe
      expect(pendientes.length).toBe(1);
      expect(pendientes[0].fecha).toBe('2026-04-08');
      expect(pendientes[0].numero_clase).toBe(2);
    });

    it('Omite automáticamente días feriados nacionales (ej. 25 de Mayo)', () => {
      // 25 de Mayo de 2026 es Lunes y es Feriado Nacional en Argentina
      const pendientes = calcularClasesPendientes({
        catedraId: 'cat-test-1',
        horariosSemanales: [{ dia: 'Lunes' }],
        clasesExistentes: [],
        fechaInicio: '2026-05-25',
        fechaFin: '2026-05-25'
      });

      // Debe omitirse por ser feriado patrio
      expect(pendientes.length).toBe(0);
    });
  });

  describe('3. Motor de Cola Offline (localStorage)', () => {
    beforeEach(() => {
      localStorage.removeItem(OFFLINE_QUEUE_KEY);
    });

    it('Encola mutaciones individuales y las recupera de la cola', () => {
      const mutacion = {
        tipo: 'ASISTENCIA_INDIVIDUAL',
        payload: {
          clase_id: 'clase-1',
          estudiante_id: 'est-1',
          estado: 'PRESENTE'
        },
        catedraId: 'cat-1'
      };

      enqueueOfflineMutation(mutacion);
      const cola = getOfflineQueue();

      expect(cola.length).toBe(1);
      expect(cola[0].tipo).toBe('ASISTENCIA_INDIVIDUAL');
      expect(cola[0].payload.estado).toBe('PRESENTE');
      expect(cola[0].id).toBeDefined();
      expect(cola[0].timestamp).toBeDefined();
    });

    it('Deduplica asistencias para el mismo alumno y clase (mantiene el último estado)', () => {
      enqueueOfflineMutation({
        tipo: 'ASISTENCIA_INDIVIDUAL',
        payload: { clase_id: 'clase-1', estudiante_id: 'est-1', estado: 'PRESENTE' },
        catedraId: 'cat-1'
      });

      // El docente cambia de opinión y marca AUSENTE offline
      enqueueOfflineMutation({
        tipo: 'ASISTENCIA_INDIVIDUAL',
        payload: { clase_id: 'clase-1', estudiante_id: 'est-1', estado: 'AUSENTE' },
        catedraId: 'cat-1'
      });

      const cola = getOfflineQueue();
      expect(cola.length).toBe(1);
      expect(cola[0].payload.estado).toBe('AUSENTE');
    });

    it('Soporta encolado de mutaciones por lote (Marcar Todos)', () => {
      const lote = [
        { clase_id: 'clase-1', estudiante_id: 'est-1', estado: 'PRESENTE' },
        { clase_id: 'clase-1', estudiante_id: 'est-2', estado: 'PRESENTE' }
      ];

      enqueueOfflineMutation({
        tipo: 'ASISTENCIA_LOTE',
        payload: lote,
        catedraId: 'cat-1'
      });

      const cola = getOfflineQueue();
      expect(cola.length).toBe(1);
      expect(cola[0].tipo).toBe('ASISTENCIA_LOTE');
      expect(cola[0].payload.length).toBe(2);
    });
  });

});
