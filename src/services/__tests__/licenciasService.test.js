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
  deleteLicencia,
  calcularDisponibilidadArticulo
} from '../licenciasService';
import {
  CATALOGO_DECRETO_1092,
  getArticuloByCodigo,
  getArticuloByText,
  getArticulosAgrupadosPorCapitulo
} from '../../constants/decreto1092';

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

  describe('3. Catálogo Decreto 1092 y Disponibilidad Inteligente', () => {
    it('El catálogo contiene los 44 artículos agrupados por capítulos', () => {
      expect(CATALOGO_DECRETO_1092.length).toBe(44);
      const grupos = getArticulosAgrupadosPorCapitulo();
      expect(grupos.length).toBeGreaterThanOrEqual(5);

      const totalEnGrupos = grupos.reduce((acc, g) => acc + g.articulos.length, 0);
      expect(totalEnGrupos).toBe(44);
    });

    it('getArticuloByText resuelve tolerante códigos históricos y jerga docente', () => {
      expect(getArticuloByText('Art. 15° - Razones particulares')?.codigo).toBe('ART_52');
      expect(getArticuloByText('Art. 9° - Corto tratamiento')?.codigo).toBe('ART_16');
      expect(getArticuloByText('Art. 32° - Mesa de examen')?.codigo).toBe('ART_53_54_A');
      expect(getArticuloByText('Art. 24° - Familiar enfermo')?.codigo).toBe('ART_30_GOCE');
      expect(getArticuloByText('Art. 45° - Fenómenos meteorológicos')?.codigo).toBe('ART_49');
    });

    it('Calcula disponibilidad para artículo SIN_LIMITE (ej. ART_53_54_A)', () => {
      const mockLicencias = [
        { fecha: '2026-04-10', articulo_codigo: 'ART_53_54_A' },
        { fecha: '2026-05-12', articulo_codigo: 'ART_53_54_A' },
        { fecha: '2026-05-18', articulo_codigo: 'ART_53_54_A' }
      ];

      const disp = calcularDisponibilidadArticulo('ART_53_54_A', mockLicencias, '2026-05-20');
      expect(disp.modo).toBe('SIN_LIMITE');
      expect(disp.usadosAnio).toBe(3);
      expect(disp.usadosMes).toBe(2);
      expect(disp.restantesAnio).toBeNull();
      expect(disp.restantesMes).toBeNull();
      expect(disp.bloqueado).toBe(false);
      expect(disp.alerta).toBe('info');
      expect(disp.mensajeAnual).toContain('Sin límite anual fijo');
      expect(disp.mensajeAnual).toContain('Llevás 3 días registrados en 2026');
      expect(disp.mensajeMensual).toContain('Sin límite mensual fijo');
      expect(disp.mensajeMensual).toContain('Llevás 2 días registrados en mayo');
    });

    it('Calcula disponibilidad para artículo POR_EVENTO (ej. ART_50)', () => {
      const mockLicencias = [
        { fecha: '2026-02-10', articulo_codigo: 'ART_50' }
      ];

      const disp = calcularDisponibilidadArticulo('ART_50', mockLicencias, '2026-05-20');
      expect(disp.modo).toBe('POR_EVENTO');
      expect(disp.usadosAnio).toBe(1);
      expect(disp.usadosMes).toBe(0);
      expect(disp.topeEvento).toBe(1);
      expect(disp.bloqueado).toBe(false);
      expect(disp.alerta).toBe('evento');
      expect(disp.mensajeSolicitud).toContain('Tope por evento: hasta 1 día por donación');
      expect(disp.mensajeAnual).toContain('Sin tope anual ni mensual de ocurrencias');
    });

    it('Calcula disponibilidad para artículo CON_TOPE (ej. ART_52 - Razones Particulares)', () => {
      const mockLicencias = [
        { fecha: '2026-03-10', articulo_codigo: 'ART_52' },
        { fecha: '2026-05-05', articulo_codigo: 'ART_52' }
      ];

      const disp = calcularDisponibilidadArticulo('ART_52', mockLicencias, '2026-05-20');
      expect(disp.modo).toBe('CON_TOPE');
      expect(disp.usadosAnio).toBe(2);
      expect(disp.restantesAnio).toBe(3); // 5 - 2 = 3
      expect(disp.usadosMes).toBe(1);
      expect(disp.restantesMes).toBe(1); // 2 - 1 = 1
      expect(disp.bloqueado).toBe(false);
      expect(disp.alerta).toBe('advertencia'); // Le queda 1 en el mes
      expect(disp.mensajeAnual).toContain('Cupo Anual: Usaste 2 de 5 → Te quedan 3 días hábiles');
      expect(disp.mensajeMensual).toContain('Cupo Mensual: Usaste 1 de 2 → Te quedan 1 este mes');
    });

    it('Detecta bloqueo cuando se alcanza el tope anual en CON_TOPE', () => {
      const mockLicencias = [
        { fecha: '2026-01-10', articulo_codigo: 'ART_52' },
        { fecha: '2026-02-10', articulo_codigo: 'ART_52' },
        { fecha: '2026-03-10', articulo_codigo: 'ART_52' },
        { fecha: '2026-04-10', articulo_codigo: 'ART_52' },
        { fecha: '2026-05-10', articulo_codigo: 'ART_52' }
      ];

      const disp = calcularDisponibilidadArticulo('ART_52', mockLicencias, '2026-05-20');
      expect(disp.usadosAnio).toBe(5);
      expect(disp.restantesAnio).toBe(0);
      expect(disp.bloqueado).toBe(true);
      expect(disp.alerta).toBe('limite');
      expect(disp.badgeColor).toBe('red');
    });

    it('Imputa al grupo acumulativo CORTO_TRATAMIENTO entre ART_16 y ART_18', () => {
      const mockLicencias = [
        { fecha: '2026-03-10', articulo_codigo: 'ART_16' },
        { fecha: '2026-04-12', articulo_codigo: 'ART_18' } // Retiro en hora de labor imputa a los 25 días
      ];

      const disp = calcularDisponibilidadArticulo('ART_16', mockLicencias, '2026-05-10');
      expect(disp.usadosAnio).toBe(2);
      expect(disp.restantesAnio).toBe(23); // 25 - 2 = 23
    });
  });
});
