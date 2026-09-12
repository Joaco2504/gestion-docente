import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { GraduationCap } from 'lucide-react';

export default function AdminRoute({ children }) {
  const { user, loading, esSuperadmin } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!loading && (!user || !esSuperadmin)) {
      toast.error('Acceso Restringido', {
        description: 'Se requieren permisos de Superadministrador para acceder a este panel.',
        id: 'admin-unauthorized-toast'
      });
    }
  }, [loading, user, esSuperadmin]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 gap-4">
        <div className="w-12 h-12 rounded-2xl border-2 border-primary/20 border-t-primary animate-spin flex items-center justify-center">
          <GraduationCap className="w-5 h-5 text-primary" />
        </div>
        <span className="text-xs font-mono text-text-muted">Verificando credenciales de administración...</span>
      </div>
    );
  }

  if (!user || !esSuperadmin) {
    return <Navigate to="/dashboard" state={{ from: location }} replace />;
  }

  return children;
}
