-- =============================================================================
-- Migration: 007_audit_logs.sql
-- Description: Menambahkan tabel capex_audit_logs dan update RPC pergeseran
-- =============================================================================

-- 1. Buat tabel capex_audit_logs
CREATE TABLE IF NOT EXISTS capex_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tahun SMALLINT NOT NULL,
    action_type VARCHAR(50) NOT NULL, -- e.g., 'PENGALIHAN'
    capex_id UUID REFERENCES capex_master(id) ON DELETE CASCADE,
    source_capex_id UUID REFERENCES capex_master(id) ON DELETE SET NULL,
    anggaran BIGINT NOT NULL,
    keterangan TEXT,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE capex_audit_logs IS 'Tabel untuk mencatat riwayat pengalihan atau perubahan anggaran secara transparan.';

-- 2. Update RPC untuk mencatat log otomatis
CREATE OR REPLACE FUNCTION rpc_create_capex_reallocation(
    p_tahun SMALLINT,
    p_kode VARCHAR,
    p_daftar_capex TEXT,
    p_kategori VARCHAR,
    p_anggaran_perubahan BIGINT,
    p_pic VARCHAR,
    p_source_capex_id UUID,
    p_user_id UUID -- Parameter baru
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sisa_sumber BIGINT;
    v_new_id UUID;
    v_source_kode VARCHAR;
    v_source_nama TEXT;
BEGIN
    -- 1. Lock baris sumber untuk mencegah race condition
    SELECT anggaran_perubahan, kode, daftar_capex 
    INTO v_sisa_sumber, v_source_kode, v_source_nama
    FROM capex_master 
    WHERE id = p_source_capex_id 
    FOR UPDATE;

    IF v_sisa_sumber IS NULL THEN
        RAISE EXCEPTION 'Source Capex tidak ditemukan.';
    END IF;

    IF v_sisa_sumber < p_anggaran_perubahan THEN
        RAISE EXCEPTION 'Sisa anggaran sumber tidak mencukupi untuk pergeseran ini.';
    END IF;

    -- 2. Kurangi anggaran sumber
    UPDATE capex_master 
    SET anggaran_perubahan = anggaran_perubahan - p_anggaran_perubahan,
        updated_at = now()
    WHERE id = p_source_capex_id;

    -- 3. Insert capex baru
    INSERT INTO capex_master (
        tahun, kode, daftar_capex, kategori, anggaran_rkap, anggaran_perubahan, pic, source_capex_id
    ) VALUES (
        p_tahun, p_kode, p_daftar_capex, p_kategori, 0, p_anggaran_perubahan, p_pic, p_source_capex_id
    ) RETURNING id INTO v_new_id;

    -- 4. Catat ke Audit Log
    INSERT INTO capex_audit_logs (
        tahun, action_type, capex_id, source_capex_id, anggaran, user_id, keterangan
    ) VALUES (
        p_tahun, 
        'PENGALIHAN', 
        v_new_id, 
        p_source_capex_id, 
        p_anggaran_perubahan, 
        p_user_id,
        'Pengalihan dari ' || COALESCE(v_source_kode, 'TANPA-KODE') || ' - ' || COALESCE(v_source_nama, '') || ' ke Capex Baru.'
    );

    RETURN v_new_id;
END;
$$;

-- RLS untuk tabel audit
ALTER TABLE capex_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all authenticated users on audit logs"
ON capex_audit_logs FOR SELECT
TO authenticated
USING (true);
