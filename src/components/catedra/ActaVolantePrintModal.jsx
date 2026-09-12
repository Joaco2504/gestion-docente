import React from 'react';
import { Printer, X, Award, FileText, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import Button from '../common/Button';
import { formatFechaDMY } from '../../lib/dateUtils';

/**
 * Convierte una nota numérica entera o decimal a su representación en letras reglamentaria.
 */
function notaEnLetras(nota) {
  if (nota === null || nota === undefined || nota === '') return '-';
  const num = Math.round(Number(nota));
  const diccionario = {
    1: 'UNO',
    2: 'DOS',
    3: 'TRES',
    4: 'CUATRO',
    5: 'CINCO',
    6: 'SEIS',
    7: 'SIETE',
    8: 'OCHO',
    9: 'NUEVE',
    10: 'DIEZ'
  };
  return diccionario[num] || String(num);
}

/**
 * ActaVolantePrintModal - Vista de impresión membretada reglamentaria del Acta Volante de Examen Final.
 */
export default function ActaVolantePrintModal({
  isOpen,
  onClose,
  mesa,
  alumnos = [],
  catedra,
  institucionNombre = '',
  cicloAnio = '2026'
}) {
  if (!isOpen || !mesa) return null;

  const handlePrint = () => {
    window.print();
  };

  // Cálculos estadísticos oficiales
  const totalInscriptos = alumnos.length;
  const ausentesCount = alumnos.filter(a => a.dictamen === 'AUSENTE').length;
  const presentesCount = totalInscriptos - ausentesCount;
  const aprobadosCount = alumnos.filter(a => a.dictamen === 'APROBADO').length;
  const desaprobadosCount = alumnos.filter(a => a.dictamen === 'DESAPROBADO').length;
  const porcentajeAprobacion = presentesCount > 0 
    ? Math.round((aprobadosCount / presentesCount) * 100) 
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      {/* Contenedor Modal en Pantalla / Documento A4 en Impresión */}
      <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden print:max-w-none print:w-full print:max-h-none print:border-none print:shadow-none print:rounded-none print:bg-white print:text-black">
        
        {/* Barra Superior no imprimible */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between gap-3 shrink-0 print:hidden bg-surface">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-primary">
                Acta Volante de Exámenes Finales
              </h3>
              <p className="text-xs text-text-muted">
                Documento reglamentario para archivo en Secretaría Académica y Libro Matriz.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              icon={Printer}
              size="sm"
              onClick={handlePrint}
              className="text-xs font-bold shadow-xs"
            >
              Imprimir / Guardar como PDF
            </Button>
            <button
              onClick={onClose}
              className="p-2 text-text-muted hover:text-text-primary rounded-xl hover:bg-surface-hover transition-colors"
              title="Cerrar vista previa"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Hoja de Documento Membretado Oficial */}
        <div className="p-6 sm:p-10 overflow-y-auto flex-1 space-y-6 print:p-0 print:overflow-visible print:text-black bg-white text-slate-900 font-sans">
          
          {/* 1. MEMBRETE INSTITUCIONAL FORMAL */}
          <div className="border-b-2 border-slate-900 pb-4 space-y-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 block">
                  REPÚBLICA ARGENTINA • MINISTERIO DE EDUCACIÓN
                </span>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 uppercase">
                  {institucionNombre || catedra?.instituciones?.nombre || 'INSTITUTO DE EDUCACIÓN SUPERIOR'}
                </h1>
                <p className="text-xs font-semibold text-slate-600">
                  Nivel Terciario / Universitario • Ciclo Lectivo {cicloAnio}
                </p>
              </div>

              <div className="text-right sm:self-center border-2 border-slate-900 rounded-lg p-2.5 bg-slate-50 text-xs font-mono shrink-0">
                <span className="block font-black text-slate-900 text-sm">ACTA VOLANTE</span>
                <span className="text-slate-600 uppercase font-semibold">Examen Final Ordinario / Extraordinario</span>
              </div>
            </div>

            {/* Metadatos de la Mesa de Examen y Cátedra */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs border-t border-slate-300">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Espacio Curricular</span>
                <strong className="text-slate-900 text-sm">{catedra?.nombre || 'Cátedra'}</strong>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Fecha de Examen</span>
                <span className="text-slate-800 font-semibold">{formatFechaDMY(mesa.fecha)}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Turno / Llamado</span>
                <span className="text-slate-800 font-semibold uppercase">{mesa.turno_llamado || '1° LLAMADO'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Carrera / Plan</span>
                <span className="text-slate-800 font-semibold">{catedra?.carrera || catedra?.nivel || 'Nivel Superior'}</span>
              </div>
            </div>

            {/* Cuadro de Registro Matriz (Libro, Tomo, Folio, Acta) */}
            <div className="grid grid-cols-4 gap-2 p-2.5 bg-slate-100 rounded-lg border border-slate-300 text-center text-xs font-mono font-bold">
              <div>
                <span className="text-[9px] uppercase text-slate-500 block font-sans">Libro N°</span>
                <span className="text-slate-900">{mesa.libro || '—'}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase text-slate-500 block font-sans">Tomo N°</span>
                <span className="text-slate-900">{mesa.tomo || '—'}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase text-slate-500 block font-sans">Folio N°</span>
                <span className="text-slate-900">{mesa.folio || '—'}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase text-slate-500 block font-sans">Acta N°</span>
                <span className="text-slate-900">{mesa.acta_numero || '—'}</span>
              </div>
            </div>
          </div>

          {/* 2. TABLA OFICIAL REGLAMENTARIA DE ALUMNOS */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs border border-slate-400">
              <thead>
                <tr className="bg-slate-200 border-b border-slate-400 text-slate-900 text-[11px] uppercase font-bold">
                  <th className="p-2 border-r border-slate-400 text-center w-10">N°</th>
                  <th className="p-2 border-r border-slate-400 w-24">D.N.I.</th>
                  <th className="p-2 border-r border-slate-400">Apellido y Nombres</th>
                  <th className="p-2 border-r border-slate-400 text-center w-20">Condición</th>
                  <th className="p-2 border-r border-slate-400 text-center w-14">Escrito</th>
                  <th className="p-2 border-r border-slate-400 text-center w-14">Oral</th>
                  <th className="p-2 border-r border-slate-400 text-center w-36">Nota Definitiva</th>
                  <th className="p-2 text-center w-28">Dictamen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {alumnos.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="p-6 text-center text-slate-500 italic">
                      No hay alumnos registrados en esta mesa de examen.
                    </td>
                  </tr>
                ) : (
                  alumnos.map((alumno, idx) => {
                    const isAprobado = alumno.dictamen === 'APROBADO';
                    const isDesaprobado = alumno.dictamen === 'DESAPROBADO';
                    const isAusente = alumno.dictamen === 'AUSENTE';

                    const notaLetras = alumno.nota_definitiva !== null && alumno.nota_definitiva !== undefined && alumno.nota_definitiva !== ''
                      ? `${alumno.nota_definitiva} (${notaEnLetras(alumno.nota_definitiva)})`
                      : '—';

                    return (
                      <tr key={alumno.id || idx} className="hover:bg-slate-50 transition-colors">
                        <td className="p-2 border-r border-slate-300 text-center font-mono font-bold text-slate-700">
                          {idx + 1}
                        </td>
                        <td className="p-2 border-r border-slate-300 font-mono text-slate-800">
                          {alumno.alumno_dni || '—'}
                        </td>
                        <td className="p-2 border-r border-slate-300 font-bold text-slate-900 uppercase">
                          {alumno.alumno_nombre_completo || 'Sin nombre'}
                        </td>
                        <td className="p-2 border-r border-slate-300 text-center font-semibold text-[10px] uppercase">
                          {alumno.condicion_previa || 'REGULAR'}
                        </td>
                        <td className="p-2 border-r border-slate-300 text-center font-mono font-semibold">
                          {alumno.nota_escrito !== null && alumno.nota_escrito !== undefined ? alumno.nota_escrito : '—'}
                        </td>
                        <td className="p-2 border-r border-slate-300 text-center font-mono font-semibold">
                          {alumno.nota_oral !== null && alumno.nota_oral !== undefined ? alumno.nota_oral : '—'}
                        </td>
                        <td className="p-2 border-r border-slate-300 text-center font-mono font-bold text-slate-900 text-[11px]">
                          {notaLetras}
                        </td>
                        <td className="p-2 text-center font-bold text-[11px] uppercase">
                          <span
                            className={
                              isAprobado
                                ? 'text-emerald-700 font-black'
                                : isDesaprobado
                                ? 'text-rose-700 font-black'
                                : 'text-slate-500 font-semibold'
                            }
                          >
                            {alumno.dictamen || 'AUSENTE'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* 3. RESUMEN ESTADÍSTICO REGLAMENTARIO */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-300 grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs font-mono">
            <div className="p-1 border-r border-slate-200">
              <span className="text-[10px] uppercase text-slate-500 block font-sans font-semibold">Inscriptos</span>
              <strong className="text-slate-900 text-sm">{totalInscriptos}</strong>
            </div>
            <div className="p-1 border-r border-slate-200">
              <span className="text-[10px] uppercase text-slate-500 block font-sans font-semibold">Presentes</span>
              <strong className="text-slate-900 text-sm">{presentesCount}</strong>
            </div>
            <div className="p-1 border-r border-slate-200">
              <span className="text-[10px] uppercase text-slate-500 block font-sans font-semibold">Ausentes</span>
              <strong className="text-slate-700 text-sm">{ausentesCount}</strong>
            </div>
            <div className="p-1 border-r border-slate-200">
              <span className="text-[10px] uppercase text-emerald-700 block font-sans font-semibold">Aprobados</span>
              <strong className="text-emerald-700 text-sm">{aprobadosCount}</strong>
            </div>
            <div className="p-1 border-r border-slate-200">
              <span className="text-[10px] uppercase text-rose-700 block font-sans font-semibold">Desaprobados</span>
              <strong className="text-rose-700 text-sm">{desaprobadosCount}</strong>
            </div>
            <div className="p-1">
              <span className="text-[10px] uppercase text-primary block font-sans font-semibold">% Aprobación</span>
              <strong className="text-primary text-sm">{porcentajeAprobacion}%</strong>
            </div>
          </div>

          {/* 4. BLOQUE DE FIRMAS DEL TRIBUNAL EVALUADOR */}
          <div className="pt-8 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center text-xs">
              
              {/* Vocal 1 */}
              <div className="flex flex-col items-center">
                <div className="w-48 border-b-2 border-slate-800 mb-2"></div>
                <strong className="text-slate-900 uppercase font-bold text-[11px]">
                  {mesa.vocal1 || 'Prof. Vocal 1'}
                </strong>
                <span className="text-[10px] text-slate-500 font-semibold uppercase">Primer Vocal Evaluador</span>
                <span className="text-[9px] text-slate-400">Aclaración / D.N.I.</span>
              </div>

              {/* Presidente */}
              <div className="flex flex-col items-center">
                <div className="w-48 border-b-2 border-slate-800 mb-2"></div>
                <strong className="text-slate-900 uppercase font-bold text-[11px]">
                  {mesa.presidente || catedra?.docentes?.nombre || 'Prof. Presidente de Mesa'}
                </strong>
                <span className="text-[10px] text-slate-500 font-semibold uppercase">Presidente de Tribunal</span>
                <span className="text-[9px] text-slate-400">Firma y Sello Docente</span>
              </div>

              {/* Vocal 2 */}
              <div className="flex flex-col items-center">
                <div className="w-48 border-b-2 border-slate-800 mb-2"></div>
                <strong className="text-slate-900 uppercase font-bold text-[11px]">
                  {mesa.vocal2 || 'Prof. Vocal 2'}
                </strong>
                <span className="text-[10px] text-slate-500 font-semibold uppercase">Segundo Vocal Evaluador</span>
                <span className="text-[9px] text-slate-400">Aclaración / D.N.I.</span>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400 italic">
              <span>Constancia emitida por PlanillaDocente para control y archivo oficial de actas.</span>
              <span>Página 1 de 1</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
