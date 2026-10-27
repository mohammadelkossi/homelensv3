-- Adds report_version to saved_reports so old and new report layouts can
-- coexist. New reports (the redesigned layout) write report_version = 2;
-- the default of 1 is the historical placeholder for any pre-existing rows
-- (there are none live, but this keeps the column meaningful if any appear).
ALTER TABLE public.saved_reports
  ADD COLUMN IF NOT EXISTS report_version integer NOT NULL DEFAULT 1;
