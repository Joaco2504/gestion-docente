import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { queryKeys } from '../lib/queryKeys';
import { catedraCache } from '../services/catedraCache';

/**
 * Hook para obtener los datos maestros de una cátedra
 * @param {string} catedraId 
 * @param {Object} [options] 
 */
export function useCatedraDetailQuery(catedraId, options = {}) {
  return useQuery({
    queryKey: queryKeys.catedras.detail(catedraId),
    queryFn: async () => {
      if (!catedraId) return null;
      if (!isSupabaseConfigured || !supabase) {
        return catedraCache.get(catedraId) || null;
      }

      const [catedraRes, critRes] = await Promise.all([
        supabase
          .from('catedras')
          .select(`
            *,
            instituciones (nombre, nivel),
            ciclos_lectivos (id, nombre, anio)
          `)
          .eq('id', catedraId)
          .single(),
        supabase
          .from('criterios_evaluacion')
          .select('min_asist_promo, min_asist_reg, min_asist_trabajo, nota_min_promo, nota_min_reg, nota_min_sec')
          .eq('catedra_id', catedraId)
          .maybeSingle()
      ]);

      if (catedraRes.error) throw catedraRes.error;

      return {
        catedra: catedraRes.data,
        criterios: critRes.data || null
      };
    },
    enabled: Boolean(catedraId),
    ...options
  });
}

/**
 * Hook para consultar o acceder al dataset consolidado de una cátedra
 * @param {string} catedraId 
 */
export function useCatedraFullDataQuery(catedraId) {
  return useQuery({
    queryKey: queryKeys.catedras.fullData(catedraId),
    queryFn: () => {
      return catedraCache.get(catedraId) || null;
    },
    enabled: Boolean(catedraId),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Mutation para invalidar y refrescar la cátedra
 */
export function useInvalidateCatedraMutation() {
  const queryClient = useQueryClient();
  return {
    invalidate: (catedraId) => {
      catedraCache.invalidate(catedraId);
      queryClient.invalidateQueries({ queryKey: queryKeys.catedras.detail(catedraId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.catedras.fullData(catedraId) });
    }
  };
}
