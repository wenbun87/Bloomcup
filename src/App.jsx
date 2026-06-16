import { useEffect, useState } from 'react';
import { supabase, isConfigured } from './lib/supabase.js';
import {
  useAuth, ensureProfile, signInWithPassword, signUp, signOut,
  sendPasswordReset, updatePassword,
} from './lib/auth.js';
import {
  createPool,
  joinPoolBySlug,
  leavePool,
  deletePool,
  fetchUserPools,
  poolInviteUrl,
} from './lib/pools.js';

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

const VALID_VIEWS = ['fixtures', 'leaderboard', 'mypicks', 'settings'];

// True when the URL hash carries a Supabase auth callback token
// (e.g. #access_token=...&type=recovery). While present, the hash
// router must leave the URL alone so Supabase can consume the token.
function isAuthCallbackHash() {
  const h = window.location.hash || '';
  return h.includes('access_token=') || h.includes('type=recovery') || h.includes('error=');
}

export default function App() {
  const { user, loading: authLoading, recovery, clearRecovery } = useAuth();
  const [profile, setProfile] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState(() => {
    const h = window.location.hash.replace('#', '');
    return VALID_VIEWS.includes(h) ? h : 'fixtures';
  });

  useEffect(() => {
    // Don't rewrite the hash while Supabase still needs to read an auth
    // callback token from it (password recovery / email confirm), or we'd
    // wipe the token before the session is established.
    if (isAuthCallbackHash()) return;
    if (window.location.hash.replace('#', '') !== view) {
      window.history.replaceState(null, '', `#${view}`);
    }
  }, [view]);

  useEffect(() => {
    function onHash() {
      if (isAuthCallbackHash()) return;
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

  const [userPools, setUserPools] = useState([]);
  const [selectedPoolId, setSelectedPoolId] = useState(null);
  const [joinNotice, setJoinNotice] = useState(null);
  const [createPoolTrigger, setCreatePoolTrigger] = useState(0);

  function startSweepstake() {
    if (!user) {
      document.getElementById('auth')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    setView('leaderboard');
    setSelectedPoolId(null);
    setCreatePoolTrigger((c) => c + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function refreshUserPools() {
    if (!user) {
      setUserPools([]);
      return;
    }
    try {
      const list = await fetchUserPools(user.id);
      setUserPools(list);
    } catch (err) {
      console.error('fetchUserPools failed', err);
    }
  }

  useEffect(() => {
    refreshUserPools();
  }, [user?.id]);

  // ?join=slug — join a pool by invite link, then strip the query param.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('join');
    if (!slug) return;

    if (!user) {
      sessionStorage.setItem('pendingJoin', slug);
      return;
    }

    (async () => {
      try {
        const pool = await joinPoolBySlug(slug, user.id);
        await refreshUserPools();
        setSelectedPoolId(pool.id);
        setView('leaderboard');
        setJoinNotice(`✓ Joined pool: ${pool.name}`);
        setTimeout(() => setJoinNotice(null), 4000);
      } catch (err) {
        setJoinNotice(`⚠ Couldn't join pool: ${err.message}`);
        setTimeout(() => setJoinNotice(null), 5000);
      } finally {
        const url = new URL(window.location.href);
        url.searchParams.delete('join');
        window.history.replaceState(null, '', url.pathname + url.search + url.hash);
        sessionStorage.removeItem('pendingJoin');
      }
    })();
  }, [user?.id]);

  // After sign-in, process any pending join from sessionStorage
  useEffect(() => {
    if (!user) return;
    const slug = sessionStorage.getItem('pendingJoin');
    if (!slug) return;
    (async () => {
      try {
        const pool = await joinPoolBySlug(slug, user.id);
        await refreshUserPools();
        setSelectedPoolId(pool.id);
        setView('leaderboard');
        setJoinNotice(`✓ Joined pool: ${pool.name}`);
        setTimeout(() => setJoinNotice(null), 4000);
      } catch (err) {
        setJoinNotice(`⚠ Couldn't join pool: ${err.message}`);
        setTimeout(() => setJoinNotice(null), 5000);
      } finally {
        sessionStorage.removeItem('pendingJoin');
      }
    })();
  }, [user?.id]);

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

  if (recovery) {
    return (
      <Shell>
        <Nav user={user} profile={profile} view="settings" onNav={() => {}} />
        <ResetPasswordScreen onDone={clearRecovery} />
      </Shell>
    );
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

  // What hasn't the user picked yet? (for the hero CTA)
  const yourPickedIds = new Set(yourPicks.map((p) => p.match_id));
  const firstUnpicked = user
    ? matches.find((m) => !yourPickedIds.has(m.id) && new Date(m.scheduled_at) > new Date())
    : null;
  const unpickedCount = user
    ? matches.filter(
        (m) => !yourPickedIds.has(m.id) && new Date(m.scheduled_at) > new Date()
      ).length
    : matches.length;
  const firstUnpickedGroup = firstUnpicked
    ? entryById[firstUnpicked.home_entry_id]?.group_label
    : null;

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
      {joinNotice && <div className="join-notice">{joinNotice}</div>}

      {view === 'fixtures' && (
        <Hero
          tournament={tournament}
          signedIn={!!user}
          yourRank={yourRank}
          yourCorrect={yourCorrect}
          yourPicks={yourPicks.length}
          yourPoints={yourPoints}
          vsModel={vsModel}
          unpickedCount={unpickedCount}
          firstUnpickedGroup={firstUnpickedGroup}
          onNav={handleNav}
          onStartSweepstake={startSweepstake}
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
          <LeaderboardView
            predictions={predictions}
            currentUserId={user?.id}
            modelId={modelId}
            user={user}
            tournamentId={tournament.id}
            matches={matches}
            entries={entries}
            userPools={userPools}
            selectedPoolId={selectedPoolId}
            onSelectPool={setSelectedPoolId}
            onPoolsChange={refreshUserPools}
            createTrigger={createPoolTrigger}
          />
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

        {view === 'settings' && (
          <Settings
            user={user}
            profile={profile}
            setProfile={setProfile}
            userPools={userPools}
            onPoolsChange={refreshUserPools}
            onProfileSaved={refreshUserPredictions}
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
            <button
              type="button"
              onClick={() => onNav('settings')}
              className={`nav__avatar ${view === 'settings' ? 'nav__avatar--active' : ''}`}
              title="settings"
            >
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

function Hero({
  tournament, signedIn, yourRank, yourCorrect, yourPicks, yourPoints, vsModel,
  unpickedCount, firstUnpickedGroup, onNav, onStartSweepstake,
}) {
  const daysToKickoff = (() => {
    if (!tournament?.start_date) return null;
    const ms = new Date(tournament.start_date) - new Date();
    return Math.max(0, Math.ceil(ms / 86400000));
  })();

  function handleCta(e) {
    e.preventDefault();
    if (!signedIn) {
      document.getElementById('auth')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (unpickedCount === 0) {
      onNav?.('leaderboard');
      return;
    }
    const target = firstUnpickedGroup
      ? document.getElementById(`group-${firstUnpickedGroup}`)
      : document.querySelector('.groups-section');
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const ctaContent = !signedIn
    ? { label: 'Get started', shine: 'sign in →' }
    : unpickedCount === 0
    ? { label: 'All picks in', shine: 'view leaderboard →' }
    : { label: 'Make your picks', shine: `${unpickedCount} left ✿` };

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
        <span className="hero__row">
          <span className="hero__line">PICK</span>
          <span className="hero__chip hero__chip--yellow">the matches.</span>
        </span>
        <span className="hero__row">
          <span className="hero__line">BEAT</span>
          <span className="hero__chip hero__chip--purple">the model.</span>
        </span>
      </h1>

      <p className="hero__lede">
        A bot picks every match. You pick every match. Whoever's wronger buys
        the next round.
        <span className="hero__lede-flower"><Flower size={20} c1="#ff6b9d" c2="#ffd93d" /></span>
        Game on.
      </p>

      <div className="hero__cta-row">
        <button type="button" onClick={handleCta} className="big-btn">
          <span>{ctaContent.label}</span>
          <span className="big-btn__shine">{ctaContent.shine}</span>
        </button>
      </div>

      <div className="hero__cta-row hero__cta-row--secondary">
        <button type="button" onClick={onStartSweepstake} className="big-btn big-btn--ghost">
          <span>Set up a sweepstakes</span>
          <span className="big-btn__shine big-btn__shine--purple">friends / work ✿</span>
        </button>
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
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [info, setInfo] = useState(null);

  function switchMode(next) {
    setMode(next);
    setErr(null);
    setInfo(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setInfo(null);
    try {
      if (mode === 'signin') {
        const { error } = await signInWithPassword(email, password);
        if (error) throw error;
      } else if (mode === 'signup') {
        const { data, error } = await signUp(email, password);
        if (error) throw error;
        if (data.user && !data.session) {
          setInfo(`check your email (${email}) to confirm, then sign in.`);
        }
      } else {
        const { error } = await sendPasswordReset(email);
        if (error) throw error;
        setInfo(`if an account exists for ${email}, a reset link is on its way. check your inbox.`);
      }
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  const head =
    mode === 'signin' ? 'Sign in to play'
    : mode === 'signup' ? 'Create an account'
    : 'Reset your password';

  return (
    <section className="auth-block" id="auth">
      <div className="auth-card">
        <div className="auth-card__head">
          <Flower size={28} c1="#ff6b9d" c2="#ffd93d" />
          <span>{head}</span>
        </div>
        <form onSubmit={handleSubmit} className="auth-form">
          <input
            type="email" required value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
          {mode !== 'forgot' && (
            <input
              type="password" required minLength={6} value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password"
            />
          )}
          <button disabled={busy} className="auth-form__submit">
            {busy ? '…'
              : mode === 'signin' ? 'sign in →'
              : mode === 'signup' ? 'sign up →'
              : 'send reset link →'}
          </button>
        </form>

        {mode === 'signin' && (
          <button type="button" className="auth-card__forgot" onClick={() => switchMode('forgot')}>
            forgot your password?
          </button>
        )}

        <button
          type="button" className="auth-card__switch"
          onClick={() => switchMode(mode === 'signup' ? 'signin' : mode === 'forgot' ? 'signin' : 'signup')}
        >
          {mode === 'signin' ? "don't have an account? sign up"
            : mode === 'signup' ? 'have an account? sign in'
            : '← back to sign in'}
        </button>

        {mode !== 'forgot' && (
          <div className="auth-card__tip">
            <Star size={18} color="#ffd93d" />
            <span>
              already use <strong>bloomgarden</strong>? sign in with the same email + password.
            </span>
          </div>
        )}
        {err && <div className="status status--error">⚠ {err}</div>}
        {info && <div className="status status--ok">✓ {info}</div>}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   Reset password screen (shown when arriving via a recovery link)
   ───────────────────────────────────────────────────────────── */

function ResetPasswordScreen({ onDone }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [done, setDone] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr(null);
    if (password.length < 6) { setErr('password must be at least 6 characters.'); return; }
    if (password !== confirm) { setErr('passwords don\'t match.'); return; }
    setBusy(true);
    try {
      const { error } = await updatePassword(password);
      if (error) throw error;
      setDone(true);
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <section className="auth-block">
        <div className="auth-card">
          <div className="auth-card__head">
            <Flower size={28} c1="#6dba63" c2="#ffd93d" />
            <span>Password updated</span>
          </div>
          <p className="reset-done">You're all set and signed in. ✿</p>
          <button type="button" className="auth-form__submit" onClick={onDone}>
            go to bloomcup →
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="auth-block">
      <div className="auth-card">
        <div className="auth-card__head">
          <Flower size={28} c1="#ff6b9d" c2="#ffd93d" />
          <span>Choose a new password</span>
        </div>
        <form onSubmit={submit} className="auth-form">
          <input
            type="password" required minLength={6} value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="new password"
            autoFocus
          />
          <input
            type="password" required minLength={6} value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="confirm new password"
          />
          <button disabled={busy} className="auth-form__submit">
            {busy ? '…' : 'update password →'}
          </button>
        </form>
        {err && <div className="status status--error">⚠ {err}</div>}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   Leaderboard
   ───────────────────────────────────────────────────────────── */

function Leaderboard({ predictions, currentUserId, scopeName = null }) {
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
        <span>{scopeName ? scopeName : 'The Garden Standings'}</span>
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
   Leaderboard tab — wraps Leaderboard with pool selector + create
   ───────────────────────────────────────────────────────────── */

function LeaderboardView({
  predictions, currentUserId, modelId, user, tournamentId, matches, entries,
  userPools, selectedPoolId, onSelectPool, onPoolsChange, createTrigger,
}) {
  const selectedPool = userPools.find((p) => p.id === selectedPoolId) || null;

  let scoped = predictions;
  if (selectedPool) {
    const allowed = new Set([...selectedPool.members, modelId].filter(Boolean));
    scoped = predictions.filter((p) => allowed.has(p.user_id));
  }

  return (
    <div className="leaderboard-view">
      {user && (
        <PoolBar
          user={user}
          tournamentId={tournamentId}
          userPools={userPools}
          selectedPoolId={selectedPoolId}
          onSelectPool={onSelectPool}
          onPoolsChange={onPoolsChange}
          createTrigger={createTrigger}
        />
      )}
      {selectedPool?.type === 'sweepstake' ? (
        <SweepstakeBoard
          pool={selectedPool}
          matches={matches}
          entries={entries}
          currentUserId={currentUserId}
          predictions={predictions}
        />
      ) : (
        <Leaderboard
          predictions={scoped}
          currentUserId={currentUserId}
          scopeName={selectedPool ? selectedPool.name : null}
        />
      )}
      {selectedPool && (
        <InviteStrip
          pool={selectedPool}
          isOwner={selectedPool.owner_id === currentUserId}
          onDelete={async () => {
            if (!confirm(`Delete pool "${selectedPool.name}"? This removes it for everyone.`)) return;
            try {
              await deletePool(selectedPool.id);
              onSelectPool(null);
              await onPoolsChange();
            } catch (err) {
              alert(err.message);
            }
          }}
        />
      )}
    </div>
  );
}

function PoolBar({
  user, tournamentId, userPools, selectedPoolId, onSelectPool, onPoolsChange, createTrigger,
}) {
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (createTrigger > 0) setCreating(true);
  }, [createTrigger]);

  return (
    <div className="pool-bar">
      <div className="pool-bar__pills">
        <button
          type="button"
          className={`pool-pill ${selectedPoolId === null ? 'pool-pill--active' : ''}`}
          onClick={() => onSelectPool(null)}
        >
          🌍 Global
        </button>
        {userPools.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`pool-pill ${selectedPoolId === p.id ? 'pool-pill--active' : ''}`}
            onClick={() => onSelectPool(p.id)}
          >
            {p.type === 'sweepstake' ? '★' : '✿'} {p.name}
            <span className="pool-pill__count">{p.members.length}</span>
          </button>
        ))}
        <button
          type="button"
          className="pool-pill pool-pill--add"
          onClick={() => setCreating((v) => !v)}
        >
          + new pool
        </button>
      </div>

      {creating && (
        <CreatePoolForm
          user={user}
          tournamentId={tournamentId}
          onCancel={() => setCreating(false)}
          onCreated={async (pool) => {
            setCreating(false);
            await onPoolsChange();
            onSelectPool(pool.id);
          }}
        />
      )}
    </div>
  );
}

function CreatePoolForm({ user, tournamentId, onCreated, onCancel }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('pickem');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const pool = await createPool({
        tournamentId,
        ownerId: user.id,
        name,
        type,
      });
      onCreated(pool);
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="pool-create">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="pool name (e.g. Office Cup 2026)"
        maxLength={60}
        autoFocus
      />

      <div className="pool-create__type">
        <label className={`pool-type-pill ${type === 'pickem' ? 'pool-type-pill--active' : ''}`}>
          <input
            type="radio"
            name="pool-type"
            value="pickem"
            checked={type === 'pickem'}
            onChange={() => setType('pickem')}
          />
          <span className="pool-type-pill__label">
            <strong>Pick'em</strong>
            <small>predict every match</small>
          </span>
        </label>
        <label className={`pool-type-pill ${type === 'sweepstake' ? 'pool-type-pill--active' : ''}`}>
          <input
            type="radio"
            name="pool-type"
            value="sweepstake"
            checked={type === 'sweepstake'}
            onChange={() => setType('sweepstake')}
          />
          <span className="pool-type-pill__label">
            <strong>Sweepstake</strong>
            <small>draw a country, follow it</small>
          </span>
        </label>
      </div>

      <div className="pool-create__actions">
        <button
          type="submit"
          disabled={!name.trim() || busy}
          className="settings-btn settings-btn--primary"
        >
          {busy ? '…' : 'create'}
        </button>
        <button type="button" onClick={onCancel} className="link-btn">cancel</button>
      </div>
      {err && <span className="auth-error">⚠ {err}</span>}
    </form>
  );
}

function InviteStrip({ pool, isOwner, onDelete }) {
  const [copied, setCopied] = useState(false);
  const url = poolInviteUrl(pool.slug);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt('Copy this invite link:', url);
    }
  }

  return (
    <div className="invite-strip">
      <Star size={22} color="#ffd93d" />
      <div className="invite-strip__text">
        <strong>Invite friends to "{pool.name}"</strong>
        <code>{url}</code>
      </div>
      <div className="invite-strip__actions">
        <button type="button" onClick={copy} className="settings-btn settings-btn--primary">
          {copied ? '✓ copied' : 'copy link'}
        </button>
        {isOwner && (
          <button type="button" onClick={onDelete} className="link-btn link-btn--danger">
            delete pool
          </button>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Sweepstake leaderboard (one country per member, ranked by progress)
   ───────────────────────────────────────────────────────────── */

const STAGE_BONUS = {
  round_of_16: 5,
  quarter_final: 10,
  semi_final: 15,
  third_place: 5,
  final: 20,
};
const CHAMPION_BONUS = 25;
const STAGE_ORDER = ['group', 'round_of_16', 'quarter_final', 'semi_final', 'final', 'champion'];
const STAGE_LABEL = {
  group: 'group stage',
  round_of_16: 'round of 16',
  quarter_final: 'quarter-final',
  semi_final: 'semi-final',
  final: 'final',
  champion: 'champion',
};

function calcSweepstakeStanding(team, matches, entries) {
  const teamEntry = entries.find((e) => e.team?.id === team.id);
  if (!teamEntry) return { points: 0, played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, stage: 'group' };

  const ours = matches.filter(
    (m) => m.home_entry_id === teamEntry.id || m.away_entry_id === teamEntry.id,
  );
  const finished = ours.filter((m) => m.status === 'finished' && m.result);

  let points = 0, w = 0, d = 0, l = 0, gf = 0, ga = 0;
  let stage = 'group';
  for (const m of finished) {
    const isHome = m.home_entry_id === teamEntry.id;
    const our = isHome ? m.result.home_score : m.result.away_score;
    const their = isHome ? m.result.away_score : m.result.home_score;
    gf += our;
    ga += their;
    if (m.stage === 'group') {
      if (our > their) { w++; points += 3; }
      else if (our === their) { d++; points += 1; }
      else { l++; }
    } else {
      points += STAGE_BONUS[m.stage] || 0;
      if (our > their) {
        if (m.stage === 'final') {
          points += CHAMPION_BONUS;
          stage = 'champion';
        } else {
          const idx = STAGE_ORDER.indexOf(m.stage);
          stage = STAGE_ORDER[Math.min(idx + 1, STAGE_ORDER.length - 1)];
        }
      } else if (our < their) {
        // eliminated
      }
    }
  }
  // For unplayed knockouts where they're scheduled, they at least reached that round
  for (const m of ours.filter((m) => m.stage !== 'group' && m.status !== 'finished')) {
    const idx = STAGE_ORDER.indexOf(m.stage);
    if (idx > STAGE_ORDER.indexOf(stage)) stage = m.stage;
  }
  return { points, played: finished.length, w, d, l, gf, ga, stage };
}

function SweepstakeBoard({ pool, matches, entries, currentUserId, predictions }) {
  // Build a map: user_id -> profile (from any prediction or pool members later)
  const profileByUserId = {};
  for (const p of predictions) {
    if (p.profile && !profileByUserId[p.user_id]) profileByUserId[p.user_id] = p.profile;
  }

  const rows = (pool.assignments || []).map((a) => {
    const profile = profileByUserId[a.user_id] || { display_name: '(anon)', is_model: false };
    const standing = calcSweepstakeStanding(a.team, matches, entries);
    return { user_id: a.user_id, profile, team: a.team, ...standing };
  });

  rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const stageRankA = STAGE_ORDER.indexOf(a.stage);
    const stageRankB = STAGE_ORDER.indexOf(b.stage);
    if (stageRankB !== stageRankA) return stageRankB - stageRankA;
    return (b.gf - b.ga) - (a.gf - a.ga);
  });

  const youRow = rows.find((r) => r.user_id === currentUserId);
  const anyPoints = rows.some((r) => r.points > 0);

  return (
    <section className="sweep-board">
      <h2 className="section-h2">
        <Star size={32} color="#ffd93d" />
        <span>{pool.name}</span>
        <Flower size={32} c1="#9d6bff" c2="#ffd93d" />
      </h2>

      {youRow && (
        <div className="sweep-yours">
          <span className="sweep-yours__label">You drew</span>
          <span className="sweep-yours__team">{youRow.team?.name || 'TBD'}</span>
          <span className="sweep-yours__sub">
            {anyPoints ? `${youRow.points} pts · ${STAGE_LABEL[youRow.stage]}` : 'tournament starts June 11'}
          </span>
        </div>
      )}

      <div className="sweep-card">
        {rows.length === 0 ? (
          <p className="lb-empty">no draws yet — invite friends to claim teams.</p>
        ) : (
          rows.map((r, i) => {
            const isYou = r.user_id === currentUserId;
            const rankClass = i === 0 ? 'gold' : i === 1 ? 'pink' : i === 2 ? 'green' : 'plain';
            return (
              <div key={r.user_id} className={`sweep-row ${isYou ? 'sweep-row--you' : ''}`}>
                <div className={`lb-rank lb-rank--${rankClass}`}>{i + 1}</div>
                <div className="sweep-row__main">
                  <div className="sweep-row__player">
                    {r.profile.display_name}
                    {isYou && <span className="lb-name__you">YOU</span>}
                  </div>
                  <div className="sweep-row__team">
                    {r.team?.code && <span className="sweep-row__code">{r.team.code}</span>}
                    {r.team?.name || 'TBD'}
                  </div>
                </div>
                <div className="sweep-row__stats">
                  {anyPoints ? (
                    <>
                      <span className="sweep-row__line">
                        {r.w}W · {r.d}D · {r.l}L · GD {r.gf - r.ga > 0 ? '+' : ''}{r.gf - r.ga}
                      </span>
                      <span className="sweep-row__stage">{STAGE_LABEL[r.stage]}</span>
                    </>
                  ) : (
                    <span className="sweep-row__line sweep-row__line--mute">awaiting kickoff</span>
                  )}
                </div>
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
          scoring kicks off when matches do (June 11). · group win 3pts · draw 1pt
          · reach R16 +5 · QF +10 · SF +15 · final +20 · champion +25
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
   Settings tab
   ───────────────────────────────────────────────────────────── */

function Settings({ user, profile, setProfile, userPools, onPoolsChange, onProfileSaved }) {
  const heading = (
    <h2 className="section-h2">
      <Flower size={32} c1="#9d6bff" c2="#ffd93d" />
      <span>Your settings</span>
      <Flower size={32} c1="#ff6b9d" c2="#ffd93d" />
    </h2>
  );

  if (!user) {
    return (
      <section className="settings">
        {heading}
        <div className="my-picks__empty">
          <Star size={40} color="#ffd93d" />
          <p className="my-picks__empty-title">Sign in to manage your account.</p>
          <p className="my-picks__empty-sub">Use the sign-in card above.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="settings">
      {heading}
      <div className="settings-stack">
        <DisplayNameCard
          user={user}
          profile={profile}
          setProfile={setProfile}
          onSaved={onProfileSaved}
        />
        <PoolsCard user={user} userPools={userPools} onPoolsChange={onPoolsChange} />
        <AccountCard user={user} />
      </div>
    </section>
  );
}

function DisplayNameCard({ user, profile, setProfile, onSaved }) {
  const [name, setName] = useState(profile?.display_name || '');
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    setName(profile?.display_name || '');
  }, [profile?.display_name]);

  const dirty = name.trim().length > 0 && name.trim() !== profile?.display_name;

  async function save(e) {
    e.preventDefault();
    if (!dirty) return;
    setBusy(true);
    setErr(null);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ display_name: name.trim() })
        .eq('id', user.id)
        .select()
        .single();
      if (error) throw error;
      setProfile(data);
      await onSaved?.();
      setFlash(true);
      setTimeout(() => setFlash(false), 1500);
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="settings-card">
      <h3 className="settings-card__title">Display name</h3>
      <p className="settings-card__sub">how you'll appear on the leaderboard.</p>
      <form onSubmit={save} className="settings-form">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="your name"
          maxLength={40}
          className="settings-input"
        />
        <button
          type="submit"
          disabled={!dirty || busy}
          className={`settings-btn settings-btn--primary ${flash ? 'is-flash' : ''}`}
        >
          {flash ? '✓ saved' : busy ? '…' : 'save'}
        </button>
      </form>
      {err && <p className="settings-error">⚠ {err}</p>}
    </div>
  );
}

function PoolsCard({ user, userPools, onPoolsChange }) {
  const [busyId, setBusyId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  async function copy(slug, id) {
    const url = poolInviteUrl(slug);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      window.prompt('Copy this invite link:', url);
    }
  }

  async function handleLeave(pool) {
    if (!confirm(`Leave "${pool.name}"?`)) return;
    setBusyId(pool.id);
    try {
      await leavePool(pool.id, user.id);
      await onPoolsChange();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(pool) {
    if (!confirm(`Delete "${pool.name}"? This removes it for everyone.`)) return;
    setBusyId(pool.id);
    try {
      await deletePool(pool.id);
      await onPoolsChange();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="settings-card">
      <h3 className="settings-card__title">Your pools</h3>
      <p className="settings-card__sub">
        private leaderboards. share the invite link to bring friends in.
      </p>
      {userPools.length === 0 ? (
        <p className="pools-empty">
          you're not in any pools yet. create one from the leaderboard tab.
        </p>
      ) : (
        <ul className="pools-list">
          {userPools.map((pool) => {
            const isOwner = pool.owner_id === user.id;
            return (
              <li key={pool.id} className="pools-row">
                <div className="pools-row__main">
                  <strong>
                    {pool.name}
                    <span className={`pools-row__type pools-row__type--${pool.type}`}>
                      {pool.type === 'sweepstake' ? '✿ sweepstake' : 'pick\'em'}
                    </span>
                  </strong>
                  <span className="pools-row__meta">
                    {pool.members.length} {pool.members.length === 1 ? 'member' : 'members'}
                    {isOwner && ' · owner'}
                  </span>
                  {pool.type === 'sweepstake' && (() => {
                    const mine = pool.assignments?.find((a) => a.user_id === user.id);
                    return mine?.team ? (
                      <span className="pools-row__draw">
                        you drew: <strong>{mine.team.name}</strong>
                      </span>
                    ) : null;
                  })()}
                </div>
                <div className="pools-row__actions">
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => copy(pool.slug, pool.id)}
                  >
                    {copiedId === pool.id ? '✓ copied' : 'copy invite'}
                  </button>
                  {isOwner ? (
                    <button
                      type="button"
                      className="link-btn link-btn--danger"
                      disabled={busyId === pool.id}
                      onClick={() => handleDelete(pool)}
                    >
                      delete
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="link-btn link-btn--danger"
                      disabled={busyId === pool.id}
                      onClick={() => handleLeave(pool)}
                    >
                      leave
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function AccountCard({ user }) {
  return (
    <div className="settings-card">
      <h3 className="settings-card__title">Account</h3>
      <p className="settings-card__sub">
        signed in as <strong>{user.email}</strong>
      </p>
      <button type="button" onClick={signOut} className="settings-btn settings-btn--danger">
        sign out
      </button>
    </div>
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
          <div className="bot-strip__row">
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
          <div className="bot-strip__why">{explainBotPick(match, modelPred)}</div>
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

function explainBotPick(match, modelPred) {
  const out = modelPred?.predicted_outcome;
  if (!out) return '';

  const homeName = match.home?.team.name || 'home';
  const awayName = match.away?.team.name || 'away';
  const homeElo = match.home?.team.metadata?.elo ?? 1500;
  const awayElo = match.away?.team.metadata?.elo ?? 1500;
  const eloDiff = homeElo - awayElo;

  const probs = [
    { kind: 'home', label: homeName, p: out.p_home_win ?? 0 },
    { kind: 'draw', label: 'a draw', p: out.p_draw ?? 0 },
    { kind: 'away', label: awayName, p: out.p_away_win ?? 0 },
  ].sort((a, b) => b.p - a.p);

  const top = probs[0];
  const margin = top.p - probs[1].p;

  let vibe;
  if (margin < 0.06) vibe = 'a real coin flip';
  else if (margin < 0.15) vibe = `slight edge to ${top.label}`;
  else if (margin < 0.30) vibe = `${top.label} favoured`;
  else vibe = `${top.label} comfortable favourite`;

  const topPct = Math.round(top.p * 100);
  const outcome = top.kind === 'draw' ? `${topPct}% draw` : `${topPct}% ${top.label} win`;

  let extra = '';
  if (Math.abs(eloDiff) >= 200) {
    extra = ` · ${Math.abs(eloDiff)} Elo gap`;
  } else if (out.home_xg != null && out.away_xg != null) {
    extra = ` · should score ~${out.home_xg.toFixed(1)} vs ~${out.away_xg.toFixed(1)}`;
  }

  return `${vibe} · ${outcome}${extra}`;
}
