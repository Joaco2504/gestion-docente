import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../../common/Modal';
import Button from '../../common/Button';
import Badge from '../../common/Badge';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  Save, 
  X, 
  GraduationCap, 
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import Tooltip from '../../common/Tooltip';

/**
 * ConfigurarRecuperatorioModal
 * Modal individual para configurar qué parciales rinde el estudiante en la
 * instancia de Recuperatorio General (Nivel Terciario - RAM Catamarca).
 * 
 * Reglas:
 * - Régimen Cuatrimestral: Máximo 1 parcial recuperable.
 * - Régimen Anual: Máximo 2 parciales recuperables.
 * - Desaprobar más parciales que el cupo en 1ra instancia -> Excluye a LIBRE.
 * - Desaprobar el recuperatorio (< 4 o Ausente) -> Condición LIBRE.
 * - Recuperar 1 parcial con >= 7 (demás >= 7 y asist >= 80%) -> PROMOCIÓN INDIRECTA.
 * - Recuperar 2 parciales en anual -> Techo máximo REGULAR.
 */
export default function ConfigurarRecuperatorioModal({
  isOpen,
  onClose,
  estudiante,
  parciales = [],
  notasMap, // function (evalId) => { valor, nota, estado }
  recuperatorioActual, // nota actual con detalle_recuperatorio
  regimen = 'CUATRIMESTRAL',
  onSave
}) {
  const isAnual = String(regimen || '').toUpperCase().includes('ANUAL');
  const maxPermitido = isAnual ? 2 : 1;

  // Estado interno: mapa de evalId -> { seleccionado: boolean, nota: number|string, estado: string }
  const [itemsMap, setItemsMap] = useState({});
  const [guardando, setGuardando] = useState(false);

  // Inicializar al abrir modal
  useEffect(() => {
    if (!isOpen || !estudiante) return;

    const initial = {};
    const detalleExistente = recuperatorioActual?.detalle_recuperatorio || [];
    const detalleMap = new Map();
    if (Array.isArray(detalleExistente)) {
      detalleExistente.forEach(d => {
        if (d?.evaluacion_id) detalleMap.set(String(d.evaluacion_id), d);
      });
    }

    parciales.forEach(p => {
      const pId = String(p.id);
      const orig = notasMap ? notasMap(p.id) : null;
      const numOrig = orig?.valor !== undefined && orig?.valor !== null && orig?.valor !== '' && !isNaN(Number(orig.valor))
        ? Number(orig.valor)
        : (orig?.nota !== undefined && orig?.nota !== null && orig?.nota !== '' && !isNaN(Number(orig.nota)) ? Number(orig.nota) : null);
      const estOrig = orig?.estado ? String(orig.estado).toUpperCase() : null;
      const desaprobadoOrig = estOrig === 'AUSENTE' || estOrig === 'NO_ENTREGO' || (numOrig !== null && numOrig < 4);

      if (detalleMap.has(pId)) {
        const item = detalleMap.get(pId);
        const valRec = item.nota_recuperatorio ?? item.valor ?? item.nota ?? '';
        initial[pId] = {
          seleccionado: true,
          nota: valRec,
          estado: item.estado || (valRec !== '' ? 'CALIFICADO' : 'PENDIENTE')
        };
      } else {
        // Preseleccionar si desaprobó en primera instancia
        initial[pId] = {
          seleccionado: desaprobadoOrig,
          nota: '',
          estado: 'PENDIENTE'
        };
      }
    });

    setItemsMap(initial);
  }, [isOpen, estudiante, parciales, notasMap, recuperatorioActual]);

  // Contabilizar parciales seleccionados
  const seleccionadosCount = useMemo(() => {
    return Object.values(itemsMap).filter(v => v.seleccionado).length;
  }, [itemsMap]);

  // Contabilizar parciales desaprobados en 1ra instancia
  const desaprobadosPrimeraInstancia = useMemo(() => {
    return parciales.filter(p => {
      const orig = notasMap ? notasMap(p.id) : null;
      const numOrig = orig?.valor !== undefined && orig?.valor !== null && orig?.valor !== '' && !isNaN(Number(orig.valor))
        ? Number(orig.valor)
        : (orig?.nota !== undefined && orig?.nota !== null && orig?.nota !== '' && !isNaN(Number(orig.nota)) ? Number(orig.nota) : null);
      const estOrig = orig?.estado ? String(orig.estado).toUpperCase() : null;
      return estOrig === 'AUSENTE' || estOrig === 'NO_ENTREGO' || (numOrig !== null && numOrig < 4);
    }).length;
  }, [parciales, notasMap]);

  const excedeLimiteRegimen = desaprobadosPrimeraInstancia > maxPermitido;
  const excedeSeleccion = seleccionadosCount > maxPermitido;

  const handleToggleSelect = (pId) => {
    setItemsMap(prev => {
      const current = prev[pId] || { seleccionado: false, nota: '', estado: 'PENDIENTE' };
      const nextSelected = !current.seleccionado;
      return {
        ...prev,
        [pId]: {
          ...current,
          seleccionado: nextSelected,
          estado: nextSelected && !current.nota ? 'PENDIENTE' : current.estado
        }
      };
    });
  };

  const handleNotaChange = (pId, val) => {
    setItemsMap(prev => {
      const current = prev[pId] || { seleccionado: true, nota: '', estado: 'PENDIENTE' };
      const num = Number(val);
      const isValidNum = val !== '' && !isNaN(num) && num >= 1 && num <= 10;
      return {
        ...prev,
        [pId]: {
          ...current,
          seleccionado: true,
          nota: val,
          estado: isValidNum ? 'CALIFICADO' : (val === '' ? 'PENDIENTE' : current.estado)
        }
      };
    });
  };

  const handleEstadoEspecial = (pId, estado) => {
    setItemsMap(prev => {
      const current = prev[pId] || { seleccionado: true, nota: '', estado: 'PENDIENTE' };
      return {
        ...prev,
        [pId]: {
          ...current,
          seleccionado: true,
          nota: '',
          estado
        }
      };
    });
  };

  const handleGuardar = async () => {
    setGuardando(true);
    try {
      const detalle = [];
      const notasNumericas = [];
      let tieneAusente = false;

      parciales.forEach(p => {
        const item = itemsMap[p.id];
        if (item && item.seleccionado) {
          const num = Number(item.nota);
          const isNum = item.nota !== '' && !isNaN(num);
          const est = item.estado || (isNum ? 'CALIFICADO' : 'PENDIENTE');

          if (isNum) {
            notasNumericas.push(num);
          }
          if (est === 'AUSENTE' || est === 'NO_ENTREGO') {
            tieneAusente = true;
          }

          detalle.push({
            evaluacion_id: p.id,
            titulo: p.titulo || p.nombre || 'Parcial',
            nota_recuperatorio: isNum ? num : null,
            estado: est,
            aprobado: isNum ? num >= 4 : false
          });
        }
      });

      // Promedio general de las notas recuperadas
      let valorPromedio = null;
      let estadoGeneral = 'PENDIENTE';

      if (notasNumericas.length > 0) {
        valorPromedio = Number((notasNumericas.reduce((a, b) => a + b, 0) / notasNumericas.length).toFixed(1));
        estadoGeneral = 'CALIFICADO';
      } else if (tieneAusente) {
        estadoGeneral = 'AUSENTE';
      }

      await onSave(detalle, valorPromedio, estadoGeneral);
      onClose();
    } catch (err) {
      console.error('Error al guardar recuperatorio individual:', err);
    } finally {
      setGuardando(false);
    }
  };

  const handleLimpiar = async () => {
    if (!window.confirm('¿Deseas eliminar la configuración de recuperatorio de este estudiante?')) return;
    setGuardando(true);
    try {
      await onSave(null, null, null);
      onClose();
    } catch (err) {
      console.error('Error al limpiar recuperatorio:', err);
    } finally {
      setGuardando(false);
    }
  };

  if (!isOpen || !estudiante) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configurar Recuperatorio Diferenciado"
      subtitle={`Estudiante: ${estudiante.apellido}, ${estudiante.nombre} (DNI ${estudiante.dni || 'S/D'})`}
      size="md"
    >
      <div className="space-y-4">
        {/* Banner de Régimen y Cupos */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-text-primary">
                Régimen {isAnual ? 'Anual' : 'Cuatrimestral'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-mono text-text-muted">Cupo máximo:</span>
              <Badge variant={isAnual ? 'promo' : 'info'} size="sm">
                {maxPermitido} {maxPermitido === 1 ? 'parcial' : 'parciales'}
              </Badge>
            </div>
          </div>

          <p className="text-xs text-text-muted leading-relaxed">
            Selecciona los parciales específicos que rinde el estudiante. Al guardar, las notas de recuperatorio aprobadas (<span className="font-semibold text-emerald-600 dark:text-emerald-400">≥ 4</span>) reemplazarán de forma efectiva la nota original para el promedio y la condición final.
          </p>

          {/* Alerta de Exclusión a Libre por Exceso de Desaprobados */}
          {excedeLimiteRegimen && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2 animate-fadeIn">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="leading-snug">
                <strong>Condición Reglamentaria: LIBRE</strong>
                <p className="text-[11px] mt-0.5">
                  El alumno desaprobó {desaprobadosPrimeraInstancia} parciales en primera instancia, superando el límite máximo permitido de {maxPermitido} {maxPermitido === 1 ? 'parcial' : 'parciales'} para régimen {isAnual ? 'anual' : 'cuatrimestral'}.
                </p>
              </div>
            </div>
          )}

          {excedeSeleccion && !excedeLimiteRegimen && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                Has seleccionado {seleccionadosCount} parciales. El cupo permitido es de {maxPermitido}.
              </span>
            </div>
          )}
        </div>

        {/* Lista de Parciales Disponibles */}
        <div className="space-y-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-text-muted block">
            Parciales de la Cátedra ({parciales.length})
          </span>

          {parciales.length === 0 ? (
            <div className="p-4 text-center text-xs text-text-muted bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-white/10">
              No hay evaluaciones de tipo Parcial creadas en esta cátedra.
            </div>
          ) : (
            parciales.map(p => {
              const pId = String(p.id);
              const item = itemsMap[pId] || { seleccionado: false, nota: '', estado: 'PENDIENTE' };
              const orig = notasMap ? notasMap(p.id) : null;
              const numOrig = orig?.valor !== undefined && orig?.valor !== null && orig?.valor !== '' && !isNaN(Number(orig.valor))
                ? Number(orig.valor)
                : (orig?.nota !== undefined && orig?.nota !== null && orig?.nota !== '' && !isNaN(Number(orig.nota)) ? Number(orig.nota) : null);
              const estOrig = orig?.estado ? String(orig.estado).toUpperCase() : null;

              const isDesaprobado = estOrig === 'AUSENTE' || estOrig === 'NO_ENTREGO' || (numOrig !== null && numOrig < 4);

              return (
                <div
                  key={pId}
                  className={`p-3 rounded-2xl border transition-all ${
                    item.seleccionado
                      ? 'bg-primary/5 dark:bg-primary/10 border-primary/40 shadow-xs'
                      : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Checkbox y Título del Parcial */}
                    <div className="flex items-center gap-3 min-w-0">
                      <label className="relative flex items-center cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={Boolean(item.seleccionado)}
                          onChange={() => handleToggleSelect(pId)}
                          className="w-5 h-5 rounded-md text-primary border-slate-300 dark:border-white/20 focus:ring-primary/40 cursor-pointer"
                        />
                      </label>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <strong className="text-xs text-text-primary block truncate font-bold">
                            {p.titulo || p.nombre || 'Parcial'}
                          </strong>
                          {isDesaprobado && (
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                              Desaprobado
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-text-muted font-mono block">
                          1ra Instancia:{' '}
                          {numOrig !== null ? (
                            <span className={`font-bold ${numOrig >= 4 ? 'text-text-primary' : 'text-rose-600 dark:text-rose-400'}`}>
                              {numOrig}
                            </span>
                          ) : estOrig ? (
                            <span className="font-bold text-amber-600">{estOrig}</span>
                          ) : (
                            'Sin calificar'
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Inputs de Calificación de Recuperatorio (si está seleccionado) */}
                    {item.seleccionado ? (
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <div className="relative">
                          <input
                            type="number"
                            min="1"
                            max="10"
                            step="0.5"
                            value={item.nota}
                            onChange={(e) => handleNotaChange(pId, e.target.value)}
                            placeholder="Nota"
                            className="w-20 px-2.5 py-1.5 text-xs font-mono font-bold text-center rounded-xl border border-slate-200 dark:border-white/20 bg-white dark:bg-slate-800 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                          />
                        </div>

                        {/* Botón rápido Ausente */}
                        <button
                          type="button"
                          onClick={() => handleEstadoEspecial(pId, item.estado === 'AUSENTE' ? 'PENDIENTE' : 'AUSENTE')}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                            item.estado === 'AUSENTE'
                              ? 'bg-rose-500 text-white border-rose-500'
                              : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20 hover:bg-rose-500/20'
                          }`}
                          title="Marcar como Ausente al recuperatorio"
                        >
                          Aus.
                        </button>

                        {/* Botón rápido No Entregó */}
                        <button
                          type="button"
                          onClick={() => handleEstadoEspecial(pId, item.estado === 'NO_ENTREGO' ? 'PENDIENTE' : 'NO_ENTREGO')}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                            item.estado === 'NO_ENTREGO'
                              ? 'bg-slate-700 text-white border-slate-700 dark:bg-slate-600'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-200'
                          }`}
                          title="Marcar como No Entregó"
                        >
                          N/E
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-text-muted italic select-none self-end sm:self-center">
                        No recupera
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Guía Rápida de Impacto Académico */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-white/5 space-y-1 text-[11px] text-text-muted">
          <strong className="text-text-primary block font-bold text-xs">
            Impacto reglamentario de la nota de recuperatorio:
          </strong>
          <ul className="list-disc pl-4 space-y-0.5">
            <li>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">Promoción Directa:</span> 0 parciales recuperados + notas ≥ 7 + asist. ≥ 80%.
            </li>
            <li>
              <span className="font-semibold text-teal-600 dark:text-teal-400">Promoción Indirecta:</span> Exactamente 1 parcial recuperado con ≥ 7 + notas finales ≥ 7 + asist. ≥ 80%.
            </li>
            <li>
              <span className="font-semibold text-amber-600 dark:text-amber-400">Regular:</span> Parciales aprobados ≥ 4 (máximo 2 recuperados en régimen anual).
            </li>
            <li>
              <span className="font-semibold text-rose-600 dark:text-rose-400">Libre:</span> Desaprobar el recuperatorio (&lt; 4 o Ausente) o exceder cupo de parciales a recuperar.
            </li>
          </ul>
        </div>

        {/* Botones de Acción */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-surface-border">
          {recuperatorioActual && (
            <Button
              variant="outline"
              size="sm"
              icon={Trash2}
              onClick={handleLimpiar}
              disabled={guardando}
              className="text-xs text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-50 dark:hover:bg-rose-950/20"
            >
              Limpiar
            </Button>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={guardando}
              className="text-xs"
            >
              Cancelar
            </Button>

            <Button
              variant="primary"
              size="sm"
              icon={Save}
              onClick={handleGuardar}
              disabled={guardando || parciales.length === 0}
              className="text-xs font-bold"
            >
              {guardando ? 'Guardando...' : 'Guardar Configuración'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
