# Database

Supabase. All tables live in the `prediction_lab` Postgres schema so this app can share a Supabase project with other apps.

## First-time setup

1. **Pick the project** you want to host this app in (any of yours).

2. **Expose the schema to the API.**
   In the Supabase dashboard: **Settings → API → "Exposed schemas"** → add `prediction_lab` (alongside `public`) → save.
   *Without this, the JS client gets `404` on every query.*

3. **Run the migration.**
   Open **SQL Editor → New query**, paste the contents of `migrations/001_initial_schema.sql`, and run.

4. **Create the "model" predictor user.**
   - **Authentication → Users → "Add user"** → email like `model@predictionlab.local`, any password.
   - Copy the user's UUID.
   - In SQL Editor:
     ```sql
     insert into prediction_lab.profiles (id, display_name, is_model)
     values ('<paste-uuid>', 'The Model', true);
     ```

5. **Verify** the API can see the schema. From your terminal:
   ```bash
   curl 'https://YOUR-PROJECT.supabase.co/rest/v1/sports?select=*' \
     -H "apikey: YOUR_ANON_KEY" \
     -H "Accept-Profile: prediction_lab"
   ```
   Should return `[{"id": "...", "slug": "football", ...}]`.

## Schema rules

See `memory/schema_philosophy.md`. Short version: no sport-specific tables. Sport-specific data goes in `jsonb` columns, validated by the sport plugin.

## Reset

To wipe and start over: `drop schema prediction_lab cascade;` then re-run the migration.
