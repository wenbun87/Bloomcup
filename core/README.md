# Core

Universal logic. Knows nothing about football, tennis, or any specific sport.

Planned modules:

- `tournament-engine.*` — group-stage standings, knockout brackets, simulation runner.
- `leaderboard.*` — points aggregation, ranking. (Mostly a thin wrapper over the SQL view.)
- `user-predictions.*` — submit, edit, list, and score predictions.
- `ui-components/` — shared React components (match card, leaderboard table, prediction form shell).

If you're about to write a sport-specific check here, stop — it belongs in `/sports/<sport>/`.
