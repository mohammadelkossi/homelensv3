-- Add CQC overall ratings to nhs_locations.
-- Run this in Supabase Dashboard → SQL Editor.

ALTER TABLE public.nhs_locations ADD COLUMN IF NOT EXISTS overall_rating text;
ALTER TABLE public.nhs_locations ADD COLUMN IF NOT EXISTS rating_date date;

CREATE INDEX IF NOT EXISTS nhs_locations_overall_rating_idx ON public.nhs_locations (overall_rating);

-- Ratings apply per CQC location, not per (cqc_location_id, category) row (a
-- single location can have two rows if it offers both GP and dental
-- services), so this is a set-based UPDATE keyed on cqc_location_id alone,
-- driven by a JSON array of {cqc_location_id, overall_rating, rating_date}.
-- scripts/import-cqc-ratings.mjs calls this in batches via the service_role
-- key, which bypasses the EXECUTE restriction below anyway; the REVOKE/GRANT
-- just ensures the anon/authenticated roles can't invoke it directly.
CREATE OR REPLACE FUNCTION public.update_nhs_location_ratings(ratings jsonb)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE public.nhs_locations n
  SET overall_rating = r.overall_rating,
      rating_date = r.rating_date
  FROM jsonb_to_recordset(ratings) AS r(cqc_location_id text, overall_rating text, rating_date date)
  WHERE n.cqc_location_id = r.cqc_location_id;
$$;

REVOKE EXECUTE ON FUNCTION public.update_nhs_location_ratings(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_nhs_location_ratings(jsonb) TO service_role;
