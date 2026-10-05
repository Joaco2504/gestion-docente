import { QueryClient } from '@tanstack/react-query';

/**
 * Cliente global de TanStack Query para Korum.
 * Configuración optimizada para aplicaciones educativas/administrativas:
 * - staleTime: 5 minutos (datos frescos sin re-consultas innecesarias al cambiar de pestaña)
 * - gcTime: 15 minutos (mantiene datos en memoria para navegación fluida)
 * - refetchOnWindowFocus: false (evita recargas molestas al alternar ventanas en clase)
 * - retry: 1 (un reintento antes de fallar)
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 15,
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});
