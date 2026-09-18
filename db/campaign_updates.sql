-- Additive schema for sourced proposals, polls and media appearances.
begin;
create table public.campaign_updates (
  id uuid primary key default gen_random_uuid(),
  dedup_key text not null unique,
  candidate_id uuid not null references public.candidates(id),
  kind text not null check (kind in ('proposal', 'poll', 'appearance')),
  title text not null check (length(trim(title)) > 0),
  summary text not null check (length(trim(summary)) > 0),
  source_name text not null,
  source_url text not null check (source_url ~ '^https://[^/[:space:]]+'),
  published_at date not null,
  verification_status text not null default 'review'
    check (verification_status in ('review', 'verified', 'rejected')),
  verified_at timestamptz,
  topic text,
  event_date date,
  event_at timestamptz,
  media_name text,
  event_status text check (event_status in ('scheduled', 'cancelled', 'completed')),
  institute text,
  sponsor text,
  metric_type text check (metric_type in ('presidential_vote_intention', 'primary_vote_intention', 'favorability', 'desired_participation')),
  scenario text,
  value_percent numeric check (value_percent between 0 and 100),
  fieldwork_start date,
  fieldwork_end date,
  sample_size integer check (sample_size > 0),
  population text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (verification_status <> 'verified' or verified_at is not null),
  check (kind <> 'proposal' or topic is not null),
  check (kind <> 'appearance' or (event_date is not null and media_name is not null and event_status is not null)),
  check (event_at is null or event_date = (event_at at time zone 'Europe/Paris')::date),
  check (kind <> 'poll' or (institute is not null and metric_type is not null and scenario is not null and value_percent is not null and fieldwork_start is not null and fieldwork_end is not null and sample_size is not null and population is not null)),
  check (fieldwork_end >= fieldwork_start),
  check (kind <> 'poll' or published_at >= fieldwork_end)
);
create index campaign_updates_candidate_idx on public.campaign_updates(candidate_id);
create index campaign_updates_recent_idx on public.campaign_updates(kind, published_at desc) where verification_status = 'verified';
create index campaign_updates_agenda_idx on public.campaign_updates(event_date, event_at) where kind = 'appearance' and verification_status = 'verified' and event_status = 'scheduled';
alter table public.campaign_updates enable row level security;
revoke all on public.campaign_updates from anon, authenticated;
grant select on public.campaign_updates to anon, authenticated;
grant all on public.campaign_updates to service_role;
create policy "Public reads verified campaign updates" on public.campaign_updates
  for select to anon, authenticated using (verification_status = 'verified');
commit;
