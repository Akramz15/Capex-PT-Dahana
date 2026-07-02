-- Menambahkan kolom Kajian Investasi ke tabel capex_assets
ALTER TABLE capex_assets
ADD COLUMN kajian_no TEXT,
ADD COLUMN kajian_tanggal DATE,
ADD COLUMN kajian_perihal TEXT;
