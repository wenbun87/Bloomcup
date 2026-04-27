import { useEffect, useState } from 'react';
import { supabase, isConfigured } from './lib/supabase.js';
import { useAuth, ensureProfile, signInWithPassword, signUp, signOut } from './lib/auth.js';

const TOURNAMENT_SLUG = 'wc-2026';

/* ─────────────────────────────────────────────────────────────
   Decorative SVG marks (Maximalist Garden direction)
   Stroke-2px black outlines + fat fills. Reused everywhere.
   ───────────────────────────────────────────────────────────── */

function Flower({ size = 60, c1 = '#ff6b9d', c2 = '#ffd93d' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" aria-hidden="true">
      {[0, 72, 144, 216, 288].map((deg) => (
        <ellipse
          key={deg}
          cx="40" cy="20" rx="11" ry="18"
          fill={c1} stroke="#1a1a1a" strokeWidth="2"
          transform={`rotate(${deg} 40 40)`}
        />
      ))}
      <circle cx="40" cy="40" r="9" fill={c2} stroke="#1a1a1a" strokeWidth="2" />
      <circle cx="40" cy="40" r="3" fill="#1a1a1a" />
    </svg>
  );
}

function Leaf({ size = 40, color = '#6dba63' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path d="M5 35 Q 5 5 35 5 Q 30 25 5 35 Z" fill={color} stroke="#1a1a1a" strokeWidth="2" />
      <path d="M8 32 Q 18 22 30 10" stroke="#1a1a1a" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

function Star({ size = 30, color = '#ffd93d' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path
        d="M20 4 L24 16 L36 16 L26 24 L30 36 L20 28 L10 36 L14 24 L4 16 L16 16 Z"
        fill={color} stroke="#1a1a1a" strokeWidth="2" strokeLinejoin="round"
      />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────
   Top-level App
   ───────────────────────────────────────────────────────────── */

const VALID_VIEWS = ['fixtures', 'leaderboard', 'mypicks'];

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState(() => {
    const h = window.location.hash.replace('#', '');
    return VALID_VIEWS.includes(h) ? h : 'fixtures';
  });

  useEffect(() => {
    if (window.location.hash.replace('#', '') !== view) {
      window.history.replaceState(null, '', `#${view}`);
    }
  }, [view]);

  useEffect(() => {
    function onHash() {
      const h = window.location.hash.replace('#', '');
      if (VALID_VIEWS.includes(h)) setView(h);
    }
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  function handleNav(next) {
    setView(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

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
          supabase
            .from('predictions')
            .select(
              'user_id, match_id, predicted_outcome, confidence, points_awarded, profile:profiles(id, display_name, is_model)'
            ),
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
      .select(
        'user_id, match_id, predicted_outcome, confidence, points_awarded, profile:profiles(id, display_name, is_model)'
      )
      .eq('user_id', user.id);
    setData((d) => {
      const others = d.predictions.filter((p) => p.user_id !== user.id);
      return { ...d, predictions: [...others, ...(fresh || [])] };
    });
  }

  if (loading || authLoading) {
    return (
      <Shell>
        <div className="status">Loading the garden…</div>
      </Shell>
    );
  }
  if (error) {
    return (
      <Shell>
        <div className="status status--error">⚠ {error}</div>
      </Shell>
    );
  }

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
  const accentCycle = ['pink', 'yellow', 'green', 'purple'];

  // Compute "your" stats for the hero ribbon
  const yourPicks = user ? predictions.filter((p) => p.user_id === user.id) : [];
  const yourCorrect = yourPicks.filter((p) => (p.points_awarded ?? 0) > 0).length;
  const yourPoints = yourPicks.reduce((a, p) => a + (p.points_awarded ?? 0), 0);

  const modelPicks = predictions.filter((p) => p.user_id === modelId);
  const modelPoints = modelPicks.reduce((a, p) => a + (p.points_awarded ?? 0), 0);
  const vsModel = yourPoints - modelPoints;

  // Player rank (humans only)
  const byUser = new Map();
  for (const p of predictions) {
    if (!p.profile) continue;
    const r = byUser.get(p.user_id) ?? { profile: p.profile, picks: 0, points: 0 };
    r.picks += 1;
    r.points += p.points_awarded ?? 0;
    byUser.set(p.user_id, r);
  }
  const ranked = [...byUser.values()]
    .filter((r) => !r.profile.is_model)
    .sort((a, b) => b.points - a.points || b.picks - a.picks);
  const yourRank = user ? ranked.findIndex((r) => r.profile.id === user.id) + 1 : 0;

  return (
    <Shell>
      {view === 'fixtures' && <BgDecor />}
      <Nav user={user} profile={profile} view={view} onNav={handleNav} />

      {view === 'fixtures' && (
        <Hero
          tournament={tournament}
          signedIn={!!user}
          yourRank={yourRank}
          yourCorrect={yourCorrect}
          yourPicks={yourPicks.length}
          yourPoints={yourPoints}
          vsModel={vsModel}
          onNav={handleNav}
        />
      )}

      {!user && <AuthBlock />}

      <main className="main">
        {view === 'fixtures' && (
          <section className="groups-section">
            <h2 className="section-h2">
              <Leaf size={32} color="#6dba63" />
              <span>The Garden of Fixtures</span>
              <Leaf size={32} color="#6dba63" />
            </h2>

            <div className="groups">
              {sortedGroupLabels.map((label, idx) => (
                <GroupCard
                  key={label}
                  label={label}
                  accent={accentCycle[idx % accentCycle.length]}
                  teams={[...groups[label].teams.values()]}
                  matches={groups[label].matches}
                  user={user}
                  onPredictionSaved={refreshUserPredictions}
                />
              ))}
            </div>
          </section>
        )}

        {view === 'leaderboard' && (
          <Leaderboard predictions={predictions} currentUserId={user?.id} />
        )}

        {view === 'mypicks' && (
          <MyPicks
            user={user}
            predictions={predictions}
            matches={matches}
            entries={entries}
            modelId={modelId}
            onPredictionSaved={refreshUserPredictions}
            onNav={handleNav}
          />
        )}
      </main>

      <Footer />
    </Shell>
  );
}

/* ─────────────────────────────────────────────────────────────
   Shell + decoration layer
   ───────────────────────────────────────────────────────────── */

function Shell({ children }) {
  return <div className="app">{children}</div>;
}

function BgDecor() {
  return (
    <div className="bg-decor" aria-hidden="true">
      <span className="bg-decor__item bg-decor__item--1"><Flower size={80} c1="#ff6b9d" c2="#ffd93d" /></span>
      <span className="bg-decor__item bg-decor__item--2"><Leaf size={70} color="#6dba63" /></span>
      <span className="bg-decor__item bg-decor__item--3"><Flower size={60} c1="#9d6bff" c2="#ff6b9d" /></span>
      <span className="bg-decor__item bg-decor__item--4"><Star size={48} color="#ffd93d" /></span>
      <span className="bg-decor__item bg-decor__item--5"><Flower size={70} c1="#ffd93d" c2="#ff6b9d" /></span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Nav (top pill bar)
   ───────────────────────────────────────────────────────────── */

function Nav({ user, profile, view, onNav }) {
  const initial = (profile?.display_name || user?.email || '?').slice(0, 1).toUpperCase();
  const link = (id, label) => (
    <button
      type="button"
      className={`nav__link ${view === id ? 'nav__link--active' : ''}`}
      onClick={() => onNav(id)}
    >
      {label}
    </button>
  );
  return (
    <header className="nav">
      <button type="button" className="nav__brand" onClick={() => onNav('fixtures')}>
        <Flower size={36} c1="#ff6b9d" c2="#ffd93d" />
        <span className="nav__brand-text">Bloomcup</span>
      </button>
      <nav className="nav__links">
        {link('fixtures', 'fixtures')}
        {link('leaderboard', 'leaderboard')}
        {link('mypicks', 'my picks')}
      </nav>
      <div className="nav__right">
        {user ? (
          <>
            <span className="nav__user">
              <strong>{profile?.display_name || user.email}</strong>
            </span>
            <button onClick={signOut} className="nav__avatar" title="sign out">
              {initial}
            </button>
          </>
        ) : (
          <a href="#auth" className="nav__signin">sign in →</a>
        )}
      </div>
    </header>
  );
}

/* ─────────────────────────────────────────────────────────────
   Hero
   ───────────────────────────────────────────────────────────── */

function Hero({ tournament, signedIn, yourRank, yourCorrect, yourPicks, yourPoints, vsModel }) {
  const daysToKickoff = (() => {
    if (!tournament?.start_date) return null;
    const ms = new Date(tournament.start_date) - new Date();
    return Math.max(0, Math.ceil(ms / 86400000));
  })();

  return (
    <section className="hero">
      <div className="hero__sticker">
        <Star size={20} color="#ffd93d" />
        <span>
          {tournament?.name?.replace(/^\d+\s/, '') || 'World Cup'}
          {daysToKickoff != null && ` · ${daysToKickoff} days to kickoff`}
        </span>
        <Star size={20} color="#ffd93d" />
      </div>

      <h1 className="hero__title">
        <span className="hero__line">PICK</span>
        <span className="hero__chip hero__chip--yellow">the matches.</span>
        <span className="hero__line">BEAT</span>
        <span className="hero__chip hero__chip--purple">the model.</span>
      </h1>

      <p className="hero__lede">
        A bot picks every match. You pick every match. Whoever's wronger buys
        the next round.
        <span className="hero__lede-flower"><Flower size={20} c1="#ff6b9d" c2="#ffd93d" /></span>
        Game on.
      </p>

      <div className="hero__cta-row">
        <a href="#fixtures" className="big-btn">
          <span>{signedIn ? "Make today's picks" : 'Get started'}</span>
          <span className="big-btn__shine">3 open ✿</span>
        </a>
        <span className="hero__cta-decor"><Leaf size={50} color="#6dba63" /></span>
      </div>

      {signedIn && (
        <div className="stat-bubbles">
          <Stat color="pink" rotate={-2} num={yourRank ? `#${yourRank}` : '—'} label="your rank" />
          <Stat color="yellow" rotate={1} num={vsModel >= 0 ? `+${vsModel}` : `${vsModel}`} label="vs the bot" />
          <Stat color="green" rotate={-1} num={`${yourCorrect}/${yourPicks}`} label="correct" />
          <Stat color="purple" rotate={2} num={yourPoints} label="points" />
        </div>
      )}
    </section>
  );
}

function Stat({ color, rotate, num, label }) {
  return (
    <div
      className={`stat-bubble stat-bubble--${color}`}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <div className="stat-bubble__num">{num}</div>
      <div className="stat-bubble__lab">{label}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Auth (sign in / sign up)
   ───────────────────────────────────────────────────────────── */

function AuthBlock() {
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
          setInfo(`check your email (${email}) to confirm, then sign in.`);
        }
      }
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="auth-block" id="auth">
      <div className="auth-card">
        <div className="auth-card__head">
          <Flower size={28} c1="#ff6b9d" c2="#ffd93d" />
          <span>{mode === 'signin' ? 'Sign in to play' : 'Create an account'}</span>
        </div>
        <form onSubmit={handleSubmit} className="auth-form">
          <input
            type="email" required value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
          <input
            type="password" required minLength={6} value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password"
          />
          <button disabled={busy} className="auth-form__submit">
            {busy ? '…' : mode === 'signin' ? 'sign in →' : 'sign up →'}
          </button>
        </form>
        <button
          type="button" className="auth-card__switch"
          onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setErr(null); setInfo(null); }}
        >
          {mode === 'signin' ? "don't have an account? sign up" : 'have an account? sign in'}
        </button>
        <div className="auth-card__tip">
          <Star size={18} color="#ffd93d" />
          <span>
            already use <strong>bloomgarden</strong>? sign in with the same email + password.
          </span>
        </div>
        {err && <div className="status status--error">⚠ {err}</div>}
        {info && <div className="status status--ok">✓ {info}</div>}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   Leaderboard
   ───────────────────────────────────────────────────────────── */

function Leaderboard({ predictions, currentUserId }) {
  const byUser = new Map();
  for (const p of predictions) {
    if (!p.profile) continue;
    const row = byUser.get(p.user_id) ?? {
      profile: p.profile, picks: 0, points: 0, correct: 0,
    };
    row.picks += 1;
    row.points += p.points_awarded ?? 0;
    if ((p.points_awarded ?? 0) > 0) row.correct += 1;
    byUser.set(p.user_id, row);
  }

  const rows = [...byUser.values()].sort(
    (a, b) => b.points - a.points || b.picks - a.picks
  );

  const anyPoints = rows.some((r) => r.points > 0);
  const playerCount = rows.filter((r) => !r.profile.is_model).length;
  const modelRow = rows.find((r) => r.profile.is_model);

  return (
    <section className="lb-section">
      <h2 className="section-h2">
        <Star size={32} color="#ffd93d" />
        <span>The Garden Standings</span>
        <Flower size={32} c1="#ff6b9d" c2="#ffd93d" />
      </h2>

      <div className="lb-card">
        {rows.length === 0 ? (
          <p className="lb-empty">no picks yet — be the first to play.</p>
        ) : (
          rows.map((r, i) => {
            const isYou = r.profile.id === currentUserId;
            const isModel = r.profile.is_model;
            const rankClass = i === 0 ? 'gold' : i === 1 ? 'pink' : i === 2 ? 'green' : 'plain';
            return (
              <div
                key={r.profile.id}
                className={[
                  'lb-row',
                  isYou && 'lb-row--you',
                  isModel && 'lb-row--bot',
                ].filter(Boolean).join(' ')}
              >
                <div className={`lb-rank lb-rank--${rankClass}`}>{i + 1}</div>
                <div className="lb-name">
                  {isModel && <span className="lb-name__bot" aria-hidden="true">🤖</span>}
                  <span>{r.profile.display_name}</span>
                  {isYou && <span className="lb-name__you">YOU</span>}
                </div>
                <div className="lb-acc">{r.correct}/{r.picks}</div>
                <div className="lb-pts">
                  {anyPoints ? r.points : '—'}
                  <span className="lb-pts__sm">pts</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {!anyPoints && rows.length > 0 && (
        <p className="lb-note">
          points start tallying once matches finish (kickoff June 11).
          {playerCount > 0 && ` · ${playerCount} ${playerCount === 1 ? 'player' : 'players'}`}
          {modelRow && ` · model has filed ${modelRow.picks} picks`}
        </p>
      )}
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   My Picks tab
   ───────────────────────────────────────────────────────────── */

function MyPicks({ user, predictions, matches, entries, modelId, onPredictionSaved, onNav }) {
  const heading = (
    <h2 className="section-h2">
      <Flower size={32} c1="#ff6b9d" c2="#ffd93d" />
      <span>Your picks</span>
      <Flower size={32} c1="#9d6bff" c2="#ffd93d" />
    </h2>
  );

  if (!user) {
    return (
      <section className="my-picks">
        {heading}
        <div className="my-picks__empty">
          <Star size={40} color="#ffd93d" />
          <p className="my-picks__empty-title">Sign in to see your picks.</p>
          <p className="my-picks__empty-sub">Use the sign-in card above.</p>
        </div>
      </section>
    );
  }

  const entryById = Object.fromEntries(entries.map((e) => [e.id, e]));
  const modelPredById = {};
  const userPredById = {};
  for (const p of predictions) {
    if (p.user_id === modelId) modelPredById[p.match_id] = p;
    if (p.user_id === user.id) userPredById[p.match_id] = p;
  }

  const yourMatchIds = new Set(Object.keys(userPredById));
  const yourMatches = matches
    .filter((m) => yourMatchIds.has(m.id))
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
    .map((m) => ({
      ...m,
      home: entryById[m.home_entry_id],
      away: entryById[m.away_entry_id],
      modelPred: modelPredById[m.id],
      userPred: userPredById[m.id],
    }));

  if (yourMatches.length === 0) {
    return (
      <section className="my-picks">
        {heading}
        <div className="my-picks__empty">
          <Flower size={48} c1="#ff6b9d" c2="#ffd93d" />
          <p className="my-picks__empty-title">No picks yet ✿</p>
          <p className="my-picks__empty-sub">
            Head to{' '}
            <button type="button" className="my-picks__link" onClick={() => onNav('fixtures')}>
              Fixtures
            </button>{' '}
            and call some matches.
          </p>
        </div>
      </section>
    );
  }

  const totalPoints = yourMatches.reduce((s, m) => s + (m.userPred?.points_awarded ?? 0), 0);
  const correct = yourMatches.filter((m) => (m.userPred?.points_awarded ?? 0) > 0).length;
  const matchedModel = yourMatches.filter((m) => {
    const u = m.userPred?.predicted_outcome;
    const md = m.modelPred?.predicted_outcome;
    return u && md && u.home_score === md.home_score && u.away_score === md.away_score;
  }).length;

  return (
    <section className="my-picks">
      {heading}

      <div className="my-picks__stats">
        <Stat color="pink" rotate={-1} num={yourMatches.length} label="picks made" />
        <Stat color="green" rotate={1} num={correct} label="correct" />
        <Stat color="yellow" rotate={-1} num={totalPoints} label="points" />
        <Stat color="purple" rotate={1} num={matchedModel} label="agree w/ bot" />
      </div>

      <p className="my-picks__hint">
        tap any score to update — picks lock when the match starts.
      </p>

      <div className="my-picks__list">
        {yourMatches.map((m) => {
          const groupLabel = m.home?.group_label || 'KO';
          return (
            <div key={m.id} className="my-pick-card">
              <div className="my-pick-card__tag">Group {groupLabel}</div>
              <MatchRow
                match={m}
                accent="pink"
                user={user}
                onPredictionSaved={onPredictionSaved}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   Group Card
   ───────────────────────────────────────────────────────────── */

function GroupCard({ label, accent, teams, matches, user, onPredictionSaved }) {
  return (
    <article className={`group-card group-card--${accent}`} data-group={label} id={`group-${label}`}>
      <header className="group-card__head">
        <div className="group-card__letter">{label}</div>
        <div className="group-card__head-text">
          <div className="group-card__title">Group {label}</div>
          <div className="group-card__sub">{teams.length} teams · {matches.length} matches</div>
        </div>
        <Flower size={32} c1={accentColor(accent)} c2="#1a1a1a" />
      </header>

      <div className="team-pills">
        {teams
          .slice()
          .sort((a, b) => a.team.name.localeCompare(b.team.name))
          .map((entry) => (
            <span key={entry.id} className="team-pill" title={entry.team.name}>
              <span className="team-pill__code">
                {entry.team.code || entry.team.name.slice(0, 3).toUpperCase()}
              </span>
              <span className="team-pill__name">{entry.team.name}</span>
            </span>
          ))}
      </div>

      <div className="match-list">
        {matches.map((m) => (
          <MatchRow key={m.id} match={m} accent={accent} user={user} onPredictionSaved={onPredictionSaved} />
        ))}
      </div>
    </article>
  );
}

function accentColor(name) {
  return { pink: '#ff6b9d', yellow: '#ffd93d', green: '#6dba63', purple: '#9d6bff' }[name] || '#ff6b9d';
}

/* ─────────────────────────────────────────────────────────────
   Match row
   ───────────────────────────────────────────────────────────── */

function MatchRow({ match, accent, user, onPredictionSaved }) {
  const finished = match.status === 'finished' && match.result;
  const modelPred = match.modelPred;
  const userPicked = !!match.userPred;

  return (
    <div className={`match-row ${finished ? 'match-row--done' : ''}`}>
      <div className="match-row__top">
        <span className="match-row__time">{formatMatchTime(match.scheduled_at)}</span>
        {finished ? (
          <span className="match-row__status match-row__status--done">FINAL ●</span>
        ) : userPicked ? (
          <span className="match-row__status match-row__status--picked">✓ PICKED</span>
        ) : (
          <span className="match-row__status match-row__status--open">OPEN</span>
        )}
      </div>

      <div className="match-row__core">
        <div className="match-row__side match-row__side--home">
          <span className="match-row__team">{match.home?.team.name || 'TBD'}</span>
          <span className="match-row__code">{match.home?.team.code || '—'}</span>
        </div>
        <div className="match-row__center">
          {finished ? (
            <span className="match-row__score">
              {match.result.home_score}–{match.result.away_score}
            </span>
          ) : (
            <span className="match-row__vs">VS</span>
          )}
        </div>
        <div className="match-row__side match-row__side--away">
          <span className="match-row__code">{match.away?.team.code || '—'}</span>
          <span className="match-row__team">{match.away?.team.name || 'TBD'}</span>
        </div>
      </div>

      {modelPred && !finished && (
        <div className="bot-strip">
          <span className="bot-strip__label">🤖 bot says</span>
          <span className="bot-strip__score">
            {modelPred.predicted_outcome.home_score}–{modelPred.predicted_outcome.away_score}
          </span>
          <span className="bot-strip__bar">
            <span style={{ flex: modelPred.predicted_outcome.p_home_win || 0, background: '#ff6b9d' }} />
            <span style={{ flex: modelPred.predicted_outcome.p_draw || 0, background: '#1a1a1a', opacity: 0.3 }} />
            <span style={{ flex: modelPred.predicted_outcome.p_away_win || 0, background: '#9d6bff' }} />
          </span>
        </div>
      )}

      {!finished && user && (
        <UserPickInput
          matchId={match.id}
          userId={user.id}
          existing={match.userPred}
          accent={accent}
          onSaved={onPredictionSaved}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Pick input
   ───────────────────────────────────────────────────────────── */

function UserPickInput({ matchId, userId, existing, accent, onSaved }) {
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
    home !== '' && away !== '' &&
    (Number(home) !== existing?.predicted_outcome?.home_score ||
     Number(away) !== existing?.predicted_outcome?.away_score);

  return (
    <form onSubmit={save} className="pick-form">
      <span className="pick-form__label">your pick:</span>
      <input
        type="number" min="0" max="20" inputMode="numeric"
        value={home} onChange={(e) => setHome(e.target.value)}
      />
      <span className="pick-form__dash">–</span>
      <input
        type="number" min="0" max="20" inputMode="numeric"
        value={away} onChange={(e) => setAway(e.target.value)}
      />
      <button
        disabled={busy || !dirty}
        className={`pick-form__btn pick-form__btn--${accent} ${flash ? 'is-flash' : ''}`}
      >
        {flash ? '✓ saved' : busy ? '…' : existing ? '↻ update' : '✿ save'}
      </button>
    </form>
  );
}

/* ─────────────────────────────────────────────────────────────
   Footer
   ───────────────────────────────────────────────────────────── */

function Footer() {
  const items = [
    'BLOOMCUP', <Flower key="f1" size={20} c1="#ff6b9d" c2="#ffd93d" />,
    'BLOOMCUP', <Star key="s1" size={18} color="#ffd93d" />,
    'BLOOMCUP', <Leaf key="l1" size={20} color="#6dba63" />,
    'BLOOMCUP', <Flower key="f2" size={20} c1="#9d6bff" c2="#ffd93d" />,
    'BLOOMCUP', <Star key="s2" size={18} color="#ffd93d" />,
    'BLOOMCUP',
  ];
  return (
    <footer className="footer">
      <div className="footer__strip">
        {items.map((it, i) => <span key={i} className="footer__item">{it}</span>)}
      </div>
    </footer>
  );
}

/* ─────────────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────────────── */

function formatMatchTime(iso) {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}
