# Scripts

Python jobs that GitHub Actions runs on a schedule. Each script reads from / writes to Supabase via the **service role key** (bypasses RLS — safe because it only runs in trusted environments, never the browser).

## Run locally

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r scripts/requirements.txt
python scripts/fetch_football_fixtures.py
```

Required env vars (loaded from project-root `.env`):

| var | purpose |
|---|---|
| `SUPABASE_URL` | project URL (same value as `VITE_SUPABASE_URL` — script falls back to it if `SUPABASE_URL` isn't set) |
| `SUPABASE_SERVICE_ROLE_KEY` | secret key, found in Supabase dashboard under Settings → API Keys → "Secret keys" → default |
| `FOOTBALL_DATA_TOKEN` | free token from [football-data.org/client/register](https://www.football-data.org/client/register) |

## Scripts

The daily pipeline. Each is idempotent and safe to run on its own.

| script | purpose |
|---|---|
| `fetch_football_fixtures.py` | pulls WC 2026 fixtures + finished results from football-data.org; upserts teams, entries, matches |
| `seed_elo.py` | one-shot loader for `data/elo_snapshot.json` — sets initial team Elo before the tournament starts |
| `update_elo.py` | for every newly finished match, runs the standard Elo update (K=30) on both teams; marks match metadata as applied so it's never double-counted |
| `run_poisson.py` | re-runs the Poisson + Elo model over every still-scheduled match and upserts the bot's prediction (modal score + probabilities) |
| `score_predictions.py` | for newly finished matches, fills `points_awarded` on user predictions (exact=5, goal-diff=3, outcome=2) |
| `daily_update.py` | orchestrator. Runs the four real scripts in order: fetch → elo → poisson → score |

`data/elo_snapshot.json` holds the hand-curated starting Elo used by `seed_elo.py`. Update by hand or replace with a live fetcher.

## Automation

`.github/workflows/daily-update.yml` runs `daily_update.py` on a cron (06:15 UTC daily) and also exposes a manual trigger via the Actions tab. Needs three repo secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `FOOTBALL_DATA_TOKEN`.

Local outputs (CSV dumps, raw scrapes) go in `output/` and `data/raw/` — both gitignored.
