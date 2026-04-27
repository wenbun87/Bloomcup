// Direction 5: Maximalist Garden
// Full-bleed flora, fat type, joyful chaos. Sticker energy.

const D5 = (() => {
  const data = window.BLOOMCUP_DATA;
  const { teams, groups, leaderboard, tournament } = data;

  const Flower = ({ size = 60, c1 = '#ff6b9d', c2 = '#ffd93d' }) => (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      {[0, 72, 144, 216, 288].map(deg => (
        <ellipse key={deg} cx="40" cy="20" rx="11" ry="18"
          fill={c1} stroke="#1a1a1a" strokeWidth="2"
          transform={`rotate(${deg} 40 40)`} />
      ))}
      <circle cx="40" cy="40" r="9" fill={c2} stroke="#1a1a1a" strokeWidth="2" />
      <circle cx="40" cy="40" r="3" fill="#1a1a1a" />
    </svg>
  );

  const Leaf = ({ size = 40, color = '#6dba63' }) => (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <path d="M5 35 Q 5 5 35 5 Q 30 25 5 35 Z"
        fill={color} stroke="#1a1a1a" strokeWidth="2" />
      <path d="M8 32 Q 18 22 30 10" stroke="#1a1a1a" strokeWidth="1.5" fill="none" />
    </svg>
  );

  const Star = ({ size = 30, color = '#ffd93d' }) => (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <path d="M20 4 L24 16 L36 16 L26 24 L30 36 L20 28 L10 36 L14 24 L4 16 L16 16 Z"
        fill={color} stroke="#1a1a1a" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );

  return function D5Component() {
    return (
      <div style={d5Styles.root}>
        {/* scattered decoration */}
        <div style={{position: 'absolute', top: 30, right: 60, transform: 'rotate(15deg)'}}><Flower size={80} c1="#ff6b9d" c2="#ffd93d" /></div>
        <div style={{position: 'absolute', top: 200, left: 30, transform: 'rotate(-25deg)'}}><Leaf size={70} color="#6dba63" /></div>
        <div style={{position: 'absolute', top: 480, right: 40, transform: 'rotate(35deg)'}}><Flower size={60} c1="#9d6bff" c2="#ff6b9d" /></div>
        <div style={{position: 'absolute', bottom: 200, left: 80}}><Star size={48} color="#ffd93d" /></div>

        {/* nav */}
        <header style={d5Styles.nav}>
          <div style={d5Styles.brand}>
            <Flower size={42} c1="#ff6b9d" c2="#ffd93d" />
            <span style={d5Styles.brandText}>Bloomcup</span>
          </div>
          <nav style={d5Styles.navLinks}>
            <a style={{...d5Styles.navLink, ...d5Styles.navLinkActive}}>fixtures</a>
            <a style={d5Styles.navLink}>leaderboard</a>
            <a style={d5Styles.navLink}>my picks</a>
          </nav>
          <button style={d5Styles.signInBtn}>sign in →</button>
        </header>

        {/* hero */}
        <section style={d5Styles.hero}>
          <div style={d5Styles.heroSticker}>
            <Star size={20} color="#ffd93d" />
            <span>2026 World Cup · 45 days to kickoff</span>
            <Star size={20} color="#ffd93d" />
          </div>

          <h1 style={d5Styles.heroTitle}>
            <span style={d5Styles.heroLine1}>PICK</span>
            <span style={{...d5Styles.heroChip, background: '#ffd93d', transform: 'rotate(-3deg)'}}>the matches.</span>
            <span style={d5Styles.heroLine2}>BEAT</span>
            <span style={{...d5Styles.heroChip, background: '#9d6bff', color: '#fff', transform: 'rotate(2deg)'}}>the model.</span>
          </h1>

          <p style={d5Styles.heroLede}>
            A bot picks every match. You pick every match. Whoever's wronger
            buys the next round. <Flower size={20} c1="#ff6b9d" c2="#ffd93d" /> Game on.
          </p>

          <div style={d5Styles.heroCtaRow}>
            <button style={d5Styles.bigBtn}>
              <span>Make today's picks</span>
              <span style={d5Styles.bigBtnShine}>3 open ✿</span>
            </button>
            <div style={d5Styles.heroBtnDecor}>
              <Leaf size={50} color="#6dba63" />
            </div>
          </div>

          <div style={d5Styles.heroStats}>
            <div style={{...d5Styles.statBubble, background: '#ff6b9d', transform: 'rotate(-2deg)'}}>
              <div style={d5Styles.statNum}>#3</div>
              <div style={d5Styles.statLab}>your rank</div>
            </div>
            <div style={{...d5Styles.statBubble, background: '#ffd93d', transform: 'rotate(1deg)'}}>
              <div style={d5Styles.statNum}>+3</div>
              <div style={d5Styles.statLab}>vs the bot</div>
            </div>
            <div style={{...d5Styles.statBubble, background: '#6dba63', color: '#fff', transform: 'rotate(-1deg)'}}>
              <div style={d5Styles.statNum}>9/17</div>
              <div style={d5Styles.statLab}>correct</div>
            </div>
            <div style={{...d5Styles.statBubble, background: '#9d6bff', color: '#fff', transform: 'rotate(2deg)'}}>
              <div style={d5Styles.statNum}>41</div>
              <div style={d5Styles.statLab}>points</div>
            </div>
          </div>
        </section>

        <div style={d5Styles.main}>
          {/* leaderboard */}
          <section style={d5Styles.lbSection}>
            <h2 style={d5Styles.h2}>
              <Star size={32} color="#ffd93d" />
              <span>The Garden Standings</span>
              <Flower size={32} c1="#ff6b9d" c2="#ffd93d" />
            </h2>

            <div style={d5Styles.lbCard}>
              {leaderboard.map((r, i) => (
                <div key={r.name} style={{
                  ...d5Styles.lbRow,
                  ...(r.you ? d5Styles.lbRowYou : {}),
                  ...(r.model ? d5Styles.lbRowBot : {}),
                }}>
                  <div style={{
                    ...d5Styles.lbRank,
                    background: i === 0 ? '#ffd93d' : i === 1 ? '#ff6b9d' : i === 2 ? '#6dba63' : '#fff',
                    color: i === 1 || i === 2 ? '#fff' : '#1a1a1a',
                  }}>{i + 1}</div>
                  <div style={d5Styles.lbName}>
                    {r.model && '🤖 '}
                    {r.name}
                    {r.you && <span style={d5Styles.lbYouTag}>YOU</span>}
                  </div>
                  <div style={d5Styles.lbAccCol}>
                    <span style={d5Styles.lbAccNum}>{r.correct}/{r.picks}</span>
                  </div>
                  <div style={d5Styles.lbPts}>{r.points}<span style={d5Styles.lbPtsSm}>pts</span></div>
                </div>
              ))}
            </div>
          </section>

          {/* groups */}
          <section style={d5Styles.groupsSection}>
            <h2 style={d5Styles.h2}>
              <Leaf size={32} color="#6dba63" />
              <span>The Garden of Fixtures</span>
              <Leaf size={32} color="#6dba63" />
            </h2>

            <div style={d5Styles.groupGrid}>
              {groups.map((g, idx) => {
                const colors = [
                  { bg: '#ffe4ec', accent: '#ff6b9d' },
                  { bg: '#fff7d4', accent: '#ffd93d' },
                  { bg: '#e0f3dc', accent: '#6dba63' },
                  { bg: '#e9def7', accent: '#9d6bff' },
                ];
                const c = colors[idx % 4];
                return (
                  <article key={g.label} style={{...d5Styles.groupCard, background: c.bg}}>
                    <header style={d5Styles.groupHead}>
                      <div style={{...d5Styles.groupLetterTag, background: c.accent, color: idx === 1 ? '#1a1a1a' : '#fff'}}>
                        {g.label}
                      </div>
                      <div style={d5Styles.groupHeadText}>
                        <div style={d5Styles.groupTitle}>Group {g.label}</div>
                        <div style={d5Styles.groupSub}>{g.matches.length} matches · pick all to lock</div>
                      </div>
                      <Flower size={32} c1={c.accent} c2="#1a1a1a" />
                    </header>

                    <div style={d5Styles.teamPills}>
                      {g.teams.map(t => (
                        <span key={t} style={d5Styles.teamPill}>
                          <span style={d5Styles.teamFlag}>{teams[t].flag}</span>
                          <span>{teams[t].name}</span>
                        </span>
                      ))}
                    </div>

                    <div style={d5Styles.fixList}>
                      {g.matches.map(m => <D5Match key={m.id} match={m} accent={c.accent} />)}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>

        {/* footer */}
        <footer style={d5Styles.footer}>
          <div style={d5Styles.footerStrip}>
            <span>BLOOMCUP</span><Flower size={20} c1="#ff6b9d" c2="#ffd93d" />
            <span>BLOOMCUP</span><Star size={18} color="#ffd93d" />
            <span>BLOOMCUP</span><Leaf size={20} color="#6dba63" />
            <span>BLOOMCUP</span><Flower size={20} c1="#9d6bff" c2="#ffd93d" />
            <span>BLOOMCUP</span><Star size={18} color="#ffd93d" />
            <span>BLOOMCUP</span>
          </div>
        </footer>
      </div>
    );
  };
})();

function D5Match({ match, accent }) {
  const data = window.BLOOMCUP_DATA;
  const home = data.teams[match.home];
  const away = data.teams[match.away];
  const finished = match.status === 'finished';
  const m = match.model;
  const userPicked = !!match.userPick;

  return (
    <div style={d5Styles.fix}>
      <div style={d5Styles.fixTopRow}>
        <span style={d5Styles.fixTime}>{match.time}</span>
        {finished ? <span style={d5Styles.fixDone}>FINAL ●</span> :
         userPicked ? <span style={d5Styles.fixPicked}>✓ PICKED</span> :
         <span style={d5Styles.fixOpen}>OPEN</span>}
      </div>

      <div style={d5Styles.fixCore}>
        <div style={{...d5Styles.fixSide, justifyContent: 'flex-end'}}>
          <span style={d5Styles.fixTeam}>{home.name}</span>
          <span style={d5Styles.fixFlag}>{home.flag}</span>
        </div>
        <div style={d5Styles.fixCenter}>
          {finished ? (
            <span style={d5Styles.fixScore}>{match.result.home}–{match.result.away}</span>
          ) : (
            <span style={d5Styles.fixVs}>VS</span>
          )}
        </div>
        <div style={d5Styles.fixSide}>
          <span style={d5Styles.fixFlag}>{away.flag}</span>
          <span style={d5Styles.fixTeam}>{away.name}</span>
        </div>
      </div>

      {!finished && (
        <div style={d5Styles.botStrip}>
          <span style={d5Styles.botLabel}>🤖 bot says</span>
          <span style={d5Styles.botScore}>{m.score}</span>
          <div style={d5Styles.bar}>
            <div style={{flex: m.pHome, background: '#ff6b9d'}} />
            <div style={{flex: m.pDraw, background: '#1a1a1a', opacity: 0.3}} />
            <div style={{flex: m.pAway, background: '#9d6bff'}} />
          </div>
        </div>
      )}

      <div style={d5Styles.pick}>
        <span style={d5Styles.pickLabel}>your pick:</span>
        <input style={d5Styles.pickInput} defaultValue={match.userPick?.score?.split('-')[0] ?? ''} />
        <span style={d5Styles.pickDash}>–</span>
        <input style={d5Styles.pickInput} defaultValue={match.userPick?.score?.split('-')[1] ?? ''} />
        <button style={{...d5Styles.pickBtn, background: accent, color: '#1a1a1a'}}>
          {userPicked ? '↻ update' : '✿ save'}
        </button>
      </div>
    </div>
  );
}

const d5Styles = {
  root: {
    fontFamily: '"DM Sans", "Inter", system-ui, sans-serif',
    background: '#fef9f0',
    color: '#1a1a1a',
    padding: '32px 40px 64px',
    position: 'relative',
    overflow: 'hidden',
  },

  nav: {
    position: 'relative', zIndex: 2,
    display: 'flex', alignItems: 'center', gap: 28,
    padding: '14px 24px',
    background: '#1a1a1a',
    color: '#fef9f0',
    borderRadius: 999,
    marginBottom: 36,
    boxShadow: '6px 6px 0 #ff6b9d',
  },
  brand: { display: 'flex', alignItems: 'center', gap: 10 },
  brandText: {
    fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em',
  },
  navLinks: { display: 'flex', gap: 6, marginLeft: 16 },
  navLink: {
    fontSize: 14, padding: '6px 14px', borderRadius: 999,
    color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
    fontWeight: 600, textDecoration: 'none',
  },
  navLinkActive: { color: '#1a1a1a', background: '#ffd93d' },
  signInBtn: {
    marginLeft: 'auto',
    background: '#ff6b9d', color: '#fff',
    border: 'none', padding: '8px 18px', borderRadius: 999,
    fontWeight: 700, fontSize: 13, cursor: 'pointer',
    fontFamily: 'inherit',
  },

  hero: {
    position: 'relative', zIndex: 1,
    padding: '40px 0 60px',
    textAlign: 'center',
  },
  heroSticker: {
    display: 'inline-flex', alignItems: 'center', gap: 10,
    padding: '8px 20px',
    background: '#1a1a1a', color: '#ffd93d',
    borderRadius: 999,
    fontSize: 13, fontWeight: 700, letterSpacing: '0.04em',
    marginBottom: 28,
  },
  heroTitle: {
    fontSize: 0, // collapse whitespace
    margin: '0 0 28px',
    lineHeight: 1,
  },
  heroLine1: {
    display: 'inline-block',
    fontSize: 124, fontWeight: 900, letterSpacing: '-0.04em',
    lineHeight: 0.9, color: '#1a1a1a',
    marginRight: 18,
    fontFamily: '"DM Sans", sans-serif',
  },
  heroLine2: {
    display: 'inline-block',
    fontSize: 124, fontWeight: 900, letterSpacing: '-0.04em',
    lineHeight: 0.9, color: '#1a1a1a',
    marginRight: 18, marginTop: 8,
    fontFamily: '"DM Sans", sans-serif',
  },
  heroChip: {
    display: 'inline-block',
    fontSize: 64, fontWeight: 700,
    fontFamily: '"Caveat", "Comic Sans MS", cursive',
    fontStyle: 'italic',
    padding: '4px 24px',
    border: '3px solid #1a1a1a',
    borderRadius: 16,
    boxShadow: '4px 4px 0 #1a1a1a',
    color: '#1a1a1a',
    lineHeight: 1.1,
    marginRight: 12,
    verticalAlign: 'middle',
  },
  heroLede: {
    fontSize: 18, color: '#444',
    margin: '0 auto 32px', maxWidth: 600,
    lineHeight: 1.5,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
    flexWrap: 'wrap',
  },
  heroCtaRow: {
    display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20,
    marginBottom: 40,
  },
  bigBtn: {
    background: '#1a1a1a', color: '#fef9f0',
    border: 'none',
    padding: '18px 36px',
    borderRadius: 16,
    fontFamily: 'inherit',
    fontSize: 18, fontWeight: 800, letterSpacing: '-0.01em',
    cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 12,
    boxShadow: '6px 6px 0 #ffd93d',
  },
  bigBtnShine: {
    background: '#ff6b9d', color: '#fff',
    fontSize: 12, padding: '4px 10px', borderRadius: 999,
    fontWeight: 700,
  },
  heroBtnDecor: { transform: 'rotate(-15deg)' },

  heroStats: {
    display: 'flex', gap: 18, justifyContent: 'center', flexWrap: 'wrap',
  },
  statBubble: {
    padding: '14px 22px',
    border: '3px solid #1a1a1a',
    borderRadius: 18,
    minWidth: 130,
    boxShadow: '4px 4px 0 #1a1a1a',
    color: '#1a1a1a',
  },
  statNum: {
    fontSize: 36, fontWeight: 900, lineHeight: 1,
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: '-0.02em',
  },
  statLab: {
    fontSize: 12, fontWeight: 700, letterSpacing: '0.04em',
    textTransform: 'uppercase', marginTop: 4,
  },

  main: { position: 'relative', zIndex: 1, marginTop: 30 },

  h2: {
    fontSize: 40, fontWeight: 900, letterSpacing: '-0.02em',
    margin: '0 0 24px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
    textAlign: 'center',
  },

  lbSection: { marginBottom: 56 },
  lbCard: {
    background: '#fff',
    border: '3px solid #1a1a1a',
    borderRadius: 24,
    padding: '14px',
    boxShadow: '8px 8px 0 #1a1a1a',
    maxWidth: 720, margin: '0 auto',
  },
  lbRow: {
    display: 'grid',
    gridTemplateColumns: '52px 1fr auto auto',
    gap: 16, alignItems: 'center',
    padding: '10px 14px',
    borderRadius: 14,
    marginBottom: 4,
  },
  lbRowYou: { background: '#fff7d4' },
  lbRowBot: { background: '#f4f0fa' },
  lbRank: {
    width: 40, height: 40, borderRadius: 12,
    border: '2.5px solid #1a1a1a',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 18, fontWeight: 900,
    fontVariantNumeric: 'tabular-nums',
  },
  lbName: {
    fontSize: 16, fontWeight: 700,
    display: 'flex', alignItems: 'center', gap: 8,
  },
  lbYouTag: {
    background: '#ff6b9d', color: '#fff',
    padding: '2px 8px', borderRadius: 999,
    fontSize: 10, letterSpacing: '0.08em', fontWeight: 800,
  },
  lbAccCol: {},
  lbAccNum: {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 13, color: '#666',
    fontWeight: 600,
  },
  lbPts: {
    fontSize: 24, fontWeight: 900,
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: '-0.02em',
    color: '#1a1a1a',
  },
  lbPtsSm: {
    fontSize: 11, fontWeight: 700, marginLeft: 4, color: '#888',
  },

  groupsSection: {},
  groupGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 22,
  },
  groupCard: {
    border: '3px solid #1a1a1a',
    borderRadius: 22,
    padding: '20px 22px',
    boxShadow: '6px 6px 0 #1a1a1a',
  },
  groupHead: {
    display: 'flex', alignItems: 'center', gap: 14,
    paddingBottom: 14, marginBottom: 14,
    borderBottom: '2.5px dashed #1a1a1a',
  },
  groupLetterTag: {
    width: 56, height: 56, borderRadius: 16,
    border: '3px solid #1a1a1a',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 32, fontWeight: 900,
    boxShadow: '3px 3px 0 #1a1a1a',
  },
  groupHeadText: { flex: 1 },
  groupTitle: {
    fontSize: 22, fontWeight: 800, letterSpacing: '-0.01em',
  },
  groupSub: {
    fontSize: 12, fontWeight: 600, color: '#444',
    marginTop: 2,
  },

  teamPills: {
    display: 'flex', flexWrap: 'wrap', gap: 6,
    marginBottom: 14,
  },
  teamPill: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '4px 12px',
    background: '#fff',
    border: '2px solid #1a1a1a',
    borderRadius: 999,
    fontSize: 12, fontWeight: 700,
  },
  teamFlag: { fontSize: 14, lineHeight: 1 },

  fixList: { display: 'flex', flexDirection: 'column', gap: 10 },

  fix: {
    background: '#fff',
    border: '2.5px solid #1a1a1a',
    borderRadius: 14,
    padding: '12px 14px',
  },
  fixTopRow: {
    display: 'flex', justifyContent: 'space-between',
    fontSize: 11, fontWeight: 800, letterSpacing: '0.08em',
    textTransform: 'uppercase', color: '#666',
    marginBottom: 8,
  },
  fixDone: { color: '#6dba63' },
  fixPicked: { color: '#9d6bff' },
  fixOpen: { color: '#ff6b9d' },
  fixCore: {
    display: 'grid', gridTemplateColumns: '1fr auto 1fr',
    alignItems: 'center', gap: 12,
  },
  fixSide: { display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 },
  fixTeam: {
    fontSize: 14, fontWeight: 700,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  fixFlag: { fontSize: 18 },
  fixCenter: {},
  fixVs: {
    fontSize: 12, fontWeight: 900, color: '#999', letterSpacing: '0.1em',
  },
  fixScore: {
    fontSize: 18, fontWeight: 900,
    background: '#ffd93d',
    padding: '2px 10px', borderRadius: 8,
    border: '2px solid #1a1a1a',
  },

  botStrip: {
    display: 'grid', gridTemplateColumns: 'auto auto 1fr',
    alignItems: 'center', gap: 8,
    marginTop: 10, paddingTop: 8,
    borderTop: '2px dashed #1a1a1a',
  },
  botLabel: {
    fontSize: 11, fontWeight: 800,
  },
  botScore: {
    fontSize: 12, fontWeight: 900,
    background: '#1a1a1a', color: '#ffd93d',
    padding: '2px 8px', borderRadius: 6,
    fontVariantNumeric: 'tabular-nums',
  },
  bar: {
    display: 'flex', height: 6,
    borderRadius: 3, overflow: 'hidden',
    border: '1.5px solid #1a1a1a',
  },

  pick: {
    display: 'flex', alignItems: 'center', gap: 6,
    marginTop: 10, paddingTop: 8,
    borderTop: '2px dashed #1a1a1a',
  },
  pickLabel: { fontSize: 11, fontWeight: 800 },
  pickInput: {
    width: 38, height: 30,
    background: '#fff7d4',
    border: '2px solid #1a1a1a',
    borderRadius: 8,
    fontSize: 14, fontWeight: 900, textAlign: 'center',
    outline: 'none',
    fontFamily: 'inherit',
  },
  pickDash: { fontWeight: 900 },
  pickBtn: {
    marginLeft: 'auto',
    border: '2px solid #1a1a1a',
    borderRadius: 999,
    padding: '5px 14px',
    fontFamily: 'inherit',
    fontSize: 12, fontWeight: 800,
    cursor: 'pointer',
    boxShadow: '2px 2px 0 #1a1a1a',
  },

  footer: {
    marginTop: 60,
    background: '#1a1a1a', color: '#ffd93d',
    borderRadius: 999,
    padding: '14px 0',
    overflow: 'hidden',
  },
  footerStrip: {
    display: 'flex', alignItems: 'center', gap: 24,
    fontSize: 18, fontWeight: 900, letterSpacing: '0.06em',
    justifyContent: 'center',
  },
};

window.D5 = D5;
