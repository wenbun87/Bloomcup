"""
One-shot: load Elo ratings from scripts/data/elo_snapshot.json into
team.metadata.elo for every team in the football sport.

Idempotent. Re-run after editing the snapshot to update ratings.

Future: replace with a live fetcher from eloratings.net.
"""

import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client, ClientOptions

load_dotenv()

SNAPSHOT_PATH = Path(__file__).parent / 'data' / 'elo_snapshot.json'


def env(*keys):
    for key in keys:
        val = os.environ.get(key)
        if val:
            return val
    sys.exit(f'Missing env var: {keys[0]}')


def main():
    sb = create_client(
        env('SUPABASE_URL', 'VITE_SUPABASE_URL'),
        env('SUPABASE_SERVICE_ROLE_KEY'),
        options=ClientOptions(schema='prediction_lab'),
    )

    with open(SNAPSHOT_PATH) as f:
        snapshot = json.load(f)
    elo_by_name = snapshot['teams']
    default_elo = snapshot['_meta']['default_for_unmatched']

    sport = sb.table('sports').select('id').eq('slug', 'football').single().execute()
    sport_id = sport.data['id']

    teams = sb.table('teams').select('id, name, code, metadata').eq('sport_id', sport_id).execute().data
    print(f'updating elo for {len(teams)} teams (snapshot: {snapshot["_meta"]["updated"]})')

    matched = unmatched = 0
    for t in teams:
        elo = elo_by_name.get(t['name'])
        if elo is None:
            elo = default_elo
            unmatched += 1
            print(f'  ! no elo for "{t["name"]}" (code={t["code"]}) — defaulting to {default_elo}')
        else:
            matched += 1

        new_metadata = {**(t.get('metadata') or {}), 'elo': elo}
        sb.table('teams').update({'metadata': new_metadata}).eq('id', t['id']).execute()

    print(f'done: {matched} matched, {unmatched} defaulted')
    if unmatched:
        print('  → edit scripts/data/elo_snapshot.json to add the missing teams, then re-run')


if __name__ == '__main__':
    main()
