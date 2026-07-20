-- =============================================================================
-- Migration: 004_add_carryover.sql
-- Project  : Sistem Monitoring Investasi (Capex) PT Dahana
-- Created  : 2026-07-20
-- =============================================================================

-- Add is_carryover to capex_master
ALTER TABLE capex_master 
ADD COLUMN is_carryover BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN capex_master.is_carryover IS 'Penanda apakah item ini merupakan Carry Over dari tahun sebelumnya.';
