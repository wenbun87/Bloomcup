-- Sport Prediction Lab - sweepstake pool type + team assignments
-- Run in the Supabase SQL editor.
--
-- Adds 'sweepstake' as a pool type. In a sweepstake pool, members draw
-- one country on join and follow it through the tournament; the leader-
-- board ranks them by their country's progress.

alter table prediction_lab.pools
  add column type text not null default 'pickem'
  check (type in ('pickem', 'sweepstake'));


create table prediction_lab.pool_assignments (
  pool_id   uuid not null references prediction_lab.pools(id) on delete cascade,
  user_id   uuid not null references prediction_lab.profiles(id) on delete cascade,
  team_id   uuid not null references prediction_lab.teams(id),
  drawn_at  timestamptz not null default now(),
  primary key (pool_id, user_id)
);

create index pool_assignments_pool_idx on prediction_lab.pool_assignments(pool_id);
create index pool_assignments_team_idx on prediction_lab.pool_assignments(team_id);


alter table prediction_lab.pool_assignments enable row level security;

create policy "pool_assignments public read"
  on prediction_lab.pool_assignments for select using (true);

create policy "pool_assignments self insert"
  on prediction_lab.pool_assignments for insert with check (auth.uid() = user_id);

create policy "pool_assignments self delete"
  on prediction_lab.pool_assignments for delete using (auth.uid() = user_id);


grant all on prediction_lab.pool_assignments to anon, authenticated, service_role;
