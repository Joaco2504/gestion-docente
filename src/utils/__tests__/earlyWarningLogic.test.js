import { describe, it, expect } from 'vitest';
import { calculateStudentRisk, calculateCatedraRiskSummary } from '../../lib/earlyWarningLogic';

describe('Motor de Alerta Temprana - earlyWarningLogic', () => {
  it('no arroja error al llamarse sin argumentos o con undefined', () => {
    expect(() => calculateStudentRisk()).not.toThrow();
    const result = calculateStudentRisk();
    expect(result.level).toBeDefined();
    expect(Array.isArray(result.reasons)).toBe(true);
  });

  it('no arroja error al llamarse solo con studentId sin context', () => {
    expect(() => calculateStudentRisk('student-123')).not.toThrow();
    const result = calculateStudentRisk('student-123');
    expect(result.level).toBe('OPTIMAL');
  });

  it('soporta firma polimórfica con un único objeto (caso useGradesData)', () => {
    const singleObjCall = {
      estudiante: { id: 'st-1', nombre: 'Juan', apellido: 'Pérez' },
      asistenciaPct: 85,
      notas: { 'eval-1': 8, 'eval-2': 7 },
      evaluaciones: [
        { id: 'eval-1', tipo: 'PARCIAL' },
        { id: 'eval-2', tipo: 'PARCIAL' }
      ],
      condicion: { condicion: 'PROMOCIONAL' }
    };

    expect(() => calculateStudentRisk(singleObjCall)).not.toThrow();
    const result = calculateStudentRisk(singleObjCall);
    expect(result.level).toBe('OPTIMAL');
    expect(result.asistPct).toBe(85);
  });

  it('detecta RIESGO CRÍTICO cuando el porcentaje de asistencia es inferior al 70%', () => {
    const result = calculateStudentRisk('st-critico', {
      asistencias: [
        { estudiante_id: 'st-critico', clase_id: 'c-1', estado: 'AUSENTE' },
        { estudiante_id: 'st-critico', clase_id: 'c-2', estado: 'AUSENTE' },
        { estudiante_id: 'st-critico', clase_id: 'c-3', estado: 'PRESENTE' }
      ],
      clases: [{ id: 'c-1', fecha: '2026-03-01' }, { id: 'c-2', fecha: '2026-03-08' }, { id: 'c-3', fecha: '2026-03-15' }],
      criterios: { min_asist_reg: 70 }
    });

    expect(result.level).toBe('CRITICAL');
    expect(result.badgeVariant).toBe('danger');
    expect(result.reasons.some(r => r.includes('Superó el cupo máximo'))).toBe(true);
  });

  it('detecta RIESGO CRÍTICO ante 3 inasistencias consecutivas', () => {
    const result = calculateStudentRisk('st-consecutivo', {
      asistencias: [
        { estudiante_id: 'st-consecutivo', clase_id: 'c-1', estado: 'PRESENTE' },
        { estudiante_id: 'st-consecutivo', clase_id: 'c-2', estado: 'AUSENTE' },
        { estudiante_id: 'st-consecutivo', clase_id: 'c-3', estado: 'AUSENTE' },
        { estudiante_id: 'st-consecutivo', clase_id: 'c-4', estado: 'AUSENTE' }
      ],
      clases: [
        { id: 'c-1', fecha: '2026-03-01' },
        { id: 'c-2', fecha: '2026-03-08' },
        { id: 'c-3', fecha: '2026-03-15' },
        { id: 'c-4', fecha: '2026-03-22' }
      ]
    });

    expect(result.level).toBe('CRITICAL');
    expect(result.reasons.some(r => r.includes('3 inasistencias seguidas'))).toBe(true);
  });

  it('calculateCatedraRiskSummary categoriza a los estudiantes correctamente', () => {
    const estudiantes = [
      { id: 'st-1', nombre: 'Ana' },
      { id: 'st-2', nombre: 'Carlos' }
    ];
    const summary = calculateCatedraRiskSummary(estudiantes, {});
    expect(summary.total).toBe(2);
    expect(summary.optimalCount + summary.warningCount + summary.criticalCount).toBe(2);
  });
});
