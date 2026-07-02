# Motivation by Death (MBD) — project context / handoff

> This file is auto-loaded by Claude Code. It's the single source of truth for a
> new session picking this project up. Read it fully before editing.
> Last updated: 2026-07-01.

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

Single repo, **client-only + a thin local AI proxy**:

- **Frontend:** Vite + React 18, **Zustand** store persisted to `localStorage`,
  **Framer Motion** for animation. No router — a `view` string in the store
  switches screens.
- **Backend (local only):** `server/index.mjs` — a small **Express** proxy that
  holds the Anthropic key and runs the Claude tool-use loop, streaming NDJSON.
- **No accounts / no database yet** — everything is per-device in localStorage.

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

## 8. Planned direction (DECIDED, NOT YET BUILT)

The user wants to split into **two repos** for real user accounts, deployed on
Vercel. Decisions locked:

- `memento-mori-web` — keep this Vite SPA (Vercel static). `memento-mori-api` —
  new **Hono (TypeScript)** backend on Vercel Functions.
- **Same-origin trick:** web `vercel.json` rewrites `/api/*` to the API
  deployment so **Auth.js** session cookies are first-party (no CORS/cookie
  pain) while keeping two repos.
- **Auth + DB:** **Vercel Postgres + Auth.js** (`@auth/pg-adapter`; OAuth or
  magic-link TBD). Tables mirror the Zustand shape, per-user.
- **AI strategy:** provider-agnostic adapter layer (`anthropic`, `google`,
  `openai-compatible` covering OpenAI/Groq/OpenRouter/etc). **Free default model:
  Groq · Llama 3.3 70B** (owner-funded, rate-limited). **BYO key** unlocks deeper
  chat + higher caps; BYO keys **encrypted at rest** (AES-256-GCM, server key).
- **The Death system prompt lives in backend code** and is injected on EVERY
  request regardless of model, so any user-added model acts as Death and users
  can't override the persona.

**Phases:** 1) scaffold both repos + move the AI proxy into the Hono backend
(Death persona + Groq + adapters), runs locally; 2) Auth.js + Postgres profiles
(+ guest mode); 3) model tiering + BYO key mgmt in Settings; 4) harden + deploy.

**User must provision (agent can't):** 2 GitHub repos, 2 Vercel projects, Vercel
Postgres, a Groq API key, Auth.js `AUTH_SECRET` + an OAuth app, and an
`ENCRYPTION_KEY`. Prepare `.env.example` + a deploy runbook for them.

Phase 1 was greenlit *pending a final confirmation* on repo locations — confirm
before scaffolding.

---

## 9. Open TODOs / next steps

- Commit the uncommitted hero "you are going to die, why not make it worth it?"
  line if not already committed.
- Start **Phase 1** (backend split) when the user confirms repo paths.
- Optional: surface annual/5-year goals to the Death coach; brighten/tune the
  graveyard background if requested; use `hero-wolf2.png` as an alt pose.
- Consider real persistence (the whole app is localStorage-only today).

---

## 10. How to work with the user

They iterate fast and visually, care a lot about the gothic aesthetic and the
Death persona feeling serious (never frivolous). Make smart default decisions,
show a working preview, and verify changes (build + DOM/preview) before claiming
done. They deploy on Vercel and think in terms of a real product for future users.
