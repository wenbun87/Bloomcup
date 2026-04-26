-- Sport Prediction Lab — initial schema
-- Run this in the Supabase SQL editor against a fresh project.
--
-- Design rule: NO sport-specific tables. Sport-specific data lives in jsonb
-- columns (matches.result, predictions.predicted_outcome, *.metadata).
-- Validation of those JSON shapes happens in the sport plugin, not the DB.

-- ---------------------------------------------------------------------------
-- Reference data
-- ---------------------------------------------------------------------------

create table sports (
  id                    uuid primary key default gen_random_uuid(),
  slug                  text unique not null,                 -- 'football', 'tennis'
  name                  text not null,
  default_scoring_rules jsonb not null default '{}'::jsonb,   -- e.g. {exact_score: 5, correct_outcome: 2}
  created_at            timestamptz not null default now()
);

create table tournaments (
  id             uuid primary key default gen_random_uuid(),
  sport_id       uuid not null references sports(id),
  slug           text unique not null,                        -- 'wc-2026'
  name           text not null,                               -- '2026 FIFA World Cup'
  format         text not null,                               -- 'group_then_knockout' | 'round_robin' | 'single_elim' | 'league'
  start_date     date not null,
  end_date       date,
  status         text not null default 'upcoming',            -- 'upcoming' | 'active' | 'completed'
  metadata       jsonb not null default '{}'::jsonb,          -- group size, host country, etc.
  scoring_rules  jsonb,                                        -- override sport defaults; null = use sport default
  created_at     timestamptz not null default now()
);

create table teams (
  id          uuid primary key default gen_random_uuid(),
  sport_id    uuid not null references sports(id),
  name        text not null,                                  -- 'Brazil', 'Novak Djokovic'
  code        text,                                            -- 'BRA', 'DJO'
  metadata    jsonb not null default '{}'::jsonb,             -- flag, FIFA ranking, etc.
  created_at  timestamptz not null default now(),
  unique (sport_id, name)
);

create table tournament_entries (
  id             uuid primary key default gen_random_uuid(),
  tournament_id  uuid not null references tournaments(id) on delete cascade,
  team_id        uuid not null references teams(id),
  group_label    text,                                         -- 'A', 'B' ... null for non-grouped formats
  seed           int,
  metadata       jsonb not null default '{}'::jsonb,
  unique (tournament_id, team_id)
);

create table matches (
  id              uuid primary key default gen_random_uuid(),
  tournament_id   uuid not null references tournaments(id) on delete cascade,
  stage           text not null,                              -- 'group', 'round_of_16', 'final', etc.
  stage_order     int,                                         -- match number within stage
  home_entry_id   uuid references tournament_entries(id),
  away_entry_id   uuid references tournament_entries(id),
  scheduled_at    timestamptz not null,
  status          text not null default 'scheduled',          -- 'scheduled' | 'live' | 'finished' | 'postponed'
  result          jsonb,                                       -- {home_score: 2, away_score: 1, ...}
  metadata        jsonb not null default '{}'::jsonb,
  external_ref    text,                                        -- e.g. football-data.org match id
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Users + predictions
-- ---------------------------------------------------------------------------

-- Profiles wrap Supabase auth.users for display data.
-- The "model" predictor is a real auth user (created via the seed step) with a
-- profiles row; its predictions sit in the same table as humans.
create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url   text,
  is_model     boolean not null default false,
  created_at   timestamptz not null default now()
);

create table predictions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references profiles(id) on delete cascade,
  match_id           uuid not null references matches(id) on delete cascade,
  predicted_outcome  jsonb not null,                          -- same shape as matches.result for that sport
  confidence         numeric,                                  -- 0..1, optional
  points_awarded     int,                                      -- null until match is scored
  submitted_at       timestamptz not null default now(),
  scored_at          timestamptz,
  unique (user_id, match_id)
);

-- ---------------------------------------------------------------------------
-- Leaderboard (computed view)
-- ---------------------------------------------------------------------------

create view leaderboard_entries as
select
  m.tournament_id,
  pred.user_id,
  prof.display_name,
  prof.is_model,
  count(*)                                              as predictions_count,
  count(*) filter (where pred.points_awarded > 0)       as correct_predictions,
  coalesce(sum(pred.points_awarded), 0)::int            as total_points,
  max(pred.scored_at)                                   as last_scored_at
from predictions pred
join matches  m    on m.id = pred.match_id
join profiles prof on prof.id = pred.user_id
where pred.points_awarded is not null
group by m.tournament_id, pred.user_id, prof.display_name, prof.is_model;

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index matches_tournament_idx           on matches(tournament_id);
create index matches_scheduled_idx            on matches(scheduled_at);
create index matches_status_idx               on matches(status);
create index predictions_user_idx             on predictions(user_id);
create index predictions_match_idx            on predictions(match_id);
create index tournament_entries_tournament_idx on tournament_entries(tournament_id);

-- ---------------------------------------------------------------------------
-- updated_at trigger for matches
-- ---------------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger matches_set_updated_at
before update on matches
for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table sports             enable row level security;
alter table tournaments        enable row level security;
alter table teams              enable row level security;
alter table tournament_entries enable row level security;
alter table matches            enable row level security;
alter table profiles           enable row level security;
alter table predictions        enable row level security;

-- Reference data: world-readable, no public writes (admin uses service role).
create policy "sports public read"             on sports             for select using (true);
create policy "tournaments public read"        on tournaments        for select using (true);
create policy "teams public read"              on teams              for select using (true);
create policy "tournament_entries public read" on tournament_entries for select using (true);
create policy "matches public read"            on matches            for select using (true);

-- Profiles: anyone can read (so leaderboards show names); only owner edits theirs.
create policy "profiles public read"  on profiles for select using (true);
create policy "profiles owner insert" on profiles for insert with check (auth.uid() = id);
create policy "profiles owner update" on profiles for update using (auth.uid() = id);

-- Predictions: anyone can read (group play + leaderboards); only owner writes.
-- Owners can only modify a prediction before its match has started.
create policy "predictions public read" on predictions for select using (true);

create policy "predictions owner insert" on predictions
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from matches m
      where m.id = match_id and m.scheduled_at > now()
    )
  );

create policy "predictions owner update" on predictions
  for update using (
    auth.uid() = user_id
    and exists (
      select 1 from matches m
      where m.id = match_id and m.scheduled_at > now()
    )
  );

-- ---------------------------------------------------------------------------
-- Seed: register football
-- ---------------------------------------------------------------------------

insert into sports (slug, name, default_scoring_rules) values
  ('football', 'Football',
   jsonb_build_object(
     'exact_score',              5,
     'correct_outcome',          2,
     'correct_goal_difference',  3
   ));
