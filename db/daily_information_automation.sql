-- Daily information watch: private discovery queue, internal authentication and schedule.
begin;

create table if not exists public.daily_information_queue (
  id uuid primary key default gen_random_uuid(),
  dedup_key text not null unique check (char_length(dedup_key) = 64),
  candidate_id uuid references public.candidates(id) on delete set null,
  query_label text not null check (char_length(btrim(query_label)) between 2 and 180),
  title text not null check (char_length(btrim(title)) between 3 and 320),
  source_name text not null check (char_length(btrim(source_name)) between 2 and 160),
  source_url text not null check (source_url ~ '^https://[^/[:space:]]+'),
  published_at timestamptz,
  discovered_at timestamptz not null default now(),
  status text not null default 'review'
    check (status in ('review','processed','dismissed')),
  review_note text check (review_note is null or char_length(review_note) <= 600),
  reviewed_at timestamptz,
  updated_at timestamptz not null default now(),
  check ((status = 'review' and reviewed_at is null) or status <> 'review')
);

comment on table public.daily_information_queue is
  'Private daily discovery queue. Items are leads for human review and are never public content by themselves.';

alter table public.daily_information_queue enable row level security;
revoke all on public.daily_information_queue from anon, authenticated;
grant select, update on public.daily_information_queue to authenticated;
grant select, insert, update, delete on public.daily_information_queue to service_role;

drop policy if exists "Administrators read daily information queue" on public.daily_information_queue;
create policy "Administrators read daily information queue"
on public.daily_information_queue for select to authenticated
using (exists (
  select 1 from public.site_admins
  where user_id = (select auth.uid())
));

drop policy if exists "Administrators update daily information queue" on public.daily_information_queue;
create policy "Administrators update daily information queue"
on public.daily_information_queue for update to authenticated
using (exists (
  select 1 from public.site_admins
  where user_id = (select auth.uid())
))
with check (exists (
  select 1 from public.site_admins
  where user_id = (select auth.uid())
));

create index if not exists daily_information_queue_review_idx
  on public.daily_information_queue(status, discovered_at desc);
create index if not exists daily_information_queue_candidate_idx
  on public.daily_information_queue(candidate_id, discovered_at desc);

create table if not exists public.automation_secret_hashes (
  name text primary key,
  secret_hash text not null check (char_length(secret_hash) = 64),
  created_at timestamptz not null default now(),
  rotated_at timestamptz not null default now()
);

comment on table public.automation_secret_hashes is
  'One-way hashes used to authenticate internal automation calls. Raw secrets are stored only in Supabase Vault.';

alter table public.automation_secret_hashes enable row level security;
revoke all on public.automation_secret_hashes from anon, authenticated;
grant select on public.automation_secret_hashes to service_role;

do $$
declare
  automation_secret text;
begin
  select decrypted_secret
  into automation_secret
  from vault.decrypted_secrets
  where name = 'daily_information_watch_secret'
  limit 1;

  if automation_secret is null then
    automation_secret := encode(extensions.gen_random_bytes(32), 'hex');
    perform vault.create_secret(
      automation_secret,
      'daily_information_watch_secret',
      'Authenticates the daily Election 2027 information watch'
    );
  end if;

  insert into public.automation_secret_hashes(name, secret_hash, rotated_at)
  values (
    'daily_information_watch',
    encode(extensions.digest(automation_secret, 'sha256'), 'hex'),
    now()
  )
  on conflict (name) do update
    set secret_hash = excluded.secret_hash,
        rotated_at = excluded.rotated_at;
end
$$;

create extension if not exists pg_net;
create extension if not exists pg_cron;

select cron.schedule(
  'daily-election-2027-information-watch',
  '30 6 * * *',
  $cron$
    select net.http_post(
      url := 'https://lwqxkjrzyfnyxrdxcpmm.supabase.co/functions/v1/daily-information-watch',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'daily_information_watch_secret'
          limit 1
        )
      ),
      body := jsonb_build_object(
        'trigger', 'supabase-cron',
        'scheduled_at', now()
      ),
      timeout_milliseconds := 10000
    ) as request_id;
  $cron$
);

commit;
