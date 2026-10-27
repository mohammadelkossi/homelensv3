-- Median (not average) sold price per year for a district + property type,
-- used by the §01 neighbouring-districts chart and ranking bars. percentile_cont
-- needs a real GROUP BY aggregate, which PostgREST can't express as a plain
-- select, so this is an RPC rather than a view.
CREATE OR REPLACE FUNCTION public.get_median_price_by_year(
  p_outcode text,
  p_property_type text,
  p_min_year integer
)
RETURNS TABLE (year integer, median_price numeric, sale_count bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT
    extract(year from date_of_transfer)::integer AS year,
    percentile_cont(0.5) WITHIN GROUP (ORDER BY price) AS median_price,
    count(*) AS sale_count
  FROM public.price_paid_data
  WHERE property_type = p_property_type
    AND postcode LIKE (upper(p_outcode) || ' %')
    AND extract(year from date_of_transfer) >= p_min_year
  GROUP BY 1
  ORDER BY 1;
$$;
