-- Add air_quality_grid table from DEFRA UK-AIR modelled background pollution
-- data (1km x 1km grid, annual mean NO2/PM2.5/PM10).
-- Run this in Supabase Dashboard → SQL Editor.

CREATE TABLE IF NOT EXISTS public.air_quality_grid (
  id bigint generated always as identity primary key,
  gridcode text NOT NULL,
  latitude double precision,
  longitude double precision,
  no2 double precision,
  pm25 double precision,
  pm10 double precision,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS air_quality_grid_lat_lon_idx ON public.air_quality_grid (latitude, longitude);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'air_quality_grid_gridcode_key'
  ) THEN
    ALTER TABLE public.air_quality_grid ADD CONSTRAINT air_quality_grid_gridcode_key UNIQUE (gridcode);
  END IF;
END $$;

-- DEFRA UK-AIR open data (OGL-licensed) — safe to read publicly. No write
-- policy is added, so only the service_role key (which bypasses RLS) can
-- insert/update/delete; that's what scripts/import-defra-air-quality.mjs uses.
ALTER TABLE public.air_quality_grid ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read air quality grid"
  ON public.air_quality_grid
  FOR SELECT
  USING (true);
