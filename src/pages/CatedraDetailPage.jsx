import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  CheckSquare, 
  GraduationCap, 
  FileSpreadsheet, 
  FolderOpen, 
  Settings as SettingsIcon, 
  Clock, 
  Users, 
  Building,
  AlertCircle
} from 'lucide-react';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Card from '../components/common/Card';
import AttendanceTab from '../components/catedra/AttendanceTab';
import GradesTab from '../components/catedra/GradesTab';
import ExcelImporter from '../components/catedra/ExcelImporter';
import ResourcesTab from '../components/catedra/ResourcesTab';
import SettingsTab from '../components/catedra/SettingsTab';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';

export default function CatedraDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isDemo } = useAuth();
  const { catedras, activeCiclo } = useApp();

  const [activeTab, setActiveTab] = useState('asistencias');
  const [catedra, setCatedra] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchCatedraData();
  }, [id, catedras]);

  const fetchCatedraData = async () => {
    setLoading(true);
    try {
      if (isSupabaseConfigured && !isDemo) {
        const { data, error } = await supabase
          .from('catedras')
          .select(`
            *,
            instituciones (
              nombre,
              nivel
            )
          `)
          .eq('id', id)
          .single();

        if (error) throw error;
        setCatedra(data);
      } else {
        // Look up in AppContext catedras or localStorage
        let found = catedras.find((c) => c.id === id);
        if (!found) {
          const stored = JSON.parse(localStorage.getItem('demo_catedras') || '[]');
          found = stored.find((c) => c.id === id);
        }

        if (found) {
          setCatedra(found);
        } else {
          // Fallback mock
          setCatedra({
            id,
            nombre: 'Programación Web II',
            nivel: 'TERCIARIO',
            modalidad: 'ANUAL',
            institucion_nombre: 'I.S.F.T. N° 179',
            horarios_semanales: [
              { dia: 'Lunes', desde: '18:00', hasta: '20:00', aula: 'Lab 1' },
              { dia: 'Miércoles', desde: '18:00', hasta: '20:00', aula: 'Lab 1' }
            ]
          });
        }
      }
    } catch (err) {
      console.error('Error fetching cátedra:', err);
      setErrorMsg('No se pudo cargar la cátedra solicitada.');
    } finally {
      setLoading(false);
    }
  };

  const handleCatedraUpdated = (updated) => {
    setCatedra(updated);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (errorMsg || !catedra) {
    return (
      <Card className="text-center py-16">
        <AlertCircle className="w-10 h-10 text-danger mx-auto mb-3" />
        <h3 className="text-base font-bold text-text-primary mb-1">Cátedra no encontrada</h3>
        <p className="text-xs text-text-muted mb-4">{errorMsg || 'La cátedra seleccionada no existe o no tienes acceso.'}</p>
        <Button variant="primary" icon={ArrowLeft} onClick={() => navigate('/dashboard')}>
          Volver al Panel
        </Button>
      </Card>
    );
  }

  const schedules = Array.isArray(catedra.horarios_semanales) ? catedra.horarios_semanales : [];

  const tabs = [
    { id: 'asistencias', label: 'Asistencias', icon: CheckSquare },
    { id: 'calificaciones', label: 'Calificaciones', icon: GraduationCap },
    { id: 'importar', label: 'Cargar Alumnos (Excel)', icon: FileSpreadsheet },
    { id: 'recursos', label: 'Recursos y Archivos', icon: FolderOpen },
    { id: 'configuracion', label: 'Configuración y Criterios', icon: SettingsIcon }
  ];

  return (
    <div className="space-y-6">
      {/* Top navigation back button */}
      <div>
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-primary transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver al Panel de Cátedras</span>
        </button>

        {/* Cátedra Header Card */}
        <div className="bg-surface p-6 rounded-2xl border border-surface-border shadow-sm">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge variant={catedra.nivel === 'TERCIARIO' ? 'primary' : 'warning'}>
                  {catedra.nivel}
                </Badge>
                <Badge variant="default">
                  {catedra.modalidad}
                </Badge>
                <span className="text-xs text-text-muted flex items-center gap-1">
                  <Building className="w-3.5 h-3.5" />
                  <span>{catedra.instituciones?.nombre || catedra.institucion_nombre || 'Institución'}</span>
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
                {catedra.nombre}
              </h1>

              {/* Schedules display */}
              {schedules.length > 0 && (
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Clock className="w-3.5 h-3.5 text-text-muted" />
                  <span className="text-xs text-text-muted font-medium">Horarios:</span>
                  {schedules.map((s, idx) => (
                    <span key={idx} className="text-xs bg-surface-hover px-2 py-0.5 rounded text-text-secondary font-mono">
                      {s.dia} {s.desde}-{s.hasta} {s.aula ? `(${s.aula})` : ''}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Quick stats on header */}
            <div className="flex items-center gap-4 bg-surface-hover/50 p-3 rounded-xl border border-surface-border">
              <div className="text-center px-2">
                <span className="text-[10px] uppercase font-bold text-text-muted block">Ciclo</span>
                <span className="text-sm font-mono font-bold text-text-primary">{activeCiclo?.anio || '2026'}</span>
              </div>
              <div className="h-6 w-px bg-surface-border" />
              <div className="text-center px-2">
                <span className="text-[10px] uppercase font-bold text-text-muted block">Régimen</span>
                <span className="text-sm font-semibold text-text-primary">{catedra.modalidad}</span>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 overflow-x-auto border-t border-surface-border mt-6 pt-2 scrollbar-thin">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Contents */}
      <div className="mt-4">
        {activeTab === 'asistencias' && (
          <AttendanceTab catedraId={catedra.id} catedraName={catedra.nombre} />
        )}

        {activeTab === 'calificaciones' && (
          <GradesTab 
            catedraId={catedra.id} 
            catedraName={catedra.nombre} 
            academicLevel={catedra.nivel}
            modalidad={catedra.modalidad}
          />
        )}

        {activeTab === 'importar' && (
          <div className="space-y-4">
            <div className="bg-surface p-4 rounded-xl border border-surface-border">
              <h3 className="text-sm font-bold text-text-primary">
                Importación Masiva de Estudiantes a {catedra.nombre}
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                Carga un archivo Excel (.xlsx, .xls) o CSV con las columnas DNI, Apellido y Nombre. El sistema detectará automáticamente los encabezados y vinculará a los alumnos en esta cátedra.
              </p>
            </div>
            <ExcelImporter 
              catedraId={catedra.id} 
              onStudentsImported={() => {
                setActiveTab('asistencias');
              }} 
            />
          </div>
        )}

        {activeTab === 'recursos' && (
          <ResourcesTab catedraId={catedra.id} catedraName={catedra.nombre} />
        )}

        {activeTab === 'configuracion' && (
          <SettingsTab catedra={catedra} onCatedraUpdated={handleCatedraUpdated} />
        )}
      </div>
    </div>
  );
}
