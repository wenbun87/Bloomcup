# Database

Supabase. One project per environment.

## Apply the schema

1. Open the Supabase project's SQL editor.
2. Paste `migrations/001_initial_schema.sql` and run it.
3. Create the "model" predictor user:
   - Authentication → Users → "Add user" → email like `model@predictionlab.local`, any password.
   - Copy the user's UUID.
   - Run in SQL editor:
     ```sql
     insert into profiles (id, display_name, is_model)
     values ('<paste-uuid>', 'The Model', true);
     ```

## Schema rules

See `memory/schema_philosophy.md` (in `~/.claude/projects/.../memory/`). Short version: no sport-specific tables. Sport-specific data goes in `jsonb` columns, validated by the sport plugin.
