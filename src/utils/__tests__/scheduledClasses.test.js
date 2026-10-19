import { describe, it, expect, beforeEach } from 'vitest';
import { 
  getDiasNumerosCatedra, 
  calcularClasesPendientes,
  ensureScheduledClassesToDate
} from '../scheduledClassesHelper';
import {
  obtenerFeriadoParaFecha,
  obtenerDiasDeCursadaCatedra,
  FERIADOS_OFICIALES_2026
} from '../licenciasHelper';
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

  describe('4. Regla Estricta de Días de Cursada y Feriados Oficiales 2026', () => {
    it('Detecta el lunes 12 de octubre de 2026 como Feriado Nacional', () => {
      expect(FERIADOS_OFICIALES_2026['2026-10-12']).toBe('Día del Respeto a la Diversidad Cultural');
      const info = obtenerFeriadoParaFecha('2026-10-12');
      expect(info.esFeriado).toBe(true);
      expect(info.nombre).toBe('Día del Respeto a la Diversidad Cultural');
    });

    it('Infiere únicamente Lunes [1] cuando la cátedra no tiene horarios en memoria pero tiene asistencia el lunes 05/10/2026', () => {
      const clasesExistentes = [
        { id: 'c-lun-05', fecha: '2026-10-05', tema: 'Clase del 05/10/2026' },
        { id: 'c-sab-10', fecha: '2026-10-10', tema: 'Clase del 10/10/2026' },
        { id: 'c-dom-11', fecha: '2026-10-11', tema: 'Clase del 11/10/2026' },
        { id: 'c-mar-13', fecha: '2026-10-13', tema: 'Clase del 13/10/2026' },
        { id: 'c-mie-14', fecha: '2026-10-14', tema: 'Clase del 14/10/2026' }
      ];
      const asistenciasExistentes = [
        { id: 'a1', clase_id: 'c-lun-05', estudiante_id: 'e1', estado: 'PRESENTE' }
      ];

      const dias = obtenerDiasDeCursadaCatedra({ id: 'cat-lunes' }, clasesExistentes, asistenciasExistentes);
      expect(dias).toEqual([1]); // Solo Lunes
    });

    it('Limpia clases fantasma (Sáb 10, Dom 11, Mar 13, Mié 14), convierte Lun 12 Oct en FERIADO y numera correlativamente Clase #1 y Clase #2', async () => {
      const catedra = {
        id: 'cat-estadistica',
        horarios_semanales: [{ dia_semana: 'Lunes' }]
      };
      const clasesSucias = [
        { id: 'c-lun-05', fecha: '2026-10-05', tema: 'Clase del 05/10/2026', numero_clase: 1 },
        { id: 'c-sab-10', fecha: '2026-10-10', tema: 'Clase del 10/10/2026', numero_clase: 1 },
        { id: 'c-dom-11', fecha: '2026-10-11', tema: 'Clase del 11/10/2026', numero_clase: 1 },
        { id: 'c-lun-12', fecha: '2026-10-12', tema: 'Clase del 12/10/2026', numero_clase: 1 },
        { id: 'c-mar-13', fecha: '2026-10-13', tema: 'Clase del 13/10/2026', numero_clase: 1 },
        { id: 'c-mie-14', fecha: '2026-10-14', tema: 'Clase del 14/10/2026', numero_clase: 1 },
        { id: 'c-lun-19', fecha: '2026-10-19', tema: 'Clase del 19/10/2026', numero_clase: 1 }
      ];
      const asistencias = [
        { id: 'a1', clase_id: 'c-lun-05', estudiante_id: 'e1', estado: 'PRESENTE' }
      ];

      const res = await ensureScheduledClassesToDate(catedra, clasesSucias, true, { asistencias });

      // Solo deben quedar los 3 lunes: 05/10, 12/10 y 19/10
      const fechasRestantes = res.all.map(c => c.fecha).sort();
      expect(fechasRestantes).toEqual(['2026-10-05', '2026-10-12', '2026-10-19']);

      const lun05 = res.all.find(c => c.fecha === '2026-10-05');
      const lun12 = res.all.find(c => c.fecha === '2026-10-12');
      const lun19 = res.all.find(c => c.fecha === '2026-10-19');

      expect(lun05.numero_clase).toBe(1);
      expect(lun12.estado).toBe('FERIADO');
      expect(lun12.unidad).toBe('Feriado Nacional');
      expect(lun12.tema).toBe('Día del Respeto a la Diversidad Cultural');
      expect(lun19.numero_clase).toBe(2);
    });
  });

});
