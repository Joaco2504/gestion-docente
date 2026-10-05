-- ============================================================================
-- Rollback: 20261005080000_fase6_rpc_dashboard_rollback.sql
-- Elimina las funciones RPC creadas en la Fase 6
-- ============================================================================

DROP FUNCTION IF EXISTS public.dashboard_agenda(UUID, INT);
DROP FUNCTION IF EXISTS public.dashboard_resumen(UUID);
