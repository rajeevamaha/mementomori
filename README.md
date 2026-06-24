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

## Stack

- **Vite + React 18** + **Framer Motion** (all animation).
- **Zustand** for state, persisted to `localStorage` (the whole platform).
- **Express** proxy (`server/index.mjs`) that holds the Anthropic key and
  streams from Claude. The browser never sees the key.
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
all without leaving the chat. Without `ANTHROPIC_API_KEY` the dock shows a
friendly "add a key" state and the rest of the app is unaffected.

Override the model or port via `.env`:

```
MBD_COACH_MODEL=claude-sonnet-4-6   # cheaper/faster than the default opus-4-8
MBD_API_PORT=8787
```

## Reset

**↺ Reset** in the sidebar wipes everything (profile, goals, finances, family,
legacy, reflections) and replays onboarding.

## Privacy

All of your planning data lives in `localStorage` on your machine. The only
thing sent off-device is the chat context you give the Death coach — and only
when you have configured your own Anthropic key and send a message.
