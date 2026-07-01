-- =============================================================================
-- Migration: 001_schema.sql
-- Project  : Sistem Monitoring Investasi (Capex) PT Dahana
-- Created  : 2026-06-29
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- TABLE: profiles
-- Extends Supabase auth.users. Stores role (admin | user).
-- =============================================================================
CREATE TABLE profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name   VARCHAR(150),
    role        VARCHAR(20) NOT NULL DEFAULT 'user'
                    CHECK (role IN ('admin', 'user')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE profiles IS 'User profile extending Supabase auth.users with RBAC role.';
COMMENT ON COLUMN profiles.role IS 'admin = full CRUD access; user = read-only access.';

-- =============================================================================
-- TABLE: capex_master
-- Source  : Sheet "RKAP" — Master daftar investasi per tahun.
-- =============================================================================
CREATE TABLE capex_master (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tahun               SMALLINT NOT NULL,
    kode                VARCHAR(50),
    daftar_capex        TEXT NOT NULL,
    kategori            VARCHAR(50),
    anggaran_rkap       BIGINT NOT NULL DEFAULT 0,
    anggaran_perubahan  BIGINT NOT NULL DEFAULT 0,
    pic                 VARCHAR(150),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE capex_master IS 'Master daftar investasi Capex dari sheet RKAP.';
COMMENT ON COLUMN capex_master.anggaran_perubahan IS 'Nilai anggaran setelah revisi/perubahan RKAP.';

-- =============================================================================
-- TABLE: capex_realization
-- Source  : Sheet "Real" — Realisasi investasi per bulan (Jan–Des).
-- =============================================================================
CREATE TABLE capex_realization (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    capex_id        UUID NOT NULL REFERENCES capex_master(id) ON DELETE CASCADE,
    tahun           SMALLINT NOT NULL,
    bulan           SMALLINT NOT NULL CHECK (bulan BETWEEN 1 AND 12),
    nilai_rkap      BIGINT NOT NULL DEFAULT 0,
    nilai_realisasi BIGINT NOT NULL DEFAULT 0,
    status          VARCHAR(50),
    keterangan      TEXT,
    pic             VARCHAR(150),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_realization_capex_period UNIQUE (capex_id, tahun, bulan)
);

COMMENT ON TABLE capex_realization IS 'Log realisasi bulanan dari sheet Real. Satu baris per item per bulan.';
COMMENT ON COLUMN capex_realization.bulan IS '1 = Januari, 12 = Desember.';

-- =============================================================================
-- TABLE: capex_status_log
-- Source  : Sheet "PO", "Tender", "Kajian", "BAADK", "Lainnya"
-- Melacak status proses pengadaan per item Capex.
-- =============================================================================
CREATE TABLE capex_status_log (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    capex_id            UUID NOT NULL REFERENCES capex_master(id) ON DELETE CASCADE,
    tahun               SMALLINT NOT NULL,
    status_type         VARCHAR(20) NOT NULL
                            CHECK (status_type IN ('PO', 'Tender', 'Kajian', 'BAADK', 'Lainnya')),
    anggaran_rkap       BIGINT DEFAULT 0,
    anggaran_perubahan  BIGINT DEFAULT 0,
    total_realisasi     BIGINT DEFAULT 0,
    keterangan          TEXT,
    rekap_nilai         BIGINT DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE capex_status_log IS 'Status proses pengadaan dari sheet PO/Tender/Kajian/BAADK/Lainnya.';
COMMENT ON COLUMN capex_status_log.rekap_nilai IS 'Total nilai rekapitulasi per kategori status.';

-- =============================================================================
-- TABLE: capex_timeline
-- Source  : Sheet "Timeline" — Timeline kajian investasi per bulan.
-- =============================================================================
CREATE TABLE capex_timeline (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    capex_id        UUID NOT NULL REFERENCES capex_master(id) ON DELETE CASCADE,
    tahun           SMALLINT NOT NULL,
    bulan           SMALLINT NOT NULL CHECK (bulan BETWEEN 1 AND 12),
    minggu          SMALLINT CHECK (minggu BETWEEN 1 AND 5),
    kode_status     CHAR(1),
    keterangan      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_timeline_capex_period UNIQUE (capex_id, tahun, bulan, minggu)
);

COMMENT ON TABLE capex_timeline IS 'Timeline kajian investasi dari sheet Timeline. Kode: K=Kajian, T=Tender, S=SPMK, P=Pelaksanaan, B=BAST.';

-- =============================================================================
-- TABLE: capex_lku
-- Source  : Sheet "LKU" — Laporan Keuangan Umum per departemen.
-- =============================================================================
CREATE TABLE capex_lku (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    capex_id            UUID REFERENCES capex_master(id) ON DELETE SET NULL,
    tahun               SMALLINT NOT NULL,
    kategori_investasi  VARCHAR(50),
    departemen          VARCHAR(150),
    rkap_nilai          BIGINT DEFAULT 0,
    rkap_target         BIGINT DEFAULT 0,
    rencana_twi         BIGINT DEFAULT 0,
    realisasi_po        BIGINT DEFAULT 0,
    realisasi_bast      BIGINT DEFAULT 0,
    rencana_per_bulan   JSONB DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE capex_lku IS 'Laporan Keuangan Umum dari sheet LKU.';
COMMENT ON COLUMN capex_lku.rencana_per_bulan IS 'JSON: {"jan":0,"feb":0,...,"des":0} rencana per bulan.';

-- =============================================================================
-- TABLE: capex_assets
-- Source  : Sheet "Data Aset" — Laporan Aktiva Tetap PT Dahana.
-- =============================================================================
CREATE TABLE capex_assets (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    no_po               VARCHAR(50),
    tanggal_po          DATE,
    no_asset            VARCHAR(50),
    sub_number          VARCHAR(20),
    category            VARCHAR(100),
    capitalized_on      DATE,
    asset_description   TEXT,
    acquis_val          BIGINT DEFAULT 0,
    accum_dep           BIGINT DEFAULT 0,
    book_val            BIGINT DEFAULT 0,
    currency            CHAR(3) NOT NULL DEFAULT 'IDR',
    location_code       VARCHAR(20),
    lokasi              VARCHAR(150),
    room                VARCHAR(100),
    keterangan          TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE capex_assets IS 'Laporan Aktiva Tetap dari sheet Data Aset.';
COMMENT ON COLUMN capex_assets.acquis_val IS 'Acquisition value dalam satuan Rupiah (IDR).';
COMMENT ON COLUMN capex_assets.accum_dep IS 'Accumulated depreciation (negatif = pengurangan).';
COMMENT ON COLUMN capex_assets.book_val IS 'Book value = acquis_val + accum_dep.';

-- =============================================================================
-- INDEXES — Optimize frequent query patterns
-- =============================================================================
CREATE INDEX idx_capex_master_tahun ON capex_master (tahun);
CREATE INDEX idx_capex_master_kategori ON capex_master (kategori);
CREATE INDEX idx_realization_capex_id ON capex_realization (capex_id);
CREATE INDEX idx_realization_tahun_bulan ON capex_realization (tahun, bulan);
CREATE INDEX idx_status_log_capex_id ON capex_status_log (capex_id);
CREATE INDEX idx_status_log_type ON capex_status_log (status_type);
CREATE INDEX idx_timeline_capex_id ON capex_timeline (capex_id);
CREATE INDEX idx_timeline_tahun ON capex_timeline (tahun, bulan);
CREATE INDEX idx_lku_tahun ON capex_lku (tahun);
CREATE INDEX idx_assets_no_po ON capex_assets (no_po);
CREATE INDEX idx_assets_category ON capex_assets (category);

-- =============================================================================
-- FUNCTION: Auto-update updated_at timestamp
-- =============================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Attach trigger to all tables with updated_at
CREATE TRIGGER trg_capex_master_updated_at
    BEFORE UPDATE ON capex_master
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_realization_updated_at
    BEFORE UPDATE ON capex_realization
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_status_log_updated_at
    BEFORE UPDATE ON capex_status_log
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_lku_updated_at
    BEFORE UPDATE ON capex_lku
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_assets_updated_at
    BEFORE UPDATE ON capex_assets
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- FUNCTION: Auto-create profile on new user signup
-- =============================================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    INSERT INTO profiles (id, full_name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'role', 'user')
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
