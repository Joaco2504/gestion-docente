import React, { Component } from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft, ShieldAlert } from 'lucide-react';
import Button from './Button';

/**
 * ErrorBoundary - Captura excepciones no controladas en el árbol de componentes
 * y previene la pantalla en blanco (White Screen Crash) renderizando una UI de contingencia.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary capturó un error crítico:', error, errorInfo);
    this.setState({ errorInfo });
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback({
          error: this.state.error,
          retry: this.handleRetry
        });
      }

      return (
        <div className="p-6 sm:p-8 rounded-3xl bg-white/80 dark:bg-slate-900/80 border border-rose-500/20 backdrop-blur-xl shadow-lg my-6 text-center animate-fadeIn max-w-2xl mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4 border border-rose-500/20 shadow-xs">
            <ShieldAlert className="w-6 h-6" />
          </div>

          <h3 className="text-base sm:text-lg font-black text-text-primary tracking-tight mb-1">
            {this.props.title || 'Error al cargar este módulo'}
          </h3>

          <p className="text-xs text-text-muted max-w-md mx-auto mb-5 leading-relaxed">
            Se detectó un problema en el procesamiento de datos. Los registros locales y en base de datos permanecen seguros.
          </p>

          {this.state.error && (
            <div className="p-3 mb-5 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/5 text-left font-mono text-[11px] text-rose-700 dark:text-rose-400 overflow-x-auto max-h-32">
              <span className="font-bold block mb-1">Detalle técnico:</span>
              {this.state.error.message || String(this.state.error)}
            </div>
          )}

          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Button
              variant="primary"
              size="sm"
              icon={RefreshCw}
              onClick={this.handleRetry}
              className="text-xs font-bold shadow-xs"
            >
              Reintentar Carga
            </Button>

            <Button
              variant="outline"
              size="sm"
              icon={ArrowLeft}
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.location.href = '/dashboard';
                }
              }}
              className="text-xs font-semibold"
            >
              Volver al Dashboard
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
