-- Add kategori_aset to capex_assets
ALTER TABLE public.capex_assets ADD COLUMN IF NOT EXISTS kategori_aset VARCHAR(255);
