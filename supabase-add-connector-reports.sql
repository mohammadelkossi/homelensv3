-- Reports generated through the Claude/ChatGPT connector (/api/mcp).
-- One row per analysis: it is both the usage log behind the monthly allowance and the
-- stored full report the connector hands back. Only the server (service role) reads or
-- writes it, so row level security is on with no policies.

create table if not exists public.connector_reports (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- 'analysis' = a new report, counted against the monthly allowance.
  -- 'enrichment' = the full version of a report first made on the website; not counted.
  kind text not null check (kind in ('analysis', 'enrichment')),
  -- 'pending' while the report is being built, so parallel requests can't overrun the allowance.
  status text not null default 'pending' check (status in ('pending', 'done')),
  property_url text,
  saved_report_id bigint references public.saved_reports (id) on delete set null,
  report jsonb,
  created_at timestamptz not null default now()
);

create index if not exists connector_reports_user_created_idx
  on public.connector_reports (user_id, created_at desc);

alter table public.connector_reports enable row level security;
