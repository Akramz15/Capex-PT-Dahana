-- Migration: 010_aset_module.sql
-- Description: Create tables for the new Aset Dashboard and Submenus

CREATE TABLE IF NOT EXISTS public.aset_nomor (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nomor_aset TEXT,
    sub_nomor TEXT,
    kategori TEXT,
    nama_aset TEXT,
    satuan TEXT,
    lokasi TEXT,
    nilai NUMERIC,
    room TEXT,
    tahun INTEGER,
    bulan INTEGER,
    user_name TEXT,
    vendor TEXT,
    keterangan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.aset_laporan_aktiva (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    deskripsi TEXT,
    asset_number TEXT,
    sub_number TEXT,
    capitalized_on TIMESTAMP WITH TIME ZONE,
    asset_description TEXT,
    acquis_val NUMERIC,
    accum_dep NUMERIC,
    book_val NUMERIC,
    currency TEXT,
    useful_life TEXT,
    location_code TEXT,
    lokasi TEXT,
    room TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.aset_data (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    asset_number TEXT,
    sub_number TEXT,
    capitalized_on TIMESTAMP WITH TIME ZONE,
    asset_description TEXT,
    acquis_val NUMERIC,
    accum_dep NUMERIC,
    book_val NUMERIC,
    currency TEXT,
    useful_life TEXT,
    location_code TEXT,
    room TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Setup RLS (Row Level Security)
ALTER TABLE public.aset_nomor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aset_laporan_aktiva ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aset_data ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read/write for now
CREATE POLICY "Allow authenticated users to read aset_nomor" ON public.aset_nomor FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert aset_nomor" ON public.aset_nomor FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update aset_nomor" ON public.aset_nomor FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to delete aset_nomor" ON public.aset_nomor FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read aset_laporan_aktiva" ON public.aset_laporan_aktiva FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert aset_laporan_aktiva" ON public.aset_laporan_aktiva FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update aset_laporan_aktiva" ON public.aset_laporan_aktiva FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to delete aset_laporan_aktiva" ON public.aset_laporan_aktiva FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read aset_data" ON public.aset_data FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert aset_data" ON public.aset_data FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update aset_data" ON public.aset_data FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to delete aset_data" ON public.aset_data FOR DELETE TO authenticated USING (true);
