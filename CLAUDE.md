# Motivation by Death (MBD) — project context / handoff

> This file is auto-loaded by Claude Code. It's the single source of truth for a
> new session picking this project up. Read it fully before editing.
> Last updated: 2026-07-03 (accounts + serverless coach on Vercel; the
> single-repo approach superseded the old two-repo plan).

---

## 1. What this is

A **mortality-driven life-planning web app**. Memento mori: it confronts the user
with their finite time and helps them spend it deliberately. A gothic **wolf grim
reaper ("Death")** is the mascot and an in-app AI coach.

**Design philosophy (important — shapes decisions):** death awareness does NOT
reliably motivate; abstract "you will die" countdowns can freeze/depress some
people. What works is *concrete reflection + agency* ("you can shape the time
that remains"). So: pair finitude with agency, offer a tone control, and balance
dread with life-affirming framing. Keep the theme dark/gothic but legible.

Owner: Rajeev(a). Deploys on **Vercel**.

---

## 2. Where it lives & how to run

- **Canonical project root:** `/Users/rajeev/claud/memento mori/` (note the space).
  Older copies are dead: `/Users/rajeev/work/untitled folder` was DELETED;
  `/Users/rajeev/work/MotivationByDeath` is a stale 2-file prototype — ignore both.
- **Run:** `npm run dev` → web on **:5174** + local Claude proxy on **:8787**
  (Vite proxies `/api/*` → 8787). `npm run dev:web` / `npm run dev:api` run them
  separately. `npm run build` (Vite) must pass before considering a change done.
- **The "Death" coach needs a key:** copy `.env.example` → `.env`, set
  `ANTHROPIC_API_KEY`. Without it the coach shows an "add a key" state; the rest
  of the app works fully.
- **Preview (Claude Code tool):** the preview tool reads launch configs from the
  PRIMARY working dir's `.claude/launch.json` (currently
  `/Users/rajeev/work/CelesDashboard/.claude/launch.json`), which has an
  `mbd-dev` config pointing `--prefix` at this project on port 5174.
- **Git:** a repo lives at the project root (branch `master`). Latest commit
  `bfba955`. There may be uncommitted work (e.g. the hero call-to-action line).
  Commit only when the user asks; end messages with the Co-Authored-By trailer.

---

## 3. Current architecture (AS BUILT)

Single repo: **local-first SPA + a framework-agnostic server core that runs
both locally (Express) and on Vercel (serverless functions in `api/`)**.

- **Frontend:** Vite + React 18, **Zustand** store persisted to `localStorage`,
  **Framer Motion** for animation. No router — a `view` string in the store
  switches screens.
- **Server core (shared by Express + Vercel):**
  - `server/coach.mjs` — Death coach: Anthropic primary → automatic Groq
    fallback (OpenAI-compat translation layer), NDJSON streaming, salvage of
    Llama's text-format tool calls, pasted-key sanitization (first token only).
  - `server/auth.mjs` — accounts: scrypt passwords, HMAC-signed HttpOnly
    session cookie (`mbd_session`, 30d), Google OAuth code flow (activates when
    GOOGLE_CLIENT_ID/SECRET set), per-user `/api/state` + `/api/convo` sync.
  - `server/store.mjs` — storage: Postgres when POSTGRES_URL set (prod), JSON
    files under `.data/` locally, cleanly "unavailable" on Vercel without a DB.
  - `server/index.mjs` — just the local Express wiring (port 8787).
  - `api/**/*.mjs` — Vercel functions re-exporting the same handlers.
- **Accounts are optional:** guests stay 100% device-local (as before). Signing
  in adopts the server copy (server wins if it has a profile, else the device
  seeds the account), then changes push debounced to `/api/state`. The Death
  dock conversation syncs to `/api/convo`, so Death resumes where the user
  left off across devices/reloads.

### File map
```
index.html                      # fonts (Grenze Gotisch + Inter), favicon removed
vite.config.js                  # port 5174, proxy /api -> :8787
server/index.mjs                # Express Claude proxy: /api/coach/health, /api/coach/chat (NDJSON), TOOLS[], buildSystemPrompt()
public/                         # reaper.png, hero-wolf.png, bg-graveyard.png (default wolf art), ASSETS.md
images/                         # original wolf source PNGs (flat white bg) — reaper/hero-wolf/hero-wolf2/bg-graveyard
src/
  main.jsx                      # NO React.StrictMode (breaks Framer AnimatePresence)
  App.jsx                       # scene-bg + clouds + fog layers; onboarding vs Shell
  store.js                      # THE Zustand store (see §4). financeTotals() helper. persist name 'mbd.store.v1' version 2
  lib/time.js                   # computeLife(dob, lifeExpectancy) -> weeks/months/years/countdown; remainingBreakdown(); fmt()
  lib/storage.js                # useNow() ticking hook (+ legacy loadProfile helpers)
  lib/tone.js                   # toneCopy/toneViews/toneStart — gentle|balanced|unflinching copy per view
  components/
    Onboarding.jsx              # 3-step wizard (name -> dob -> life expectancy) + ethos line
    Shell.jsx                   # sidebar nav (Timeline/Goals/Money/Family/Legacy/Reflect/Settings) + DeathDock
    Reaper.jsx                  # wolf avatar: uses store.images.reaper -> /reaper.png -> inline SVG fallback
    DeathDock.jsx               # persistent right-side AI chat dock + execTool() (client-side tool exec)
    LifeWeeks.jsx               # life grid with Months | Years toggle (Weeks removed; default Months)
    MonthCalendar.jsx           # "months" mode: calendar w/ crosses, milestones/anniversaries/goals, clickable future months -> MonthModal
    MonthModal.jsx              # add event / goal on a month; "milestones not meetings" note
    YearGrid.jsx                # "years" mode: one box/year; annual + 5-year goal markers; clickable -> YearModal
    YearModal.jsx               # add annual (this year) / 5-year (this year+4) goal
    views/DashboardView.jsx     # hero (wolf figure + greeting + punch line + CTAs) + countdown + "where you stand" + LifeWeeks + quote
    views/GoalsView.jsx         # kanban Backlog/Active/Completed, inline edit; EXCLUDES horizon goals
    views/FinanceView.jsx       # assets/liabilities ledgers (inline edit), net worth, retirement target, donut
    views/FamilyView.jsx        # members (inline edit) + milestones
    views/LegacyView.jsx        # letters/ethical will/etc vault
    views/ReflectView.jsx       # periodic review ritual (saved reviews)
    views/SettingsView.jsx      # profile edit, tone control, JSON backup export/import, image uploader (Appearance)
  styles.css                    # one global stylesheet; CSS variables in :root
```

---

## 4. Data model (Zustand store, `src/store.js`)

Persisted under localStorage key **`mbd.store.v1`**, persist **version 2**.
Migration v1→v2 clears `images` (old uploads were flat white-bg PNGs; defaults in
/public now win). If you add/rename persisted fields, bump the version + migrate.

State: `profile {name,dob,lifeExpectancy}`, `view`, `dockOpen`, `tone`
('gentle'|'balanced'|'unflinching'), `images {reaper,bg,hero}` (data-URL overrides),
`goals[]`, `finance {assets[],liabilities[],retirementTarget}`, `family[]` (each with
`milestones[]`), `legacy[]`, `events[]`, `anniversaryAsked`, `reviews[]`.

**Goal shape:** `{id, category, title, description, status(BACKLOG|ACTIVE|COMPLETED),
priority(1-3), targetDate, horizon(null|'annual'|'fiveyear'), year, createdAt}`.
- `horizon: null` = ordinary kanban goal.
- `horizon: 'annual'|'fiveyear'` = **year-scoped goal shown ONLY in the Years
  life-grid view.** These are deliberately filtered OUT of the Goals kanban,
  Month calendar markers, and dashboard goal stats. Keep that isolation if you
  touch those files.

Actions include: add/update/remove for goals, finance items, family members,
milestones, legacy; setTone, setImage/clearImage, addEvent, addReview,
importData (tolerant backup restore), resetAll, completeOnboarding.

---

## 5. The "Death" AI coach

- **UI:** `DeathDock.jsx` — a persistent dock on the right (toggle via the
  floating 💀 FAB / the "—" button; `dockOpen` in the store). Streams replies.
- **Tool use:** the coach can mutate the app by chatting. `server/index.mjs`
  runs `client.messages.stream` with `tools` and emits NDJSON
  (`{type:'text'}` deltas + a final `{type:'final', content, stop_reason}`).
  Tools execute **client-side** in `DeathDock.execTool` against the Zustand store
  (add/move/remove goals, assets/liabilities, retirement target,
  family/milestones, legacy, profile, navigate); the browser appends
  `tool_result` blocks and re-POSTs until `stop_reason !== 'tool_use'`.
- **Model:** `MBD_COACH_MODEL` (default `claude-opus-4-8`), adaptive thinking.
- **Persona:** built in `server/index.mjs > buildSystemPrompt(context)` from the
  user's live data. Death is first-person, short (2–5 sentences), deadly serious
  (no jokes/emoji/flattery), cites their real numbers, refuses to indulge trivial
  topics and redirects to life goals, reminds them they're speaking with Death,
  frames finitude as agency, never breaks character.

**Claude API rules (do not violate):** default model `claude-opus-4-8`; use
`thinking:{type:'adaptive'}` (NOT `budget_tokens`); no `temperature`/`top_p` on
Opus 4.7/4.8; stream for large outputs. When touching Claude code, consult the
`claude-api` skill rather than guessing SDK shapes.

---

## 6. Theming & art

- **Palette/legibility:** CSS variables in `:root` (`styles.css`). A WCAG pass
  set readable grays: `--ash #9498a4`, `--ash-dim #858894` (text) vs
  `--ash-faint #44464f` (decorative fills only). `--focus` spectral ring. Keep
  cards lifted (visible border+shadow) and don't regress this.
- **Font:** `--serif` = **Grenze Gotisch** (gothic) with Cinzel/Georgia fallback;
  `--sans` = Inter. Loaded in `index.html`.
- **Buttons:** squared (2px radius), refined ember primary; inputs/seg toggles
  sharpened to match.
- **Background:** `App.jsx` renders `.scene-bg` (`/bg-graveyard.png`, dimmed
  via `.void-bg` overlay) + `.clouds` drift + `.fog`. There is **no CSS moon**
  (removed — the graveyard photo has its own moon).
- **Wolf art pipeline (how the default wolf got made):** originals in `images/`
  were flat PNGs with a near-white background. They were background-removed via a
  Pillow border flood-fill (keep pixels; flood transparent where neutral-light,
  `min>=224 & spread<=16`) and written as transparent cut-outs to `public/`.
  If re-cutting art, reuse that flood-fill approach. Users can also override art
  per-device via Settings → Appearance (downscaled data-URLs in `store.images`).

---

## 7. Gotchas & conventions

- **No React.StrictMode** — it breaks Framer Motion's AnimatePresence; the app
  uses keyed enter-animations instead of exit animations.
- **Life grid re-renders:** `LifeWeeks`, `MonthCalendar`, `YearGrid` are memoized
  and read the store directly to avoid re-rendering on the per-second countdown
  tick. Keep them decoupled from `useNow`.
- **Preview screenshots are flaky** in this environment: `preview_screenshot`
  often returns a stale/black frame right after a scroll or on the dense weeks
  grid. Verify via `preview_eval` (DOM/computed styles) as the source of truth;
  restart the preview server to clear a stuck renderer.
- **`node_modules`, `.env`, `dist`** are gitignored. `images/` + `public/*.png`
  ARE committed (they're the default art).
- Match existing style: one global `styles.css`, CSS vars, kebab class names,
  functional components, framer-motion for motion.

---

## 8. Direction (what happened to the old two-repo plan)

The old plan (two repos, Hono/TS backend, Auth.js + @auth/pg-adapter) was
**superseded in practice on 2026-07-02/03**: the coach moved to Vercel
serverless functions inside THIS repo, and accounts were built the same way
(no auth framework — see §3). The goals of that plan are mostly met with far
less machinery: server-held Death prompt on every request regardless of model,
Groq as free fallback, Postgres per-user persistence, first-party cookies
(same origin by construction). Do NOT resurrect the two-repo split unless the
user asks.

Still-open ideas from that plan: model tiering + BYO-key management in Settings
(encrypted at rest), provider adapter beyond Anthropic/Groq.

**User must provision (agent can't):** Vercel Postgres (Storage → Neon,
injects POSTGRES_URL), `AUTH_SECRET` env var on Vercel, and a Google OAuth
client (GOOGLE_CLIENT_ID/SECRET) if Google sign-in is wanted. Runbook lives in
README → "Deploying on Vercel".

---

## 9. Open TODOs / next steps

- **User provisions prod accounts** (see §8): Vercel Postgres + AUTH_SECRET,
  optional Google OAuth client. Code is deployed and waits on env vars.
- **Groq free tier is 100k tokens/day** — the system prompt is ~2.5k/turn, so
  heavy use exhausts it (hit on 2026-07-03). Real fix: Anthropic credits, or a
  smaller Groq prompt / cheaper primary.
- **Anthropic account has no credits** (calls 400 with "credit balance too
  low") — the coach currently runs on Groq fallback only. User should top up.
- The "self-improving Death" design (per-user memory extraction + cross-user
  playbook distillation) was discussed and architected in-session on
  2026-07-02 — Layer 1 (per-user memory + `remember` tool + reflection pass)
  is the agreed next build step.
- Both API keys were pasted into chat/Vercel UI carelessly — remind the user
  to rotate them eventually.
- Optional: surface annual/5-year goals to the Death coach; brighten/tune the
  graveyard background if requested; use `hero-wolf2.png` as an alt pose.

---

## 10. How to work with the user

They iterate fast and visually, care a lot about the gothic aesthetic and the
Death persona feeling serious (never frivolous). Make smart default decisions,
show a working preview, and verify changes (build + DOM/preview) before claiming
done. They deploy on Vercel and think in terms of a real product for future users.
