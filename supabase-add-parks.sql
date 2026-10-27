-- Add parks table sourced from OS Open Greenspace ("Public Park Or Garden" sites).
-- Run this in Supabase Dashboard → SQL Editor.

CREATE TABLE IF NOT EXISTS public.parks (
  id bigint generated always as identity primary key,
  os_id text,
  name text NOT NULL,
  latitude double precision,
  longitude double precision,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS parks_lat_lon_idx ON public.parks (latitude, longitude);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'parks_os_id_key'
  ) THEN
    ALTER TABLE public.parks ADD CONSTRAINT parks_os_id_key UNIQUE (os_id);
  END IF;
END $$;

-- OS Open Greenspace is OGL-licensed open data — safe to read publicly. No
-- write policy is added, so only the service_role key (which bypasses RLS)
-- can insert/update/delete; that's what scripts/import-os-parks.mjs uses.
ALTER TABLE public.parks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read parks"
  ON public.parks
  FOR SELECT
  USING (true);
