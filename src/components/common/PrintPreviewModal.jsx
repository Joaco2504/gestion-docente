import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  X, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  FileText, 
  BookOpen, 
  Award, 
  CheckSquare, 
  GraduationCap, 
  ShieldCheck, 
  Maximize2,
  Calendar,
  Building,
  User,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import Button from './Button';
import { formatFechaDMY } from '../../lib/dateUtils';

/**
 * Convierte una nota numérica a su representación reglamentaria en letras.
 */
function notaEnLetras(nota) {
  if (nota === null || nota === undefined || nota === '') return '—';
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
 * PrintPreviewModal - Visor Documental Unificado de Alta Fidelidad
 * Simula una hoja física A4 antes de imprimir o generar el archivo PDF.
 */
export default function PrintPreviewModal({
  isOpen,
  onClose,
  title = 'Documento Oficial',
  subtitle = 'Vista previa para rúbrica reglamentaria y archivo en Secretaría Académica',
  type = 'libro-temas', // 'libro-temas' | 'acta-examen' | 'calificaciones' | 'asistencias'
  data = {},
  defaultOrientation
}) {
  // Para Calificaciones y Asistencias se recomienda horizontal (landscape) por ancho de columnas
  const initialOrientation = defaultOrientation || (
    type === 'calificaciones' || type === 'asistencias' ? 'landscape' : 'portrait'
  );

  const [orientation, setOrientation] = useState(initialOrientation);
  const [zoom, setZoom] = useState(100);

  // Actualizar orientación al cambiar de tipo
  useEffect(() => {
    if (defaultOrientation) {
      setOrientation(defaultOrientation);
    } else {
      setOrientation(type === 'calificaciones' || type === 'asistencias' ? 'landscape' : 'portrait');
    }
    setZoom(100);
  }, [type, defaultOrientation, isOpen]);

  // Manejo de atajo Esc para cerrar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 15, 130));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 15, 70));
  };

  const toggleOrientation = () => {
    setOrientation(prev => prev === 'portrait' ? 'landscape' : 'portrait');
  };

  const getDocIcon = () => {
    switch (type) {
      case 'libro-temas': return BookOpen;
      case 'acta-examen': return Award;
      case 'calificaciones': return GraduationCap;
      case 'asistencias': return CheckSquare;
      default: return FileText;
    }
  };

  const DocIcon = getDocIcon();

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/85 backdrop-blur-md overflow-hidden print:p-0 print:bg-white print:static print:overflow-visible">
      
      {/* =========================================================================
          BARRA SUPERIOR FLOTANTE DE HERRAMIENTAS (Oculta en Impresión)
      ========================================================================= */}
      <header className="px-4 py-3 bg-slate-900/95 border-b border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 print:hidden z-20 text-white shadow-xl">
        
        {/* Título del Documento e Icono */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="p-2 rounded-xl bg-primary/20 text-primary-light shrink-0">
            <DocIcon className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-white tracking-tight truncate">
              {title}
            </h2>
            <p className="text-[11px] text-slate-400 truncate hidden md:block">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Controles: Orientación y Zoom */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-center">
          
          {/* Selector de Orientación */}
          <button
            type="button"
            onClick={toggleOrientation}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
            title="Cambiar orientación de página para visualización e impresión"
          >
            <RotateCw className="w-3.5 h-3.5 text-primary" />
            <span className="hidden xs:inline">Hoja:</span>
            <span className="font-bold text-white uppercase text-[11px]">
              {orientation === 'landscape' ? 'Horizontal' : 'Vertical'}
            </span>
          </button>

          {/* Selector de Zoom */}
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1 text-xs font-mono">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoom <= 70}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 disabled:opacity-30 transition-colors cursor-pointer"
              title="Reducir zoom"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoom(100)}
              className="px-2 font-bold text-slate-200 hover:text-white cursor-pointer"
              title="Restablecer zoom a 100%"
            >
              {zoom}%
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoom >= 130}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 disabled:opacity-30 transition-colors cursor-pointer"
              title="Aumentar zoom"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Acciones: Imprimir / PDF y Cerrar */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            variant="primary"
            icon={Printer}
            size="sm"
            onClick={handlePrint}
            className="text-xs font-bold shadow-md flex-1 sm:flex-initial"
          >
            Imprimir / Guardar como PDF
          </Button>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            title="Cerrar vista previa (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* =========================================================================
          ÁREA SCROLLABLE DEL VISOR DOCUMENTAL
      ========================================================================= */}
      <main className="flex-1 overflow-y-auto overflow-x-auto p-3 sm:p-8 flex justify-center items-start print:p-0 print:overflow-visible print:block">
        
        {/* Hoja física simulada con zoom interactivo */}
        <div 
          className={`w-full transition-transform duration-150 origin-top print:transform-none ${
            orientation === 'landscape' ? 'max-w-6xl print-landscape' : 'max-w-4xl'
          }`}
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
        >
          <div className="printable-sheet bg-white text-slate-900 shadow-2xl rounded-sm p-6 sm:p-12 border border-slate-300 font-sans print:p-0 print:border-none print:shadow-none print:max-w-none">
            
            {/* RENDERIZADO DE LA PLANTILLA SELECCIONADA */}
            {type === 'libro-temas' && (
              <LibroTemasTemplate data={data} />
            )}

            {type === 'acta-examen' && (
              <ActaVolanteTemplate data={data} />
            )}

            {type === 'calificaciones' && (
              <CalificacionesTemplate data={data} />
            )}

            {type === 'asistencias' && (
              <AsistenciasTemplate data={data} />
            )}

          </div>
        </div>
      </main>

    </div>
  );
}

// =============================================================================
// PLANTILLA 1: LIBRO DE TEMAS DIGITAL
// =============================================================================
function LibroTemasTemplate({ data }) {
  const {
    catedra = {},
    clases = [],
    institucionNombre = '',
    cicloAnio = '2026',
    docenteNombre = ''
  } = data;

  const sortedClases = [...clases].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  const totalHorasDictadas = sortedClases.reduce((acc, c) => acc + Number(c.horas_catedra || 2), 0);

  return (
    <div className="space-y-6">
      {/* 1. Membrete Institucional Formal */}
      <div className="border-b-2 border-slate-900 pb-4 space-y-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 block">
              REPÚBLICA ARGENTINA • MINISTERIO DE EDUCACIÓN
            </span>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 uppercase">
              {institucionNombre || catedra?.instituciones?.nombre || catedra?.institucion_nombre || 'INSTITUTO DE EDUCACIÓN SUPERIOR'}
            </h1>
            <p className="text-xs font-semibold text-slate-600">
              Nivel: {catedra?.nivel || 'TERCIARIO'} • Ciclo Lectivo {cicloAnio}
            </p>
          </div>

          <div className="text-right sm:self-center border-2 border-slate-900 rounded-lg p-2.5 bg-slate-50 text-xs font-mono shrink-0">
            <span className="block font-black text-slate-900 text-sm">LIBRO DE TEMAS</span>
            <span className="text-slate-600 uppercase font-semibold">Registro Pedagógico Oficial</span>
          </div>
        </div>

        {/* Metadatos de la Cátedra */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs border-t border-slate-300">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Espacio Curricular</span>
            <strong className="text-slate-900 text-sm">{catedra?.nombre || 'Cátedra'}</strong>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Docente Titular</span>
            <span className="text-slate-800 font-semibold">{docenteNombre || catedra?.docentes?.nombre || 'Prof. a cargo'}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Carrera / Plan</span>
            <span className="text-slate-800 font-semibold">{catedra?.carrera || catedra?.nivel || 'Nivel Terciario'}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Régimen / Modalidad</span>
            <span className="text-slate-800 font-semibold">{catedra?.modalidad || 'ANUAL'}</span>
          </div>
        </div>

        {/* Cómputo de horas */}
        <div className="flex justify-between items-center p-2.5 bg-slate-100 rounded-lg border border-slate-300 text-xs font-mono font-bold">
          <span>Clases Dictadas Registradas: <b>{sortedClases.length}</b></span>
          <span>Carga Horaria Total Dictada: <b>{totalHorasDictadas} hs cátedra</b></span>
        </div>
      </div>

      {/* 2. Tabla Membretada de Clases */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs border border-slate-400">
          <thead>
            <tr className="bg-slate-200 border-b border-slate-400 text-slate-900 text-[11px] uppercase font-bold">
              <th className="p-2 border-r border-slate-400 text-center w-10">N°</th>
              <th className="p-2 border-r border-slate-400 w-24">Fecha</th>
              <th className="p-2 border-r border-slate-400 text-center w-14">Hs.</th>
              <th className="p-2 border-r border-slate-400 w-28">Carácter</th>
              <th className="p-2 border-r border-slate-400">Contenido / Tema Desarrollado</th>
              <th className="p-2 border-r border-slate-400 w-44">Observaciones</th>
              <th className="p-2 text-center w-28">Firma Docente</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300">
            {sortedClases.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-8 text-center text-slate-500 italic">
                  No se registraron clases desarrolladas en este ciclo lectivo.
                </td>
              </tr>
            ) : (
              sortedClases.map((clase, idx) => (
                <tr key={clase.id || idx} className="print-row hover:bg-slate-50">
                  <td className="p-2 border-r border-slate-300 text-center font-mono font-bold text-slate-700">
                    {idx + 1}
                  </td>
                  <td className="p-2 border-r border-slate-300 font-mono text-slate-800 whitespace-nowrap">
                    {formatFechaDMY(clase.fecha)}
                  </td>
                  <td className="p-2 border-r border-slate-300 text-center font-mono font-bold">
                    {clase.horas_catedra || 2}
                  </td>
                  <td className="p-2 border-r border-slate-300 text-[10px] uppercase font-semibold text-slate-700">
                    {clase.caracter || 'TEÓRICA'}
                  </td>
                  <td className="p-2 border-r border-slate-300 text-slate-900 font-medium leading-relaxed">
                    {clase.tema || 'Sin tema especificado'}
                  </td>
                  <td className="p-2 border-r border-slate-300 text-slate-600 text-[11px] italic">
                    {clase.observaciones || '—'}
                  </td>
                  <td className="p-2 border-slate-300 text-center">
                    <div className="h-6 border-b border-dotted border-slate-300"></div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 3. Cuadro de Rúbrica para Dirección y Secretaría Académica */}
      <div className="pt-8 pb-4 print-avoid-break">
        <div className="grid grid-cols-2 gap-12 text-center text-xs">
          <div className="flex flex-col items-center">
            <div className="w-56 border-b-2 border-slate-800 mb-2"></div>
            <strong className="text-slate-900 uppercase font-bold text-xs">
              {docenteNombre || catedra?.docentes?.nombre || 'Docente Titular'}
            </strong>
            <span className="text-[10px] text-slate-500 uppercase">Firma del Profesor a Cargo</span>
          </div>

          <div className="flex flex-col items-center">
            <div className="w-56 border-b-2 border-slate-800 mb-2"></div>
            <strong className="text-slate-900 uppercase font-bold text-xs">
              Secretaría Académica / Dirección
            </strong>
            <span className="text-[10px] text-slate-500 uppercase">Visado Institucional y Sello</span>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400 italic">
          <span>Libro de Temas generado mediante PlanillaDocente para archivo oficial.</span>
          <span>Página 1 de 1</span>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// PLANTILLA 2: ACTA VOLANTE DE EXAMEN
// =============================================================================
function ActaVolanteTemplate({ data }) {
  const {
    mesa = {},
    alumnos = [],
    catedra = {},
    institucionNombre = '',
    cicloAnio = '2026'
  } = data;

  const totalInscriptos = alumnos.length;
  const ausentesCount = alumnos.filter(a => a.dictamen === 'AUSENTE').length;
  const presentesCount = totalInscriptos - ausentesCount;
  const aprobadosCount = alumnos.filter(a => a.dictamen === 'APROBADO').length;
  const desaprobadosCount = alumnos.filter(a => a.dictamen === 'DESAPROBADO').length;
  const porcentajeAprobacion = presentesCount > 0 
    ? Math.round((aprobadosCount / presentesCount) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* 1. Membrete Formal y Matriz */}
      <div className="border-b-2 border-slate-900 pb-4 space-y-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 block">
              REPÚBLICA ARGENTINA • MINISTERIO DE EDUCACIÓN
            </span>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 uppercase">
              {institucionNombre || catedra?.instituciones?.nombre || catedra?.institucion_nombre || 'INSTITUTO DE EDUCACIÓN SUPERIOR'}
            </h1>
            <p className="text-xs font-semibold text-slate-600">
              Nivel: {catedra?.nivel || 'TERCIARIO'} • Ciclo Lectivo {cicloAnio}
            </p>
          </div>

          <div className="text-right sm:self-center border-2 border-slate-900 rounded-lg p-2.5 bg-slate-50 text-xs font-mono shrink-0">
            <span className="block font-black text-slate-900 text-sm">ACTA VOLANTE</span>
            <span className="text-slate-600 uppercase font-semibold">Examen Final Ordinario / Especial</span>
          </div>
        </div>

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
            <span className="text-slate-800 font-semibold">{catedra?.carrera || catedra?.nivel || 'Nivel Terciario'}</span>
          </div>
        </div>

        {/* Cuadro Matriz: Libro, Tomo, Folio, Acta */}
        <div className="grid grid-cols-4 gap-2 p-2 bg-slate-100 rounded-lg border border-slate-300 text-center text-xs font-mono font-bold">
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

      {/* 2. Nómina de Alumnos y Calificaciones */}
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
                  No hay alumnos inscriptos en esta acta de examen.
                </td>
              </tr>
            ) : (
              alumnos.map((alumno, idx) => {
                const notaLetras = alumno.nota_definitiva !== null && alumno.nota_definitiva !== undefined && alumno.nota_definitiva !== ''
                  ? `${alumno.nota_definitiva} (${notaEnLetras(alumno.nota_definitiva)})`
                  : '—';

                return (
                  <tr key={alumno.id || idx} className="print-row hover:bg-slate-50">
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
                      {alumno.nota_escrito ?? '—'}
                    </td>
                    <td className="p-2 border-r border-slate-300 text-center font-mono font-semibold">
                      {alumno.nota_oral ?? '—'}
                    </td>
                    <td className="p-2 border-r border-slate-300 text-center font-mono font-bold text-slate-900 text-[11px]">
                      {notaLetras}
                    </td>
                    <td className="p-2 text-center font-bold text-[11px] uppercase">
                      <span className={alumno.dictamen === 'APROBADO' ? 'text-emerald-700 font-black' : alumno.dictamen === 'DESAPROBADO' ? 'text-rose-700 font-black' : 'text-slate-500'}>
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

      {/* 3. Resumen Estadístico */}
      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-300 grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs font-mono print-avoid-break">
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

      {/* 4. Triple Bloque de Firmas */}
      <div className="pt-8 pb-4 print-avoid-break">
        <div className="grid grid-cols-3 gap-6 text-center text-xs">
          <div className="flex flex-col items-center">
            <div className="w-40 border-b-2 border-slate-800 mb-2"></div>
            <strong className="text-slate-900 uppercase font-bold text-[11px]">{mesa.vocal1 || 'Prof. Vocal 1'}</strong>
            <span className="text-[10px] text-slate-500 uppercase">Primer Vocal Evaluador</span>
          </div>

          <div className="flex flex-col items-center">
            <div className="w-40 border-b-2 border-slate-800 mb-2"></div>
            <strong className="text-slate-900 uppercase font-bold text-[11px]">{mesa.presidente || catedra?.docentes?.nombre || 'Presidente de Mesa'}</strong>
            <span className="text-[10px] text-slate-500 uppercase">Presidente del Tribunal</span>
          </div>

          <div className="flex flex-col items-center">
            <div className="w-40 border-b-2 border-slate-800 mb-2"></div>
            <strong className="text-slate-900 uppercase font-bold text-[11px]">{mesa.vocal2 || 'Prof. Vocal 2'}</strong>
            <span className="text-[10px] text-slate-500 uppercase">Segundo Vocal Evaluador</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// PLANTILLA 3: PLANILLA INTEGRAL DE CALIFICACIONES
// =============================================================================
function CalificacionesTemplate({ data }) {
  const {
    catedra = {},
    estudiantes = [],
    evaluaciones = [],
    notas = [],
    matrixData = [],
    criterios = {},
    cicloAnio = '2026',
    institucionNombre = '',
    docenteNombre = ''
  } = data;

  const mainEvaluations = evaluaciones.filter(e => e.tipo !== 'RECUPERATORIO');

  // Cálculos estadísticos globales
  const totalAlumnos = matrixData.length;
  const promocionados = matrixData.filter(m => m.condicion?.condicion === 'PROMOCIONAL' || m.condicion?.condicion === 'APROBADO').length;
  const regulares = matrixData.filter(m => m.condicion?.condicion === 'REGULAR').length;
  const libres = matrixData.filter(m => m.condicion?.condicion === 'LIBRE' || m.condicion?.condicion === 'DESAPROBADO').length;

  return (
    <div className="space-y-6">
      {/* 1. Membrete Institucional Formal */}
      <div className="border-b-2 border-slate-900 pb-4 space-y-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 block">
              REPÚBLICA ARGENTINA • MINISTERIO DE EDUCACIÓN
            </span>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 uppercase">
              {institucionNombre || catedra?.instituciones?.nombre || catedra?.institucion_nombre || 'INSTITUTO DE EDUCACIÓN SUPERIOR'}
            </h1>
            <p className="text-xs font-semibold text-slate-600">
              Nivel: {catedra?.nivel || 'TERCIARIO'} • Ciclo Lectivo {cicloAnio}
            </p>
          </div>

          <div className="text-right sm:self-center border-2 border-slate-900 rounded-lg p-2.5 bg-slate-50 text-xs font-mono shrink-0">
            <span className="block font-black text-slate-900 text-sm">PLANILLA DE CALIFICACIONES</span>
            <span className="text-slate-600 uppercase font-semibold">Sábana Oficial de Evaluaciones</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs border-t border-slate-300">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Espacio Curricular</span>
            <strong className="text-slate-900 text-sm">{catedra?.nombre || 'Cátedra'}</strong>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Docente Titular</span>
            <span className="text-slate-800 font-semibold">{docenteNombre || catedra?.docentes?.nombre || 'Prof. a cargo'}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Modalidad</span>
            <span className="text-slate-800 font-semibold">{catedra?.modalidad || 'ANUAL'}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Criterio Promoción / Reg.</span>
            <span className="text-slate-800 font-semibold">{criterios.nota_min_promo || 7}+ Promo / {criterios.nota_min_reg || 4}+ Reg.</span>
          </div>
        </div>
      </div>

      {/* 2. Sábana de Notas */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs border border-slate-400">
          <thead>
            <tr className="bg-slate-200 border-b border-slate-400 text-slate-900 text-[10px] uppercase font-bold">
              <th className="p-1.5 border-r border-slate-400 text-center w-8">#</th>
              <th className="p-1.5 border-r border-slate-400 w-24">D.N.I.</th>
              <th className="p-1.5 border-r border-slate-400 min-w-[160px]">Apellido y Nombres</th>
              <th className="p-1.5 border-r border-slate-400 text-center w-16">% Asist.</th>
              {mainEvaluations.map(ev => (
                <th key={ev.id} className="p-1.5 border-r border-slate-400 text-center min-w-[70px]">
                  <span className="block truncate max-w-[100px]">{ev.titulo}</span>
                  <span className="text-[8px] text-slate-600 block">{ev.tipo}</span>
                </th>
              ))}
              <th className="p-1.5 text-center w-28">Condición Final</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300">
            {matrixData.length === 0 ? (
              <tr>
                <td colSpan={5 + mainEvaluations.length} className="p-6 text-center text-slate-500 italic">
                  No hay calificaciones asentadas para esta cátedra.
                </td>
              </tr>
            ) : (
              matrixData.map((item, idx) => {
                const est = item.estudiante;
                const cond = item.condicion?.condicion || 'REGULAR';
                const isPromo = cond === 'PROMOCIONAL' || cond === 'APROBADO';
                const isLibre = cond === 'LIBRE' || cond === 'DESAPROBADO';

                return (
                  <tr key={est.id || idx} className="print-row hover:bg-slate-50 text-[11px]">
                    <td className="p-1.5 border-r border-slate-300 text-center font-mono font-bold text-slate-600">
                      {idx + 1}
                    </td>
                    <td className="p-1.5 border-r border-slate-300 font-mono text-slate-800">
                      {est.dni || '—'}
                    </td>
                    <td className="p-1.5 border-r border-slate-300 font-bold text-slate-900 uppercase">
                      {est.apellido}, {est.nombre}
                    </td>
                    <td className="p-1.5 border-r border-slate-300 text-center font-mono font-bold">
                      {item.asistenciaPct}%
                    </td>
                    {mainEvaluations.map(ev => {
                      const recup = evaluaciones.find(r => r.tipo === 'RECUPERATORIO' && r.evaluacion_origen_id === ev.id);
                      const notaRecord = notas.find(n => n.estudiante_id === est.id && n.evaluacion_id === ev.id);
                      const recupRecord = recup ? notas.find(n => n.estudiante_id === est.id && n.evaluacion_id === recup.id) : null;
                      
                      return (
                        <td key={ev.id} className="p-1.5 border-r border-slate-300 text-center font-mono font-bold">
                          {notaRecord?.valor !== undefined ? notaRecord.valor : '—'}
                          {recupRecord?.valor !== undefined && (
                            <span className="block text-[9px] text-purple-700">R: {recupRecord.valor}</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="p-1.5 text-center font-black uppercase text-[10px]">
                      <span className={isPromo ? 'text-emerald-700 font-black' : isLibre ? 'text-rose-700 font-black' : 'text-slate-800 font-bold'}>
                        {cond}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 3. Resumen Estadístico y Firmas */}
      <div className="p-3 bg-slate-50 rounded-xl border border-slate-300 grid grid-cols-4 gap-2 text-center text-xs font-mono print-avoid-break">
        <div>
          <span className="text-[10px] uppercase text-slate-500 block font-sans">Total Alumnos</span>
          <strong className="text-slate-900 text-sm">{totalAlumnos}</strong>
        </div>
        <div>
          <span className="text-[10px] uppercase text-emerald-700 block font-sans">Promocionados</span>
          <strong className="text-emerald-700 text-sm">{promocionados} ({totalAlumnos > 0 ? Math.round((promocionados/totalAlumnos)*100) : 0}%)</strong>
        </div>
        <div>
          <span className="text-[10px] uppercase text-slate-700 block font-sans">Regulares</span>
          <strong className="text-slate-900 text-sm">{regulares} ({totalAlumnos > 0 ? Math.round((regulares/totalAlumnos)*100) : 0}%)</strong>
        </div>
        <div>
          <span className="text-[10px] uppercase text-rose-700 block font-sans">Libres</span>
          <strong className="text-rose-700 text-sm">{libres} ({totalAlumnos > 0 ? Math.round((libres/totalAlumnos)*100) : 0}%)</strong>
        </div>
      </div>

      <div className="pt-8 pb-4 print-avoid-break">
        <div className="grid grid-cols-2 gap-12 text-center text-xs">
          <div className="flex flex-col items-center">
            <div className="w-56 border-b-2 border-slate-800 mb-2"></div>
            <strong className="text-slate-900 uppercase font-bold text-xs">{docenteNombre || catedra?.docentes?.nombre || 'Docente Titular'}</strong>
            <span className="text-[10px] text-slate-500 uppercase">Firma del Docente Evaluador</span>
          </div>

          <div className="flex flex-col items-center">
            <div className="w-56 border-b-2 border-slate-800 mb-2"></div>
            <strong className="text-slate-900 uppercase font-bold text-xs">Secretaría Académica</strong>
            <span className="text-[10px] text-slate-500 uppercase">Recepción y Registro Matriz</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// PLANTILLA 4: PLANILLA REGISTRO DE ASISTENCIAS
// =============================================================================
function AsistenciasTemplate({ data }) {
  const {
    catedra = {},
    estudiantes = [],
    clases = [],
    asistencias = [],
    inasistenciasDocente = [],
    studentStatsMap = new Map(),
    criterios = {},
    cicloAnio = '2026',
    institucionNombre = '',
    docenteNombre = ''
  } = data;

  const totalClases = clases.length;
  const clasesConLicencia = inasistenciasDocente.filter(
    i => i.tipo === 'LICENCIA' && clases.some(c => c.fecha === i.fecha)
  ).length;
  const clasesEfectivas = totalClases - clasesConLicencia;

  const minReg = Number(criterios.min_asist_reg || 70);
  const minPromo = Number(criterios.min_asist_promo || 80);

  return (
    <div className="space-y-6">
      {/* 1. Membrete Formal */}
      <div className="border-b-2 border-slate-900 pb-4 space-y-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 block">
              REPÚBLICA ARGENTINA • MINISTERIO DE EDUCACIÓN
            </span>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 uppercase">
              {institucionNombre || catedra?.instituciones?.nombre || catedra?.institucion_nombre || 'INSTITUTO DE EDUCACIÓN SUPERIOR'}
            </h1>
            <p className="text-xs font-semibold text-slate-600">
              Nivel: {catedra?.nivel || 'TERCIARIO'} • Ciclo Lectivo {cicloAnio}
            </p>
          </div>

          <div className="text-right sm:self-center border-2 border-slate-900 rounded-lg p-2.5 bg-slate-50 text-xs font-mono shrink-0">
            <span className="block font-black text-slate-900 text-sm">REGISTRO DE ASISTENCIAS</span>
            <span className="text-slate-600 uppercase font-semibold">Cómputo Anual / Periódico</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs border-t border-slate-300">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Espacio Curricular</span>
            <strong className="text-slate-900 text-sm">{catedra?.nombre || 'Cátedra'}</strong>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Docente Titular</span>
            <span className="text-slate-800 font-semibold">{docenteNombre || catedra?.docentes?.nombre || 'Prof. a cargo'}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Clases Registradas</span>
            <span className="text-slate-800 font-semibold">{totalClases} ({clasesEfectivas} efectivas)</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Requisito Asistencia</span>
            <span className="text-slate-800 font-semibold">{minReg}% Regular / {minPromo}% Promo</span>
          </div>
        </div>
      </div>

      {/* 2. Tabla de Asistencias */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs border border-slate-400">
          <thead>
            <tr className="bg-slate-200 border-b border-slate-400 text-slate-900 text-[11px] uppercase font-bold">
              <th className="p-2 border-r border-slate-400 text-center w-10">N°</th>
              <th className="p-2 border-r border-slate-400 w-28">D.N.I.</th>
              <th className="p-2 border-r border-slate-400">Apellido y Nombres</th>
              <th className="p-2 border-r border-slate-400 text-center w-20">Clases</th>
              <th className="p-2 border-r border-slate-400 text-center w-20 text-emerald-800">Presentes</th>
              <th className="p-2 border-r border-slate-400 text-center w-20 text-rose-800">Ausentes</th>
              <th className="p-2 border-r border-slate-400 text-center w-24">% Asist. Final</th>
              <th className="p-2 text-center w-36">Estado de Regularidad</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300">
            {estudiantes.length === 0 ? (
              <tr>
                <td colSpan="8" className="p-6 text-center text-slate-500 italic">
                  No hay estudiantes registrados en la nómina.
                </td>
              </tr>
            ) : (
              estudiantes.map((est, idx) => {
                const studentAsist = asistencias.filter(a => a.estudiante_id === est.id);
                const presentes = studentAsist.filter(a => a.estado === 'PRESENTE').length;
                const ausentes = studentAsist.filter(a => a.estado === 'AUSENTE').length;
                const pct = studentStatsMap.get(est.id) ?? 100;
                const cumpleRegular = pct >= minReg;
                const cumplePromo = pct >= minPromo;

                return (
                  <tr key={est.id || idx} className="print-row hover:bg-slate-50 text-[11px]">
                    <td className="p-2 border-r border-slate-300 text-center font-mono font-bold text-slate-700">
                      {idx + 1}
                    </td>
                    <td className="p-2 border-r border-slate-300 font-mono text-slate-800">
                      {est.dni || '—'}
                    </td>
                    <td className="p-2 border-r border-slate-300 font-bold text-slate-900 uppercase">
                      {est.apellido}, {est.nombre}
                    </td>
                    <td className="p-2 border-r border-slate-300 text-center font-mono">
                      {clasesEfectivas}
                    </td>
                    <td className="p-2 border-r border-slate-300 text-center font-mono font-bold text-emerald-700">
                      {presentes}
                    </td>
                    <td className="p-2 border-r border-slate-300 text-center font-mono font-bold text-rose-700">
                      {ausentes}
                    </td>
                    <td className="p-2 border-r border-slate-300 text-center font-mono font-black text-slate-900">
                      {pct}%
                    </td>
                    <td className="p-2 text-center font-bold text-[10px] uppercase">
                      {cumplePromo ? (
                        <span className="text-emerald-700 font-black">CUMPLE PROMOCIÓN</span>
                      ) : cumpleRegular ? (
                        <span className="text-slate-800 font-bold">REGULAR</span>
                      ) : (
                        <span className="text-rose-700 font-black">CUPO SUPERADO (LIBRE)</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 3. Cuadro de Firmas */}
      <div className="pt-8 pb-4 print-avoid-break">
        <div className="grid grid-cols-2 gap-12 text-center text-xs">
          <div className="flex flex-col items-center">
            <div className="w-56 border-b-2 border-slate-800 mb-2"></div>
            <strong className="text-slate-900 uppercase font-bold text-xs">{docenteNombre || catedra?.docentes?.nombre || 'Docente Titular'}</strong>
            <span className="text-[10px] text-slate-500 uppercase">Firma del Docente</span>
          </div>

          <div className="flex flex-col items-center">
            <div className="w-56 border-b-2 border-slate-800 mb-2"></div>
            <strong className="text-slate-900 uppercase font-bold text-xs">Secretaría Académica</strong>
            <span className="text-[10px] text-slate-500 uppercase">Control y Supervisión</span>
          </div>
        </div>
      </div>
    </div>
  );
}
