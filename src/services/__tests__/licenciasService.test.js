import { describe, it, expect, beforeEach, vi } from 'vitest';

const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, val) => { store[key] = String(val); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();
Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true
});

import { 
  calcularConsumoLicencias, 
  normalizeLicencia,
  getLocalLicencias,
  saveLocalLicencias,
  getLicenciasByYear,
  createOrUpdateLicencia,
  updateObservacion,
  deleteLicencia
} from '../licenciasService';

describe('licenciasService — Reglas y Contadores Decreto 1092', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('1. Cálculo de Consumo y Alertas (Art. 15° y Desglose)', () => {
    it('Calcula correctamente cuando no hay licencias', () => {
      const res = calcularConsumoLicencias([], 2026, '2026-05-10');
      expect(res.totalAnual).toBe(0);
      expect(res.art15.usadosAnio).toBe(0);
      expect(res.art15.maxAnio).toBe(6);
      expect(res.art15.usadosMes).toBe(0);
      expect(res.art15.maxMes).toBe(2);
      expect(res.art15.alerta).toBe('normal');
      expect(res.desglose).toEqual({});
    });

    it('Cuenta licencias del Art. 15 anuales y mensuales con alertas correctas', () => {
      const mockLicencias = [
        { fecha: '2026-03-12', articulo: 'Art. 15° - Razones particulares' },
        { fecha: '2026-04-05', articulo: 'Art. 15° - Razones particulares' },
        { fecha: '2026-05-02', articulo: 'Art. 15° - Razones particulares' },
        { fecha: '2026-05-20', articulo: 'Art. 15° - Razones particulares' },
        { fecha: '2026-05-15', articulo: 'Art. 9° - Enfermedad de corto tratamiento' },
        { fecha: '2025-10-10', articulo: 'Art. 15° - Razones particulares' }, // Año anterior, no debe contar
      ];

      const res = calcularConsumoLicencias(mockLicencias, 2026, '2026-05-25');
      expect(res.totalAnual).toBe(5);
      expect(res.art15.usadosAnio).toBe(4);
      expect(res.art15.usadosMes).toBe(2); // Dos en mayo de 2026
      expect(res.art15.alerta).toBe('limite'); // Llegó a 2 en el mes -> límite
      expect(res.desglose['Art. 15°']).toBe(4);
      expect(res.desglose['Art. 9°']).toBe(1);
    });

    it('Alcanzar 4 anuales activa advertencia si mes es menor a 2', () => {
      const mockLicencias = [
        { fecha: '2026-01-10', articulo: 'Art. 15° - Razones particulares' },
        { fecha: '2026-02-10', articulo: 'Art. 15° - Razones particulares' },
        { fecha: '2026-03-10', articulo: 'Art. 15° - Razones particulares' },
        { fecha: '2026-04-10', articulo: 'Art. 15° - Razones particulares' },
      ];

      const res = calcularConsumoLicencias(mockLicencias, 2026, '2026-05-01');
      expect(res.art15.usadosAnio).toBe(4);
      expect(res.art15.usadosMes).toBe(0);
      expect(res.art15.alerta).toBe('advertencia');
    });

    it('Alcanzar 6 anuales activa estado limite', () => {
      const mockLicencias = [
        { fecha: '2026-01-10', articulo: 'Art. 15°' },
        { fecha: '2026-02-10', articulo: 'Art. 15°' },
        { fecha: '2026-03-10', articulo: 'Art. 15°' },
        { fecha: '2026-04-10', articulo: 'Art. 15°' },
        { fecha: '2026-05-10', articulo: 'Art. 15°' },
        { fecha: '2026-06-10', articulo: 'Art. 15°' },
      ];

      const res = calcularConsumoLicencias(mockLicencias, 2026, '2026-07-01');
      expect(res.art15.usadosAnio).toBe(6);
      expect(res.art15.alerta).toBe('limite');
    });
  });

  describe('2. Operaciones CRUD y Persistencia Local (Demo / Offline)', () => {
    it('Normaliza campos de licencia correctamente', () => {
      const raw = {
        id: 'lic-123',
        fecha: '2026-05-10T00:00:00.000Z',
        articulo: 'Art. 9° - Enfermedad',
        observaciones: 'Reposo 48hs',
        catedra_id: 'cat-1'
      };

      const norm = normalizeLicencia(raw, { 'cat-1': { id: 'cat-1', nombre: 'Matemática', institucion: 'IES 1' } });
      expect(norm.id).toBe('lic-123');
      expect(norm.fecha).toBe('2026-05-10');
      expect(norm.observacion).toBe('Reposo 48hs');
      expect(norm.catedra.nombre).toBe('Matemática');
      expect(norm.catedra.institucion).toBe('IES 1');
      expect(norm.estado_tramite).toBe('PENDIENTE_CERTIFICADO');
    });

    it('Crea una nueva licencia y la consulta por año en modo Demo/Local', async () => {
      const payload = {
        fecha: '2026-08-14',
        articulo: 'Art. 32° - Integración de mesa examinadora',
        observacion: 'Tribunal en IES Maldones',
        estado_tramite: 'PRESENTADA'
      };

      const created = await createOrUpdateLicencia(payload, { isDemo: true, docenteId: 'doc-1' });
      expect(created.articulo).toBe(payload.articulo);
      expect(created.observacion).toBe(payload.observacion);
      expect(created.estado_tramite).toBe('PRESENTADA');

      const list = await getLicenciasByYear('doc-1', 2026, { isDemo: true });
      expect(list.length).toBe(1);
      expect(list[0].id).toBe(created.id);
    });

    it('Actualiza la observación inline de una licencia existente', async () => {
      const created = await createOrUpdateLicencia({
        fecha: '2026-09-01',
        articulo: 'Art. 9°',
        observacion: 'Nota previa',
        estado_tramite: 'PENDIENTE_CERTIFICADO'
      }, { isDemo: true, docenteId: 'doc-1' });

      const updated = await updateObservacion(created.id, 'Certificado entregado en rectoría', 'APROBADA', {
        isDemo: true,
        docenteId: 'doc-1'
      });

      expect(updated.observacion).toBe('Certificado entregado en rectoría');
      expect(updated.estado_tramite).toBe('APROBADA');

      const list = await getLicenciasByYear('doc-1', 2026, { isDemo: true });
      expect(list[0].observacion).toBe('Certificado entregado en rectoría');
      expect(list[0].estado_tramite).toBe('APROBADA');
    });

    it('Elimina una licencia correctamente', async () => {
      const created = await createOrUpdateLicencia({
        fecha: '2026-10-01',
        articulo: 'Art. 15°',
        observacion: 'A eliminar'
      }, { isDemo: true, docenteId: 'doc-1' });

      let list = await getLicenciasByYear('doc-1', 2026, { isDemo: true });
      expect(list.length).toBe(1);

      await deleteLicencia(created.id, null, { isDemo: true, docenteId: 'doc-1' });

      list = await getLicenciasByYear('doc-1', 2026, { isDemo: true });
      expect(list.length).toBe(0);
    });
  });
});
