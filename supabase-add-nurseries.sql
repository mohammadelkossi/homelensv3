-- Add nurseries table for Ofsted-registered childcare providers on
-- non-domestic premises (nurseries/preschools/day-care, not childminders,
-- whose personal address data is redacted in the open dataset).
-- Run this in Supabase Dashboard → SQL Editor.

CREATE TABLE IF NOT EXISTS public.nurseries (
  id bigint generated always as identity primary key,
  provider_urn text,
  name text NOT NULL,
  subtype text,
  address text,
  postcode text,
  latitude double precision,
  longitude double precision,
  region text,
  local_authority text,
  overall_rating text,
  rating_date date,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS nurseries_lat_lon_idx ON public.nurseries (latitude, longitude);
CREATE INDEX IF NOT EXISTS nurseries_overall_rating_idx ON public.nurseries (overall_rating);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'nurseries_provider_urn_key'
  ) THEN
    ALTER TABLE public.nurseries ADD CONSTRAINT nurseries_provider_urn_key UNIQUE (provider_urn);
  END IF;
END $$;

-- Ofsted open data (OGL-licensed) — safe to read publicly. No write policy is
-- added, so only the service_role key (which bypasses RLS) can insert/update/
-- delete; that's what scripts/import-ofsted-nurseries.mjs uses.
ALTER TABLE public.nurseries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read nurseries"
  ON public.nurseries
  FOR SELECT
  USING (true);
