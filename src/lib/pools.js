import { supabase } from './supabase.js';

/**
 * Slugify a name into a URL-safe identifier and append a short random
 * suffix so two pools named the same don't collide on `slug`.
 */
export function makeSlug(name) {
  const base = (name || 'pool')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30) || 'pool';
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}

/**
 * Pick a random unassigned team from the pool's tournament and insert
 * an assignment row. If every team is already taken (>tournament size
 * members) we let teams repeat instead of failing.
 */
async function drawTeamFor(pool, userId) {
  const { data: entries, error: eErr } = await supabase
    .from('tournament_entries')
    .select('team_id')
    .eq('tournament_id', pool.tournament_id);
  if (eErr) throw eErr;

  const { data: assigned, error: aErr } = await supabase
    .from('pool_assignments')
    .select('team_id')
    .eq('pool_id', pool.id);
  if (aErr) throw aErr;

  const taken = new Set((assigned || []).map((a) => a.team_id));
  const available = (entries || []).filter((e) => !taken.has(e.team_id));
  const candidates = available.length > 0 ? available : entries;

  if (!candidates || candidates.length === 0) {
    throw new Error('No teams available to draw — has the fixtures fetcher run?');
  }
  const pick = candidates[Math.floor(Math.random() * candidates.length)];

  const { error: insErr } = await supabase
    .from('pool_assignments')
    .upsert(
      { pool_id: pool.id, user_id: userId, team_id: pick.team_id },
      { onConflict: 'pool_id,user_id' },
    );
  if (insErr) throw insErr;

  return pick.team_id;
}

/**
 * Create a pool, add the creator as the first member, and (for
 * sweepstake pools) draw a team for them.
 */
export async function createPool({ tournamentId, ownerId, name, description, type = 'pickem' }) {
  const slug = makeSlug(name);
  const { data: pool, error } = await supabase
    .from('pools')
    .insert({
      tournament_id: tournamentId,
      slug,
      name: name.trim(),
      description: description?.trim() || null,
      owner_id: ownerId,
      type,
    })
    .select()
    .single();
  if (error) throw error;

  const { error: mErr } = await supabase
    .from('pool_members')
    .insert({ pool_id: pool.id, user_id: ownerId });
  if (mErr) throw mErr;

  if (pool.type === 'sweepstake') {
    await drawTeamFor(pool, ownerId);
  }

  return pool;
}

/**
 * Add the current user to a pool by slug. For sweepstake pools, also
 * draws a team for them on first join.
 */
export async function joinPoolBySlug(slug, userId) {
  const { data: pool, error } = await supabase
    .from('pools')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  if (!pool) throw new Error(`Pool "${slug}" not found.`);

  const { error: mErr } = await supabase
    .from('pool_members')
    .upsert({ pool_id: pool.id, user_id: userId }, { onConflict: 'pool_id,user_id' });
  if (mErr) throw mErr;

  if (pool.type === 'sweepstake') {
    const { data: existing } = await supabase
      .from('pool_assignments')
      .select('team_id')
      .eq('pool_id', pool.id)
      .eq('user_id', userId)
      .maybeSingle();
    if (!existing) {
      await drawTeamFor(pool, userId);
    }
  }

  return pool;
}

export async function leavePool(poolId, userId) {
  const { error: aErr } = await supabase
    .from('pool_assignments')
    .delete()
    .eq('pool_id', poolId)
    .eq('user_id', userId);
  if (aErr) throw aErr;

  const { error } = await supabase
    .from('pool_members')
    .delete()
    .eq('pool_id', poolId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function deletePool(poolId) {
  const { data, error } = await supabase
    .from('pools')
    .delete()
    .eq('id', poolId)
    .select();
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error(
      'Delete blocked. Only the pool owner can delete a pool — check that the "pools owner delete" RLS policy exists in Supabase.',
    );
  }
}

/**
 * Fetch the pools the user is a member of, with members + assignments
 * for each. Returns:
 *   [{ id, slug, name, type, owner_id, members: [user_id, ...],
 *      assignments: [{ user_id, team: {id, name, code, metadata} }] }]
 */
export async function fetchUserPools(userId) {
  if (!userId) return [];

  const { data: memberships, error } = await supabase
    .from('pool_members')
    .select('pool:pools(id, slug, name, description, owner_id, tournament_id, type)')
    .eq('user_id', userId);
  if (error) throw error;

  const pools = (memberships || []).map((m) => m.pool).filter(Boolean);
  if (pools.length === 0) return [];

  const poolIds = pools.map((p) => p.id);

  const [{ data: allMembers, error: mErr }, { data: allAssignments, error: aErr }] = await Promise.all([
    supabase.from('pool_members').select('pool_id, user_id').in('pool_id', poolIds),
    supabase
      .from('pool_assignments')
      .select('pool_id, user_id, drawn_at, team:teams(id, name, code, metadata)')
      .in('pool_id', poolIds),
  ]);
  if (mErr) throw mErr;
  if (aErr) throw aErr;

  const membersByPool = {};
  for (const row of allMembers || []) {
    (membersByPool[row.pool_id] ??= []).push(row.user_id);
  }
  const assignmentsByPool = {};
  for (const row of allAssignments || []) {
    (assignmentsByPool[row.pool_id] ??= []).push({
      user_id: row.user_id,
      team: row.team,
      drawn_at: row.drawn_at,
    });
  }

  return pools.map((p) => ({
    ...p,
    members: membersByPool[p.id] || [p.owner_id],
    assignments: assignmentsByPool[p.id] || [],
  }));
}

export function poolInviteUrl(slug) {
  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://bloomcup.pages.dev';
  return `${origin}/?join=${encodeURIComponent(slug)}`;
}
