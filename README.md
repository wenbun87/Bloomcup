# Bloomcup

A multi-sport tournament prediction platform. Phase 1: 2026 Men's Football World Cup. Architected so any future sport (tennis, cricket, basketball...) plugs in as a new module without touching the core engine.

## Three things it does

1. **Personal predictions tracker** — log your picks, see your accuracy over time.
2. **Friends/group prediction game** — multi-user with leaderboards and scoring.
3. **Data-driven prediction model** — Poisson + Elo, runs daily, posts its own predictions so you can compare.

The model lives in the same `predictions` table as human users. Comparing yourself to it is a query, not a separate code path.

## Stack

- **Frontend:** React + Vite → Cloudflare Pages
- **Database + auth:** Supabase
- **Prediction jobs:** Python (`numpy`, `scipy`) on GitHub Actions, daily
- **Version control:** GitHub

## Folder structure

```
/core/                   universal: tournament engine, leaderboard, prediction storage, UI
/sports/
  /football/             sport plugin: data fetcher, Poisson model, scoring rules
/db/migrations/          SQL migrations for Supabase
/scripts/                Python prediction jobs (run on GitHub Actions)
```

The rule: anything sport-specific lives in `/sports/<sport>/`. If you find yourself adding a football-specific check inside `/core/`, stop — it belongs in the plugin.

## Getting started

1. Create a Supabase project for this app.
2. Run `db/migrations/001_initial_schema.sql` in the Supabase SQL editor.
3. Create the "model" predictor user (see [db/README.md](db/README.md)).
4. Install + run the frontend:
   ```bash
   npm install
   cp .env.example .env   # then fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
   npm run dev            # http://localhost:5173
   ```
5. You should see the registered sport (Football) load from Supabase.

## Deploying

Cloudflare Pages, build command `npm run build`, output dir `dist`.
Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as Pages env vars.

## Build phases

- **Phase 1** (~1 month part-time): core + football + WC 2026, ship before kickoff.
- **Phase 2** (~1–2 weeks): add a second sport, refactor what's not flexible enough.
- **Phase 3+**: each new sport is a few days.
