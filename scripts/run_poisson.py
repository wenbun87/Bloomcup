"""
Run the Poisson prediction model over upcoming matches.

For each scheduled WC 2026 match:
  1. Fetch home/away team Elo (from team.metadata.elo)
  2. Convert Elo difference into expected goals via a calibrated mapping
  3. Sample home and away goals from independent Poisson distributions
     N_SIMULATIONS times
  4. Use the modal scoreline as the model's prediction
  5. Store probabilities (P(home win), P(draw), P(away win)) alongside

Writes one row per match into the `predictions` table under the model's
profile (the row in `profiles` with is_model = true).

Idempotent: upserts on (user_id, match_id).

Required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
"""

import os
import sys
from collections import Counter

import numpy as np
from dotenv import load_dotenv
from supabase import create_client, ClientOptions

load_dotenv()

N_SIMULATIONS = 10_000
ELO_TO_GOAL_DIFF = 0.004     # 1 Elo point ≈ 0.004 goals (so ~250 Elo per goal of diff)
AVG_INTERNATIONAL_GOALS = 2.5
MIN_XG = 0.15                 # floor — even huge underdogs score sometimes
MAX_XG = 4.5                  # ceiling — avoids absurd modal scores
HOST_NATIONS = {'United States', 'USA', 'Canada', 'Mexico'}
HOST_ADVANTAGE = 0.3          # extra xG for host nations playing at home


def env(*keys):
    for key in keys:
        val = os.environ.get(key)
        if val:
            return val
    sys.exit(f'Missing env var: {keys[0]}')


def predict(home_elo, away_elo, home_is_host):
    elo_diff = (home_elo - away_elo) * ELO_TO_GOAL_DIFF
    home_advantage = HOST_ADVANTAGE if home_is_host else 0
    home_xg = (AVG_INTERNATIONAL_GOALS + elo_diff) / 2 + home_advantage
    away_xg = (AVG_INTERNATIONAL_GOALS - elo_diff) / 2
    home_xg = min(MAX_XG, max(MIN_XG, home_xg))
    away_xg = min(MAX_XG, max(MIN_XG, away_xg))

    home_goals = np.random.poisson(home_xg, N_SIMULATIONS)
    away_goals = np.random.poisson(away_xg, N_SIMULATIONS)

    p_home = float((home_goals > away_goals).mean())
    p_draw = float((home_goals == away_goals).mean())
    p_away = float((home_goals < away_goals).mean())

    # Predicted scoreline: pick the most likely OUTCOME (home/draw/away),
    # then the most common exact scoreline *within that outcome*. Taking the
    # global modal score collapses almost every game to 1-1, because for two
    # low-mean Poissons the single most common joint score is (1,1) even when
    # one side is clearly favoured. Conditioning on the outcome makes the
    # favourite show a winning scoreline and gives realistic variety.
    if p_home >= p_draw and p_home >= p_away:
        mask = home_goals > away_goals
    elif p_away >= p_home and p_away >= p_draw:
        mask = home_goals < away_goals
    else:
        mask = home_goals == away_goals

    if mask.any():
        score_counts = Counter(zip(home_goals[mask].tolist(), away_goals[mask].tolist()))
    else:
        score_counts = Counter(zip(home_goals.tolist(), away_goals.tolist()))
    pred_home, pred_away = score_counts.most_common(1)[0][0]

    return {
        'home_score': int(pred_home),
        'away_score': int(pred_away),
        'p_home_win': round(p_home, 4),
        'p_draw': round(p_draw, 4),
        'p_away_win': round(p_away, 4),
        'home_xg': round(home_xg, 3),
        'away_xg': round(away_xg, 3),
    }, max(p_home, p_draw, p_away)


def main():
    sb = create_client(
        env('SUPABASE_URL', 'VITE_SUPABASE_URL'),
        env('SUPABASE_SERVICE_ROLE_KEY'),
        options=ClientOptions(schema='prediction_lab'),
    )

    model = sb.table('profiles').select('id, display_name').eq('is_model', True).limit(1).execute()
    if not model.data:
        sys.exit('No model user found in profiles. Create one first (see db/README.md step 4).')
    model_id = model.data[0]['id']
    print(f'model: {model.data[0]["display_name"]} ({model_id})')

    sport = sb.table('sports').select('id').eq('slug', 'football').single().execute()
    sport_id = sport.data['id']

    teams = sb.table('teams').select('id, name, metadata').eq('sport_id', sport_id).execute().data
    elo_by_team_id = {t['id']: (t.get('metadata') or {}).get('elo', 1500) for t in teams}
    name_by_team_id = {t['id']: t['name'] for t in teams}

    entries = sb.table('tournament_entries').select('id, team_id').execute().data
    team_id_by_entry = {e['id']: e['team_id'] for e in entries}

    matches = (
        sb.table('matches')
        .select('id, home_entry_id, away_entry_id, status, scheduled_at')
        .eq('status', 'scheduled')
        .execute().data
    )
    print(f'predicting {len(matches)} scheduled matches')

    predictions_to_upsert = []
    for m in matches:
        home_team_id = team_id_by_entry.get(m['home_entry_id'])
        away_team_id = team_id_by_entry.get(m['away_entry_id'])
        if not (home_team_id and away_team_id):
            continue

        home_elo = elo_by_team_id.get(home_team_id, 1500)
        away_elo = elo_by_team_id.get(away_team_id, 1500)
        home_is_host = name_by_team_id.get(home_team_id) in HOST_NATIONS

        outcome, confidence = predict(home_elo, away_elo, home_is_host)

        predictions_to_upsert.append({
            'user_id': model_id,
            'match_id': m['id'],
            'predicted_outcome': outcome,
            'confidence': confidence,
        })

    # Upsert in batches (Supabase has a row limit per request)
    batch_size = 100
    for i in range(0, len(predictions_to_upsert), batch_size):
        batch = predictions_to_upsert[i:i + batch_size]
        sb.table('predictions').upsert(batch, on_conflict='user_id,match_id').execute()

    print(f'wrote {len(predictions_to_upsert)} predictions')


if __name__ == '__main__':
    main()
