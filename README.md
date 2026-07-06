# Motivation by Death ☠

A mortality-driven **life-planning platform**. *Memento mori* — turn awareness
of finite time into focused action. You enter your name and birth date; the
reaper shows you exactly how much sand is left, then helps you spend it well.

## Modules

- **Timeline** — onboarding (name → DOB → life-expectancy wager) and a live
  mortality dashboard: ticking countdown, "life in weeks" grid, life-progress
  bar, and cross-module summary (active goals, net worth, next family
  milestone) with one-tap deep links.
- **Goals** — a Kanban Goal Engine (Backlog → Active → Completed) with the
  seven life categories (Self, Family, Health, Career, Experiences, Finance,
  Legacy), priority, and target dates.
- **Money** — assets/liabilities ledger, live net worth, retirement/freedom
  target with a runway bar, and an asset-allocation donut.
- **Family** — loved ones and the milestones you want to be there for.
- **Legacy** — a vault for letters, an ethical will, memories, and hand-off
  instructions (stored only on this device).
- **Reflect** — a guided review ritual with mortality-grounded questions, saved
  over time.
- **Death** — a **Claude-powered life coach** docked permanently on the right of
  every screen (toggle with the floating 💀, or the — button to hide). It reads
  your real timeline, goals, finances, and family, streams its replies live, and
  can **update your plan through conversation** via tool use: "add a goal to run
  a marathon next year", "log my brokerage at $250k", "set my freedom target to
  $1.5M", "add my daughter Mara and her college milestone in 2032" — it makes the
  change and you watch the dashboard update. Tools run locally against your store;
  nothing is auto-sent anywhere.

- **Accounts (required)** — the app is account-only: a visitor signs in
  (username/email + password, or Google) before anything else. Your plan **and
  Death's memory of your conversations** are stored to your account and follow
  you across every device you sign in on.

## Stack

- **Vite + React 18** + **Framer Motion** (all animation).
- **Zustand** for state, mirrored to your account (Postgres) and cached in
  `localStorage` between syncs.
- **Accounts** — no auth framework: scrypt password hashes, HMAC-signed
  HttpOnly session cookies, and a plain OAuth 2 code flow for Google
  (`server/auth.mjs`). Storage is Postgres in production (`POSTGRES_URL`) or
  JSON files under `.data/` in local dev (`server/store.mjs`).
- **Coach core** (`server/coach.mjs`) that holds the API keys and streams from
  Claude/Groq. The browser never sees the keys. Locally it's served by a thin
  **Express** wrapper (`server/index.mjs`); on Vercel the same handlers deploy
  as serverless functions (`api/coach/*.mjs`).
- **@anthropic-ai/sdk** → `claude-opus-4-8` with adaptive thinking, streamed.

## Local development

```bash
npm install

# Optional but required for the "Death" coach:
cp .env.example .env          # then paste your key into .env
#   ANTHROPIC_API_KEY=sk-ant-...

npm run dev                    # runs web (5174) + Claude proxy (8787) together
```

Open http://localhost:5174.

- `npm run dev:web` — Vite only (the dashboard and all modules work fully
  without a key; only the Death coach needs one).
- `npm run dev:api` — the Claude proxy only.
- `npm run build` / `npm run preview` — production build.

### The Death coach (persistent dock + tool use)

The coach is a calm, wise reaper-mentor (not morbid) whose system prompt is
built from your living data — remaining weeks, goals, net worth, family — so its
advice is grounded in *your* finitude, not generic. It lives in a dock on the
right, always available while you work in any section.

It can **change the app as you talk**. The Express proxy runs the Claude
tool-use loop and emits tool calls as NDJSON; the browser executes them against
the local Zustand store and sends results back, so Death can add/move/remove
goals, log assets & liabilities, set a retirement target, add family members and
milestones, write Legacy entries, edit your profile, and navigate sections —
all without leaving the chat.

**Never-fail provider chain.** The coach tries providers in order and rolls to
the next on any failure (rate limit, credits, outage), all speaking the same
Death persona injected server-side:

```
Anthropic (claude-opus-4-8)  →  Groq (llama-3.3-70b)  →  OpenRouter (any open model)
```

Set any subset — with only a Groq key it runs on Groq alone; add
`OPENROUTER_API_KEY` (https://openrouter.ai/keys) for a third, near-free tier
that's ideal for a public demo. The dock's status line shows whichever model
answered. **If every provider is down, Death still replies in character** — the
user never sees a stack trace.

Override the models or port via `.env`:

```
MBD_COACH_MODEL=claude-sonnet-4-6            # cheaper/faster than opus-4-8
MBD_GROQ_MODEL=llama-3.3-70b-versatile       # the Groq fallback model
MBD_OPENROUTER_MODEL=meta-llama/llama-3.1-8b-instruct   # ultra-cheap backup
MBD_API_PORT=8787
```

## Deploying on Vercel

The repo deploys as a Vite static app **plus** serverless functions
(`api/**/*.mjs` — coach, auth, and sync; see `vercel.json`).

**The app is account-only** — a visitor sees the sign-in screen first and
cannot use anything until they have an account, so **a database is required**
(without one the deployed app shows a "not ready" notice, by design).

1. **Database (required).** In the Vercel dashboard: **Storage → Create
   Database → Postgres** (Neon), then **Connect** it to this project. That
   injects `POSTGRES_URL` automatically — no value to paste. The tables
   (`mbd_users`, `mbd_state`, `mbd_convo`, `mbd_rate`) **auto-create on first
   use**; there is no migration step.
2. **`AUTH_SECRET` (required).** Add it under **Settings → Environment
   Variables**. Generate one with
   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
   It signs session cookies — keep it secret; rotating it logs everyone out.
3. **Coach keys.** Set `ANTHROPIC_API_KEY` and/or `GROQ_API_KEY` (and optional
   `OPENROUTER_API_KEY`) the same way. Redeploy — env vars only apply to new
   deployments.
4. **Google sign-in (optional):** at
   [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)
   create an **OAuth client ID → Web application**, add the redirect URI
   `https://YOUR-APP.vercel.app/api/auth/google/callback`, then set
   `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` env vars and redeploy. The
   "Continue with Google" button appears automatically once configured.

## Opening the demo to the public

The coach costs money/quota per message, so before sharing a link widely:

- **Rate limits are on by default.** Guests are capped per IP, signed-in users
  per account, over a rolling 24h — tune with `MBD_RATE_GUEST_PER_DAY` (default
  12) and `MBD_RATE_USER_PER_DAY` (default 120). Over the cap, Death replies "I
  must rest" in character. The counter is shared across serverless instances
  when Postgres is configured; otherwise it's per-instance (fine for local).
- **Lead with the free tiers.** Point the primary at Groq or an OpenRouter free
  model and keep Anthropic as an optional upgrade — a few dollars of OpenRouter
  credit funds tens of thousands of turns on 8B-class models.
- **Encourage sign-in.** A quick account (or Google) both raises the user's cap
  and deters bots/scrapers hammering the anonymous IP bucket.
- **Optional: Cloudflare AI Gateway.** For an extra layer of caching, analytics,
  and automatic retries with zero code change, point a provider's base URL at a
  [Cloudflare AI Gateway](https://developers.cloudflare.com/ai-gateway/) endpoint
  (it proxies the same OpenAI-compatible API). Set it as the provider URL and
  keep your key — the app is unaffected.
- **Keys never reach the browser.** All provider calls run server-side in
  `api/coach/*`; the frontend only ever talks to your own `/api`.

## Security

Accounts are built without an auth framework, on standard primitives:

- **Passwords** — hashed with `scrypt` (per-user random salt); the plaintext is
  never stored (verified against a live Postgres — the column holds only
  `scrypt:<salt>:<hash>`).
- **Sessions** — stateless **HMAC-signed** tokens in an **HttpOnly, SameSite=Lax**
  cookie (`Secure` over HTTPS). The signature includes a version derived from
  the password hash, so **changing the password invalidates every old session**.
- **Google OAuth** — the standard code flow, with a **per-flow nonce cookie
  bound to the `state`** (defeats login-CSRF) and a **verified-email requirement**
  before linking to an existing account.
- **Storage** — all SQL is **parameterized** (no injection); per-user rows keyed
  by id; state/convo endpoints require a valid session; JSONB values are
  serialized explicitly; the DB connection uses **TLS**.
- **Rate limiting** — both auth and the coach are limited (per-IP and per-account),
  with a fixed-window counter that's **atomic across serverless instances** in
  Postgres and **fails open** so a DB hiccup can't lock the app.
- **Secrets** — all API keys live server-side in `api/*`; **nothing secret ever
  reaches the browser**. Pasted keys are sanitized to a single token.

Operational must-dos: set a strong random `AUTH_SECRET`, keep it (and the
provider keys) only in Vercel env vars, and serve over HTTPS (Vercel does by
default).

## Reset

**↺ Reset** in the sidebar clears this device and signs you out. Your account
keeps its saved plan on the server — sign back in to restore it.

## Privacy

With an account, your plan and your conversations with Death are stored to your
account (Postgres) so they follow you across devices; they are sent off-device
only when you send the coach a message. API keys are held server-side and never
reach the browser.
