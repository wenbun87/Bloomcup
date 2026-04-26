# Football plugin

Everything football-specific. Three required pieces:

- `data-fetcher.*` — pulls fixtures + results from football-data.org and Elo from eloratings.net; writes to `teams`, `tournament_entries`, `matches`.
- `prediction-model.*` — Poisson model. Uses team Elo + recent form to estimate goals scored, simulates each match 10,000 times, writes the modal prediction (and probabilities) to `predictions` under the model user.
- `scoring-rules.*` — given a `match.result` and a `prediction.predicted_outcome`, returns points. Defaults come from `sports.default_scoring_rules` but can be overridden per tournament.

JSON shapes this plugin owns:

- `matches.result` → `{home_score: int, away_score: int, went_to_penalties?: bool, penalty_winner?: 'home'|'away'}`
- `predictions.predicted_outcome` → `{home_score: int, away_score: int}`
