-- §02 "How fast is it selling?": sales count for a district + property type over
-- the last 12 months vs. the previous 12 months, plus the trend percentage.
-- Land Registry data lags ~2-3 months behind real time, so both windows end
-- 3 months ago rather than today (see getDistrictSalesTrend in district-comparison.ts).
-- Matches the split_part(postcode, ' ', 1) functional index used elsewhere, same
-- reason as get_median_price_by_year: a plain LIKE/ilike filter can't use that index.
CREATE OR REPLACE FUNCTION public.get_district_sales_trend(
  p_outcode text,
  p_property_type text,
  p_current_start date,
  p_current_end date,
  p_previous_start date,
  p_previous_end date
)
RETURNS TABLE (current_count bigint, previous_count bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT
    count(*) FILTER (WHERE date_of_transfer >= p_current_start AND date_of_transfer < p_current_end) AS current_count,
    count(*) FILTER (WHERE date_of_transfer >= p_previous_start AND date_of_transfer < p_previous_end) AS previous_count
  FROM public.price_paid_data
  WHERE split_part(postcode, ' ', 1) = upper(p_outcode)
    AND property_type = p_property_type
    AND date_of_transfer >= p_previous_start
    AND date_of_transfer < p_current_end;
$$;
