import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { handleAppError } from '../utils/handleAppError';

const AppContext = createContext({});

export const useApp = () => useContext(AppContext);

export function AppProvider({ children }) {
  const { user, isDemo } = useAuth();
  
  const [instituciones, setInstituciones] = useState([]);
  const [selectedInstitucion, setSelectedInstitucion] = useState(null);
  const [ciclosLectivos, setCiclosLectivos] = useState([]);
  const [selectedCiclo, setSelectedCiclo] = useState(null);
  const [catedras, setCatedras] = useState([]);
  const [periodosAcademicos, setPeriodosAcademicos] = useState([]);
  const [openNewCatedraModal, setOpenNewCatedraModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Carga instituciones, ciclos lectivos y cátedras desde Supabase o Mock
  const refreshGlobalState = useCallback(async () => {
    if (!user) {
      setInstituciones([]);
      setSelectedInstitucion(null);
      setCiclosLectivos([]);
      setSelectedCiclo(null);
      setCatedras([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    if (isDemo || !isSupabaseConfigured || !supabase) {
      // Cargar datos demo de localStorage o iniciales
      const savedInst = localStorage.getItem('docentepro_demo_instituciones');
      const savedCiclos = localStorage.getItem('docentepro_demo_ciclos');
      const savedCatedras = localStorage.getItem('demo_catedras');

      let instList = savedInst ? JSON.parse(savedInst) : [
        { id: 'inst-1', docente_id: user.id, nombre: 'Instituto Superior de Formación Docente N° 19', nivel: 'TERCIARIO' },
        { id: 'inst-2', docente_id: user.id, nombre: 'Colegio Secundario N° 4 Manuel Belgrano', nivel: 'SECUNDARIO' }
      ];

      let ciclosList = savedCiclos ? JSON.parse(savedCiclos) : [
        { id: 'ciclo-2026', docente_id: user.id, anio: 2026, activo: true },
        { id: 'ciclo-2025', docente_id: user.id, anio: 2025, activo: false }
      ];

      let catList = savedCatedras ? JSON.parse(savedCatedras) : [
        {
          id: 'cat-1',
          docente_id: user.id,
          institucion_id: 'inst-1',
          institucion_nombre: 'Instituto Superior de Formación Docente N° 19',
          ciclo_id: 'ciclo-2026',
          nombre: 'Programación y Algoritmos II',
          nivel: 'TERCIARIO',
          modalidad: 'ANUAL',
          horarios_semanales: [
            { dia: 'Lunes', desde: '18:00', hasta: '20:00', aula: 'Lab 1' },
            { dia: 'Miércoles', desde: '18:00', hasta: '20:00', aula: 'Lab 1' }
          ],
          estudiantes_count: 24
        },
        {
          id: 'cat-2',
          docente_id: user.id,
          institucion_id: 'inst-1',
          institucion_nombre: 'Instituto Superior de Formación Docente N° 19',
          ciclo_id: 'ciclo-2026',
          nombre: 'Bases de Datos Relacionales',
          nivel: 'TERCIARIO',
          modalidad: 'CUATRIMESTRAL',
          horarios_semanales: [
            { dia: 'Martes', desde: '20:00', hasta: '22:00', aula: 'Aula 8' }
          ],
          estudiantes_count: 18
        },
        {
          id: 'cat-3',
          docente_id: user.id,
          institucion_id: 'inst-2',
          institucion_nombre: 'Colegio Secundario N° 4 Manuel Belgrano',
          ciclo_id: 'ciclo-2026',
          nombre: 'Tecnologías de la Información (5to Año)',
          nivel: 'SECUNDARIO',
          modalidad: 'ANUAL',
          horarios_semanales: [
            { dia: 'Jueves', desde: '07:30', hasta: '09:30', aula: 'Aula 12' },
            { dia: 'Viernes', desde: '10:00', hasta: '12:00', aula: 'Aula 12' }
          ],
          estudiantes_count: 32
        }
      ];

      const savedActiveInstId = localStorage.getItem('institucion_activa_id');
      const activeInst = (savedActiveInstId && instList.find(i => i.id === savedActiveInstId)) || instList[0] || null;
      if (activeInst?.id) localStorage.setItem('institucion_activa_id', activeInst.id);

      setInstituciones(instList);
      setSelectedInstitucion(activeInst);
      setCiclosLectivos(ciclosList);
      setSelectedCiclo(ciclosList.find(c => c.activo) ?? ciclosList[0] ?? null);
      setCatedras(catList);
      localStorage.setItem('docentepro_demo_instituciones', JSON.stringify(instList));
      localStorage.setItem('docentepro_demo_ciclos', JSON.stringify(ciclosList));
      localStorage.setItem('demo_catedras', JSON.stringify(catList));

      const savedPeriods = localStorage.getItem('docentepro_academic_periods');
      if (savedPeriods) {
        setPeriodosAcademicos(JSON.parse(savedPeriods));
      } else {
        const defaultPers = [
          { id: 'per-1', nombre: '1° Cuatrimestre', tipo: 'PRIMER_CUATRIMESTRE', fecha_inicio: '2026-03-09', fecha_fin: '2026-07-10' },
          { id: 'per-2', nombre: 'Receso Invernal', tipo: 'RECESO_INVERNAL', fecha_inicio: '2026-07-13', fecha_fin: '2026-07-24' },
          { id: 'per-3', nombre: '2° Cuatrimestre', tipo: 'SEGUNDO_CUATRIMESTRE', fecha_inicio: '2026-08-03', fecha_fin: '2026-11-20' }
        ];
        setPeriodosAcademicos(defaultPers);
        localStorage.setItem('docentepro_academic_periods', JSON.stringify(defaultPers));
      }

      setLoading(false);
      return;
    }

    try {
      // 1. Fetch Instituciones
      const { data: instData, error: instErr } = await supabase
        .from('instituciones')
        .select('*')
        .eq('docente_id', user.id)
        .order('nombre', { ascending: true });

      if (instErr) throw instErr;

      // 2. Fetch Ciclos Lectivos
      const { data: cicloData, error: cicloErr } = await supabase
        .from('ciclos_lectivos')
        .select('*')
        .eq('docente_id', user.id)
        .order('anio', { ascending: false });

      if (cicloErr) throw cicloErr;

      // 3. Fetch Cátedras
      const { data: catData, error: catErr } = await supabase
        .from('catedras')
        .select(`
          *,
          instituciones (
            nombre,
            nivel
          )
        `)
        .eq('docente_id', user.id)
        .order('nombre', { ascending: true });

      if (catErr) throw catErr;

      const insts = instData ?? [];
      const ciclos = cicloData ?? [];
      const cats = (catData ?? []).map(c => ({
        ...c,
        institucion_nombre: c.instituciones?.nombre || ''
      }));

      const savedActiveInstId = localStorage.getItem('institucion_activa_id');

      setInstituciones(insts);
      setSelectedInstitucion(prev => {
        if (savedActiveInstId) {
          const found = insts.find(i => i.id === savedActiveInstId);
          if (found) return found;
        }
        if (prev && insts.some(i => i.id === prev.id)) return prev;
        const dbActive = insts.find(i => i.activa) || insts[0] || null;
        if (dbActive?.id) {
          localStorage.setItem('institucion_activa_id', dbActive.id);
        }
        return dbActive;
      });

      setCiclosLectivos(ciclos);
      setSelectedCiclo(prev => {
        if (prev && ciclos.some(c => c.id === prev.id)) return prev;
        return ciclos.find(c => c.activo) ?? ciclos[0] ?? null;
      });

      setCatedras(cats);

      // 4. Fetch Periodos Académicos
      try {
        const { data: perData } = await supabase
          .from('periodos_academicos')
          .select('*')
          .order('fecha_inicio', { ascending: true });
        if (perData && perData.length > 0) {
          setPeriodosAcademicos(perData);
          localStorage.setItem('docentepro_academic_periods', JSON.stringify(perData));
        } else {
          const storedPers = localStorage.getItem('docentepro_academic_periods');
          if (storedPers) setPeriodosAcademicos(JSON.parse(storedPers));
        }
      } catch (perErr) {
        console.warn('Aviso cargando periodos_academicos en AppContext:', perErr);
      }
    } catch (error) {
      handleAppError(error, 'AppContext / refreshGlobalState', user);
    } finally {
      setLoading(false);
    }
  }, [user, isDemo]);

  useEffect(() => {
    refreshGlobalState();
  }, [refreshGlobalState]);

  // Crear nueva institución
  const createInstitucion = async (nombre, nivel) => {
    if (!user) return null;
    
    if (isDemo || !isSupabaseConfigured) {
      const nueva = { 
        id: 'inst-' + Date.now(), 
        docente_id: user.id, 
        nombre, 
        nivel 
      };
      const updated = [...instituciones, nueva];
      setInstituciones(updated);
      setSelectedInstitucion(nueva);
      localStorage.setItem('docentepro_demo_instituciones', JSON.stringify(updated));
      return nueva;
    }

    const { data, error } = await supabase
      .from('instituciones')
      .insert({ docente_id: user.id, nombre, nivel })
      .select()
      .single();

    if (error) throw error;
    await refreshGlobalState();
    setSelectedInstitucion(data);
    return data;
  };

  // Crear nuevo ciclo lectivo
  const createCicloLectivo = async (anio, activo = false) => {
    if (!user) return null;

    if (isDemo || !isSupabaseConfigured) {
      const nuevo = { 
        id: 'ciclo-' + Date.now(), 
        docente_id: user.id, 
        anio: Number(anio), 
        activo 
      };
      let updated = [...ciclosLectivos, nuevo];
      if (activo) {
        updated = updated.map(c => c.id === nuevo.id ? c : { ...c, activo: false });
      }
      setCiclosLectivos(updated);
      setSelectedCiclo(nuevo);
      localStorage.setItem('docentepro_demo_ciclos', JSON.stringify(updated));
      return nuevo;
    }

    if (activo) {
      await supabase
        .from('ciclos_lectivos')
        .update({ activo: false })
        .eq('docente_id', user.id);
    }

    const { data, error } = await supabase
      .from('ciclos_lectivos')
      .insert({ docente_id: user.id, anio: Number(anio), activo })
      .select()
      .single();

    if (error) throw error;
    await refreshGlobalState();
    setSelectedCiclo(data);
    return data;
  };

  const handleSetActiveInstitucion = (inst) => {
    setSelectedInstitucion(inst);
    if (inst?.id) {
      localStorage.setItem('institucion_activa_id', inst.id);
    } else {
      localStorage.removeItem('institucion_activa_id');
    }
  };

  const value = {
    instituciones,
    selectedInstitucion,
    setSelectedInstitucion: handleSetActiveInstitucion,
    activeInstitucion: selectedInstitucion,
    setActiveInstitucion: handleSetActiveInstitucion,
    ciclosLectivos,
    selectedCiclo,
    setSelectedCiclo,
    activeCiclo: selectedCiclo,
    setActiveCiclo: setSelectedCiclo,
    catedras,
    setCatedras,
    periodosAcademicos,
    setPeriodosAcademicos,
    openNewCatedraModal,
    setOpenNewCatedraModal,
    loading,
    loadingApp: loading,
    refreshGlobalState,
    refreshData: refreshGlobalState,
    refreshCatedras: refreshGlobalState,
    createInstitucion,
    createCicloLectivo
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
