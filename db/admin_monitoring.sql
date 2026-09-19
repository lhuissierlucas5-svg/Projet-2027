begin;
create table public.site_admins (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
alter table public.site_admins enable row level security;
revoke all on public.site_admins from anon, authenticated;
grant select on public.site_admins to authenticated;
create policy "Read own administrator membership" on public.site_admins for select to authenticated using (user_id = (select auth.uid()));

create table public.content_sync_runs (
 id uuid primary key default gen_random_uuid(),
 started_at timestamptz not null default now(),
 finished_at timestamptz,
 status text not null default 'running' check (status in ('running','success','partial','failed')),
 added integer not null default 0 check (added >= 0),
 corrected integer not null default 0 check (corrected >= 0),
 archived integer not null default 0 check (archived >= 0),
 sources_checked integer not null default 0 check (sources_checked >= 0),
 summary text check (char_length(summary) <= 600),
 check ((status = 'running' and finished_at is null) or (status <> 'running' and finished_at is not null)),
 check (finished_at is null or finished_at >= started_at)
);
comment on table public.content_sync_runs is 'Public, sanitized collection history. Never include credentials, personal data or raw error details.';
alter table public.content_sync_runs enable row level security;
revoke all on public.content_sync_runs from anon, authenticated;
grant select on public.content_sync_runs to anon, authenticated;
create policy "Public collection status" on public.content_sync_runs for select to anon, authenticated using (true);
create index content_sync_runs_started_at_idx on public.content_sync_runs(started_at desc);

-- Rights are granted only to explicitly enrolled administrators. No self-enrolment.
do $$
declare t text;
begin
 foreach t in array array['candidates','candidate_positions','political_agenda','contender_watch','candidate_issue_cards','campaign_updates'] loop
  execute format('revoke insert, update, delete on public.%I from anon, authenticated', t);
  execute format('grant select, update on public.%I to authenticated', t);
  execute format('create policy "Administrators read all" on public.%I for select to authenticated using (exists (select 1 from public.site_admins where user_id = (select auth.uid())))', t);
  execute format('create policy "Administrators edit" on public.%I for update to authenticated using (exists (select 1 from public.site_admins where user_id = (select auth.uid()))) with check (exists (select 1 from public.site_admins where user_id = (select auth.uid())))', t);
 end loop;
 foreach t in array array['candidate_positions','political_agenda'] loop
  execute format('grant insert on public.%I to authenticated', t);
  execute format('create policy "Administrators create" on public.%I for insert to authenticated with check (exists (select 1 from public.site_admins where user_id = (select auth.uid())))', t);
 end loop;
end $$;
alter policy "Public can read political agenda" on public.political_agenda using (archived_at is null);
alter policy "Public can read contender watch" on public.contender_watch using (archived_at is null);
alter policy "Public can read verified candidate positions" on public.candidate_positions using (verification_status = 'verified' and archived_at is null);
alter policy "Public can read verified issue cards" on public.candidate_issue_cards using (verification_status = 'verified' and archived_at is null);
alter policy "Public reads verified campaign updates" on public.campaign_updates using (verification_status = 'verified' and archived_at is null);
commit;
