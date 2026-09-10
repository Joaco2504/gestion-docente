import React, { useState, useRef } from 'react';
import { parseExcelOrCsv, autoDetectColumns, sanitizeStudentRows } from '../../lib/excel';
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, X, Users, ArrowRight } from 'lucide-react';
import Button from '../common/Button';
import Badge from '../common/Badge';
import CustomSelect from '../common/CustomSelect';
import { toast } from 'sonner';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';

export default function ExcelImporter({ onImportSuccess, onStudentsImported, catedraId }) {
  const { user, isDemo } = useAuth();
  const { activeCiclo } = useApp();

  const [file, setFile] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [rawRows, setRawRows] = useState([]);
  const [mapping, setMapping] = useState({ dniField: '', apellidoField: '', nombreField: '' });
  const [sanitizedData, setSanitizedData] = useState([]);
  const [errors, setErrors] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState(1); // 1: Carga, 2: Mapeo y Preview
  const [importSuccessCount, setImportSuccessCount] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setIsProcessing(true);
    try {
      const { rows, headers: detectedHeaders } = await parseExcelOrCsv(selectedFile);
      if (rows.length === 0) {
        toast.error('El archivo no contiene filas de datos.');
        return;
      }

      setFile(selectedFile);
      setHeaders(detectedHeaders);
      setRawRows(rows);

      // Auto-detectar columnas
      const autoMap = autoDetectColumns(detectedHeaders);
      setMapping(autoMap);

      // Sanitize initial
      const { sanitized, errors: sanitizeErrors } = sanitizeStudentRows(rows, autoMap);
      setSanitizedData(sanitized);
      setErrors(sanitizeErrors);
      setStep(2);
    } catch (err) {
      toast.error('Error al leer el archivo: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMappingChange = (field, newCol) => {
    const updatedMap = { ...mapping, [field]: newCol };
    setMapping(updatedMap);
    const { sanitized, errors: sanitizeErrors } = sanitizeStudentRows(rawRows, updatedMap);
    setSanitizedData(sanitized);
    setErrors(sanitizeErrors);
  };

  const handleConfirmImport = async () => {
    if (sanitizedData.length === 0) {
      toast.error('No hay alumnos válidos para importar.');
      return;
    }
    setIsProcessing(true);
    try {
      if (isSupabaseConfigured && !isDemo && user && catedraId) {
        // 1. Deduplicar en memoria por DNI (si el archivo traía repetidos en la misma planilla)
        const uniqueStudentsMap = new Map();
        sanitizedData.forEach(s => {
          if (!uniqueStudentsMap.has(s.dni)) {
            uniqueStudentsMap.set(s.dni, s);
          }
        });
        const uniqueStudents = Array.from(uniqueStudentsMap.values());
        const dnis = uniqueStudents.map(s => s.dni);

        // 2. Consultar estudiantes ya existentes en la BD para este docente
        const { data: existingStudents, error: fetchErr } = await supabase
          .from('estudiantes')
          .select('id, dni')
          .eq('docente_id', user.id)
          .in('dni', dnis);

        if (fetchErr) throw fetchErr;

        const existingMap = new Map((existingStudents || []).map(e => [e.dni, e.id]));
        const toInsert = [];
        const toUpdate = [];

        uniqueStudents.forEach(s => {
          if (existingMap.has(s.dni)) {
            toUpdate.push({
              id: existingMap.get(s.dni),
              apellido: s.apellido,
              nombre: s.nombre
            });
          } else {
            toInsert.push({
              docente_id: user.id,
              dni: s.dni,
              apellido: s.apellido,
              nombre: s.nombre
            });
          }
        });

        // 3. Insertar nuevos estudiantes (sin depender de restricciones ON CONFLICT)
        let newlyInserted = [];
        if (toInsert.length > 0) {
          const { data: inserted, error: insertErr } = await supabase
            .from('estudiantes')
            .insert(toInsert)
            .select('id, dni');

          if (insertErr) throw insertErr;
          newlyInserted = inserted || [];
        }

        // 4. Actualizar nombres/apellidos si correspondiese
        if (toUpdate.length > 0) {
          await Promise.all(
            toUpdate.map(u =>
              supabase
                .from('estudiantes')
                .update({ apellido: u.apellido, nombre: u.nombre })
                .eq('id', u.id)
            )
          );
        }

        // 5. Consolidar IDs de todos los estudiantes (nuevos + existentes)
        const allStudentIds = [
          ...newlyInserted.map(s => s.id),
          ...toUpdate.map(s => s.id)
        ];

        // 6. Inscribir en la cátedra verificando inscripciones previas para no duplicar
        if (allStudentIds.length > 0) {
          const { data: existingInsc, error: inscFetchErr } = await supabase
            .from('inscripciones')
            .select('estudiante_id')
            .eq('catedra_id', catedraId)
            .in('estudiante_id', allStudentIds);

          if (inscFetchErr) throw inscFetchErr;

          const alreadyInscribedSet = new Set((existingInsc || []).map(i => i.estudiante_id));
          const inscriptionsToInsert = allStudentIds
            .filter(id => !alreadyInscribedSet.has(id))
            .map(id => ({
              estudiante_id: id,
              catedra_id: catedraId,
              ciclo_id: activeCiclo?.id || null
            }));

          if (inscriptionsToInsert.length > 0) {
            const { error: inscInsertErr } = await supabase
              .from('inscripciones')
              .insert(inscriptionsToInsert);

            if (inscInsertErr) throw inscInsertErr;
          }
        }
      } else if (catedraId) {
        // Demo mode fallback
        const existing = JSON.parse(localStorage.getItem(`estudiantes_${catedraId}`) || '[]');
        const existingDnis = new Set(existing.map(e => e.dni));
        const newStudents = [];

        sanitizedData.forEach(s => {
          if (!existingDnis.has(s.dni)) {
            newStudents.push({
              id: 'est-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
              dni: s.dni,
              apellido: s.apellido,
              nombre: s.nombre
            });
          }
        });

        const updated = [...existing, ...newStudents];
        localStorage.setItem(`estudiantes_${catedraId}`, JSON.stringify(updated));
      }

      setImportSuccessCount(sanitizedData.length);
      toast.success(`Se han procesado e importado exitosamente ${sanitizedData.length} alumnos.`);
      if (onStudentsImported) onStudentsImported(sanitizedData);
      if (onImportSuccess) onImportSuccess(sanitizedData);

      // Reset
      setFile(null);
      setStep(1);
      setSanitizedData([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error('Error al importar:', err);
      toast.error('Error al importar alumnos: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    setFile(null);
    setStep(1);
    setSanitizedData([]);
    setErrors([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {importSuccessCount && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-success" />
            <span className="font-semibold">
              ¡Se han importado exitosamente {importSuccessCount} estudiantes a esta cátedra!
            </span>
          </div>
          <button 
            onClick={() => setImportSuccessCount(null)}
            className="text-green-700 hover:text-green-900 font-bold"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {step === 1 ? (
        <div className="border-2 border-dashed border-surface-border hover:border-primary/60 rounded-xl p-8 text-center transition-colors bg-surface">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileChange}
            className="hidden"
            id="excel-upload"
          />
          <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileSpreadsheet className="w-7 h-7" />
          </div>
          <h4 className="text-base font-bold text-text-primary mb-1">
            Importar Nómina de Alumnos desde Excel o CSV
          </h4>
          <p className="text-xs text-text-muted max-w-md mx-auto mb-5 leading-relaxed">
            Sube un archivo <code>.xlsx</code> o <code>.csv</code> con las columnas de <strong>DNI, Apellido y Nombre</strong>.
            Se detectarán automáticamente las columnas y se verificarán duplicados.
          </p>
          <label
            htmlFor="excel-upload"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-semibold cursor-pointer shadow-sm transition-all"
          >
            <Upload className="w-4 h-4" />
            <span>Seleccionar Archivo</span>
          </label>
        </div>
      ) : (
        <div className="bg-surface rounded-xl border border-surface-border p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-surface-border pb-4">
            <div>
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-primary" />
                <h4 className="text-base font-bold text-text-primary">{file?.name}</h4>
                <Badge variant="primary">{rawRows.length} filas detectadas</Badge>
              </div>
              <p className="text-xs text-text-muted mt-1">
                Verifica el mapeo de columnas antes de insertar los estudiantes en la cátedra.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={handleCancel}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmImport}
                loading={isProcessing}
                disabled={sanitizedData.length === 0}
                icon={CheckCircle2}
              >
                Confirmar e Importar {sanitizedData.length} Alumnos
              </Button>
            </div>
          </div>

          {/* Mapeo de columnas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-surface-hover/50 p-4 rounded-xl border border-surface-border">
            <div>
              <label className="block text-xs font-bold uppercase text-text-secondary mb-1">
                Columna de DNI / Documento:
              </label>
              <CustomSelect
                value={mapping.dniField}
                onChange={(val) => handleMappingChange('dniField', typeof val === 'object' ? val.target.value : val)}
                options={headers.map(h => ({ value: h, label: h }))}
                placeholder="Seleccionar columna..."
                buttonClassName="py-1.5 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-text-secondary mb-1">
                Columna de Apellido:
              </label>
              <CustomSelect
                value={mapping.apellidoField}
                onChange={(val) => handleMappingChange('apellidoField', typeof val === 'object' ? val.target.value : val)}
                options={headers.map(h => ({ value: h, label: h }))}
                placeholder="Seleccionar columna..."
                buttonClassName="py-1.5 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-text-secondary mb-1">
                Columna de Nombre:
              </label>
              <CustomSelect
                value={mapping.nombreField}
                onChange={(val) => handleMappingChange('nombreField', typeof val === 'object' ? val.target.value : val)}
                options={headers.map(h => ({ value: h, label: h }))}
                placeholder="Seleccionar columna..."
                buttonClassName="py-1.5 text-xs"
              />
            </div>
          </div>

          {/* Alertas y advertencias */}
          {errors.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
              <div className="flex items-center gap-2 font-semibold text-amber-800">
                <AlertTriangle className="w-4 h-4" />
                <span>Advertencias encontradas ({errors.length}):</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 max-h-24 overflow-y-auto">
                {errors.slice(0, 5).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
                {errors.length > 5 && <li>...y {errors.length - 5} advertencias más.</li>}
              </ul>
            </div>
          )}

          {/* Vista previa de estudiantes limpios */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase text-text-muted tracking-wider">
                Vista Previa de Alumnos Válidos ({sanitizedData.length})
              </span>
            </div>
            <div className="border border-surface-border rounded-xl overflow-hidden max-h-64 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-hover text-text-secondary font-semibold border-b border-surface-border sticky top-0">
                  <tr>
                    <th className="px-4 py-2.5 w-12 text-center font-mono">#</th>
                    <th className="px-4 py-2.5 font-mono">DNI</th>
                    <th className="px-4 py-2.5">Apellido</th>
                    <th className="px-4 py-2.5">Nombre</th>
                    <th className="px-4 py-2.5 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {sanitizedData.slice(0, 50).map((row, idx) => (
                    <tr key={idx} className="hover:bg-surface-hover/50">
                      <td className="px-4 py-2 text-center text-text-muted font-mono">{idx + 1}</td>
                      <td className="px-4 py-2 font-mono font-medium text-text-secondary">{row.dni}</td>
                      <td className="px-4 py-2 font-semibold text-text-primary">{row.apellido}</td>
                      <td className="px-4 py-2 text-text-secondary">{row.nombre}</td>
                      <td className="px-4 py-2 text-center">
                        <Badge variant="success" size="sm">Válido</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {sanitizedData.length > 50 && (
              <p className="text-[11px] text-text-muted mt-2 text-right">
                Mostrando los primeros 50 alumnos de {sanitizedData.length}.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
