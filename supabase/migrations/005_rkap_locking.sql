-- =============================================================================
-- Migration: 005_rkap_locking.sql
-- Description: Menambahkan tabel rkap_locks dan referensi source_capex_id
-- =============================================================================

-- 1. Buat tabel rkap_locks
CREATE TABLE IF NOT EXISTS rkap_locks (
    tahun SMALLINT PRIMARY KEY,
    is_locked BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id)
);

COMMENT ON TABLE rkap_locks IS 'Status penguncian anggaran RKAP per tahun';

-- 2. Tambahkan kolom source_capex_id ke capex_master
ALTER TABLE capex_master 
ADD COLUMN IF NOT EXISTS source_capex_id UUID REFERENCES capex_master(id) ON DELETE SET NULL;

COMMENT ON COLUMN capex_master.source_capex_id IS 'Jika ini adalah capex baru (saat RKAP terkunci), ID capex lama mana yang anggarannya dipotong';

-- 3. Set RLS Policies untuk rkap_locks
ALTER TABLE rkap_locks ENABLE ROW LEVEL SECURITY;

-- Semua user (authenticated) bisa membaca (select)
CREATE POLICY "Enable read access for all authenticated users"
ON rkap_locks FOR SELECT
TO authenticated
USING (true);

-- Hanya role admin yang bisa memodifikasi (insert/update)
CREATE POLICY "Enable write access for admin users only"
ON rkap_locks FOR ALL
TO authenticated
USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' );

-- 4. RPC untuk melakukan Insert Capex Baru & Potong Anggaran Sumber (Transaksi Aman)
CREATE OR REPLACE FUNCTION rpc_create_capex_reallocation(
    p_tahun SMALLINT,
    p_kode VARCHAR,
    p_daftar_capex TEXT,
    p_kategori VARCHAR,
    p_anggaran_perubahan BIGINT,
    p_pic VARCHAR,
    p_source_capex_id UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sisa_sumber BIGINT;
    v_new_id UUID;
BEGIN
    -- 1. Lock baris sumber untuk mencegah race condition
    SELECT anggaran_perubahan INTO v_sisa_sumber 
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
    SET anggaran_perubahan = anggaran_perubahan - p_anggaran_perubahan
    WHERE id = p_source_capex_id;

    -- 3. Insert capex baru
    INSERT INTO capex_master (
        tahun, kode, daftar_capex, kategori, anggaran_rkap, anggaran_perubahan, pic, source_capex_id
    ) VALUES (
        p_tahun, p_kode, p_daftar_capex, p_kategori, 0, p_anggaran_perubahan, p_pic, p_source_capex_id
    ) RETURNING id INTO v_new_id;

    RETURN v_new_id;
END;
$$;
