import { describe, it, expect } from 'vitest';
import { obtenerLicenciaParaFecha } from '../licenciasHelper';

describe('obtenerLicenciaParaFecha — Detector Universal de Licencias', () => {
  const mockLicencias = [
    {
      id: 'lic-duelo-1',
      fecha_inicio: '2026-10-10',
      fecha_fin: '2026-10-15',
      cantidad_dias: 5,
      fecha_reintegro: '2026-10-16',
      articulo: 'Art. 48° inc. b) - Fallecimiento de familiares de 2° grado',
      articulo_codigo: 'ART_48_B',
      observacion: 'Duelo abuelo',
      aplica_todas_catedras: true
    },
    {
      id: 'lic-particular-1',
      fecha_inicio: '2026-11-03',
      fecha_fin: '2026-11-03',
      cantidad_dias: 1,
      fecha_reintegro: '2026-11-04',
      articulo: 'Art. 52° - Razones particulares',
      articulo_codigo: 'ART_52',
      observacion: 'Trámite personal',
      aplica_todas_catedras: false,
      catedra_id: 'cat-sistemas',
      catedra_ids: ['cat-sistemas']
    }
  ];

  it('Detecta fechas dentro del rango de una licencia multi-día (ej. 10/10 al 15/10)', () => {
    // Día de inicio
    const r1 = obtenerLicenciaParaFecha('2026-10-10', 'cat-matematica', mockLicencias);
    expect(r1).not.toBeNull();
    expect(r1.esLicencia).toBe(true);
    expect(r1.articulo_codigo).toBe('ART_48_B');
    expect(r1.observacion).toBe('Duelo abuelo');

    // Día intermedio
    const r2 = obtenerLicenciaParaFecha('2026-10-12', 'cat-otra', mockLicencias);
    expect(r2).not.toBeNull();
    expect(r2.esLicencia).toBe(true);
    expect(r2.fecha_inicio).toBe('2026-10-10');
    expect(r2.fecha_fin).toBe('2026-10-15');

    // Día final del rango
    const r3 = obtenerLicenciaParaFecha('2026-10-15', 'cat-cualquiera', mockLicencias);
    expect(r3).not.toBeNull();
    expect(r3.esLicencia).toBe(true);
  });

  it('Retorna null para fechas fuera del rango', () => {
    // Un día antes
    expect(obtenerLicenciaParaFecha('2026-10-09', 'cat-matematica', mockLicencias)).toBeNull();
    // Un día después (día de reintegro)
    expect(obtenerLicenciaParaFecha('2026-10-16', 'cat-matematica', mockLicencias)).toBeNull();
  });

  it('Respeta el alcance de cátedras específicas', () => {
    // Cátedra alcanzada
    const rOk = obtenerLicenciaParaFecha('2026-11-03', 'cat-sistemas', mockLicencias);
    expect(rOk).not.toBeNull();
    expect(rOk.articulo_codigo).toBe('ART_52');

    // Otra cátedra en la misma fecha no está alcanzada
    const rOtro = obtenerLicenciaParaFecha('2026-11-03', 'cat-fisica', mockLicencias);
    expect(rOtro).toBeNull();
  });

  it('Detecta licencia directamente desde los atributos de claseObj si ya está ausente', () => {
    const claseFalta = {
      id: 'cls-100',
      fecha: '2026-08-20',
      estado: 'DOCENTE_AUSENTE',
      articulo_licencia: 'Art. 16° - Afecciones de corto tratamiento',
      motivo_inasistencia: 'Gripe con reposo 48hs'
    };

    const res = obtenerLicenciaParaFecha('2026-08-20', 'cat-x', [], claseFalta);
    expect(res).not.toBeNull();
    expect(res.esLicencia).toBe(true);
    expect(res.articulo).toContain('Art. 16°');
    expect(res.observacion).toBe('Gripe con reposo 48hs');
  });

  it('Tolera fechas en formato ISO completo con timestamps', () => {
    const res = obtenerLicenciaParaFecha('2026-10-12T19:30:00.000Z', 'cat-1', mockLicencias);
    expect(res).not.toBeNull();
    expect(res.esLicencia).toBe(true);
  });
});
