import { describe, it, expect } from 'vitest';
import { calcularCondicionFinal, calcularPorcentajeAsistencia, calcularNotasEfectivasEstudiante } from '../../lib/academicLogic';

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

  describe('7. Sistema de Recuperatorio Diferenciado por Alumno (Nivel Terciario)', () => {
    const parciales = [
      { id: 'p1', tipo: 'PARCIAL', titulo: '1° Parcial' },
      { id: 'p2', tipo: 'PARCIAL', titulo: '2° Parcial' },
      { id: 'p3', tipo: 'PARCIAL', titulo: '3° Parcial' }
    ];

    it('Caso 1: 0 parciales recuperados + notas >= 7 + asistencia >= 80% -> PROMOCIONAL (Directa)', () => {
      const notas = [
        { evaluacion_id: 'p1', valor: 8 },
        { evaluacion_id: 'p2', valor: 7 },
        { evaluacion_id: 'p3', valor: 9 }
      ];
      const resultado = calcularCondicionFinal({
        nivel: 'TERCIARIO',
        modalidad: 'CUATRIMESTRAL',
        asistenciaPct: 85,
        evaluaciones: parciales,
        studentNotas: notas
      });

      expect(resultado.condicion).toBe('PROMOCIONAL');
      expect(resultado.subcondicion).toBe('DIRECTA');
      expect(resultado.badgeVariant).toBe('promo');
    });

    it('Caso 2: Exactamente 1 parcial recuperado con nota >= 7 + notas finales >= 7 + asist >= 80% -> PROMOCION_INDIRECTA', () => {
      // Alumno desaprobó p1 con 3, pero en recuperatorio sacó 8. p2=7, p3=8
      const notas = [
        { evaluacion_id: 'p1', valor: 3 },
        { evaluacion_id: 'p2', valor: 7 },
        { evaluacion_id: 'p3', valor: 8 },
        {
          evaluacion_id: 'recup-gen',
          detalle_recuperatorio: [
            { evaluacion_id: 'p1', titulo: '1° Parcial', nota_recuperatorio: 8, estado: 'CALIFICADO', aprobado: true }
          ]
        }
      ];
      const resultado = calcularCondicionFinal({
        nivel: 'TERCIARIO',
        modalidad: 'CUATRIMESTRAL',
        asistenciaPct: 82,
        evaluaciones: parciales,
        studentNotas: notas
      });

      expect(resultado.condicion).toBe('PROMOCION_INDIRECTA');
      expect(resultado.subcondicion).toBe('INDIRECTA');
      expect(resultado.badgeVariant).toBe('promo');
      expect(resultado.motivo).toContain('Promoción Indirecta alcanzada');
    });

    it('Caso 3: Régimen ANUAL con 2 parciales recuperados aprobados con >= 7 -> REGULAR (tope máx regular para 2 recuperados)', () => {
      // Alumno recuperó p1 con 8 y p3 con 9. Aunque las notas son altas, 2 recuperados limitan a REGULAR
      const notas = [
        { evaluacion_id: 'p1', valor: 2 },
        { evaluacion_id: 'p2', valor: 8 },
        { evaluacion_id: 'p3', valor: 3 },
        {
          evaluacion_id: 'recup-gen',
          detalle_recuperatorio: [
            { evaluacion_id: 'p1', titulo: '1° Parcial', nota_recuperatorio: 8, estado: 'CALIFICADO', aprobado: true },
            { evaluacion_id: 'p3', titulo: '3° Parcial', nota_recuperatorio: 9, estado: 'CALIFICADO', aprobado: true }
          ]
        }
      ];
      const resultado = calcularCondicionFinal({
        nivel: 'TERCIARIO',
        modalidad: 'ANUAL',
        asistenciaPct: 85,
        evaluaciones: parciales,
        studentNotas: notas
      });

      expect(resultado.condicion).toBe('REGULAR');
      expect(resultado.badgeVariant).toBe('regular');
      expect(resultado.motivo).toContain('Regularidad alcanzada con 2 parcial(es) recuperado(s)');
    });

    it('Caso 4a: Régimen CUATRIMESTRAL con 2 parciales desaprobados en 1ra instancia -> LIBRE automático (excede límite máx 1)', () => {
      const notas = [
        { evaluacion_id: 'p1', valor: 2 },
        { evaluacion_id: 'p2', valor: 3 },
        { evaluacion_id: 'p3', valor: 8 }
      ];
      const resultado = calcularCondicionFinal({
        nivel: 'TERCIARIO',
        modalidad: 'CUATRIMESTRAL',
        asistenciaPct: 90,
        evaluaciones: parciales,
        studentNotas: notas
      });

      expect(resultado.condicion).toBe('LIBRE');
      expect(resultado.badgeVariant).toBe('libre');
      expect(resultado.motivo).toContain('exceder límite de parciales desaprobados');
    });

    it('Caso 4b: Régimen ANUAL con 3 parciales desaprobados en 1ra instancia -> LIBRE automático (excede límite máx 2)', () => {
      const notas = [
        { evaluacion_id: 'p1', valor: 2 },
        { evaluacion_id: 'p2', valor: 3 },
        { evaluacion_id: 'p3', valor: 1 }
      ];
      const resultado = calcularCondicionFinal({
        nivel: 'TERCIARIO',
        modalidad: 'ANUAL',
        asistenciaPct: 90,
        evaluaciones: parciales,
        studentNotas: notas
      });

      expect(resultado.condicion).toBe('LIBRE');
      expect(resultado.badgeVariant).toBe('libre');
      expect(resultado.motivo).toContain('exceder límite de parciales desaprobados');
    });

    it('Caso 5: Rinde recuperatorio y saca nota < 4 o Ausente -> LIBRE automático', () => {
      const notas = [
        { evaluacion_id: 'p1', valor: 2 },
        { evaluacion_id: 'p2', valor: 8 },
        { evaluacion_id: 'p3', valor: 7 },
        {
          evaluacion_id: 'recup-gen',
          detalle_recuperatorio: [
            { evaluacion_id: 'p1', titulo: '1° Parcial', nota_recuperatorio: 2, estado: 'CALIFICADO', aprobado: false }
          ]
        }
      ];
      const resultado = calcularCondicionFinal({
        nivel: 'TERCIARIO',
        modalidad: 'CUATRIMESTRAL',
        asistenciaPct: 85,
        evaluaciones: parciales,
        studentNotas: notas
      });

      expect(resultado.condicion).toBe('LIBRE');
      expect(resultado.badgeVariant).toBe('libre');
      expect(resultado.motivo).toContain('Libre por desaprobar recuperatorio');
    });

    it('Caso 6: Trazabilidad y Reemplazo Efectivo con calcularNotasEfectivasEstudiante', () => {
      const notas = [
        { evaluacion_id: 'p1', valor: 3 },
        { evaluacion_id: 'p2', valor: 8 },
        { evaluacion_id: 'p3', valor: 7 },
        {
          evaluacion_id: 'recup-gen',
          detalle_recuperatorio: [
            { evaluacion_id: 'p1', titulo: '1° Parcial', nota_recuperatorio: 9, estado: 'CALIFICADO', aprobado: true }
          ]
        }
      ];

      const { notasEfectivasMap, parcialesRecuperadosCount, promedioEfectivo } = calcularNotasEfectivasEstudiante({
        evaluaciones: parciales,
        studentNotas: notas
      });

      expect(parcialesRecuperadosCount).toBe(1);
      const infoP1 = notasEfectivasMap.get('p1');
      expect(infoP1.notaOriginal).toBe(3);
      expect(infoP1.notaRecup).toBe(9);
      expect(infoP1.notaEfectiva).toBe(9);
      expect(infoP1.reemplazada).toBe(true);
      // Promedio con 9, 8, 7 = (9 + 8 + 7) / 3 = 8.0
      expect(promedioEfectivo).toBe(8);
    });
  });

});
