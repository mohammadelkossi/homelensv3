-- Add nhs_locations table for CQC-sourced hospitals, GP surgeries, and dentists.
-- Run this in Supabase Dashboard → SQL Editor.

CREATE TABLE IF NOT EXISTS public.nhs_locations (
  id bigint generated always as identity primary key,
  cqc_location_id text,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('hospital', 'gp_surgery', 'dentist')),
  address text,
  postcode text,
  latitude double precision,
  longitude double precision,
  region text,
  local_authority text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS nhs_locations_category_idx ON public.nhs_locations (category);
CREATE INDEX IF NOT EXISTS nhs_locations_lat_lon_idx ON public.nhs_locations (latitude, longitude);

-- A single CQC location can legitimately match more than one category (e.g. a
-- practice offering both GP and dental services), so uniqueness is per
-- (cqc_location_id, category) pair, not cqc_location_id alone.
ALTER TABLE public.nhs_locations DROP CONSTRAINT IF EXISTS nhs_locations_cqc_location_id_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'nhs_locations_cqc_location_id_category_key'
  ) THEN
    ALTER TABLE public.nhs_locations
      ADD CONSTRAINT nhs_locations_cqc_location_id_category_key UNIQUE (cqc_location_id, category);
  END IF;
END $$;

-- Public CQC open data (OGL-licensed) — safe to read publicly. No write policy is
-- added, so only the service_role key (which bypasses RLS) can insert/update/delete;
-- that's what scripts/import-cqc-locations.mjs uses.
ALTER TABLE public.nhs_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read NHS locations"
  ON public.nhs_locations
  FOR SELECT
  USING (true);
