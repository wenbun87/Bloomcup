// Sample Bloomcup data — World Cup 2026 style
// Realistic enough to feel real; not actual draws

window.BLOOMCUP_DATA = (function() {
  const teams = {
    BRA: { name: 'Brazil', code: 'BRA', flag: '🇧🇷' },
    SRB: { name: 'Serbia', code: 'SRB', flag: '🇷🇸' },
    SUI: { name: 'Switzerland', code: 'SUI', flag: '🇨🇭' },
    CMR: { name: 'Cameroon', code: 'CMR', flag: '🇨🇲' },
    ARG: { name: 'Argentina', code: 'ARG', flag: '🇦🇷' },
    MEX: { name: 'Mexico', code: 'MEX', flag: '🇲🇽' },
    POL: { name: 'Poland', code: 'POL', flag: '🇵🇱' },
    KSA: { name: 'Saudi Arabia', code: 'KSA', flag: '🇸🇦' },
    FRA: { name: 'France', code: 'FRA', flag: '🇫🇷' },
    DEN: { name: 'Denmark', code: 'DEN', flag: '🇩🇰' },
    TUN: { name: 'Tunisia', code: 'TUN', flag: '🇹🇳' },
    AUS: { name: 'Australia', code: 'AUS', flag: '🇦🇺' },
    ENG: { name: 'England', code: 'ENG', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
    USA: { name: 'USA', code: 'USA', flag: '🇺🇸' },
    IRN: { name: 'Iran', code: 'IRN', flag: '🇮🇷' },
    WAL: { name: 'Wales', code: 'WAL', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿' },
  };

  // Group A — sample
  const groupA = {
    label: 'A',
    teams: ['BRA', 'SRB', 'SUI', 'CMR'],
    matches: [
      { id: 'a1', home: 'BRA', away: 'SRB', time: 'Thu Jun 11 · 14:00', status: 'upcoming',
        model: { score: '2-0', pHome: 0.62, pDraw: 0.22, pAway: 0.16 },
        userPick: null },
      { id: 'a2', home: 'SUI', away: 'CMR', time: 'Thu Jun 11 · 17:00', status: 'upcoming',
        model: { score: '1-1', pHome: 0.38, pDraw: 0.31, pAway: 0.31 },
        userPick: { score: '2-1' } },
      { id: 'a3', home: 'BRA', away: 'SUI', time: 'Mon Jun 15 · 14:00', status: 'upcoming',
        model: { score: '2-1', pHome: 0.55, pDraw: 0.24, pAway: 0.21 },
        userPick: null },
      { id: 'a4', home: 'CMR', away: 'SRB', time: 'Mon Jun 15 · 11:00', status: 'finished',
        result: { home: 3, away: 3 },
        model: { score: '1-2', pHome: 0.28, pDraw: 0.27, pAway: 0.45 },
        userPick: { score: '0-2' } },
    ],
  };

  const groupB = {
    label: 'B',
    teams: ['ARG', 'MEX', 'POL', 'KSA'],
    matches: [
      { id: 'b1', home: 'ARG', away: 'KSA', time: 'Tue Jun 12 · 11:00', status: 'finished',
        result: { home: 1, away: 2 },
        model: { score: '3-0', pHome: 0.71, pDraw: 0.18, pAway: 0.11 },
        userPick: { score: '2-0' } },
      { id: 'b2', home: 'MEX', away: 'POL', time: 'Tue Jun 12 · 14:00', status: 'upcoming',
        model: { score: '1-1', pHome: 0.34, pDraw: 0.33, pAway: 0.33 },
        userPick: { score: '2-1' } },
      { id: 'b3', home: 'POL', away: 'ARG', time: 'Sat Jun 16 · 17:00', status: 'upcoming',
        model: { score: '0-2', pHome: 0.18, pDraw: 0.24, pAway: 0.58 },
        userPick: null },
      { id: 'b4', home: 'KSA', away: 'MEX', time: 'Sat Jun 16 · 14:00', status: 'upcoming',
        model: { score: '1-2', pHome: 0.27, pDraw: 0.28, pAway: 0.45 },
        userPick: null },
    ],
  };

  const groupC = {
    label: 'C',
    teams: ['FRA', 'DEN', 'TUN', 'AUS'],
    matches: [
      { id: 'c1', home: 'FRA', away: 'AUS', time: 'Wed Jun 13 · 17:00', status: 'upcoming',
        model: { score: '3-1', pHome: 0.68, pDraw: 0.18, pAway: 0.14 },
        userPick: { score: '2-0' } },
      { id: 'c2', home: 'DEN', away: 'TUN', time: 'Wed Jun 13 · 11:00', status: 'upcoming',
        model: { score: '1-0', pHome: 0.51, pDraw: 0.30, pAway: 0.19 },
        userPick: null },
    ],
  };

  const groupD = {
    label: 'D',
    teams: ['ENG', 'USA', 'IRN', 'WAL'],
    matches: [
      { id: 'd1', home: 'ENG', away: 'IRN', time: 'Fri Jun 14 · 11:00', status: 'upcoming',
        model: { score: '2-0', pHome: 0.64, pDraw: 0.22, pAway: 0.14 },
        userPick: { score: '3-1' } },
      { id: 'd2', home: 'USA', away: 'WAL', time: 'Fri Jun 14 · 17:00', status: 'upcoming',
        model: { score: '1-1', pHome: 0.39, pDraw: 0.32, pAway: 0.29 },
        userPick: null },
    ],
  };

  const groups = [groupA, groupB, groupC, groupD];

  const leaderboard = [
    { name: 'petalpusher', picks: 18, points: 47, correct: 11, you: false },
    { name: 'meadowlark', picks: 18, points: 44, correct: 10, you: false },
    { name: 'you', picks: 17, points: 41, correct: 9, you: true },
    { name: 'bloom.model', picks: 64, points: 38, correct: 9, model: true },
    { name: 'sunflora', picks: 18, points: 36, correct: 8, you: false },
    { name: 'goldfinch', picks: 16, points: 33, correct: 8, you: false },
    { name: 'buttercup', picks: 18, points: 29, correct: 7, you: false },
    { name: 'fernandez', picks: 14, points: 24, correct: 6, you: false },
  ];

  return { teams, groups, leaderboard, tournament: {
    name: '2026 Men\u2019s Football World Cup',
    dates: 'June 11 – July 19, 2026',
    host: 'USA · Canada · Mexico',
    daysToKickoff: 45,
  } };
})();
