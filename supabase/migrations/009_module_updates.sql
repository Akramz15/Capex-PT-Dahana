-- =============================================================================
-- Migration: 009_module_updates.sql
-- Description: Tabel untuk mencatat waktu pembaruan terakhir (last updated) per modul
-- =============================================================================

CREATE TABLE IF NOT EXISTS app_module_updates (
    module_name VARCHAR(100) PRIMARY KEY,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by VARCHAR(255) NOT NULL
);

COMMENT ON TABLE app_module_updates IS 'Mencatat kapan terakhir kali sebuah modul (misal: RKAP Master, Realisasi) diubah, dan oleh siapa.';

-- Aktifkan RLS
ALTER TABLE app_module_updates ENABLE ROW LEVEL SECURITY;

-- Izinkan siapa saja (authenticated) untuk membaca log ini
CREATE POLICY "Enable read access for all authenticated users"
ON app_module_updates FOR SELECT
TO authenticated
USING (true);

-- Insert nilai default awal untuk mencegah not found, akan di-upsert oleh backend nantinya
INSERT INTO app_module_updates (module_name, updated_by) VALUES
    ('RKAP Master', 'Sistem'),
    ('Realisasi', 'Sistem'),
    ('Carry Over', 'Sistem'),
    ('Aset Tetap', 'Sistem'),
    ('Timeline', 'Sistem'),
    ('LKU', 'Sistem')
ON CONFLICT (module_name) DO NOTHING;
