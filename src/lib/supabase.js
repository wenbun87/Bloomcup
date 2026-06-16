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
  auth: {
    // Read auth tokens (incl. password-recovery) from the URL on load,
    // persist the session, and refresh it automatically.
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const isConfigured = Boolean(url && anonKey);
