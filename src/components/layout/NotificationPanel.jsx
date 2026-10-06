import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  Info, 
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Clock
} from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuSeparator
} from '../common/DropdownMenu';

function formatTimestamp(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffSec < 60 && diffSec >= -60) return 'Hace un instante';
  if (diffSec >= 60 && diffSec < 3600) return `Hace ${Math.floor(diffSec / 60)} min`;
  if (diffSec >= 3600 && diffSec < 86400) return `Hace ${Math.floor(diffSec / 3600)} h`;
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}

export default function NotificationPanel() {
  const navigate = useNavigate();
  const { 
    notificaciones, 
    unreadCount, 
    marcarLeida, 
    marcarTodasLeidas, 
    limpiarNotificaciones 
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);

  const getIconForType = (tipo) => {
    switch (tipo) {
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />;
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />;
      case 'agenda':
        return <Calendar className="w-4 h-4 text-primary shrink-0" />;
      default:
        return <Info className="w-4 h-4 text-sky-500 shrink-0" />;
    }
  };

  const handleItemClick = (notif) => {
    marcarLeida(notif.id);
    if (notif.link) {
      setIsOpen(false);
      navigate(notif.link);
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Abrir notificaciones"
          className="relative p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-hidden transition-colors cursor-pointer active:scale-95"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[1.125rem] h-[1.125rem] px-1 rounded-full bg-rose-500 text-white font-mono font-bold text-[10px] flex items-center justify-center ring-2 ring-surface shadow-xs animate-scaleIn">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-80 sm:w-96 p-0 shadow-2xl border border-slate-200/80 dark:border-slate-800 bg-surface/98 backdrop-blur-xl overflow-hidden"
      >
        {/* Cabecera del panel */}
        <div className="p-3.5 border-b border-slate-200/70 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/40">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-text-primary tracking-tight">
              Notificaciones & Agenda
            </span>
            {unreadCount > 0 && (
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {unreadCount} nuevas
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => marcarTodasLeidas()}
                className="p-1 rounded-lg text-text-muted hover:text-primary hover:bg-surface-hover transition-colors text-[11px] font-medium inline-flex items-center gap-1 cursor-pointer"
                title="Marcar todas como leídas"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Leídas</span>
              </button>
            )}
            {(notificaciones || []).length > 0 && (
              <button
                type="button"
                onClick={() => limpiarNotificaciones()}
                className="p-1 rounded-lg text-text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-colors text-[11px] cursor-pointer"
                title="Limpiar todas"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Listado con scroll controlado */}
        <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
          {(notificaciones || []).length === 0 ? (
            <div className="py-10 px-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-3 border border-emerald-500/20">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-xs font-bold text-text-primary mb-1">
                Todo al día
              </h4>
              <p className="text-[11px] text-text-muted max-w-[200px] mx-auto leading-relaxed">
                No tienes recordatorios ni alertas pendientes en la agenda.
              </p>
            </div>
          ) : (
            notificaciones.map((notif) => {
              const isUnread = !notif.leida;
              return (
                <div
                  key={notif.id}
                  onClick={() => handleItemClick(notif)}
                  className={`p-3 transition-colors cursor-pointer flex gap-3 text-left ${
                    isUnread
                      ? 'bg-primary/5 hover:bg-primary/10'
                      : 'hover:bg-surface-hover opacity-85 hover:opacity-100'
                  }`}
                >
                  <div className="mt-0.5">
                    {getIconForType(notif.tipo)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className={`text-xs truncate ${isUnread ? 'font-bold text-text-primary' : 'font-medium text-text-primary'}`}>
                        {notif.titulo}
                      </p>
                      {isUnread && (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      )}
                    </div>

                    <p className="text-[11px] text-text-muted leading-relaxed line-clamp-2">
                      {notif.mensaje}
                    </p>

                    <div className="mt-1 flex items-center justify-between text-[10px] text-text-muted/80">
                      <span className="inline-flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" />
                        {formatTimestamp(notif.fecha)}
                      </span>
                      {notif.link && (
                        <span className="text-primary font-semibold inline-flex items-center gap-0.5">
                          Ver <ArrowRight className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pie con acceso al calendario */}
        <div className="p-2.5 border-t border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-center">
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              navigate('/calendario');
            }}
            className="w-full py-1.5 px-3 rounded-xl text-xs font-bold text-primary hover:bg-primary/10 transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Ver Calendario Completo</span>
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
