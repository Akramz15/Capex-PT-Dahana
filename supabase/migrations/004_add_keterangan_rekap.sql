-- =============================================================================
-- Migration: 004_add_keterangan_rekap.sql
-- =============================================================================

ALTER TABLE capex_status_log ADD COLUMN keterangan_rekap TEXT;

COMMENT ON COLUMN capex_status_log.keterangan_rekap IS 'Keterangan khusus untuk rekapitulasi nilai.';
