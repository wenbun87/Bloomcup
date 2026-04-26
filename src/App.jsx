import { useEffect, useState } from 'react';
import { supabase, isConfigured } from './lib/supabase.js';

export default function App() {
  const [sports, setSports] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConfigured) {
      setError('Supabase env vars missing — see README.');
      setLoading(false);
      return;
    }
    supabase
      .from('sports')
      .select('id, slug, name, default_scoring_rules')
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setSports(data ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="app">
      <header className="hero">
        <span className="badge">bloomcup</span>
        <h1>Pick the matches. Beat the model.</h1>
        <p>Starting with the 2026 Men's World Cup.</p>
      </header>

      <section className="card">
        <h2>Sports registered</h2>
        <p>Reads from the <code>sports</code> table — proves the DB wiring works.</p>

        {loading && <div className="status">Connecting…</div>}

        {error && <div className="status error">⚠ {error}</div>}

        {!loading && !error && sports.length === 0 && (
          <div className="status">No sports yet. Did the seed insert run?</div>
        )}

        {sports.length > 0 && (
          <div className="list">
            {sports.map((s) => (
              <div key={s.id} className="chip">
                <span>{s.name}</span>
                <span className="meta">/{s.slug}</span>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && sports.length > 0 && (
          <div className="status ok">✓ Connected to Supabase</div>
        )}
      </section>
    </div>
  );
}
