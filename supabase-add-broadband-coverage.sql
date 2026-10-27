-- Add broadband_coverage table from Ofcom Connected Nations postcode-level
-- fixed broadband coverage data.
-- Run this in Supabase Dashboard → SQL Editor.

CREATE TABLE IF NOT EXISTS public.broadband_coverage (
  id bigint generated always as identity primary key,
  postcode text NOT NULL,
  postcode_display text,
  gigabit_availability numeric,
  ultrafast_availability numeric,
  superfast_availability numeric,
  below_uso numeric,
  decent_broadband_fwa numeric,
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'broadband_coverage_postcode_key'
  ) THEN
    ALTER TABLE public.broadband_coverage ADD CONSTRAINT broadband_coverage_postcode_key UNIQUE (postcode);
  END IF;
END $$;

-- Ofcom Connected Nations data (OGL-licensed) — safe to read publicly. No
-- write policy is added, so only the service_role key (which bypasses RLS)
-- can insert/update/delete; that's what scripts/import-ofcom-broadband.mjs uses.
ALTER TABLE public.broadband_coverage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read broadband coverage"
  ON public.broadband_coverage
  FOR SELECT
  USING (true);
