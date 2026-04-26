import { useEffect, useState } from 'react';
import { supabase, isConfigured } from './lib/supabase.js';
import { useAuth, ensureProfile, signInWithPassword, signUp, signOut } from './lib/auth.js';

const TOURNAMENT_SLUG = 'wc-2026';

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    ensureProfile(user)
      .then(setProfile)
      .catch((err) => setError(err.message));
  }, [user]);

  useEffect(() => {
    if (!isConfigured) {
      setError('Supabase env vars missing — see README.');
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const { data: tournament, error: tErr } = await supabase
          .from('tournaments')
          .select('*')
          .eq('slug', TOURNAMENT_SLUG)
          .single();
        if (tErr) throw tErr;

        const { data: modelUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('is_model', true)
          .limit(1)
          .maybeSingle();
        const modelId = modelUser?.id;

        const userIds = [modelId, user?.id].filter(Boolean);

        const [
          { data: entries, error: eErr },
          { data: matches, error: mErr },
          { data: predictions, error: pErr },
        ] = await Promise.all([
          supabase
            .from('tournament_entries')
            .select('id, group_label, team:teams(id, name, code, metadata)')
            .eq('tournament_id', tournament.id),
          supabase
            .from('matches')
            .select('*')
            .eq('tournament_id', tournament.id)
            .order('scheduled_at'),
          userIds.length
            ? supabase
                .from('predictions')
                .select('user_id, match_id, predicted_outcome, confidence')
                .in('user_id', userIds)
            : Promise.resolve({ data: [], error: null }),
        ]);
        if (eErr) throw eErr;
        if (mErr) throw mErr;
        if (pErr) throw pErr;

        if (!cancelled) setData({ tournament, entries, matches, predictions, modelId });
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  async function refreshUserPredictions() {
    if (!user || !data) return;
    const { data: fresh } = await supabase
      .from('predictions')
      .select('user_id, match_id, predicted_outcome, confidence')
      .eq('user_id', user.id);
    setData((d) => {
      const others = d.predictions.filter((p) => p.user_id !== user.id);
      return { ...d, predictions: [...others, ...(fresh || [])] };
    });
  }

  if (loading || authLoading) return <Shell><div className="status">Loading…</div></Shell>;
  if (error) return <Shell><div className="status error">⚠ {error}</div></Shell>;

  const { tournament, entries, matches, predictions, modelId } = data;
  const entryById = Object.fromEntries(entries.map((e) => [e.id, e]));

  const modelPredById = {};
  const userPredById = {};
  for (const p of predictions) {
    if (p.user_id === modelId) modelPredById[p.match_id] = p;
    if (user && p.user_id === user.id) userPredById[p.match_id] = p;
  }

  const groups = {};
  for (const m of matches) {
    const home = entryById[m.home_entry_id];
    const away = entryById[m.away_entry_id];
    const label = home?.group_label || 'KO';
    if (!groups[label]) groups[label] = { teams: new Map(), matches: [] };
    groups[label].matches.push({
      ...m,
      home,
      away,
      modelPred: modelPredById[m.id],
      userPred: userPredById[m.id],
    });
    if (home) groups[label].teams.set(home.id, home);
    if (away) groups[label].teams.set(away.id, away);
  }

  const sortedGroupLabels = Object.keys(groups).sort();

  return (
    <Shell wide>
      <AuthBar user={user} profile={profile} />

      <header className="hero">
        <div className="hero-decor hero-decor--left" aria-hidden="true">⚽</div>
        <div className="hero-decor hero-decor--right" aria-hidden="true">🏆</div>
        <span className="badge">🏆 bloomcup</span>
        <h1 className="hero-title">{tournament.name}</h1>
        <p className="tagline">Pick the matches. Beat the model.</p>
        <p className="hero-meta">
          {formatDateRange(tournament.start_date, tournament.end_date)}
          {tournament.metadata?.host_country && ` · ${tournament.metadata.host_country}`}
        </p>
      </header>

      <div className="groups">
        {sortedGroupLabels.map((label) => (
          <GroupCard
            key={label}
            label={label}
            teams={[...groups[label].teams.values()]}
            matches={groups[label].matches}
            user={user}
            onPredictionSaved={refreshUserPredictions}
          />
        ))}
      </div>
    </Shell>
  );
}

function Shell({ children, wide }) {
  return <div className={`app ${wide ? 'app--wide' : ''}`}>{children}</div>;
}

function AuthBar({ user, profile }) {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [info, setInfo] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setInfo(null);
    try {
      if (mode === 'signin') {
        const { error } = await signInWithPassword(email, password);
        if (error) throw error;
      } else {
        const { data, error } = await signUp(email, password);
        if (error) throw error;
        if (data.user && !data.session) {
          setInfo(`check your email (${email}) to confirm your account, then come back and sign in.`);
        }
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (user) {
    return (
      <div className="auth-bar auth-bar--signedin">
        <span>signed in as <strong>{profile?.display_name || user.email}</strong> 🌸</span>
        <button onClick={signOut} className="link-btn">sign out</button>
      </div>
    );
  }

  return (
    <div className="auth-block">
      <div className="auth-bar">
        <form onSubmit={handleSubmit} className="signin-form">
          <span className="signin-prompt">
            {mode === 'signin' ? 'sign in to play:' : 'create an account:'}
          </span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password"
          />
          <button disabled={busy}>
            {busy ? '…' : mode === 'signin' ? 'sign in' : 'sign up'}
          </button>
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setErr(null);
              setInfo(null);
            }}
          >
            {mode === 'signin' ? 'or sign up' : 'have an account? sign in'}
          </button>
        </form>
      </div>
      <div className="tip">
        <span className="tip-emoji" aria-hidden="true">💡</span>
        <span>
          already use <strong>bloomgarden</strong>? sign in with the same email and password —
          your login works here too.
        </span>
      </div>
      {err && <div className="status error">⚠ {err}</div>}
      {info && <div className="status ok">✓ {info}</div>}
    </div>
  );
}

function GroupCard({ label, teams, matches, user, onPredictionSaved }) {
  return (
    <div className="card group-card" data-group={label}>
      <div className="group-header">
        <h2>Group {label}</h2>
        <span className="group-meta">{teams.length} teams · {matches.length} matches</span>
      </div>
      <div className="team-pills">
        {teams
          .slice()
          .sort((a, b) => a.team.name.localeCompare(b.team.name))
          .map((entry) => (
            <span key={entry.id} className="team-pill" title={entry.team.name}>
              {entry.team.code || entry.team.name.slice(0, 3).toUpperCase()}
            </span>
          ))}
      </div>
      <div className="match-list">
        {matches.map((m) => (
          <MatchRow
            key={m.id}
            match={m}
            user={user}
            onPredictionSaved={onPredictionSaved}
          />
        ))}
      </div>
    </div>
  );
}

function MatchRow({ match, user, onPredictionSaved }) {
  const finished = match.status === 'finished' && match.result;
  const modelPred = match.modelPred;

  return (
    <div className={`match-row ${finished ? 'match-row--done' : ''}`}>
      <span className="match-time">{formatMatchTime(match.scheduled_at)}</span>
      <div className="match-teams">
        <span className="match-team home">{match.home?.team.name || 'TBD'}</span>
        {finished ? (
          <span className="match-score">
            {match.result.home_score} – {match.result.away_score}
          </span>
        ) : (
          <span className="match-vs">vs</span>
        )}
        <span className="match-team away">{match.away?.team.name || 'TBD'}</span>
      </div>

      {modelPred && !finished && (
        <div className="match-prediction">
          <span className="prediction-label">model</span>
          <span className="prediction-score">
            {modelPred.predicted_outcome.home_score}–{modelPred.predicted_outcome.away_score}
          </span>
          <span className="prediction-bar">
            <span className="bar-seg home" style={{ width: `${(modelPred.predicted_outcome.p_home_win || 0) * 100}%` }} />
            <span className="bar-seg draw" style={{ width: `${(modelPred.predicted_outcome.p_draw || 0) * 100}%` }} />
            <span className="bar-seg away" style={{ width: `${(modelPred.predicted_outcome.p_away_win || 0) * 100}%` }} />
          </span>
        </div>
      )}

      {!finished && user && (
        <UserPickInput
          matchId={match.id}
          userId={user.id}
          existing={match.userPred}
          onSaved={onPredictionSaved}
        />
      )}
    </div>
  );
}

function UserPickInput({ matchId, userId, existing, onSaved }) {
  const [home, setHome] = useState(existing?.predicted_outcome?.home_score ?? '');
  const [away, setAway] = useState(existing?.predicted_outcome?.away_score ?? '');
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(false);

  async function save(e) {
    e.preventDefault();
    if (home === '' || away === '') return;
    setBusy(true);
    try {
      const row = {
        user_id: userId,
        match_id: matchId,
        predicted_outcome: { home_score: Number(home), away_score: Number(away) },
      };
      const { error } = await supabase
        .from('predictions')
        .upsert(row, { onConflict: 'user_id,match_id' });
      if (error) throw error;
      setFlash(true);
      setTimeout(() => setFlash(false), 1500);
      onSaved?.();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  const dirty =
    home !== '' &&
    away !== '' &&
    (Number(home) !== existing?.predicted_outcome?.home_score ||
      Number(away) !== existing?.predicted_outcome?.away_score);

  return (
    <form onSubmit={save} className="match-pick">
      <span className="pick-label">your pick</span>
      <input
        type="number"
        min="0"
        max="20"
        inputMode="numeric"
        value={home}
        onChange={(e) => setHome(e.target.value)}
      />
      <span className="pick-dash">–</span>
      <input
        type="number"
        min="0"
        max="20"
        inputMode="numeric"
        value={away}
        onChange={(e) => setAway(e.target.value)}
      />
      <button disabled={busy || !dirty} className={flash ? 'flash' : ''}>
        {flash ? '✓ saved' : busy ? '…' : existing ? 'update' : 'save'}
      </button>
    </form>
  );
}

function formatDateRange(start, end) {
  const opts = { month: 'long', day: 'numeric' };
  const s = new Date(start).toLocaleDateString('en-US', opts);
  const e = new Date(end).toLocaleDateString('en-US', { ...opts, year: 'numeric' });
  return `${s} – ${e}`;
}

function formatMatchTime(iso) {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
