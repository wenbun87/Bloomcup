# Handoff: Bloomcup — Maximalist Garden Revamp

## Overview

This is a full visual revamp of **Bloomcup**, a multi-sport prediction game (Phase 1 = 2026 FIFA Men's World Cup) where players pick match outcomes and compete against an in-house Poisson + Elo model. The current production site (`bloomcup.pages.dev`) leans pastel and friendly; this revamp doubles down on that personality with a bolder, "maximalist garden" aesthetic — chunky outlines, hard offset shadows, sticker-style data, and scattered floral marks.

This is a **drop-in replacement** for the existing `src/App.jsx` and `src/index.css` in the Bloomcup repo. The Supabase data contract, auth flow, and component architecture are preserved exactly — only the visual layer has changed.

## About the Design Files

The files in `reference/` are **design references created in HTML/JSX** — prototypes that show intended look and behavior, not production code to ship as-is. Specifically:

- `Bloomcup Revamp.html` is the multi-direction design canvas (5 directions explored). It's a static prototype that runs against fake sample data.
- `d5-maximalist-garden.jsx` is the chosen direction (Direction 5) as it appeared on the canvas.
- `App.jsx` and `index.css` (in `reference/`) are the **port** of Direction 5 into the Bloomcup repo's component skeleton — Supabase queries, auth flow, and data shape are wired up. **These are the files to actually use** — copy them into the real repo at `src/App.jsx` and `src/index.css`.

The task for the implementing developer is simply to drop the ported files into the repo, add the font imports, and verify everything renders cleanly against the live Supabase backend.

## Fidelity

**High-fidelity (hifi).** All colors are final hex values, all type sizes are settled, all spacing is precise. The reference port already uses the repo's existing libraries (React 18, Vite, Supabase JS) and follows its established patterns — no framework migration needed.

## Files

```
reference/
├── App.jsx                       ← THE PORT — replaces src/App.jsx
├── index.css                     ← THE PORT — replaces src/index.css
├── d5-maximalist-garden.jsx      ← original Direction 5 mock (canvas version)
├── Bloomcup Revamp.html          ← full canvas with all 5 explored directions
├── data.js                       ← sample data used by the canvas mock
└── design-canvas.jsx             ← canvas wrapper (not needed for production)
```

## How to Apply

From the Bloomcup repo root:

```bash
cp /path/to/handoff/reference/App.jsx   src/App.jsx
cp /path/to/handoff/reference/index.css src/index.css
```

Then add the Google Fonts import to `<head>` in `index.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800;900&family=Caveat:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
```

Run `npm run dev` to verify, then `npm run deploy`.

## Design Tokens

All tokens are defined as CSS custom properties at the top of `index.css`:

### Colors

| Token | Hex | Use |
|---|---|---|
| `--bg` | `#fef9f0` | page background (warm cream) |
| `--ink` | `#1a1a1a` | text, all strokes, display type |
| `--ink-soft` | `#444444` | secondary text |
| `--ink-mute` | `#888888` | tertiary text, timestamps |
| `--pink` | `#ff6b9d` | accent 1, "you" highlights, group A |
| `--yellow` | `#ffd93d` | accent 2, the bot, scores, group B |
| `--green` | `#6dba63` | accent 3, finished/correct, leaves, group C |
| `--purple` | `#9d6bff` | accent 4, the model, group D |
| `--pink-soft` | `#ffe4ec` | group A card background |
| `--yellow-soft` | `#fff7d4` | group B card background, "you" row |
| `--green-soft` | `#e0f3dc` | group C card background |
| `--purple-soft` | `#e9def7` | group D card background, bot row |

Group cards cycle through `[pink, yellow, green, purple]` modulo `groups.length` — see `accentCycle` in `App.jsx`. To pin specific accents to specific group letters, replace the array lookup with a map.

### Typography

| Family | Weights | Use |
|---|---|---|
| DM Sans | 400, 500, 700, 800, 900 | everything by default |
| Caveat | 400–700, italic | the two hero "chip" words ("the matches.", "the model.") |
| JetBrains Mono | 400, 500, 600 | team codes, accuracy fractions, timestamps |

Display sizes use `clamp()` for fluid scaling. Hero headline lines: `clamp(64px, 11vw, 124px)`. Hero chips: `clamp(36px, 6vw, 64px)`. Section headings: `clamp(28px, 4vw, 40px)`.

### Spacing & Shape

| Token | Value | Use |
|---|---|---|
| `--radius-sm` | 10px | inputs, small chips |
| `--radius` | 16px | buttons, hero chips |
| `--radius-lg` | 22px | cards |
| `--radius-pill` | 999px | nav, pills, links |
| `--stroke` | 2.5px solid #1a1a1a | inputs, team pills, match rows |
| `--stroke-fat` | 3px solid #1a1a1a | cards, big buttons, hero chips |
| `--dashed` | 2px dashed #1a1a1a | internal dividers |
| `--shadow` | `4px 4px 0 #1a1a1a` | small elements |
| `--shadow-lg` | `6px 6px 0 #1a1a1a` | nav, group cards, auth card |
| `--shadow-xl` | `8px 8px 0 #1a1a1a` | leaderboard card |

The hard offset (no blur, fully opaque) shadow is the signature of this direction. Don't switch to soft drop-shadows — they break the system.

## Screens / Views

There's one screen — a single-page app with a vertical scroll. Sections from top to bottom:

### 1. Nav (top, sticky-feeling pill bar)

- Black pill, ~64px tall, full width of `.app` container, with a 6px pink offset shadow
- Brand mark (40px Flower SVG) + "Bloomcup" wordmark on the left
- Three nav links (`fixtures` / `leaderboard` / `my picks`) — active link gets a yellow pill background; inactive are 60% white text
- Right side: when signed in, display name + circular pink avatar with first initial (clicking signs out). When signed out, a pink "sign in →" pill that anchors to `#auth`.

### 2. Hero

- Centered, ~400–500px tall
- Yellow-on-black "sticker" capsule at top: tournament name + days-to-kickoff, bracketed by ★ marks
- Two-line display headline:
  - Line 1: **PICK** (huge sans, black) + **the matches.** (Caveat italic, in a yellow chip rotated -3°, with 3px black border + 4px shadow)
  - Line 2: **BEAT** (huge sans, black) + **the model.** (Caveat italic, in a purple chip with white text, rotated +2°)
- Lede paragraph (max 600px) with a small flower mid-sentence, ending "Game on."
- Primary CTA: black pill button "Make today's picks" with a pink "3 open ✿" inline tag and a yellow 6px shadow. A 50px green leaf rotates -15° next to it.
- **Stat bubbles row** (only when signed in): 4 chunky pill stats — `#rank`, `vs the bot`, `correct`, `points` — each rotated ±2° in pink/yellow/green/purple. Numbers are 36px black weight 900.

### 3. Auth block (only when signed out)

- Centered card, max 480px wide, 3px black border, 6px black shadow, white background
- Header: small flower + "Sign in to play" / "Create an account"
- Form: email + password inputs (2.5px black borders, 10px radius), then a black pill submit button with hover translate + shadow grow
- Below: text-button to switch sign-in/sign-up modes
- Bottom tip box: yellow-soft background with a star icon, telling existing bloomgarden users to use the same credentials

### 4. Leaderboard ("The Garden Standings")

- Section heading: ★ + "The Garden Standings" + ✿, centered
- White card, 3px border, 8px shadow, max 720px wide
- Each row: rank badge (40×40, 12px radius, 2.5px border) + name + accuracy fraction (mono) + points (24px black)
- Top 3 rank badges: gold yellow / pink-on-white / green-on-white. Rest are plain white.
- Current user's row: yellow-soft background tint + "YOU" pink pill chip after the name
- Model row: purple-soft tint + 🤖 emoji prefix
- Footer note in italic mute: "points start tallying once matches finish (kickoff June 11). · N players · model has filed M picks"

### 5. Groups grid ("The Garden of Fixtures")

- Section heading: leaf + "The Garden of Fixtures" + leaf
- Auto-fill grid, `minmax(380px, 1fr)`, 22px gap
- Each group card: tinted pastel background (pink/yellow/green/purple-soft), 3px black border, 6px shadow, 22px radius
- Card header: a 56×56 chunky letter tile (group letter, white-on-accent, 3px border, 3px shadow) + "Group X" title + "N teams · M matches" sub + a small flower
- Team pills row: white pills with 2.5px borders showing team code (always) and full name (≥640px width). Up to 4 wrap.
- Match rows (white card, 2.5px border, 14px radius):
  - Top line: tiny uppercase timestamp + status chip (`OPEN` pink / `✓ PICKED` purple / `FINAL ●` green)
  - Core: home name + code (right-aligned) — VS or yellow score chip — code + away name (left-aligned)
  - Bot strip (dashed top border): "🤖 bot says" + black-on-yellow score chip + 6px probability bar (pink home / dark draw / purple away, weights from `p_home_win`/`p_draw`/`p_away_win`)
  - Pick form (dashed top border, only if signed in + match not finished): "your pick:" label + two yellow-soft number inputs + dash + a colored pick button (matches the group accent). Button shows `✿ save` / `↻ update` / `✓ saved` (green flash on success) / `…` (busy).

### 6. Footer

- Full-bleed black bar, breaks out of the `.app` padding via negative margins
- Centered yellow text repeating "BLOOMCUP" interleaved with flower / star / leaf marks
- 16px vertical padding, 3px top border in ink

## Interactions & Behavior

- **Big-btn / pick buttons**: hover translates `(-2px, -2px)` and grows shadow; active translates `(+2px, +2px)` and shrinks shadow to 1–2px. 120ms ease.
- **Avatar / inputs**: avatar scales 1.08 on hover. Inputs grow shadow on focus.
- **Pick save**: optimistic — sets `flash` true for 1.5s, button goes green with "✓ saved", then refetches the user's predictions for fresh data. On error, alerts and reverts.
- **Pick form dirty detection**: button disabled until both scores entered AND values differ from existing prediction.
- **Stat bubbles**: only render when `user` is truthy. Vs-bot can be negative (shown as `-N`) or positive (`+N`).
- **Group accent cycling**: `accentCycle[idx % accentCycle.length]` where `idx` is sorted group label index. So Group A → pink, B → yellow, C → green, D → purple, E → pink again.
- **Decorative SVGs**: `Flower`, `Leaf`, `Star` are inline components. Background `BgDecor` lays 5 of them at fixed offsets behind everything (z-index 0, pointer-events none).

## State Management

Same as existing repo — no new state introduced. Top-level `App` holds:
- `user` from `useAuth()`
- `profile` (loaded via `ensureProfile(user)`)
- `data = { tournament, entries, matches, predictions, modelId }` — single bundled fetch on mount
- `loading`, `error`

`refreshUserPredictions()` is called by `UserPickInput` after a save and merges fresh predictions into `data.predictions` (kept stable for non-current-user rows).

## Data Contract

Unchanged from the existing repo. Queries:

- `tournaments` where `slug = 'wc-2026'` → single row with `id`, `name`, `start_date`
- `profiles` where `is_model = true` limit 1 → `modelId`
- `tournament_entries` where `tournament_id = tournament.id` → `[{ id, group_label, team: { id, name, code, metadata } }]`
- `matches` where `tournament_id = tournament.id` ordered by `scheduled_at` → standard match rows with `home_entry_id`, `away_entry_id`, `status`, `result`, `scheduled_at`
- `predictions` (all rows, joined to profile) → `[{ user_id, match_id, predicted_outcome: { home_score, away_score, p_home_win, p_draw, p_away_win }, confidence, points_awarded, profile: { id, display_name, is_model } }]`

Pick upsert: `predictions.upsert({ user_id, match_id, predicted_outcome: { home_score, away_score } }, { onConflict: 'user_id,match_id' })`.

## Assets

No external image assets. All decoration is **inline SVG** defined in `App.jsx`:

- `<Flower size c1 c2>` — 5-petal daisy with center, default 60×60
- `<Leaf size color>` — single curved leaf with center vein, default 40×40
- `<Star size color>` — 5-point star, default 30×30

All three use 2px black strokes. If you add more screens later, lift them into `src/components/marks.jsx` and import.

## Responsive Behavior

Single breakpoint at 720px:
- Container padding 32 → 16
- Nav links hidden (brand + auth/avatar only)
- Hero line text 56px, chips 32px
- Stat bubbles tighten (10px gap, 100px min-width, 28px numbers)
- Leaderboard rows tighten
- Groups grid → 1 column
- Group card padding 20 → 16
- Footer side margins 32 → 16

The chunky shadows look best at desktop sizes. The mobile breakpoint keeps them but proportionally smaller via the rank/group-letter resizes.

## Caveats / Next Steps

- **Footer marquee** is currently a static flex strip. To make it actually scroll, wrap `.footer__strip` in an `overflow:hidden` container and animate `transform: translateX` via `@keyframes`.
- **Decorative SVGs** are fine inline for one screen; lift to a shared module if more screens are added.
- **`scrollIntoView`** is intentionally not used anywhere — sign-in CTA uses a `#auth` href anchor instead.
- **Error states** for the data fetch render a single status line. If you want richer error UI per-section, split the loading/error handling into the leaderboard and groups sections individually.
- **The four other directions** (Botanical Editorial, Risograph Stadium, Dark Bloom, Soft Modern) are still in `Bloomcup Revamp.html` if the team wants to revisit. They were not ported.
