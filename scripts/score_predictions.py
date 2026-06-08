"""
Score user predictions for finished matches.

For every match with status='finished', find predictions whose
points_awarded is still NULL and fill them in based on the tournament's
scoring rules:

  - exact score        : 5 pts
  - correct goal diff  : 3 pts  (e.g. predict 2-1, actual 3-2)
  - correct outcome    : 2 pts  (predicted W/D/L matches actual)
  - else               : 0 pts

Idempotent: only scores predictions where points_awarded is null.
"""

import os
import sys
from datetime import datetime, timezone

from dotenv import load_dotenv
from supabase import create_client, ClientOptions

load_dotenv()

DEFAULT_SCORING = {'exact_score': 5, 'correct_outcome': 2, 'correct_goal_difference': 3}


def env(*keys):
    for key in keys:
        v = os.environ.get(key)
        if v:
            return v
    sys.exit(f'Missing env var: {keys[0]}')


def score_one(prediction, result, rules):
    if not prediction or not result:
        return 0
    p_home, p_away = prediction.get('home_score'), prediction.get('away_score')
    a_home, a_away = result.get('home_score'), result.get('away_score')
    if None in (p_home, p_away, a_home, a_away):
        return 0
    if p_home == a_home and p_away == a_away:
        return int(rules.get('exact_score', 5))
    p_diff = p_home - p_away
    a_diff = a_home - a_away
    if p_diff == a_diff:
        return int(rules.get('correct_goal_difference', 3))
    same_winner = (p_diff > 0 and a_diff > 0) or (p_diff < 0 and a_diff < 0) or (p_diff == 0 and a_diff == 0)
    if same_winner:
        return int(rules.get('correct_outcome', 2))
    return 0


def main():
    sb = create_client(
        env('SUPABASE_URL', 'VITE_SUPABASE_URL'),
        env('SUPABASE_SERVICE_ROLE_KEY'),
        options=ClientOptions(schema='prediction_lab'),
    )

    sport = sb.table('sports').select('default_scoring_rules').eq('slug', 'football').single().execute()
    rules = sport.data.get('default_scoring_rules') or DEFAULT_SCORING
    print(f'rules: {rules}')

    matches = (
        sb.table('matches')
        .select('id, result')
        .eq('status', 'finished')
        .execute().data
    )
    finished = [m for m in matches if m.get('result')]
    if not finished:
        print('no finished matches with results — nothing to score.')
        return

    finished_ids = [m['id'] for m in finished]
    print(f'{len(finished_ids)} finished matches')

    preds = (
        sb.table('predictions')
        .select('id, match_id, predicted_outcome')
        .in_('match_id', finished_ids)
        .is_('points_awarded', 'null')
        .execute().data
    )
    if not preds:
        print('no unscored predictions.')
        return
    print(f'{len(preds)} unscored predictions to score')

    result_by_match = {m['id']: m['result'] for m in finished}
    now_iso = datetime.now(timezone.utc).isoformat()

    by_score = {0: 0, 2: 0, 3: 0, 5: 0}
    for p in preds:
        pts = score_one(p.get('predicted_outcome'), result_by_match.get(p['match_id']), rules)
        sb.table('predictions').update({
            'points_awarded': pts,
            'scored_at': now_iso,
        }).eq('id', p['id']).execute()
        by_score[pts] = by_score.get(pts, 0) + 1

    print(f'scored: 5pt={by_score.get(5, 0)}, 3pt={by_score.get(3, 0)}, 2pt={by_score.get(2, 0)}, 0pt={by_score.get(0, 0)}')


if __name__ == '__main__':
    main()
