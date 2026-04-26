-- Sport Prediction Lab - initial schema
-- Run in the Supabase SQL editor.
-- All tables live in the prediction_lab schema.

create schema if not exists prediction_lab;


-- Reference data ------------------------------------------------------------

create table prediction_lab.sports (
  id                    uuid primary key default gen_random_uuid(),
  slug                  text unique not null,
  name                  text not null,
  default_scoring_rules jsonb not null default '{}'::jsonb,
  created_at            timestamptz not null default now()
);

create table prediction_lab.tournaments (
  id            uuid primary key default gen_random_uuid(),
  sport_id      uuid not null references prediction_lab.sports(id),
  slug          text unique not null,
  name          text not null,
  format        text not null,
  start_date    date not null,
  end_date      date,
  status        text not null default 'upcoming',
  metadata      jsonb not null default '{}'::jsonb,
  scoring_rules jsonb,
  created_at    timestamptz not null default now()
);

create table prediction_lab.teams (
  id         uuid primary key default gen_random_uuid(),
  sport_id   uuid not null references prediction_lab.sports(id),
  name       text not null,
  code       text,
  metadata   jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (sport_id, name)
);

create table prediction_lab.tournament_entries (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references prediction_lab.tournaments(id) on delete cascade,
  team_id       uuid not null references prediction_lab.teams(id),
  group_label   text,
  seed          int,
  metadata      jsonb not null default '{}'::jsonb,
  unique (tournament_id, team_id)
);

create table prediction_lab.matches (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references prediction_lab.tournaments(id) on delete cascade,
  stage         text not null,
  stage_order   int,
  home_entry_id uuid references prediction_lab.tournament_entries(id),
  away_entry_id uuid references prediction_lab.tournament_entries(id),
  scheduled_at  timestamptz not null,
  status        text not null default 'scheduled',
  result        jsonb,
  metadata      jsonb not null default '{}'::jsonb,
  external_ref  text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);


-- Users + predictions -------------------------------------------------------

create table prediction_lab.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url   text,
  is_model     boolean not null default false,
  created_at   timestamptz not null default now()
);

create table prediction_lab.predictions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references prediction_lab.profiles(id) on delete cascade,
  match_id          uuid not null references prediction_lab.matches(id) on delete cascade,
  predicted_outcome jsonb not null,
  confidence        numeric,
  points_awarded    int,
  submitted_at      timestamptz not null default now(),
  scored_at         timestamptz,
  unique (user_id, match_id)
);


-- Leaderboard view ----------------------------------------------------------

create view prediction_lab.leaderboard_entries as select m.tournament_id, pred.user_id, prof.display_name, prof.is_model, count(*) as predictions_count, count(*) filter (where pred.points_awarded > 0) as correct_predictions, coalesce(sum(pred.points_awarded), 0)::int as total_points, max(pred.scored_at) as last_scored_at from prediction_lab.predictions pred join prediction_lab.matches m on m.id = pred.match_id join prediction_lab.profiles prof on prof.id = pred.user_id where pred.points_awarded is not null group by m.tournament_id, pred.user_id, prof.display_name, prof.is_model;


-- Indexes -------------------------------------------------------------------

create index matches_tournament_idx on prediction_lab.matches(tournament_id);
create index matches_scheduled_idx on prediction_lab.matches(scheduled_at);
create index matches_status_idx on prediction_lab.matches(status);
create index predictions_user_idx on prediction_lab.predictions(user_id);
create index predictions_match_idx on prediction_lab.predictions(match_id);
create index tournament_entries_tournament_idx on prediction_lab.tournament_entries(tournament_id);


-- updated_at trigger --------------------------------------------------------

create or replace function prediction_lab.set_updated_at()
returns trigger language plpgsql as
$body$ begin new.updated_at = now(); return new; end; $body$;

create trigger matches_set_updated_at
before update on prediction_lab.matches
for each row execute function prediction_lab.set_updated_at();


-- Row Level Security --------------------------------------------------------

alter table prediction_lab.sports             enable row level security;
alter table prediction_lab.tournaments        enable row level security;
alter table prediction_lab.teams              enable row level security;
alter table prediction_lab.tournament_entries enable row level security;
alter table prediction_lab.matches            enable row level security;
alter table prediction_lab.profiles           enable row level security;
alter table prediction_lab.predictions        enable row level security;

create policy "sports public read" on prediction_lab.sports for select using (true);
create policy "tournaments public read" on prediction_lab.tournaments for select using (true);
create policy "teams public read" on prediction_lab.teams for select using (true);
create policy "tournament_entries public read" on prediction_lab.tournament_entries for select using (true);
create policy "matches public read" on prediction_lab.matches for select using (true);

create policy "profiles public read" on prediction_lab.profiles for select using (true);
create policy "profiles owner insert" on prediction_lab.profiles for insert with check (auth.uid() = id);
create policy "profiles owner update" on prediction_lab.profiles for update using (auth.uid() = id);

create policy "predictions public read" on prediction_lab.predictions for select using (true);

create policy "predictions owner insert" on prediction_lab.predictions
  for insert with check (
    auth.uid() = user_id
    and exists (select 1 from prediction_lab.matches m where m.id = match_id and m.scheduled_at > now())
  );

create policy "predictions owner update" on prediction_lab.predictions
  for update using (
    auth.uid() = user_id
    and exists (select 1 from prediction_lab.matches m where m.id = match_id and m.scheduled_at > now())
  );


-- Grants for the Data API ---------------------------------------------------

grant usage on schema prediction_lab to anon, authenticated, service_role;
grant all on all tables in schema prediction_lab to anon, authenticated, service_role;
grant all on all sequences in schema prediction_lab to anon, authenticated, service_role;
grant all on all functions in schema prediction_lab to anon, authenticated, service_role;

alter default privileges in schema prediction_lab grant all on tables to anon, authenticated, service_role;
alter default privileges in schema prediction_lab grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema prediction_lab grant all on functions to anon, authenticated, service_role;


-- Seed: register football ---------------------------------------------------

insert into prediction_lab.sports (slug, name, default_scoring_rules)
values ('football', 'Football', jsonb_build_object('exact_score', 5, 'correct_outcome', 2, 'correct_goal_difference', 3));
