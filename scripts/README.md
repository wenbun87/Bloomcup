# Scripts

Python jobs that GitHub Actions runs on a schedule. Each script reads from / writes to Supabase via the service-role key (set as a GitHub Actions secret, never committed).

Planned jobs:

- `fetch-football-fixtures.py` — daily, syncs WC 2026 fixtures + results from football-data.org.
- `update-elo.py` — weekly, refreshes Elo ratings from eloratings.net.
- `run-poisson.py` — daily, runs the Poisson simulator for upcoming matches and upserts predictions for the model user.
- `score-predictions.py` — runs after fixtures sync, awards points for newly finished matches.

Local outputs (CSV dumps, raw scrapes) go in `output/` and `data/raw/` — both gitignored.
