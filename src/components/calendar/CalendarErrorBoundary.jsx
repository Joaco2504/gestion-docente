import React from 'react';
import { CalendarX, RefreshCw, Trash2, ArrowLeft } from 'lucide-react';
import Button from '../common/Button';

/**
 * CalendarErrorBoundary
 * Escudo protector contra pantallas negras en CalendarPage (BUG-05).
 * Captura excepciones en el parseo o renderizado de fechas y provee
 * restablecimiento de estado local y reintento sin bloquear la navegación.
 */
export default class CalendarErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[CalendarErrorBoundary] Excepción capturada en Calendario:', error, errorInfo);
  }

  handleResetDemoData = () => {
    try {
      localStorage.removeItem('mesas_examen_all');
      localStorage.removeItem('docentepro_demo_calendario');
      localStorage.removeItem('docentepro_demo_eventos');
      sessionStorage.clear();
    } catch (_) {}
    window.location.reload();
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[65vh] flex items-center justify-center p-4 sm:p-8 animate-fadeIn select-none">
          <div className="max-w-lg w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
              <CalendarX className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-lg sm:text-xl font-bold text-text-primary">
                Inconsistencia al Cargar el Calendario
              </h2>
              <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
                Se detectó un fallo o fecha malformada en la agenda. Tus cátedras, calificaciones y asistencias permanecen seguras en la base de datos.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5 text-left">
                <span className="text-[11px] font-mono text-rose-600 dark:text-rose-400 font-semibold block mb-1">
                  Detalle del error:
                </span>
                <p className="text-[11px] font-mono text-text-muted break-all max-h-24 overflow-y-auto">
                  {this.state.error?.message || String(this.state.error)}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button
                variant="secondary"
                size="md"
                icon={RefreshCw}
                onClick={this.handleRetry}
                className="w-full sm:w-auto"
              >
                Reintentar Carga
              </Button>
              <Button
                variant="primary"
                size="md"
                icon={Trash2}
                onClick={this.handleResetDemoData}
                className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white"
              >
                Restablecer Datos Locales
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
