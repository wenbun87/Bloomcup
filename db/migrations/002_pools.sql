-- Sport Prediction Lab - pools (private leaderboards / sweepstakes)
-- Run in the Supabase SQL editor.

create table prediction_lab.pools (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references prediction_lab.tournaments(id) on delete cascade,
  slug          text unique not null,
  name          text not null,
  description   text,
  owner_id      uuid not null references prediction_lab.profiles(id) on delete cascade,
  created_at    timestamptz not null default now()
);

create index pools_tournament_idx on prediction_lab.pools(tournament_id);
create index pools_owner_idx on prediction_lab.pools(owner_id);

create table prediction_lab.pool_members (
  pool_id    uuid not null references prediction_lab.pools(id) on delete cascade,
  user_id    uuid not null references prediction_lab.profiles(id) on delete cascade,
  joined_at  timestamptz not null default now(),
  primary key (pool_id, user_id)
);

create index pool_members_user_idx on prediction_lab.pool_members(user_id);


-- RLS

alter table prediction_lab.pools         enable row level security;
alter table prediction_lab.pool_members  enable row level security;

create policy "pools public read"   on prediction_lab.pools for select using (true);
create policy "pools owner insert"  on prediction_lab.pools for insert with check (auth.uid() = owner_id);
create policy "pools owner update"  on prediction_lab.pools for update using (auth.uid() = owner_id);
create policy "pools owner delete"  on prediction_lab.pools for delete using (auth.uid() = owner_id);

create policy "pool_members public read"  on prediction_lab.pool_members for select using (true);
create policy "pool_members self join"    on prediction_lab.pool_members for insert with check (auth.uid() = user_id);
create policy "pool_members self leave"   on prediction_lab.pool_members for delete using (auth.uid() = user_id);


-- Grants (the auto-expose toggle should handle these but explicit is safe)

grant all on prediction_lab.pools         to anon, authenticated, service_role;
grant all on prediction_lab.pool_members  to anon, authenticated, service_role;
