"""
Update team Elo ratings from newly finished match results.

For every match with status='finished' that hasn't had its Elo applied
yet (tracked in match.metadata.elo_applied_at), runs the standard Elo
update for both teams:

    expected_home = 1 / (1 + 10 ** ((away_elo - home_elo) / 400))
    new_home_elo  = home_elo + K * (actual_home - expected_home)

Where actual is 1 / 0.5 / 0 for win / draw / loss. K=30 (standard for
international football). No goal-difference multiplier in v1 — we can
add it later if the model wants it.

Idempotent: skips matches already applied.

Run order in the daily pipeline: fetch_football_fixtures → update_elo →
run_poisson, so the Poisson model picks up the fresh Elo values.
"""

import os
import sys
from datetime import datetime, timezone

from dotenv import load_dotenv
from supabase import create_client, ClientOptions

load_dotenv()

K_FACTOR = 30


def env(*keys):
    for key in keys:
        v = os.environ.get(key)
        if v:
            return v
    sys.exit(f'Missing env var: {keys[0]}')


def expected(my_elo, their_elo):
    return 1 / (1 + 10 ** ((their_elo - my_elo) / 400))


def main():
    sb = create_client(
        env('SUPABASE_URL', 'VITE_SUPABASE_URL'),
        env('SUPABASE_SERVICE_ROLE_KEY'),
        options=ClientOptions(schema='prediction_lab'),
    )

    matches = (
        sb.table('matches')
        .select('id, home_entry_id, away_entry_id, result, metadata, scheduled_at')
        .eq('status', 'finished')
        .order('scheduled_at')
        .execute().data
    )
    unapplied = [m for m in matches if not (m.get('metadata') or {}).get('elo_applied_at')]
    if not unapplied:
        print('no unapplied finished matches — nothing to update.')
        return
    print(f'{len(unapplied)} matches to apply')

    entries = sb.table('tournament_entries').select('id, team_id').execute().data
    team_by_entry = {e['id']: e['team_id'] for e in entries}

    teams = sb.table('teams').select('id, name, metadata').execute().data
    meta_by_team = {t['id']: (t.get('metadata') or {}) for t in teams}
    elo_by_team = {t['id']: float((t.get('metadata') or {}).get('elo', 1500)) for t in teams}
    name_by_team = {t['id']: t['name'] for t in teams}

    now_iso = datetime.now(timezone.utc).isoformat()

    for m in unapplied:
        home_team = team_by_entry.get(m['home_entry_id'])
        away_team = team_by_entry.get(m['away_entry_id'])
        result = m.get('result') or {}
        a_home = result.get('home_score')
        a_away = result.get('away_score')

        if home_team is None or away_team is None or a_home is None or a_away is None:
            print(f'  skip match {m["id"]}: missing teams or result')
            continue

        if a_home > a_away:
            actual_h, actual_a = 1.0, 0.0
        elif a_home < a_away:
            actual_h, actual_a = 0.0, 1.0
        else:
            actual_h, actual_a = 0.5, 0.5

        h_elo = elo_by_team[home_team]
        a_elo = elo_by_team[away_team]

        new_h = round(h_elo + K_FACTOR * (actual_h - expected(h_elo, a_elo)), 2)
        new_a = round(a_elo + K_FACTOR * (actual_a - expected(a_elo, h_elo)), 2)

        elo_by_team[home_team] = new_h
        elo_by_team[away_team] = new_a

        meta_by_team[home_team] = {**meta_by_team[home_team], 'elo': new_h}
        meta_by_team[away_team] = {**meta_by_team[away_team], 'elo': new_a}

        sb.table('teams').update({'metadata': meta_by_team[home_team]}).eq('id', home_team).execute()
        sb.table('teams').update({'metadata': meta_by_team[away_team]}).eq('id', away_team).execute()

        match_meta = {**(m.get('metadata') or {}), 'elo_applied_at': now_iso}
        sb.table('matches').update({'metadata': match_meta}).eq('id', m['id']).execute()

        print(
            f'  {name_by_team[home_team]} {h_elo:.0f}→{new_h:.0f}  '
            f'vs {name_by_team[away_team]} {a_elo:.0f}→{new_a:.0f}  '
            f'({a_home}-{a_away})'
        )

    print('elo update complete.')


if __name__ == '__main__':
    main()
