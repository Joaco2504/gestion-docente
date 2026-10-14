import { describe, it, expect } from 'vitest';
import { calcularCondicionFinal, calcularPorcentajeAsistencia } from '../../lib/academicLogic';

describe('Suite de Pruebas Unitarias: academicLogic (RAM Catamarca & Régimen Laboral)', () => {

  describe('1. Régimen Regular RAM Catamarca (Umbral Estándar 70%)', () => {
    const evaluaciones = [
      { id: 'p1', tipo: 'PARCIAL', fecha_entrega: '2026-05-01' },
      { id: 'p2', tipo: 'PARCIAL', fecha_entrega: '2026-06-01' }
    ];

    it('Determina condición REGULAR con asistencia >= 70% y parciales aprobados (>= 4)', () => {
      const notas = [
        { evaluacion_id: 'p1', valor: 6 },
        { evaluacion_id: 'p2', valor: 5 }
      ];
      const resultado = calcularCondicionFinal({
        nivel: 'TERCIARIO',
        modalidad: 'CUATRIMESTRAL',
        asistenciaPct: 70,
        evaluaciones,
        studentNotas: notas,
        tiene_certificado_trabajo: false
      });

      expect(resultado.condicion).toBe('REGULAR');
      expect(resultado.badgeVariant).toBe('regular');
    });

    it('Determina condición PROMOCIONAL con asistencia >= 80% y parciales >= 7', () => {
      const notas = [
        { evaluacion_id: 'p1', valor: 8 },
        { evaluacion_id: 'p2', valor: 7 }
      ];
      const resultado = calcularCondicionFinal({
        nivel: 'TERCIARIO',
        modalidad: 'CUATRIMESTRAL',
        asistenciaPct: 85,
        evaluaciones,
        studentNotas: notas,
        tiene_certificado_trabajo: false
      });

      expect(resultado.condicion).toBe('PROMOCIONAL');
      expect(resultado.badgeVariant).toBe('promo');
    });

    it('Determina condición LIBRE si la asistencia es < 70% para alumno regular sin certificado', () => {
      const notas = [
        { evaluacion_id: 'p1', valor: 8 },
        { evaluacion_id: 'p2', valor: 9 }
      ];
      const resultado = calcularCondicionFinal({
        nivel: 'TERCIARIO',
        modalidad: 'CUATRIMESTRAL',
        asistenciaPct: 69,
        evaluaciones,
        studentNotas: notas,
        tiene_certificado_trabajo: false
      });

      expect(resultado.condicion).toBe('LIBRE');
      expect(resultado.badgeVariant).toBe('libre');
    });
  });

  describe('2. Régimen Laboral con Certificado de Trabajo (Meta Adaptativa 60%)', () => {
    const evaluaciones = [
      { id: 'p1', tipo: 'PARCIAL', fecha_entrega: '2026-05-01' }
    ];
    const notas = [
      { evaluacion_id: 'p1', valor: 6 }
    ];

    it('Mantiene condición REGULAR con 60% de asistencia si tiene certificado de trabajo', () => {
      const resultado = calcularCondicionFinal({
        nivel: 'TERCIARIO',
        modalidad: 'CUATRIMESTRAL',
        asistenciaPct: 60,
        evaluaciones,
        studentNotas: notas,
        tiene_certificado_trabajo: true
      });

      expect(resultado.condicion).toBe('REGULAR');
    });

    it('Pasa a condición LIBRE si la asistencia es < 60% incluso con certificado de trabajo', () => {
      const resultado = calcularCondicionFinal({
        nivel: 'TERCIARIO',
        modalidad: 'CUATRIMESTRAL',
        asistenciaPct: 59.9,
        evaluaciones,
        studentNotas: notas,
        tiene_certificado_trabajo: true
      });

      expect(resultado.condicion).toBe('LIBRE');
    });
  });

  describe('3. Manejo Defensivo de Notas y Estados (Sin NaN)', () => {
    const evaluaciones = [
      { id: 'p1', tipo: 'PARCIAL' },
      { id: 'p2', tipo: 'PARCIAL' }
    ];

    it('Maneja defensivamente notas null, undefined o vacías sin arrojar errores ni generar NaN', () => {
      const notas = [
        { evaluacion_id: 'p1', valor: null, estado: null },
        { evaluacion_id: 'p2', valor: undefined, nota: '' }
      ];

      expect(() => {
        const resultado = calcularCondicionFinal({
          nivel: 'TERCIARIO',
          asistenciaPct: 80,
          evaluaciones,
          studentNotas: notas
        });
        expect(resultado.condicion).toBeDefined();
        expect(resultado.motivo).not.toContain('NaN');
      }).not.toThrow();
    });

    it('Maneja correctamente estados NO_ENTREGO y AUSENTE sin valores NaN', () => {
      const notas = [
        { evaluacion_id: 'p1', valor: null, estado: 'NO_ENTREGO' },
        { evaluacion_id: 'p2', valor: null, estado: 'AUSENTE' }
      ];
      const resultado = calcularCondicionFinal({
        nivel: 'TERCIARIO',
        asistenciaPct: 85,
        evaluaciones,
        studentNotas: notas
      });

      expect(resultado.condicion).toBe('LIBRE');
      expect(resultado.motivo).not.toContain('NaN');
    });

    it('Tolerancia a estados abreviados N/E y Aus. sin producir NaN ni detonar excepciones', () => {
      const notas = [
        { evaluacion_id: 'p1', valor: 'N/E', estado: 'N/E' },
        { evaluacion_id: 'p2', valor: null, estado: 'Aus.' }
      ];
      const resultado = calcularCondicionFinal({
        nivel: 'TERCIARIO',
        asistenciaPct: 85,
        evaluaciones,
        studentNotas: notas
      });

      expect(resultado.condicion).toBe('LIBRE');
      expect(resultado.motivo).not.toContain('NaN');
    });

    it('Tolerancia en Nivel Secundario con estados N/E y Aus. calculando promedio sin NaN', () => {
      const notas = [
        { evaluacion_id: 'p1', valor: 8 },
        { evaluacion_id: 'p2', valor: 'Aus.', estado: 'Aus.' }
      ];
      const resultado = calcularCondicionFinal({
        nivel: 'SECUNDARIO',
        asistenciaPct: 75,
        evaluaciones,
        studentNotas: notas
      });

      expect(resultado.condicion).toBeDefined();
      expect(resultado.motivo).not.toContain('NaN');
    });
  });

  describe('4. Acreditación Automática por Equivalencia', () => {
    it('Retorna ACREDITADA_EQUIVALENCIA independientemente de asistencias o evaluaciones', () => {
      const resultado = calcularCondicionFinal({
        es_equivalencia: true,
        asistenciaPct: 0,
        evaluaciones: [{ id: 'p1', tipo: 'PARCIAL' }],
        studentNotas: [{ evaluacion_id: 'p1', valor: 2 }]
      });

      expect(resultado.condicion).toBe('ACREDITADA_EQUIVALENCIA');
      expect(resultado.badgeVariant).toBe('promo');
      expect(resultado.motivo).toContain('equivalencia');
    });
  });

  describe('5. Cálculo de Porcentaje de Asistencia y Descuento de Licencias Docentes', () => {
    it('Calcula porcentaje exacto de presentes sobre clases dictadas', () => {
      const asistencias = [
        { estado: 'PRESENTE' },
        { estado: 'PRESENTE' },
        { estado: 'AUSENTE' },
        { estado: 'PRESENTE' }
      ];
      // 3 presentes de 4 clases = 75%
      const pct = calcularPorcentajeAsistencia(asistencias, 4, 0);
      expect(pct).toBe(75);
    });

    it('Descuenta clases con inasistencia/licencia docente sin penalizar al alumno', () => {
      const asistencias = [
        { estado: 'PRESENTE' },
        { estado: 'PRESENTE' },
        { estado: 'PRESENTE' }
      ];
      // Total 5 clases pero 2 fueron con licencia docente -> 3 clases efectivas. 3 presentes / 3 = 100%
      const pct = calcularPorcentajeAsistencia(asistencias, 5, 2);
      expect(pct).toBe(100);
    });

    it('Devuelve 100% si no hubo clases efectivas dictadas', () => {
      const pct = calcularPorcentajeAsistencia([], 2, 2);
      expect(pct).toBe(100);
    });

    it('Soporta llamada con objeto de configuración { asistencias, totalClases, clasesConLicencia }', () => {
      const asistencias = [
        { estado: 'PRESENTE' },
        { estado: 'AUSENTE' }
      ];
      const pct = calcularPorcentajeAsistencia({
        asistencias,
        totalClases: 4,
        clasesConLicencia: 2
      });
      // 1 presente de (4 - 2) = 2 clases efectivas -> 50%
      expect(pct).toBe(50);
    });

    it('Excluye asistencias marcadas con inasistencia/licencia docente si estuvieran en el arreglo', () => {
      const asistencias = [
        { estado: 'PRESENTE', docenteAusente: true },
        { estado: 'PRESENTE' }
      ];
      const pct = calcularPorcentajeAsistencia({
        asistencias,
        totalClases: 2,
        clasesConLicencia: 1
      });
      // 1 presente válido sobre 1 clase efectiva = 100%
      expect(pct).toBe(100);
    });
  });

  describe('6. Evaluación Semántica de Umbral de Asistencia Acumulada (Régimen Laboral 60% vs 70%)', () => {
    const evaluarSemaforo = (pct, tieneCertificado) => {
      const umbral = tieneCertificado ? 60 : 70;
      if (pct >= umbral + 5) return 'verde';
      if (pct >= umbral) return 'ambar';
      return 'rojo';
    };

    it('Asigna color VERDE si el porcentaje supera el umbral por 5% o más', () => {
      expect(evaluarSemaforo(75, false)).toBe('verde'); // 75 >= 75
      expect(evaluarSemaforo(65, true)).toBe('verde');  // 65 >= 65
    });

    it('Asigna color ÁMBAR si está dentro del margen de riesgo (umbral a umbral + 4.9%)', () => {
      expect(evaluarSemaforo(70, false)).toBe('ambar'); // 70 < 75
      expect(evaluarSemaforo(74.9, false)).toBe('ambar');
      expect(evaluarSemaforo(60, true)).toBe('ambar');  // 60 < 65
      expect(evaluarSemaforo(64.9, true)).toBe('ambar');
    });

    it('Asigna color ROJO si cae por debajo del umbral mínimo reglamentario', () => {
      expect(evaluarSemaforo(69.9, false)).toBe('rojo');
      expect(evaluarSemaforo(59.9, true)).toBe('rojo');
    });
  });

});
