/**
 * Interfaces TypeScript para el motor de cálculo académico y alertas tempranas de Korum.
 */

import {
  type EstadoAcademico,
  type EstadoAsistencia,
  type NivelEducativo,
  type TipoEvaluacion
} from '../lib/enums';
import { type CriteriosEvaluacion } from './catedra';

export type {
  AsistenciaItem,
  ClaseItem,
  EvaluacionItem,
  NotaItem,
  EvaluacionResultadoRAM,
  CriteriosRamCatedra
} from '../utils/ramCalculator';

export interface PorcentajeAsistenciaOptions {
  asistencias?: Array<{
    estado: EstadoAsistencia | string;
    docenteAusente?: boolean;
    inasistenciaDocente?: boolean;
  }>;
  totalClases?: number;
  clasesConLicencia?: number;
}

export interface CondicionFinalOptions {
  nivel?: NivelEducativo | string;
  asistencias?: Array<{
    estado: EstadoAsistencia | string;
    docenteAusente?: boolean;
    inasistenciaDocente?: boolean;
  }>;
  evaluaciones?: Array<{
    id: string;
    titulo?: string;
    tipo?: TipoEvaluacion | string;
    fecha?: string;
  }>;
  notas?: Array<{
    evaluacion_id: string;
    nota?: number | string | null;
    valor?: number | string | null;
  }>;
  totalClases?: number;
  criteriosPersonalizados?: Partial<CriteriosEvaluacion>;
  tieneCertificadoTrabajo?: boolean;
}

export interface CalculoCondicionResult {
  condicion: EstadoAcademico;
  porcentajeAsistencia: number;
  promedioNotas: number | null;
  promedioPonderado?: number | null;
  evaluacionesAprobadas: number;
  evaluacionesTotal: number;
  cumpleAsistencia: boolean;
  cumpleNotas: boolean;
  motivos?: string[];
}

export type EarlyWarningLevel = 'OPTIMAL' | 'WARNING' | 'CRITICAL';

export interface EarlyWarningRisk {
  level: EarlyWarningLevel;
  score: number;
  reasons: string[];
  primaryReason?: string;
  badgeLabel: string;
  asistPct?: number;
  promedio?: number | null;
  aprobadasRatio?: string;
}

export interface AcreditacionEquivalencia {
  estudiante_id: string;
  catedra_id: string;
  resolucion_equivalencia: string;
  fecha_equivalencia?: string;
  nota_final_acreditacion?: number | null;
}

export interface EstudianteCatedra {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  email?: string;
  telefono?: string;
  inscripcion_id?: string;
  catedra_id?: string;
  ciclo_id?: string;
  estado_academico?: EstadoAcademico | string;
  condicion?: string;
  nota_final?: number | null;
  nota_final_acreditacion?: number | null;
  fecha_acreditacion?: string | null;
  es_equivalencia?: boolean;
  tiene_certificado_trabajo?: boolean;
  resolucion_equivalencia?: string | null;
  fecha_equivalencia?: string | null;
  ciclo_nombre?: string;
  ciclo_anio?: number | string;
}
