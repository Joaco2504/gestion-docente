import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, 
  Award, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  FileText, 
  AlertCircle,
  X,
  BookOpen,
  User
} from 'lucide-react';
import Modal from '../common/Modal';
import Badge from '../common/Badge';
import Button from '../common/Button';
import { formatFechaDMY } from '../../lib/dateUtils';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

export default function EstudianteDetailModal({
  isOpen,
  onClose,
  student,
  catedraId,
  catedraName
}) {
  const { isDemo } = useAuth();
  const [examHistory, setExamHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const isAcreditado = student?.estado_academico === 'ACREDITADO';

  useEffect(() => {
    if (isOpen && student?.id) {
      fetchStudentExamHistory();
    }
  }, [isOpen, student?.id]);

  async function fetchStudentExamHistory() {
    setLoadingHistory(true);
    try {
      if (isSupabaseConfigured && !isDemo) {
        // Consultar actas de examen asociadas a este estudiante
        const { data, error } = await supabase
          .from('actas_examen_alumnos')
          .select(`
            *,
            mesas_examen (
              id,
              fecha,
              turno_llamado,
              tipo_mesa,
              libro,
              tomo,
              folio,
              acta_numero,
              presidente
            )
          `)
          .or(`estudiante_id.eq.${student.id},alumno_dni.eq.${student.dni}`)
          .order('created_at', { ascending: false });

        if (!error && data) {
          // Filtrar las que correspondan a esta cátedra si vienen con mesa_examen
          const filtered = data.filter(d => {
            if (!d.mesas_examen) return true;
            return true; // mostrar historial general o de esta cátedra
          });
          setExamHistory(filtered);
          return;
        }
      }

      // Fallback local: Buscar en actas guardadas en localStorage
      const localHistory = [];
      try {
        const storedCat = JSON.parse(localStorage.getItem(`mesas_examen_${catedraId}`) || '[]');
        const storedAll = JSON.parse(localStorage.getItem('mesas_examen_all') || '[]');
        const allMesasMap = new Map();
        [...storedCat, ...storedAll].forEach(m => {
          if (m?.id && !allMesasMap.has(m.id)) {
            allMesasMap.set(m.id, m);
          }
        });

        for (const m of allMesasMap.values()) {
          const storedActas = JSON.parse(localStorage.getItem(`actas_examen_${m.id}`) || '[]');
          const found = storedActas.find(a => 
            a.estudiante_id === student.id || 
            (a.alumno_dni && student.dni && String(a.alumno_dni).trim() === String(student.dni).trim())
          );
          if (found) {
            localHistory.push({
              ...found,
              mesas_examen: m
            });
          }
        }
      } catch (_) {}

      setExamHistory(localHistory);
    } catch (err) {
      console.warn('Error fetching exam history:', err);
      setExamHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }

  if (!student) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="🎓 Ficha Académica del Estudiante"
      size="lg"
    >
      <div className="space-y-6">
        {/* Cabecera Bento del Alumno */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-base shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
                {student.apellido}, {student.nombre}
              </h3>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                <span className="font-mono">DNI: {student.dni || 'S/D'}</span>
                <span>•</span>
                <span className="truncate">{catedraName || 'Cátedra'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Badge 
              variant={
                student.condicion === 'PROMOCIONAL' ? 'promo' :
                student.condicion === 'REGULAR' ? 'regular' : 'libre'
              }
            >
              Condición: {student.condicion || 'REGULAR'}
            </Badge>
          </div>
        </div>

        {/* Banner Hero de Acreditación si la materia ya fue aprobada */}
        {isAcreditado ? (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-emerald-500/10 to-teal-500/15 border border-emerald-500/30 text-emerald-950 dark:text-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fadeIn">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/30 shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  Estado Académico Final
                </span>
                <h4 className="text-base sm:text-lg font-black text-emerald-950 dark:text-white">
                  🎓 ACREDITADO — MATERIA APROBADA
                </h4>
                <p className="text-xs text-emerald-800/80 dark:text-emerald-200/80 mt-0.5">
                  {student.fecha_acreditacion 
                    ? `Acreditado el ${formatFechaDMY(student.fecha_acreditacion)}`
                    : 'Acreditación registrada en actas volantes de la institución.'}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0 bg-white/60 dark:bg-emerald-950/50 p-3 rounded-xl border border-emerald-500/20">
              <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300 block">
                Calificación Definitiva
              </span>
              <span className="text-2xl sm:text-3xl font-mono font-black text-emerald-600 dark:text-emerald-400">
                {student.nota_final ?? '10'}
              </span>
              <span className="text-xs text-emerald-600/70 dark:text-emerald-400/70 block">/ 10 pts</span>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-white/5 flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
            <Clock className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              Materia en curso / regularizada. El estudiante aún no cuenta con acreditación definitiva asentada en actas de examen.
            </span>
          </div>
        )}

        {/* Historial Cronológico de Mesas de Examen */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-primary" />
              <span>Historial de Presentaciones a Mesas de Examen</span>
            </h4>
            <span className="text-[11px] font-mono text-slate-400">
              {examHistory.length} {examHistory.length === 1 ? 'instancia' : 'instancias'}
            </span>
          </div>

          {loadingHistory ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Cargando historial de exámenes...
            </div>
          ) : examHistory.length === 0 ? (
            <div className="p-6 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 text-center text-xs text-slate-500 dark:text-slate-400 space-y-1.5">
              <FileText className="w-6 h-6 text-slate-400 mx-auto" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                Sin registros de examen en actas volantes
              </p>
              <p>
                Este estudiante aún no ha sido cargado en ninguna mesa constituida en esta cátedra.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10 scrollbar-thin">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="p-3">Fecha & Turno</th>
                    <th className="p-3">Tipo</th>
                    <th className="p-3 text-center">Condición</th>
                    <th className="p-3 text-center">Escrito</th>
                    <th className="p-3 text-center">Oral</th>
                    <th className="p-3 text-center">Definitiva</th>
                    <th className="p-3 text-center">Dictamen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {examHistory.map((h, i) => {
                    const isPromo = h.mesas_examen?.tipo_mesa === 'PROMOCIONAL';
                    const dictamen = (h.dictamen || 'AUSENTE').toUpperCase();
                    const isAprob = dictamen === 'APROBADO' || dictamen === 'ACREDITADO';
                    const isDesaprob = dictamen === 'DESAPROBADO';

                    return (
                      <tr key={h.id || i} className="hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="p-3 font-medium">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {h.mesas_examen?.turno_llamado || 'Turno Regular'}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500">
                            {formatFechaDMY(h.mesas_examen?.fecha || h.created_at)}
                          </div>
                        </td>

                        <td className="p-3">
                          <Badge variant={isPromo ? 'promo' : 'info'} compact>
                            {isPromo ? '🎖️ Promo' : 'Final'}
                          </Badge>
                        </td>

                        <td className="p-3 text-center font-mono text-[11px] text-slate-600 dark:text-slate-300">
                          {h.condicion_previa || 'REGULAR'}
                        </td>

                        <td className="p-3 text-center font-mono">
                          {h.nota_escrito !== null && h.nota_escrito !== undefined ? h.nota_escrito : '-'}
                        </td>

                        <td className="p-3 text-center font-mono">
                          {h.nota_oral !== null && h.nota_oral !== undefined ? h.nota_oral : '-'}
                        </td>

                        <td className="p-3 text-center font-mono font-bold text-slate-900 dark:text-white">
                          {h.nota_definitiva !== null && h.nota_definitiva !== undefined ? h.nota_definitiva : '-'}
                        </td>

                        <td className="p-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isAprob
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                              : isDesaprob
                              ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                          }`}>
                            {dictamen}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pie del modal */}
        <div className="flex items-center justify-end pt-3 border-t border-slate-200 dark:border-white/10">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Cerrar Ficha
          </Button>
        </div>
      </div>
    </Modal>
  );
}
