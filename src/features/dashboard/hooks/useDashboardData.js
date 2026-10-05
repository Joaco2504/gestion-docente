import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../../../lib/supabase';
import { handleAppError } from '../../../utils/handleAppError';
import { processAgendaItems } from '../utils/dashboardHelpers';

export function useDashboardData(user, isDemo, activeCiclo) {
  const [loading, setLoading] = useState(true);
  const [catedrasList, setCatedrasList] = useState([]);
  const [agendaItems, setAgendaItems] = useState([]);

  /**
   * Datos demo para pruebas locales sin conexión activa
   */
  const loadDemoData = useCallback(() => {
    const demoCatedras = [
      {
        id: 'cat-1',
        nombre: 'Programación y Algoritmos II',
        nivel: 'TERCIARIO',
        modalidad: 'ANUAL',
        institucion_nombre: 'Instituto Superior de Formación Docente N° 19',
        institucion_nivel: 'TERCIARIO',
        estudiantes_count: 26,
        asistencia_promedio: 88.5,
        clases_count: 8,
        horarios_semanales: [{ dia: 'Lunes', desde: '18:00', hasta: '20:00', aula: 'Lab 1' }],
        ultima_clase: {
          id: 'clase-demo-1',
          fecha: '2026-03-09',
          tema: 'Unidad 2 - Estructuras de Datos Avanzadas y Recursión',
          presentes: 24,
          totalAsist: 26
        }
      },
      {
        id: 'cat-2',
        nombre: 'Bases de Datos Relacionales',
        nivel: 'TERCIARIO',
        modalidad: 'CUATRIMESTRAL',
        institucion_nombre: 'Instituto Superior de Formación Docente N° 19',
        institucion_nivel: 'TERCIARIO',
        estudiantes_count: 31,
        asistencia_promedio: 92.0,
        clases_count: 12,
        horarios_semanales: [{ dia: 'Martes', desde: '19:00', hasta: '21:00', aula: 'Lab 2' }],
        ultima_clase: {
          id: 'clase-demo-2',
          fecha: '2026-03-10',
          tema: 'Normalización 3FN y Claves Foráneas en PostgreSQL',
          presentes: 29,
          totalAsist: 31
        }
      },
      {
        id: 'cat-3',
        nombre: 'Informática y Ciudadanía Digital',
        nivel: 'SECUNDARIO',
        modalidad: 'ANUAL',
        institucion_nombre: 'Colegio Secundario N° 4 Manuel Belgrano',
        institucion_nivel: 'SECUNDARIO',
        estudiantes_count: 28,
        asistencia_promedio: 84.2,
        clases_count: 5,
        horarios_semanales: [{ dia: 'Miércoles', desde: '08:30', hasta: '10:30', aula: 'Aula 4' }],
        ultima_clase: {
          id: 'clase-demo-3',
          fecha: '2026-03-04',
          tema: 'Introducción al Pensamiento Computacional y Ética de Datos',
          presentes: 25,
          totalAsist: 28
        }
      }
    ];

    const demoAgenda = [
      {
        id: 'ev-1',
        titulo: 'Tribunal Examinador - Turno Febrero/Marzo',
        tipo: 'TRIBUNAL_EXAMEN',
        fecha: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
        hora: '18:30',
        notas: 'Mesa evaluadora de Programación I y Algoritmos'
      },
      {
        id: 'ev-2',
        titulo: 'Reunión Plenaria de Personal Docente',
        tipo: 'REUNION',
        fecha: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
        hora: '09:00',
        notas: 'Planificación anual y pautas institucionales ciclo 2026'
      },
      {
        id: 'ev-3',
        titulo: 'Cierre de Carga de Diagnósticos Iniciales',
        tipo: 'PERIODO',
        fecha: new Date(Date.now() + 86400000 * 10).toISOString().split('T')[0],
        hora: null,
        notas: 'Plazo reglamentario de entrega en secretaría'
      }
    ];

    setCatedrasList(demoCatedras);
    setAgendaItems(demoAgenda);
  }, []);

  /**
   * Carga y optimización de datos en paralelo desde Supabase
   */
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      if (isSupabaseConfigured && !isDemo && user) {
        const todayIso = new Date().toISOString().split('T')[0];
        const next15Days = new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0];

        // 1. Cátedras globales del docente (sin filtrar por instituto) + Eventos y Períodos
        const [catedrasRes, eventsRes, periodsRes] = await Promise.all([
          supabase
            .from('catedras')
            .select(`
              *,
              instituciones (
                id,
                nombre,
                nivel
              ),
              ciclos_lectivos (
                id,
                anio,
                activo
              )
            `)
            .eq('docente_id', user.id)
            .order('nombre', { ascending: true }),

          supabase
            .from('eventos_calendario')
            .select('*')
            .eq('docente_id', user.id)
            .gte('fecha_inicio', todayIso + 'T00:00:00')
            .lte('fecha_inicio', next15Days + 'T23:59:59')
            .order('fecha_inicio', { ascending: true }),

          supabase
            .from('periodos_academicos')
            .select('*')
            .order('fecha_inicio', { ascending: true })
        ]);

        const rawCatedras = catedrasRes.data || [];
        const catedraIds = rawCatedras.map(c => c.id);

        let inscripcionesByCat = {};
        let latestClaseByCat = {};
        let attendancePctByCat = {};
        let clasesCountByCat = {};

        if (catedraIds.length > 0) {
          // 2. Consultar inscripciones y todas las clases en paralelo
          const [inscRes, clasesRes] = await Promise.all([
            supabase
              .from('inscripciones')
              .select('id, catedra_id, estudiante_id, estado_academico')
              .in('catedra_id', catedraIds),

            supabase
              .from('clases')
              .select('id, catedra_id, fecha, tema')
              .in('catedra_id', catedraIds)
              .order('fecha', { ascending: false })
          ]);

          // Conteo de inscriptos por cátedra
          (inscRes.data || []).forEach(row => {
            inscripcionesByCat[row.catedra_id] = (inscripcionesByCat[row.catedra_id] || 0) + 1;
          });

          // Obtener la clase más reciente de cada cátedra y conteo total de clases por cátedra
          const allClases = clasesRes.data || [];
          
          clasesCountByCat = (allClases || []).reduce((acc, c) => {
            const catId = c.catedra_id;
            acc[catId] = (acc[catId] || 0) + 1;
            return acc;
          }, {});

          allClases.forEach(c => {
            if (!latestClaseByCat[c.catedra_id]) {
              latestClaseByCat[c.catedra_id] = { ...c };
            }
          });

          // 3. Consulta unificada y atómica de asistencias para todas las clases de las cátedras
          const allClaseIds = allClases.map(c => c.id);
          if (allClaseIds.length > 0) {
            const { data: allAsistData } = await supabase
              .from('asistencias')
              .select('id, clase_id, estudiante_id, estado')
              .in('clase_id', allClaseIds);

            const asistMap = {};
            const claseToCat = {};
            allClases.forEach(c => { claseToCat[c.id] = c.catedra_id; });

            const totalByCat = {};
            const presentesByCat = {};

            (allAsistData || []).forEach(a => {
              if (!asistMap[a.clase_id]) {
                asistMap[a.clase_id] = { presentes: 0, total: 0 };
              }
              asistMap[a.clase_id].total += 1;
              if (a.estado === 'PRESENTE') {
                asistMap[a.clase_id].presentes += 1;
              }

              const catId = claseToCat[a.clase_id];
              if (catId) {
                totalByCat[catId] = (totalByCat[catId] || 0) + 1;
                if (a.estado === 'PRESENTE') {
                  presentesByCat[catId] = (presentesByCat[catId] || 0) + 1;
                }
              }
            });

            // Asignar presentes a la última clase
            Object.keys(latestClaseByCat).forEach(catId => {
              const cls = latestClaseByCat[catId];
              if (cls && asistMap[cls.id]) {
                cls.presentes = asistMap[cls.id].presentes;
                cls.totalAsist = asistMap[cls.id].total;
              }
            });

            // Calcular porcentaje promedio de asistencia por cátedra
            catedraIds.forEach(catId => {
              const tot = totalByCat[catId] || 0;
              const pres = presentesByCat[catId] || 0;
              attendancePctByCat[catId] = tot > 0 ? Number(((pres / tot) * 100).toFixed(1)) : null;
            });
          }
        }

        const agenda = processAgendaItems(eventsRes.data || [], periodsRes.data || [], todayIso, next15Days);

        const enriched = rawCatedras.map(c => ({
          ...c,
          institucion_nombre: c.instituciones?.nombre || 'Institución',
          institucion_nivel: c.instituciones?.nivel || c.nivel,
          estudiantes_count: inscripcionesByCat[c.id] ?? 0,
          clases_count: clasesCountByCat?.[c.id] ?? 0,
          ultima_clase: latestClaseByCat[c.id] || null,
          asistencia_promedio: attendancePctByCat[c.id] ?? null
        }));

        setCatedrasList(enriched);
        setAgendaItems(agenda);
      } else {
        loadDemoData();
      }
    } catch (err) {
      handleAppError(err, 'DashboardPage / Cargar Datos', user);
    } finally {
      setLoading(false);
    }
  }, [user, isDemo, loadDemoData]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData, activeCiclo]);

  return {
    loading,
    catedrasList,
    setCatedrasList,
    agendaItems,
    setAgendaItems,
    fetchDashboardData
  };
}
