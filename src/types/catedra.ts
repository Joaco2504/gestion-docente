/**
 * Interfaces TypeScript, tipos y constantes compartidas para el ecosistema de Cátedras.
 * Ubicación centralizada para evitar dependencias circulares entre CatedraDetailPage y sus componentes hijos.
 */

export type NivelEducativo = 'SECUNDARIO' | 'TERCIARIO' | 'UNIVERSITARIO' | 'PRIMARIO';
export type ModalidadCursado = 'ANUAL' | 'CUATRIMESTRAL' | 'BIMESTRAL';
export type CondicionEstudiante = 'PROMOCIONAL' | 'REGULAR' | 'LIBRE' | 'APROBADO' | 'DESAPROBADO';
export type EstadoAsistencia = 'PRESENTE' | 'AUSENTE' | 'JUSTIFICADO';
export type TipoEvaluacion = 'PARCIAL' | 'RECUPERATORIO' | 'TP' | 'FINAL' | 'COLOQUIO';

export type CatedraTabId = 
  | 'alumnos' 
  | 'asistencias' 
  | 'calificaciones' 
  | 'unidades' 
  | 'libro-temas' 
  | 'recursos' 
  | 'configuracion';

export interface Institucion {
  id?: string;
  nombre: string;
  nivel?: NivelEducativo | string;
  cue?: string;
  direccion?: string;
}

export interface CicloLectivo {
  id?: string;
  nombre?: string;
  anio?: number | string;
  activo?: boolean;
}

export interface HorarioSemanal {
  dia: string;
  desde: string;
  hasta: string;
  aula?: string;
}

export interface CriteriosEvaluacion {
  min_asist_promo: number;
  min_asist_reg: number;
  nota_min_promo: number;
  nota_min_reg: number;
  nota_min_sec?: number;
}

export interface Catedra {
  id: string;
  nombre: string;
  nivel?: NivelEducativo | string;
  modalidad?: ModalidadCursado | string;
  docente_id?: string;
  institucion_id?: string;
  institucion_nombre?: string;
  instituciones?: Institucion | null;
  ciclo_id?: string;
  ciclos_lectivos?: CicloLectivo | null;
  horarios_semanales?: HorarioSemanal[];
  created_at?: string;
}

export interface Estudiante {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  email?: string;
  telefono?: string;
  docente_id?: string;
  created_at?: string;
  inscripciones?: Array<{
    id?: string;
    catedra_id?: string;
    catedras?: {
      id: string;
      nombre: string;
    };
  }>;
}

export interface Asistencia {
  id?: string;
  clase_id: string;
  estudiante_id: string;
  estado: EstadoAsistencia;
  docenteAusente?: boolean;
  inasistenciaDocente?: boolean;
  observacion?: string;
  fecha?: string;
}

export interface Clase {
  id: string;
  catedra_id: string;
  fecha: string;
  tema?: string;
  unidad_numero?: number;
  unidad_id?: string;
  unidades_tematicas?: {
    id?: string;
    numero?: number;
    titulo?: string;
  };
  observaciones?: string;
  docente_ausente?: boolean;
  horas_catedra?: number;
}

export interface Evaluacion {
  id: string;
  catedra_id: string;
  titulo: string;
  tipo: TipoEvaluacion | string;
  fecha?: string;
  ponderacion?: number;
  unidad_tematica_id?: string;
}

export interface Calificacion {
  id?: string;
  evaluacion_id: string;
  estudiante_id: string;
  valor?: number | string | null;
  nota?: number | string | null;
  observacion?: string;
}

export interface UnidadTematica {
  id: string;
  catedra_id: string;
  numero: number;
  titulo: string;
  descripcion?: string;
  created_at?: string;
}

export interface MesaExamen {
  id: string;
  catedra_id: string;
  docente_id: string;
  fecha: string;
  turno_llamado: string;
  libro?: string;
  tomo?: string;
  folio?: string;
  vocal1?: string;
  vocal2?: string;
  presidenta?: string;
  estudiantes_inscriptos?: number;
}

export const VALID_CATEDRA_TABS: CatedraTabId[] = [
  'alumnos',
  'asistencias',
  'calificaciones',
  'unidades',
  'libro-temas',
  'recursos',
  'configuracion'
];

export const DEFAULT_CRITERIOS_EVALUACION: CriteriosEvaluacion = {
  min_asist_promo: 80,
  min_asist_reg: 70,
  nota_min_promo: 7,
  nota_min_reg: 4,
  nota_min_sec: 6
};
