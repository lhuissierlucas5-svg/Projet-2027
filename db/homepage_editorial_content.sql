-- Applied in Supabase as migration 20260920075016 (homepage_editorial_content).
-- Kept in the repository so production schema and source control describe the same feature.
begin;

create table public.homepage_content (
  id text primary key default 'home' check (id = 'home'),
  eyebrow text not null default 'PRÉSIDENTIELLE FRANÇAISE · 2027' check (char_length(btrim(eyebrow)) > 0 and char_length(eyebrow) <= 80),
  title text not null default 'Comprendre les programmes. Éclairer votre choix.' check (char_length(btrim(title)) > 0 and char_length(title) <= 120),
  subtitle text not null default 'Les personnalités, leurs propositions et les temps forts de la campagne présidentielle, réunis pour vous aider à comparer les idées et à remonter aux sources.' check (char_length(btrim(subtitle)) > 0 and char_length(subtitle) <= 400),
  primary_label text not null default 'Explorer les candidats' check (char_length(btrim(primary_label)) > 0 and char_length(primary_label) <= 45),
  secondary_label text not null default 'Comparer les propositions' check (char_length(btrim(secondary_label)) > 0 and char_length(secondary_label) <= 45),
  banner text not null default 'Des faits datés, des sources accessibles. À vous de vous faire une opinion.' check (char_length(btrim(banner)) > 0 and char_length(banner) <= 200),
  figures_title text not null default 'La campagne, en repères' check (char_length(btrim(figures_title)) > 0 and char_length(figures_title) <= 80),
  profiles_label text not null default 'personnalités suivies' check (char_length(btrim(profiles_label)) > 0 and char_length(profiles_label) <= 60),
  positions_label text not null default 'propositions documentées' check (char_length(btrim(positions_label)) > 0 and char_length(positions_label) <= 60),
  events_label text not null default 'rendez-vous à venir ou en cours' check (char_length(btrim(events_label)) > 0 and char_length(events_label) <= 60),
  candidates_title text not null default 'Les personnalités et leurs idées' check (char_length(btrim(candidates_title)) > 0 and char_length(candidates_title) <= 100),
  primaries_title text not null default 'Les étapes avant la présidentielle' check (char_length(btrim(primaries_title)) > 0 and char_length(primaries_title) <= 100),
  primaries_description text not null default 'Primaires, désignations et dates clés : comprendre comment se dessine la campagne.' check (char_length(btrim(primaries_description)) > 0 and char_length(primaries_description) <= 250),
  methodology text not null default 'Les profils suivis ne constituent pas une liste officielle de candidats. Les propositions sont présentées avec leur date et leur source ; leur présence ne vaut pas approbation. Les sondages décrivent une enquête et un scénario donnés, pas un résultat électoral. Consultez les sources et la méthode avant toute comparaison.' check (char_length(btrim(methodology)) > 0 and char_length(methodology) <= 1200),
  updated_at timestamptz not null default now()
);

alter table public.homepage_content enable row level security;
revoke all on public.homepage_content from anon, authenticated;
grant select on public.homepage_content to anon, authenticated;
grant update (
  eyebrow, title, subtitle, primary_label, secondary_label, banner, figures_title,
  profiles_label, positions_label, events_label, candidates_title, primaries_title,
  primaries_description, methodology
) on public.homepage_content to authenticated;

create policy "Public reads homepage"
  on public.homepage_content
  for select
  to anon, authenticated
  using (true);

create policy "Administrators edit homepage"
  on public.homepage_content
  for update
  to authenticated
  using (exists (select 1 from public.site_admins where user_id = (select auth.uid())))
  with check (exists (select 1 from public.site_admins where user_id = (select auth.uid())));

create trigger homepage_updated_at
  before update on public.homepage_content
  for each row execute function public.touch_content_updated_at();

insert into public.homepage_content (id) values ('home');

comment on table public.homepage_content is
  'Public homepage copy. Manual administration only; automated collection must not write here.';

commit;
