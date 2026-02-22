-- Add property_reports_used to profiles (for 5-free-reports limit).
-- Run this in Supabase Dashboard → SQL Editor.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS property_reports_used integer NOT NULL DEFAULT 0;

-- Optional: backfill existing rows so they have 0 (only needed if the column was missing and some rows already exist).
UPDATE public.profiles
SET property_reports_used = 0
WHERE property_reports_used IS NULL;
