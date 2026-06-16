"""
Pull 2026 FIFA World Cup fixtures from football-data.org and seed the
prediction_lab schema with teams, tournament entries, and matches.

Idempotent: safe to run repeatedly. Designed to be run on a daily cron via
GitHub Actions, but also runs cleanly locally.

Required env vars (loaded from .env if present):
  SUPABASE_URL                  Supabase project URL
  SUPABASE_SERVICE_ROLE_KEY     Service-role key (bypasses RLS)
  FOOTBALL_DATA_TOKEN           Free token from https://www.football-data.org

Usage:
  pip install -r scripts/requirements.txt
  python scripts/fetch_football_fixtures.py
"""

import os
import sys

import requests
from dotenv import load_dotenv
from supabase import create_client, ClientOptions

load_dotenv()

FD_BASE = 'https://api.football-data.org/v4'
COMPETITION = 'WC'
TOURNAMENT_SLUG = 'wc-2026'

STAGE_MAP = {
    'GROUP_STAGE': 'group',
    'LAST_16': 'round_of_16',
    'QUARTER_FINALS': 'quarter_final',
    'SEMI_FINALS': 'semi_final',
    'THIRD_PLACE': 'third_place',
    'FINAL': 'final',
}

STATUS_MAP = {
    'SCHEDULED': 'scheduled',
    'TIMED': 'scheduled',
    'IN_PLAY': 'live',
    'PAUSED': 'live',
    'FINISHED': 'finished',
    'POSTPONED': 'postponed',
    'SUSPENDED': 'postponed',
    'CANCELLED': 'postponed',
}


def env(*keys):
    """Return the first set env var among `keys`, or exit."""
    for key in keys:
        val = os.environ.get(key)
        if val:
            return val
    sys.exit(f'Missing env var: {keys[0]}')


def main():
    sb_url = env('SUPABASE_URL', 'VITE_SUPABASE_URL')
    sb_key = env('SUPABASE_SERVICE_ROLE_KEY')
    fd_token = env('FOOTBALL_DATA_TOKEN')

    sb = create_client(sb_url, sb_key, options=ClientOptions(schema='prediction_lab'))

    sport = sb.table('sports').select('id').eq('slug', 'football').single().execute()
    sport_id = sport.data['id']
    print(f'sport football: {sport_id}')

    tournament = sb.table('tournaments').upsert({
        'sport_id': sport_id,
        'slug': TOURNAMENT_SLUG,
        'name': '2026 FIFA World Cup',
        'format': 'group_then_knockout',
        'start_date': '2026-06-11',
        'end_date': '2026-07-19',
        'status': 'upcoming',
        'metadata': {'host_country': 'USA, Canada, Mexico', 'group_size': 4},
    }, on_conflict='slug').execute()
    tournament_id = tournament.data[0]['id']
    print(f'tournament {TOURNAMENT_SLUG}: {tournament_id}')

    print(f'fetching {FD_BASE}/competitions/{COMPETITION}/matches ...')
    resp = requests.get(
        f'{FD_BASE}/competitions/{COMPETITION}/matches',
        headers={'X-Auth-Token': fd_token},
        timeout=30,
    )
    if resp.status_code != 200:
        sys.exit(f'football-data.org error {resp.status_code}: {resp.text[:300]}')

    matches_data = resp.json().get('matches', [])
    print(f'fetched {len(matches_data)} matches')

    teams_by_fd = {}
    group_by_fd = {}
    for m in matches_data:
        for side in ('homeTeam', 'awayTeam'):
            t = m.get(side) or {}
            fd_id = t.get('id')
            if not fd_id:
                continue
            teams_by_fd[fd_id] = {
                'sport_id': sport_id,
                'name': t.get('name') or t.get('shortName') or f'Team {fd_id}',
                'code': t.get('tla'),
                'football_data_id': fd_id,
            }
            group = m.get('group')
            if group and m.get('stage') == 'GROUP_STAGE':
                group_by_fd[fd_id] = group.replace('GROUP_', '').replace('Group ', '').strip()
    print(f'found {len(teams_by_fd)} teams')

    # Existing metadata so we can MERGE (never overwrite) — otherwise the
    # elo set by seed_elo.py / update_elo.py would be wiped on every run.
    existing_teams = sb.table('teams').select('name, metadata').eq('sport_id', sport_id).execute().data
    meta_by_name = {t['name']: (t.get('metadata') or {}) for t in existing_teams}

    team_id_by_fd = {}
    for fd_id, team in teams_by_fd.items():
        name = team['name']
        merged_meta = {
            **meta_by_name.get(name, {}),
            'football_data_id': team.pop('football_data_id'),
        }
        team['metadata'] = merged_meta
        result = sb.table('teams').upsert(team, on_conflict='sport_id,name').execute()
        team_id_by_fd[fd_id] = result.data[0]['id']

    entry_id_by_fd = {}
    for fd_id, team_id in team_id_by_fd.items():
        result = sb.table('tournament_entries').upsert({
            'tournament_id': tournament_id,
            'team_id': team_id,
            'group_label': group_by_fd.get(fd_id),
        }, on_conflict='tournament_id,team_id').execute()
        entry_id_by_fd[fd_id] = result.data[0]['id']
    print(f'tournament entries: {len(entry_id_by_fd)}')

    existing = sb.table('matches').select('id, external_ref').eq('tournament_id', tournament_id).execute()
    existing_id_by_ref = {row['external_ref']: row['id'] for row in existing.data if row.get('external_ref')}

    inserted = updated = skipped = 0
    for m in matches_data:
        home_fd = (m.get('homeTeam') or {}).get('id')
        away_fd = (m.get('awayTeam') or {}).get('id')
        if not (home_fd and away_fd):
            skipped += 1
            continue

        fd_match_id = str(m['id'])
        row = {
            'tournament_id': tournament_id,
            'stage': STAGE_MAP.get(m.get('stage'), (m.get('stage') or 'unknown').lower()),
            'home_entry_id': entry_id_by_fd.get(home_fd),
            'away_entry_id': entry_id_by_fd.get(away_fd),
            'scheduled_at': m['utcDate'],
            'status': STATUS_MAP.get(m.get('status'), 'scheduled'),
            'external_ref': fd_match_id,
        }
        ft = (m.get('score') or {}).get('fullTime') or {}
        if ft.get('home') is not None and ft.get('away') is not None:
            row['result'] = {'home_score': ft['home'], 'away_score': ft['away']}

        if fd_match_id in existing_id_by_ref:
            sb.table('matches').update(row).eq('id', existing_id_by_ref[fd_match_id]).execute()
            updated += 1
        else:
            sb.table('matches').insert(row).execute()
            inserted += 1

    print(f'matches: {inserted} inserted, {updated} updated, {skipped} skipped (teams TBD)')


if __name__ == '__main__':
    main()
