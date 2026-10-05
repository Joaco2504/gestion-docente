import React from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import {
  GraduationCap,
  Briefcase,
  Award,
  FileText,
  Edit3,
  UserMinus,
  RotateCcw
} from 'lucide-react';
import Badge from '../../common/Badge';
import RiskBadge from '../../common/RiskBadge';
import { formatFechaDMY } from '../../../lib/dateUtils';

const columnHelper = createColumnHelper();

/**
 * Column definitions for StudentsDataTable (Cursantes & Equivalencias)
 */
export function getStudentColumns({
  isEquivalencias,
  getStudentCondition,
  studentRiskMap,
  getCondBadgeVariant,
  onOpenStudentDetail,
  onOpenEdit,
  onOpenDelete,
  onOpenDeclararEquivalencia,
  onToggleCertificadoTrabajo,
  onRevertirEquivalencia
}) {
  if (isEquivalencias) {
    return [
      columnHelper.accessor('dni', {
        id: 'dni',
        header: 'DNI',
        cell: info => (
          <span className="font-mono tabular-nums font-medium text-text-secondary">
            {info.getValue() || '-'}
          </span>
        )
      }),
      columnHelper.accessor(row => `${row.apellido || ''}, ${row.nombre || ''}`, {
        id: 'estudiante',
        header: 'Estudiante',
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => onOpenStudentDetail?.(row.original)}
            className="text-left font-bold text-text-primary hover:text-primary transition-colors cursor-pointer"
            title="Ver ficha académica"
          >
            {row.original.apellido}, {row.original.nombre}
          </button>
        )
      }),
      columnHelper.accessor('resolucion_equivalencia', {
        id: 'resolucion',
        header: 'Resolución / Expediente',
        cell: info => (
          <div className="flex items-center gap-1.5 font-mono text-xs text-text-primary">
            <Award className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
            <span className="font-semibold">{info.getValue() || 'Resolución Registrada'}</span>
          </div>
        )
      }),
      columnHelper.accessor('fecha_equivalencia', {
        id: 'fecha',
        header: 'Fecha Acreditación',
        cell: info => (
          <span className="font-mono text-xs text-text-secondary">
            {info.getValue() ? formatFechaDMY(info.getValue()) : '-'}
          </span>
        )
      }),
      columnHelper.display({
        id: 'condicion',
        header: () => <span className="w-full text-center block">Condición</span>,
        cell: () => (
          <div className="flex justify-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
              <GraduationCap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
              <span>ACREDITADA (EQUIVALENCIA)</span>
            </span>
          </div>
        )
      }),
      columnHelper.display({
        id: 'acciones',
        header: () => <span className="w-full text-right block">Acciones</span>,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => onOpenStudentDetail?.(row.original)}
              className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-surface-hover transition-colors touch-target-44"
              title="Ver ficha académica"
              aria-label={`Ver ficha de ${row.original.apellido}, ${row.original.nombre}`}
            >
              <FileText className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onRevertirEquivalencia?.(row.original)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all touch-target-44 cursor-pointer"
              title="Revertir condición de equivalencia"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Revertir a Regular</span>
            </button>
          </div>
        )
      })
    ];
  }

  // Columnas para Cursantes
  return [
    columnHelper.accessor('dni', {
      id: 'dni',
      header: 'DNI',
      cell: info => (
        <span className="font-mono tabular-nums font-medium text-text-secondary">
          {info.getValue() || '-'}
        </span>
      )
    }),
    columnHelper.accessor('apellido', {
      id: 'apellido',
      header: 'Apellido',
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => onOpenStudentDetail?.(row.original)}
          className="text-left font-bold text-text-primary hover:text-primary transition-colors cursor-pointer"
          title="Ver ficha académica e historial"
        >
          {row.original.apellido || '-'}
        </button>
      )
    }),
    columnHelper.accessor('nombre', {
      id: 'nombre',
      header: 'Nombre',
      cell: ({ row }) => (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => onOpenStudentDetail?.(row.original)}
            className="text-left text-text-primary hover:text-primary transition-colors cursor-pointer"
            title="Ver ficha académica"
          >
            {row.original.nombre || '-'}
          </button>
          {row.original.tiene_certificado_trabajo && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20"
              title="Régimen Laboral Acreditado (60%)"
            >
              <Briefcase className="w-3 h-3 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              <span>Cert. Laboral (60%)</span>
            </span>
          )}
        </div>
      )
    }),
    columnHelper.accessor(row => getStudentCondition?.(row.id) || '', {
      id: 'condicion',
      header: () => <span className="w-full text-center block">Condición</span>,
      cell: ({ row }) => {
        const st = row.original;
        const cond = getStudentCondition?.(st.id);
        const isAcreditado = st.estado_academico === 'ACREDITADO';
        const notaFinal = st.nota_final ?? st.nota_final_acreditacion ?? null;
        const risk = studentRiskMap?.get(st.id);

        return (
          <div className="flex items-center justify-center gap-1.5">
            {st.es_equivalencia ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                <GraduationCap className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                <span>Acreditada (Equiv.)</span>
              </span>
            ) : isAcreditado ? (
              <button
                type="button"
                onClick={() => onOpenStudentDetail?.(st)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all cursor-pointer shadow-2xs"
                title={`Materia Acreditada (Calificación Final: ${notaFinal ?? 'Aprobado'})`}
              >
                <GraduationCap className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                <span>Acreditado ({notaFinal ?? 'Aprobado'})</span>
              </button>
            ) : (
              <>
                <Badge variant={getCondBadgeVariant ? getCondBadgeVariant(cond) : 'default'}>
                  {cond || 'SIN CONDICIÓN'}
                </Badge>
                {risk && <RiskBadge risk={risk} compact />}
              </>
            )}
          </div>
        );
      }
    }),
    columnHelper.display({
      id: 'acciones',
      header: () => <span className="w-full text-right block">Acciones</span>,
      cell: ({ row }) => {
        const st = row.original;
        return (
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => onOpenStudentDetail?.(st)}
              className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-surface-hover transition-colors touch-target-44"
              title="Ver ficha del estudiante"
              aria-label={`Ver ficha de ${st.apellido}`}
            >
              <FileText className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onToggleCertificadoTrabajo?.(st)}
              className={`p-1.5 rounded-lg transition-colors touch-target-44 ${
                st.tiene_certificado_trabajo
                  ? 'text-blue-600 bg-blue-500/15 hover:bg-blue-500/25'
                  : 'text-text-muted hover:text-blue-600 hover:bg-surface-hover'
              }`}
              title={st.tiene_certificado_trabajo ? "Quitar Certificado de Trabajo" : "Registrar Certificado Laboral"}
            >
              <Briefcase className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onOpenDeclararEquivalencia?.(st)}
              className="p-1.5 rounded-lg text-text-muted hover:text-emerald-600 hover:bg-emerald-500/10 transition-colors touch-target-44"
              title="Declarar Acreditación por Equivalencia"
            >
              <Award className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onOpenEdit?.(st)}
              className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-surface-hover transition-colors touch-target-44"
              title="Editar datos del alumno"
            >
              <Edit3 className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onOpenDelete?.(st)}
              className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors touch-target-44"
              title="Dar de baja de la cátedra"
            >
              <UserMinus className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        );
      }
    })
  ];
}
