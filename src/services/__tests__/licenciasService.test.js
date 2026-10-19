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
  updateLicencia,
  updateObservacion,
  deleteLicencia,
  calcularDisponibilidadArticulo,
  getFechasEnRango,
  isFechaCubiertaPorLicencias,
  catedraTieneClaseEnFecha,
  esFechaFeriado,
  obtenerLicenciaParaFecha
} from '../licenciasService';
import { maskDni } from '../studentPortalService';
import {
  CATALOGO_DECRETO_1092,
  getArticuloByCodigo,
  getArticuloByText,
  getArticulosAgrupadosPorCapitulo,
  calcularFechaFinLicencia
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

  describe('4. Multi-Día, Multi-Cátedra y Cálculo de Fechas Fin/Reintegro', () => {
    it('Calcula fechas para días CORRIDOS correctamente', () => {
      // 10 días corridos iniciando el lunes 2026-05-11
      const res = calcularFechaFinLicencia('2026-05-11', 10, 'CORRIDOS');
      expect(res.fechaInicio).toBe('2026-05-11');
      expect(res.fechaFin).toBe('2026-05-20');
      expect(res.fechaReintegro).toBe('2026-05-21');
    });

    it('Calcula fechas para días HÁBILES excluyendo fines de semana', () => {
      // 5 días hábiles iniciando el viernes 2026-05-15
      // Viernes 15 (1), Lunes 18 (2), Martes 19 (3), Miércoles 20 (4), Jueves 21 (5)
      // Reintegro: Viernes 22
      const res = calcularFechaFinLicencia('2026-05-15', 5, 'HABILES');
      expect(res.fechaInicio).toBe('2026-05-15');
      expect(res.fechaFin).toBe('2026-05-21');
      expect(res.fechaReintegro).toBe('2026-05-22');
    });

    it('Ajusta automáticamente al lunes si fecha de inicio en HÁBILES cae fin de semana', () => {
      // Sábado 2026-05-16 -> se ajusta al Lunes 2026-05-18
      // 2 días hábiles: Lunes 18 (1), Martes 19 (2) -> Reintegro: Miércoles 20
      const res = calcularFechaFinLicencia('2026-05-16', 2, 'HABILES');
      expect(res.fechaInicio).toBe('2026-05-18');
      expect(res.fechaFin).toBe('2026-05-19');
      expect(res.fechaReintegro).toBe('2026-05-20');
    });

    it('Genera rango inclusivo de fechas con getFechasEnRango', () => {
      const fechas = getFechasEnRango('2026-05-10', '2026-05-13');
      expect(fechas).toEqual(['2026-05-10', '2026-05-11', '2026-05-12', '2026-05-13']);
    });

    it('Detecta si una fecha está cubierta por licencias (isFechaCubiertaPorLicencias)', () => {
      const mockLicencias = [
        {
          id: 'lic-multi-1',
          fecha_inicio: '2026-06-01',
          fecha_fin: '2026-06-05',
          aplica_todas_catedras: true,
          articulo_codigo: 'ART_16'
        },
        {
          id: 'lic-single-1',
          fecha_inicio: '2026-06-15',
          fecha_fin: '2026-06-15',
          aplica_todas_catedras: false,
          catedra_id: 'cat-matematica',
          catedra_ids: ['cat-matematica'],
          articulo_codigo: 'ART_52'
        }
      ];

      // Dentro del rango de la licencia global
      expect(isFechaCubiertaPorLicencias('2026-06-03', mockLicencias, 'cualquier-cat').cubierta).toBe(true);

      // Fuera del rango de la licencia global
      expect(isFechaCubiertaPorLicencias('2026-06-06', mockLicencias, 'cualquier-cat').cubierta).toBe(false);

      // Licencia para cátedra específica
      expect(isFechaCubiertaPorLicencias('2026-06-15', mockLicencias, 'cat-matematica').cubierta).toBe(true);
      expect(isFechaCubiertaPorLicencias('2026-06-15', mockLicencias, 'cat-fisica').cubierta).toBe(false);
    });

    it('Acumula cantidad_dias al calcular consumo anual', () => {
      const mockLicencias = [
        {
          fecha: '2026-04-01',
          fecha_inicio: '2026-04-01',
          fecha_fin: '2026-04-07',
          cantidad_dias: 7,
          articulo_codigo: 'ART_16'
        },
        {
          fecha: '2026-05-10',
          fecha_inicio: '2026-05-10',
          fecha_fin: '2026-05-12',
          cantidad_dias: 3,
          articulo_codigo: 'ART_16'
        }
      ];

      const disp = calcularDisponibilidadArticulo('ART_16', mockLicencias, '2026-05-20');
      expect(disp.usadosAnio).toBe(10); // 7 + 3 = 10 días
      expect(disp.restantesAnio).toBe(15); // 25 - 10 = 15 días restantes
    });
  });

  describe('5. Edición Completa y Reconciliación Diferencial (updateLicencia)', () => {
    it('Actualiza artículo, días, fechas y observaciones en localStorage', async () => {
      // 1. Crear licencia inicial
      const payloadOriginal = {
        id: 'lic-edit-test-1',
        docente_id: 'doc-1',
        fecha_inicio: '2026-07-01',
        cantidad_dias: 2,
        articulo: 'Art. 52° - Razones particulares o especiales',
        articulo_codigo: 'ART_52',
        aplica_todas_catedras: true,
        observacion: 'Trámite inicial'
      };

      await createOrUpdateLicencia(payloadOriginal, {
        isDemo: true,
        docenteId: 'doc-1',
        allCatedraIds: ['cat-1']
      });

      const licInicial = getLocalLicencias('doc-1').find(l => l.id === 'lic-edit-test-1');
      expect(licInicial).toBeDefined();
      expect(licInicial.fecha_fin).toBe('2026-07-02');
      expect(licInicial.cantidad_dias).toBe(2);

      // 2. Modificar licencia completa cambiando fechas (a 2026-07-10), días (a 3), artículo y cátedras
      const payloadUpdate = {
        fecha_inicio: '2026-07-10',
        cantidad_dias: 3,
        articulo: 'Art. 16° - Afecciones comunes o corto tratamiento',
        articulo_codigo: 'ART_16',
        aplica_todas_catedras: false,
        catedra_ids: ['cat-1'],
        observacion: 'Modificación con certificado médico'
      };

      const updated = await updateLicencia('lic-edit-test-1', payloadUpdate, licInicial, {
        isDemo: true,
        docenteId: 'doc-1',
        allCatedraIds: ['cat-1']
      });

      expect(updated.fecha).toBe('2026-07-10');
      expect(updated.fecha_inicio).toBe('2026-07-10');
      expect(updated.cantidad_dias).toBe(3);
      expect(updated.fecha_fin).toBe('2026-07-12');
      expect(updated.articulo_codigo).toBe('ART_16');
      expect(updated.observacion).toBe('Modificación con certificado médico');

      // Verificar persistencia local
      const stored = getLocalLicencias('doc-1').find(l => l.id === 'lic-edit-test-1');
      expect(stored.fecha_inicio).toBe('2026-07-10');
      expect(stored.fecha_fin).toBe('2026-07-12');
      expect(stored.observacion).toBe('Modificación con certificado médico');
    });

    it('Reconcilia clases: libera a DICTADA las fechas viejas y marca DOCENTE_AUSENTE las nuevas', async () => {
      const cId = 'cat-historia';
      const keyClases = `clases_${cId}`;

      // Configurar clases existentes en localStorage
      const clasesIniciales = [
        { id: 'c-1', catedra_id: cId, fecha: '2026-08-03', estado: 'DICTADA', tema: 'Clase inicial' },
        { id: 'c-2', catedra_id: cId, fecha: '2026-08-04', estado: 'DICTADA', tema: 'Clase inicial' },
        { id: 'c-3', catedra_id: cId, fecha: '2026-08-10', estado: 'DICTADA', tema: 'Clase inicial' },
      ];
      localStorage.setItem(keyClases, JSON.stringify(clasesIniciales));

      // 1. Asentar licencia en 2026-08-03 y 2026-08-04
      const licOriginal = await createOrUpdateLicencia({
        id: 'lic-reconcile-1',
        docente_id: 'doc-2',
        fecha_inicio: '2026-08-03',
        cantidad_dias: 2,
        articulo: 'Art. 52° - Razones particulares',
        articulo_codigo: 'ART_52',
        aplica_todas_catedras: false,
        catedra_ids: [cId]
      }, { isDemo: true, docenteId: 'doc-2' });

      let clasesAfterCreate = JSON.parse(localStorage.getItem(keyClases));
      expect(clasesAfterCreate.find(c => c.fecha === '2026-08-03').estado).toBe('DOCENTE_AUSENTE');
      expect(clasesAfterCreate.find(c => c.fecha === '2026-08-04').estado).toBe('DOCENTE_AUSENTE');
      expect(clasesAfterCreate.find(c => c.fecha === '2026-08-10').estado).toBe('DICTADA');

      // 2. Modificar la licencia para que ahora sea solo el 2026-08-10 (1 día)
      await updateLicencia('lic-reconcile-1', {
        fecha_inicio: '2026-08-10',
        cantidad_dias: 1,
        articulo: 'Art. 52° - Razones particulares',
        articulo_codigo: 'ART_52',
        aplica_todas_catedras: false,
        catedra_ids: [cId]
      }, licOriginal, { isDemo: true, docenteId: 'doc-2' });

      let clasesAfterUpdate = JSON.parse(localStorage.getItem(keyClases));
      // Los días viejos (03 y 04) deben haberse restaurado a DICTADA
      const c1 = clasesAfterUpdate.find(c => c.fecha === '2026-08-03');
      const c2 = clasesAfterUpdate.find(c => c.fecha === '2026-08-04');
      const c3 = clasesAfterUpdate.find(c => c.fecha === '2026-08-10');

      expect(c1.estado).toBe('DICTADA');
      expect(c1.articulo_licencia).toBeNull();
      expect(c2.estado).toBe('DICTADA');
      expect(c2.articulo_licencia).toBeNull();

      // El nuevo día (10) debe ser DOCENTE_AUSENTE
      expect(c3.estado).toBe('DOCENTE_AUSENTE');
      expect(c3.articulo_licencia).toBe('Art. 52° - Razones particulares');
    });

    it('createOrUpdateLicencia delega automáticamente a updateLicencia cuando el ID ya existe', async () => {
      // Crear licencia
      await createOrUpdateLicencia({
        id: 'lic-auto-delegate-1',
        docente_id: 'doc-3',
        fecha_inicio: '2026-09-01',
        cantidad_dias: 1,
        articulo_codigo: 'ART_52',
        observacion: 'Original'
      }, { isDemo: true, docenteId: 'doc-3' });

      // Llamar a createOrUpdateLicencia con el mismo ID pero datos modificados
      const updated = await createOrUpdateLicencia({
        id: 'lic-auto-delegate-1',
        docente_id: 'doc-3',
        fecha_inicio: '2026-09-05',
        cantidad_dias: 2,
        articulo_codigo: 'ART_16',
        observacion: 'Actualizada via delegación'
      }, { isDemo: true, docenteId: 'doc-3' });

      expect(updated.fecha_inicio).toBe('2026-09-05');
      expect(updated.cantidad_dias).toBe(2);
      expect(updated.observacion).toBe('Actualizada via delegación');
    });

    it('Exclusión del registro en edición al calcular cupos para evitar duplicación de consumo', () => {
      const mockLicencias = [
        {
          id: 'lic-a-editar',
          fecha: '2026-05-02',
          fecha_inicio: '2026-05-02',
          fecha_fin: '2026-05-03',
          cantidad_dias: 2,
          articulo_codigo: 'ART_52'
        },
        {
          id: 'otra-licencia',
          fecha: '2026-05-15',
          fecha_inicio: '2026-05-15',
          fecha_fin: '2026-05-15',
          cantidad_dias: 1,
          articulo_codigo: 'ART_52'
        }
      ];

      // Sin exclusión (ambas licencias cuentan -> 3 días usados)
      const dispTotal = calcularDisponibilidadArticulo('ART_52', mockLicencias, '2026-05-02');
      expect(dispTotal.usadosAnio).toBe(3);

      // Con exclusión de la licencia en edición (solo cuenta 'otra-licencia' -> 1 día usado)
      const licenciasFiltradas = mockLicencias.filter(l => l.id !== 'lic-a-editar');
      const dispModoEdicion = calcularDisponibilidadArticulo('ART_52', licenciasFiltradas, '2026-05-02');
      expect(dispModoEdicion.usadosAnio).toBe(1);
      expect(dispModoEdicion.restantesAnio).toBe(4); // 5 - 1 = 4 días disponibles
    });

    it('Enmascara correctamente el DNI (maskDni) para privacidad en el portal estudiantil', () => {
      expect(maskDni('42376302')).toBe('42.***.302');
      expect(maskDni('42.376.302')).toBe('42.***.302');
      expect(maskDni(38123456)).toBe('38.***.456');
    });

    it('Valida días reales de cursada (catedraTieneClaseEnFecha) y prioridad absoluta de Feriados (esFechaFeriado)', async () => {
      const catEstadistica = {
        id: 'cat-est',
        nombre: 'Estadística',
        horarios_semanales: [
          { dia: 'Lunes', desde: '18:00', hasta: '20:00' },
          { dia: 'Miércoles', desde: '18:00', hasta: '20:00' }
        ]
      };

      // 2026-10-12 es Lunes (Feriado: Día del Respeto a la Diversidad Cultural)
      // 2026-10-13 es Martes (Estadística NO cursa)
      // 2026-10-14 es Miércoles (Estadística SÍ cursa y NO es feriado)
      expect(catedraTieneClaseEnFecha(catEstadistica, '2026-10-12')).toBe(true);
      expect(catedraTieneClaseEnFecha(catEstadistica, '2026-10-13')).toBe(false);
      expect(catedraTieneClaseEnFecha(catEstadistica, '2026-10-14')).toBe(true);

      expect(esFechaFeriado('2026-10-12')).toBe(true);
      expect(esFechaFeriado('2026-10-14')).toBe(false);

      // Si se registra una licencia del 10/10/2026 al 15/10/2026 para Estadística:
      // - NO debe crear clase en Lunes 12/10 porque es FERIADO
      // - NO debe crear clase en Martes 13/10 ni Jueves 15/10 porque Estadística no cursa esos días
      // - SÍ debe crear clase DOCENTE_AUSENTE únicamente el Miércoles 14/10
      await createOrUpdateLicencia({
        id: 'lic-oct-2026',
        docente_id: 'doc-4',
        fecha_inicio: '2026-10-10',
        cantidad_dias: 6,
        articulo_codigo: 'ART_48_B',
        aplica_todas_catedras: true
      }, {
        isDemo: true,
        docenteId: 'doc-4',
        catedrasList: [catEstadistica],
        allCatedraIds: ['cat-est']
      });

      const clasesEst = JSON.parse(localStorage.getItem('clases_cat-est') || '[]');
      expect(clasesEst.map(c => c.fecha)).toEqual(['2026-10-14']);
      expect(clasesEst[0].estado).toBe('DOCENTE_AUSENTE');

      // obtenerLicenciaParaFecha devuelve null si claseObj es FERIADO, y objeto en día hábil (2026-10-14)
      const lics = getLocalLicencias('doc-4');
      expect(obtenerLicenciaParaFecha('2026-10-12', 'cat-est', lics, { fecha: '2026-10-12', estado: 'FERIADO' })).toBeNull();
      expect(obtenerLicenciaParaFecha('2026-10-14', 'cat-est', lics)).not.toBeNull();
    });
  });
});
