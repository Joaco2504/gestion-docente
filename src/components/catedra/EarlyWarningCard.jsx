import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Mail, 
  Copy, 
  ExternalLink,
  Users,
  Sparkles,
  PhoneCall
} from 'lucide-react';
import { toast } from 'sonner';
import Button from '../common/Button';
import Badge from '../common/Badge';
import RiskBadge from '../common/RiskBadge';
import { calculateCatedraRiskSummary } from '../../lib/earlyWarningLogic';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { handleAppError } from '../../utils/handleAppError';

export default function EarlyWarningCard({
  catedraId,
  criterios = {},
  academicLevel = 'TERCIARIO',
  modalidad = 'ANUAL',
  onSelectTab
}) {
  const { user, isDemo } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  const [estudiantes, setEstudiantes] = useState([]);
  const [clases, setClases] = useState([]);
  const [asistencias, setAsistencias] = useState([]);
  const [inasistenciasDocente, setInasistenciasDocente] = useState([]);
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [notas, setNotas] = useState([]);

  useEffect(() => {
    if (catedraId) {
      loadData();
    }
  }, [catedraId]);

  async function loadData() {
    setLoading(true);
    try {
      if (isSupabaseConfigured && !isDemo) {
        // 1. Estudiantes
        const { data: inscData } = await supabase
          .from('inscripciones')
          .select(`
            estudiante_id,
            estudiantes ( id, dni, apellido, nombre, email, telefono )
          `)
          .eq('catedra_id', catedraId);

        const estList = (inscData || []).map(i => i.estudiantes).filter(Boolean);
        setEstudiantes(estList);

        // 2. Clases
        const { data: clData } = await supabase
          .from('clases')
          .select('id, fecha')
          .eq('catedra_id', catedraId);
        setClases(clData || []);

        // 3. Inasistencias docente
        const { data: inasDocData } = await supabase
          .from('inasistencias_docente')
          .select('fecha')
          .eq('catedra_id', catedraId);
        setInasistenciasDocente(inasDocData || []);

        // 4. Asistencias
        const clIds = (clData || []).map(c => c.id);
        if (clIds.length > 0) {
          const { data: asData } = await supabase
            .from('asistencias')
            .select('*')
            .in('clase_id', clIds);
          setAsistencias(asData || []);
        } else {
          setAsistencias([]);
        }

        // 5. Evaluaciones y Notas
        const { data: evData } = await supabase
          .from('evaluaciones')
          .select('*')
          .eq('catedra_id', catedraId);
        setEvaluaciones(evData || []);

        const evIds = (evData || []).map(e => e.id);
        if (evIds.length > 0) {
          const { data: nData } = await supabase
            .from('notas')
            .select('*')
            .in('evaluacion_id', evIds);
          setNotas(nData || []);
        } else {
          setNotas([]);
        }
      } else {
        // Modo local / Fallback
        const storedEst = JSON.parse(localStorage.getItem(`estudiantes_${catedraId}`) || '[]');
        setEstudiantes(storedEst);
        const storedClases = JSON.parse(localStorage.getItem(`clases_${catedraId}`) || '[]');
        setClases(storedClases);
        const storedAsist = JSON.parse(localStorage.getItem(`asistencias_${catedraId}`) || '[]');
        setAsistencias(storedAsist);
        const storedEv = JSON.parse(localStorage.getItem(`evaluaciones_${catedraId}`) || '[]');
        setEvaluaciones(storedEv);
        const storedNotas = JSON.parse(localStorage.getItem(`notas_${catedraId}`) || '[]');
        setNotas(storedNotas);
      }
    } catch (err) {
      handleAppError(err, 'EarlyWarningCard / fetchData', user);
    } finally {
      setLoading(false);
    }
  };

  const riskSummary = useMemo(() => {
    return calculateCatedraRiskSummary(estudiantes, {
      asistencias,
      clases,
      inasistenciasDocente,
      evaluaciones,
      notas,
      criterios,
      academicLevel,
      modalidad
    });
  }, [estudiantes, asistencias, clases, inasistenciasDocente, evaluaciones, notas, criterios, academicLevel, modalidad]);

  if (loading || estudiantes.length === 0) {
    return null;
  }

  const { critical, warning, optimal, criticalCount, warningCount, optimalCount } = riskSummary;
  const hasCritical = criticalCount > 0;
  const displayedCritical = isExpanded ? critical : critical.slice(0, 3);

  const handleCopyAlertMessage = (est) => {
    const text = `Estimado/a ${est.nombre} ${est.apellido}, nos comunicamos desde la cátedra para informarte sobre tu situación académica: ${est.risk?.primaryReason || 'Riesgo de regularidad'}. Por favor, contáctate a la brevedad para coordinar la recuperación de contenidos.`;
    navigator.clipboard.writeText(text);
    toast.success(`Mensaje de alerta copiado para ${est.apellido}.`);
  };

  return (
    <div
      className={`backdrop-blur-xl rounded-3xl border transition-all duration-300 p-5 sm:p-6 shadow-xs ${
        hasCritical
          ? 'bg-rose-500/[0.04] dark:bg-rose-500/[0.06] border-rose-500/25 dark:border-rose-500/30'
          : 'bg-white/75 dark:bg-slate-900/60 border-slate-200/80 dark:border-white/10'
      }`}
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`p-3 rounded-2xl flex items-center justify-center shrink-0 ${
              hasCritical
                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {hasCritical ? (
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            ) : (
              <ShieldCheck className="w-6 h-6" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-text-primary tracking-tight">
                Alertas Preventivas y Semáforo de Riesgo
              </h3>
              {hasCritical ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-500 text-white shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  {criticalCount} {criticalCount === 1 ? 'caso crítico' : 'casos críticos'}
                </span>
              ) : (
                <Badge variant="success" className="font-bold text-[11px]">
                  Riesgo Controlado
                </Badge>
              )}
            </div>

            <p className="text-xs text-text-muted mt-0.5">
              {hasCritical
                ? 'Estudiantes con inasistencias consecutivas o parciales reprobados en riesgo de perder regularidad.'
                : `${optimalCount} estudiantes en condición óptima y ${warningCount} en observación preventiva.`}
            </p>
          </div>
        </div>

        {/* Resumen numérico en píldoras */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className="px-2 py-1 rounded-xl bg-rose-500/10 text-rose-700 dark:text-rose-400 font-bold border border-rose-500/20">
              {criticalCount} Críticos
            </span>
            <span className="px-2 py-1 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold border border-amber-500/20">
              {warningCount} Observación
            </span>
            <span className="px-2 py-1 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-500/20">
              {optimalCount} Óptimos
            </span>
          </div>

          {hasCritical && critical.length > 3 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 text-text-muted hover:text-text-primary rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              title={isExpanded ? 'Ver menos' : 'Ver todos'}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Lista Desplegable de Estudiantes Críticos */}
      {hasCritical && (
        <div className="mt-4 pt-4 border-t border-rose-500/20 space-y-2">
          {displayedCritical.map((est) => (
            <div
              key={est.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-2xl bg-white/60 dark:bg-slate-900/50 border border-rose-500/20 hover:border-rose-500/40 transition-all text-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <RiskBadge risk={est.risk} />
                <div className="truncate">
                  <span className="font-bold text-text-primary text-xs uppercase block sm:inline mr-2">
                    {est.apellido}, {est.nombre}
                  </span>
                  <span className="text-[11px] text-text-muted font-mono">
                    DNI: {est.dni || '—'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <span className="text-[11px] text-rose-700 dark:text-rose-400 font-medium hidden md:inline">
                  {est.risk?.primaryReason}
                </span>

                <Button
                  variant="outline"
                  size="xs"
                  icon={Copy}
                  onClick={() => handleCopyAlertMessage(est)}
                  className="text-[10px] font-bold rounded-xl border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                  title="Copiar texto de notificación formal para el estudiante"
                >
                  Copiar Notificación
                </Button>

                {est.email && (
                  <a
                    href={`mailto:${est.email}?subject=Aviso de Regularidad Cátedra&body=Estimado/a ${est.nombre}, te contactamos para acordar seguimiento de tu situación académica: ${est.risk?.primaryReason}`}
                    className="p-1.5 rounded-xl bg-slate-100 dark:bg-white/5 text-text-muted hover:text-primary transition-colors"
                    title={`Enviar correo a ${est.email}`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
