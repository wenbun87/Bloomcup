import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn(
    '[supabase] missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — copy .env.example to .env and fill them in.'
  );
}

// All app tables live in the `prediction_lab` schema so this Supabase project
// can be shared with other apps. The schema must also be added to
// "Exposed schemas" in the Supabase dashboard (Settings → API).
export const supabase = createClient(url ?? '', anonKey ?? '', {
  db: { schema: 'prediction_lab' },
});

export const isConfigured = Boolean(url && anonKey);
