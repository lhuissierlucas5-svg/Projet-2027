begin;

create or replace function public.invalidate_stale_source_excerpt()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.source_url is distinct from old.source_url
     and new.source_excerpt is not distinct from old.source_excerpt then
    new.source_excerpt := null;
  end if;
  return new;
end;
$$;

create or replace function public.invalidate_stale_quote_excerpt()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.quote_source_url is distinct from old.quote_source_url
     and new.quote_source_excerpt is not distinct from old.quote_source_excerpt then
    new.quote_source_excerpt := null;
  end if;
  return new;
end;
$$;

create or replace function public.invalidate_stale_positioning_excerpt()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.positioning_source_url is distinct from old.positioning_source_url
     and new.source_excerpt is not distinct from old.source_excerpt then
    new.source_excerpt := null;
  end if;
  return new;
end;
$$;

create or replace function public.invalidate_stale_process_excerpt()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.official_url is distinct from old.official_url
     and new.source_excerpt is not distinct from old.source_excerpt then
    new.source_excerpt := null;
  end if;
  return new;
end;
$$;

revoke all on function public.invalidate_stale_source_excerpt() from public;
revoke all on function public.invalidate_stale_quote_excerpt() from public;
revoke all on function public.invalidate_stale_positioning_excerpt() from public;
revoke all on function public.invalidate_stale_process_excerpt() from public;

do $$
declare
  t text;
begin
  foreach t in array array[
    'candidate_positions',
    'candidate_issue_cards',
    'campaign_updates',
    'political_agenda',
    'contender_watch',
    'priority_issues',
    'selection_process_watch',
    'selection_poll_indicators'
  ] loop
    execute format('drop trigger if exists invalidate_stale_source_excerpt on public.%I', t);
    execute format(
      'create trigger invalidate_stale_source_excerpt before update of source_url, source_excerpt on public.%I for each row execute function public.invalidate_stale_source_excerpt()',
      t
    );
  end loop;
end;
$$;

drop trigger if exists invalidate_stale_quote_excerpt on public.candidates;
create trigger invalidate_stale_quote_excerpt
before update of quote_source_url, quote_source_excerpt on public.candidates
for each row execute function public.invalidate_stale_quote_excerpt();

drop trigger if exists invalidate_stale_positioning_excerpt on public.selection_candidates;
create trigger invalidate_stale_positioning_excerpt
before update of positioning_source_url, source_excerpt on public.selection_candidates
for each row execute function public.invalidate_stale_positioning_excerpt();

drop trigger if exists invalidate_stale_process_excerpt on public.selection_processes;
create trigger invalidate_stale_process_excerpt
before update of official_url, source_excerpt on public.selection_processes
for each row execute function public.invalidate_stale_process_excerpt();

do $$
declare
  t text;
  constraint_name text;
begin
  foreach t in array array[
    'candidate_positions',
    'candidate_issue_cards',
    'campaign_updates',
    'political_agenda',
    'contender_watch',
    'priority_issues',
    'selection_process_watch',
    'selection_poll_indicators'
  ] loop
    constraint_name := t || '_source_excerpt_length_check';
    if not exists (
      select 1 from pg_constraint
      where conrelid = format('public.%I', t)::regclass
        and conname = constraint_name
    ) then
      execute format(
        'alter table public.%I add constraint %I check (source_excerpt is null or char_length(btrim(source_excerpt)) between 3 and 300)',
        t, constraint_name
      );
    end if;
  end loop;
end;
$$;

alter table public.selection_candidates
  drop constraint if exists selection_candidates_source_excerpt_length_check;
alter table public.selection_candidates
  add constraint selection_candidates_source_excerpt_length_check
  check (source_excerpt is null or char_length(btrim(source_excerpt)) between 3 and 300);

alter table public.selection_processes
  drop constraint if exists selection_processes_source_excerpt_length_check;
alter table public.selection_processes
  add constraint selection_processes_source_excerpt_length_check
  check (source_excerpt is null or char_length(btrim(source_excerpt)) between 3 and 300);

alter table public.candidates
  drop constraint if exists candidates_quote_source_excerpt_length_check;
alter table public.candidates
  add constraint candidates_quote_source_excerpt_length_check
  check (quote_source_excerpt is null or char_length(btrim(quote_source_excerpt)) between 3 and 300);

commit;
