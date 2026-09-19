alter table public.political_agenda add column end_date date, add column starts_at timestamptz, add column ends_at timestamptz;
alter table public.political_agenda add constraint agenda_date_order check (end_date is null or end_date >= sort_date), add constraint agenda_time_order check (ends_at is null or starts_at is null or ends_at >= starts_at);
alter table public.political_agenda drop constraint political_agenda_status_check;
alter table public.political_agenda add constraint political_agenda_status_check check (status in ('upcoming','ongoing','completed','date_tbc','cancelled'));
-- Dates de fin reprises des libellés et résumés sourcés existants.
update public.political_agenda set end_date = case slug
when 'modem-rendez-vous-2026' then date '2026-09-20'
when 'primaire-tour1-choisir2027' then date '2026-10-10'
when 'primaire-tour2-choisir2027' then date '2026-10-17'
when 'budget-plf-2027-partie1' then date '2026-10-19'
when 'budget-securite-sociale-2027' then date '2026-10-26'
else end_date end;
alter table public.political_agenda add column archived_at timestamptz, add column expires_at timestamptz;
create view public.current_political_agenda with (security_invoker=true) as select * from public.political_agenda where archived_at is null and (expires_at is null or expires_at > now()) and status not in ('completed','cancelled') and coalesce(ends_at, starts_at, ((coalesce(end_date,sort_date) + 1)::timestamp at time zone 'Europe/Paris')) > now();
grant select on public.current_political_agenda to anon, authenticated;
alter table public.campaign_updates add column archived_at timestamptz, add column expires_at timestamptz;
create view public.current_campaign_updates with (security_invoker=true) as select * from public.campaign_updates where archived_at is null and (expires_at is null or expires_at > now()) and verification_status = 'verified' and published_at <= (now() at time zone 'Europe/Paris')::date and (kind <> 'poll' or published_at >= (now() at time zone 'Europe/Paris')::date - 90) and (kind <> 'appearance' or (event_status = 'scheduled' and coalesce(event_at, ((event_date + 1)::timestamp at time zone 'Europe/Paris')) > now()));
grant select on public.current_campaign_updates to anon, authenticated;
alter table public.candidate_positions add column archived_at timestamptz, add column expires_at timestamptz;
create view public.current_candidate_positions with (security_invoker=true) as select * from public.candidate_positions where archived_at is null and (expires_at is null or expires_at > now()) and verification_status = 'verified';
grant select on public.current_candidate_positions to anon, authenticated;
alter table public.contender_watch add column archived_at timestamptz, add column expires_at timestamptz;
create view public.current_contender_watch with (security_invoker=true) as select * from public.contender_watch where archived_at is null and (expires_at is null or expires_at > now());
grant select on public.current_contender_watch to anon, authenticated;
alter table public.candidate_issue_cards add column archived_at timestamptz, add column expires_at timestamptz;
create view public.current_candidate_issue_cards with (security_invoker=true) as select * from public.candidate_issue_cards where archived_at is null and (expires_at is null or expires_at > now()) and verification_status = 'verified';
grant select on public.current_candidate_issue_cards to anon, authenticated;
alter table public.priority_issues add column archived_at timestamptz, add column expires_at timestamptz;
create view public.current_priority_issues with (security_invoker=true) as select * from public.priority_issues where archived_at is null and (expires_at is null or expires_at > now());
grant select on public.current_priority_issues to anon, authenticated;
