-- §02 "5 most recent sales nearby": candidate pool of same-type sales in a
-- district over the last 2 years, nearest-N picked in application code after
-- a postcodes.io bulk-geocode distance pass. Same split_part() index match as
-- the other district RPCs. Capped at 300 rows — plenty for a single outcode's
-- 2-year window, keeps the function's output bounded.
CREATE OR REPLACE FUNCTION public.get_recent_sales_for_outcode(
  p_outcode text,
  p_property_type text,
  p_since date
)
RETURNS TABLE (
  paon text, saon text, street text, postcode text, price integer, date_of_transfer date
)
LANGUAGE sql
STABLE
AS $$
  SELECT paon, saon, street, postcode, price, date_of_transfer
  FROM public.price_paid_data
  WHERE split_part(postcode, ' ', 1) = upper(p_outcode)
    AND property_type = p_property_type
    AND date_of_transfer >= p_since
  ORDER BY date_of_transfer DESC
  LIMIT 300;
$$;
