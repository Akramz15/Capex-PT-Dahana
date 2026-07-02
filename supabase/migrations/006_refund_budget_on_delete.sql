-- =============================================================================
-- Migration: 006_refund_budget_on_delete.sql
-- Description: RPC untuk Menghapus Capex & Mengembalikan (Refund) Dana ke Sumbernya
-- =============================================================================

CREATE OR REPLACE FUNCTION rpc_delete_capex_reallocation(
    p_capex_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_source_id UUID;
    v_amount BIGINT;
BEGIN
    -- 1. Ambil source_capex_id dan nominal anggaran_perubahan dari item yang akan dihapus
    SELECT source_capex_id, anggaran_perubahan 
    INTO v_source_id, v_amount
    FROM capex_master 
    WHERE id = p_capex_id 
    FOR UPDATE;

    -- 2. Jika item ini memiliki sumber dana (hasil pergeseran), kembalikan anggarannya
    IF v_source_id IS NOT NULL AND v_amount > 0 THEN
        UPDATE capex_master 
        SET anggaran_perubahan = anggaran_perubahan + v_amount
        WHERE id = v_source_id;
    END IF;

    -- 3. Hapus item capex
    DELETE FROM capex_master WHERE id = p_capex_id;
END;
$$;
