-- =============================================================================
-- Migration: 003_seed.sql
-- Project  : Sistem Monitoring Investasi (Capex) PT Dahana
-- Purpose  : Data representatif dari Template Monitoring Capex-R2.xlsx
-- =============================================================================

-- NOTE: Seed admin user harus dibuat via Supabase Auth Dashboard terlebih dahulu,
-- kemudian update role via SQL berikut:
-- UPDATE profiles SET role = 'admin' WHERE id = '<user-uuid>';

-- =============================================================================
-- SEED: capex_master (Tahun 2026 — sheet RKAP)
-- =============================================================================
INSERT INTO capex_master (tahun, kode, daftar_capex, kategori, anggaran_rkap, anggaran_perubahan, pic) VALUES
    (2026, 'APP-01', 'Aplikasi E-Audit',                        'Aplikasi Proses Bisnis', 1000000000,  1000000000,  'Divisi IT'),
    (2026, 'APP-02', 'Aplikasi Site Performance Management System', 'Aplikasi Proses Bisnis', 3000000000, 3000000000,  'Divisi IT'),
    (2026, 'APP-03', 'Aplikasi E-Office',                       'Aplikasi Proses Bisnis', 600000000,   600000000,   'Divisi IT'),
    (2026, 'APP-04', 'Aplikasi Autocad',                        'Aplikasi Proses Bisnis', 150000000,   150000000,   'Divisi Engineering'),
    (2026, 'INF-01', 'PowerEdge R760XS (Rack)',                 'Infrastruktur IT',       157100000,   157100000,   'Divisi IT'),
    (2026, 'EQP-01', 'Blasting Monitor Micromate',              'Alat & Perlengkapan',    250000000,   250000000,   'Divisi Operasi'),
    (2026, 'EQP-02', 'Cubicle Switchgear Listrik',              'Infrastruktur',          450000000,   450000000,   'Divisi Umum'),
    (2026, 'MMT-01', 'Pembuatan dan Peremajaan Mobile Manufacturing Truck (MMT)', 'Investasi Rutin', 106350000000, 106350000000, 'Divisi Produksi');

-- =============================================================================
-- SEED: capex_realization (Realisasi Bulanan 2026)
-- =============================================================================
-- Aplikasi E-Audit (APP-01) — Realisasi Juli
INSERT INTO capex_realization (capex_id, tahun, bulan, nilai_rkap, nilai_realisasi, status, keterangan, pic)
SELECT id, 2026, 7, 1000000000, 0, 'Kajian', 'Dalam proses kajian internal', 'Divisi IT'
FROM capex_master WHERE kode = 'APP-01';

-- Aplikasi E-Office (APP-03) — PO Terbit
INSERT INTO capex_realization (capex_id, tahun, bulan, nilai_rkap, nilai_realisasi, status, keterangan, pic)
SELECT id, 2026, 5, 600000000, 600000000, 'PO', '48-771 / Mei 2026', 'Divisi IT'
FROM capex_master WHERE kode = 'APP-03';

-- Cubicle Switchgear Listrik (EQP-02) — Kajian
INSERT INTO capex_realization (capex_id, tahun, bulan, nilai_rkap, nilai_realisasi, status, keterangan, pic)
SELECT id, 2026, 3, 450000000, 450000000, 'Kajian', 'Kajian selesai, menunggu approval', 'Divisi Umum'
FROM capex_master WHERE kode = 'EQP-02';

-- MMT-01 — Realisasi Januari sampai April
INSERT INTO capex_realization (capex_id, tahun, bulan, nilai_rkap, nilai_realisasi, status, keterangan, pic)
SELECT id, 2026, 1, 0,           0,           'Rencana', NULL, 'Divisi Produksi' FROM capex_master WHERE kode = 'MMT-01';
INSERT INTO capex_realization (capex_id, tahun, bulan, nilai_rkap, nilai_realisasi, status, keterangan, pic)
SELECT id, 2026, 2, 0,           0,           'Rencana', NULL, 'Divisi Produksi' FROM capex_master WHERE kode = 'MMT-01';
INSERT INTO capex_realization (capex_id, tahun, bulan, nilai_rkap, nilai_realisasi, status, keterangan, pic)
SELECT id, 2026, 3, 25050000000, 25050000000, 'PO',      'SPMK diterbitkan', 'Divisi Produksi' FROM capex_master WHERE kode = 'MMT-01';
INSERT INTO capex_realization (capex_id, tahun, bulan, nilai_rkap, nilai_realisasi, status, keterangan, pic)
SELECT id, 2026, 4, 8570000000,  8570000000,  'PO',      'Progress 25%', 'Divisi Produksi' FROM capex_master WHERE kode = 'MMT-01';

-- =============================================================================
-- SEED: capex_status_log (dari sheet PO, Kajian, Lainnya)
-- =============================================================================
INSERT INTO capex_status_log (capex_id, tahun, status_type, anggaran_rkap, anggaran_perubahan, total_realisasi, keterangan, rekap_nilai)
SELECT id, 2026, 'PO', 600000000, 600000000, 600000000, '48-771 / 17 Jun 26', 209982994063
FROM capex_master WHERE kode = 'APP-03';

INSERT INTO capex_status_log (capex_id, tahun, status_type, anggaran_rkap, anggaran_perubahan, total_realisasi, keterangan, rekap_nilai)
SELECT id, 2026, 'Kajian', 450000000, 450000000, 450000000, 'Kajian', 41900482009
FROM capex_master WHERE kode = 'EQP-02';

INSERT INTO capex_status_log (capex_id, tahun, status_type, anggaran_rkap, anggaran_perubahan, total_realisasi, keterangan, rekap_nilai)
SELECT id, 2026, 'Lainnya', 150000000, 150000000, 0, 'Cancel', 3760000000
FROM capex_master WHERE kode = 'APP-04';

-- =============================================================================
-- SEED: capex_timeline (Sheet Timeline)
-- =============================================================================
-- MMT-01: Kajian Januari-Februari, Tender Maret, SPMK April-Mei
INSERT INTO capex_timeline (capex_id, tahun, bulan, minggu, kode_status, keterangan)
SELECT id, 2026, 1, 1, 'K', 'Proses Kajian investasi di Tim Capex' FROM capex_master WHERE kode = 'MMT-01';
INSERT INTO capex_timeline (capex_id, tahun, bulan, minggu, kode_status, keterangan)
SELECT id, 2026, 2, 1, 'T', 'Tender'                               FROM capex_master WHERE kode = 'MMT-01';
INSERT INTO capex_timeline (capex_id, tahun, bulan, minggu, kode_status, keterangan)
SELECT id, 2026, 3, 1, 'S', 'Proses persiapan pekerjaan (SPMK)'   FROM capex_master WHERE kode = 'MMT-01';
INSERT INTO capex_timeline (capex_id, tahun, bulan, minggu, kode_status, keterangan)
SELECT id, 2026, 4, 1, 'P', 'Pelaksanaan pekerjaan'               FROM capex_master WHERE kode = 'MMT-01';

-- =============================================================================
-- SEED: capex_lku (Sheet LKU)
-- =============================================================================
INSERT INTO capex_lku (capex_id, tahun, kategori_investasi, departemen, rkap_nilai, rkap_target, rencana_twi, realisasi_po, realisasi_bast, rencana_per_bulan)
SELECT
    id,
    2026,
    'INVESTASI RUTIN',
    'Divisi Produksi',
    106350000000,
    106350,
    33620,
    0,
    0,
    '{"jan":0,"feb":0,"mar":25050000000,"apr":8570000000,"mei":0,"jun":25050000000,"jul":6120000000,"agu":0,"sep":33400000000,"okt":8160000000,"nov":0,"des":0}'
FROM capex_master WHERE kode = 'MMT-01';

-- =============================================================================
-- SEED: capex_assets (Sheet Data Aset)
-- =============================================================================
INSERT INTO capex_assets (no_po, tanggal_po, no_asset, sub_number, category, capitalized_on, asset_description, acquis_val, accum_dep, book_val, currency, location_code, lokasi, room, keterangan) VALUES
    ('4800000704', '2025-11-18', '1300000176', '0', 'Instalasi Komunikasi', '2026-01-21', 'PowerEdge R760XS (Rack)',         157100000, -31420000, 125680000, 'IDR', '1102', 'Subang',          'Data Center',  'Peralatan & Fasilitas IT'),
    ('4800000707', '2025-11-20', '1700001142', '0', 'Alat & Perlengkapan',  '2026-01-01', 'Blasting Monitor Micromate',      250000000, -50000000, 200000000, 'IDR', '2035', 'Katingan Tengah', 'Site Maruwai', 'Blasting Equipment'),
    ('4800000710', '2025-12-01', '1200000520', '0', 'Peralatan Kantor',     '2026-02-01', 'Laptop Dell Latitude 5540',        18000000,  -3600000,  14400000,  'IDR', '1101', 'Subang',          'Kantor Utama', 'Peralatan Kantor'),
    ('4800000715', '2026-01-05', '1500000330', '0', 'Kendaraan',            '2026-03-01', 'Toyota Hilux Double Cabin 4x4',   450000000, -45000000, 405000000, 'IDR', '3010', 'Paiton',          'Site Paiton',  'Kendaraan Operasional');
