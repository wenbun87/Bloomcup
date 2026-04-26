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

- **`fetch_football_fixtures.py`** — pulls WC 2026 fixtures from football-data.org, upserts teams + tournament_entries + matches. Idempotent.

Planned next:
- `update_elo.py` — refresh team Elo ratings from eloratings.net
- `run_poisson.py` — simulate upcoming matches and post predictions for the model user
- `score_predictions.py` — award points after fixtures finish

Local outputs (CSV dumps, raw scrapes) go in `output/` and `data/raw/` — both gitignored.
