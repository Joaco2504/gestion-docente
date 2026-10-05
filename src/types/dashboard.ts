/**
 * Interfaces TypeScript para el panel de control docente (Dashboard) y RPCs de PostgreSQL.
 */

import { type NivelEducativo, type ModalidadCursado } from '../lib/enums';
import { type EarlyWarningRisk } from './academic';

export interface DashboardResumenRPCResponse {
  total_catedras: number;
  total_alumnos: number;
  total_clases_mes: number;
  promedio_asistencia_global: number;
  alertas_criticas_total: number;
  catedras_metricas?: Array<{
    id: string;
    nombre: string;
    nivel?: NivelEducativo | string;
    alumnos_count: number;
    asistencia_promedio: number;
  }>;
}

export interface DashboardAgendaRPCResponse {
  agenda: Array<{
    id: string;
    catedra_id: string;
    catedra_nombre: string;
    institucion_nombre?: string;
    fecha: string;
    dia_semana?: string;
    hora_inicio?: string;
    hora_fin?: string;
    aula?: string;
    tema?: string;
    es_hoy?: boolean;
    dias_restantes?: number;
  }>;
}

export interface ProximaClaseInfo {
  id?: string;
  catedraId: string;
  catedraNombre: string;
  institucionNombre?: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  aula?: string;
  tema?: string;
  esHoy: boolean;
  minutosRestantes?: number;
  estadoEnVivo?: 'EN_CURSO' | 'INMINENTE' | 'PROXIMA';
}

export interface DashboardMetricStats {
  totalCatedras: number;
  totalEstudiantes: number;
  clasesDictadasMes: number;
  asistenciaGlobalPct: number;
  alertasRiesgoTotal: number;
}

export interface DashboardAgendaItem {
  id: string;
  catedraId: string;
  catedraNombre: string;
  institucionNombre?: string;
  fecha: string;
  horaInicio?: string;
  horaFin?: string;
  aula?: string;
  tema?: string;
  esHoy: boolean;
  etiquetaFecha: string;
}

export interface DashboardAlertaPedagogica {
  id: string;
  estudianteId: string;
  estudianteNombre: string;
  catedraId: string;
  catedraNombre: string;
  risk: EarlyWarningRisk;
}
