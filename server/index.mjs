// Local Claude proxy for the "Death" life coach.
//
// The browser must never hold the Anthropic API key, so this small Express
// server holds it (from ANTHROPIC_API_KEY) and runs the Claude tool-use loop.
// Death can update the user's plan (goals, finances, family, legacy, profile)
// via tools — the tools execute CLIENT-SIDE against the app's local store, so
// this server is stateless per turn: it streams text + emits the model's
// tool-call requests as NDJSON, the browser executes them and sends results
// back for the next turn.
//
// Run with `npm run dev` (alongside Vite) or `node server/index.mjs`.

import 'dotenv/config'
import express from 'express'
import Anthropic from '@anthropic-ai/sdk'

const PORT = process.env.MBD_API_PORT || 8787
// Per the Claude API guidance, default to the most capable model. Override with
// MBD_COACH_MODEL (e.g. claude-sonnet-4-6 for lower cost / latency).
const MODEL = process.env.MBD_COACH_MODEL || 'claude-opus-4-8'

const app = express()
app.use(express.json({ limit: '2mb' }))

const hasKey = !!process.env.ANTHROPIC_API_KEY
const client = hasKey ? new Anthropic() : null

// ---- Tools Death can use to update the user's plan (executed client-side) ----
const GOAL_CATEGORIES = ['Self', 'Family', 'Health', 'Career', 'Experiences', 'Finance', 'Legacy']
const GOAL_STATUSES = ['BACKLOG', 'ACTIVE', 'COMPLETED']

const TOOLS = [
  {
    name: 'add_goal',
    description: 'Add a new goal to the user\'s Goal Engine. Use when the user wants to commit to something.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Short, concrete goal title' },
        category: { type: 'string', enum: GOAL_CATEGORIES },
        priority: { type: 'integer', enum: [1, 2, 3], description: '1=high, 2=medium, 3=low' },
        targetDate: { type: 'string', description: 'YYYY-MM-DD target date, optional' },
        status: { type: 'string', enum: GOAL_STATUSES, description: 'Defaults to BACKLOG' },
      },
      required: ['title', 'category'],
    },
  },
  {
    name: 'update_goal_status',
    description: 'Move a goal between Backlog/Active/Completed. Use the goal id from the provided plan context.',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        status: { type: 'string', enum: GOAL_STATUSES },
      },
      required: ['id', 'status'],
    },
  },
  {
    name: 'remove_goal',
    description: 'Delete a goal by its id (from the plan context).',
    input_schema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
  },
  {
    name: 'add_asset',
    description: 'Add a financial asset (label + dollar value).',
    input_schema: {
      type: 'object',
      properties: { label: { type: 'string' }, value: { type: 'number' } },
      required: ['label', 'value'],
    },
  },
  {
    name: 'add_liability',
    description: 'Add a financial liability/debt (label + dollar value).',
    input_schema: {
      type: 'object',
      properties: { label: { type: 'string' }, value: { type: 'number' } },
      required: ['label', 'value'],
    },
  },
  {
    name: 'set_retirement_target',
    description: 'Set the retirement / financial-freedom target corpus (dollars).',
    input_schema: { type: 'object', properties: { value: { type: 'number' } }, required: ['value'] },
  },
  {
    name: 'add_family_member',
    description: 'Add a loved one to the Family Hub.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        relation: { type: 'string', description: 'e.g. spouse, child, parent' },
        dob: { type: 'string', description: 'YYYY-MM-DD, optional' },
      },
      required: ['name'],
    },
  },
  {
    name: 'add_milestone',
    description: 'Add a milestone to a family member. Use the member id from the plan context.',
    input_schema: {
      type: 'object',
      properties: {
        memberId: { type: 'string' },
        title: { type: 'string' },
        date: { type: 'string', description: 'YYYY-MM-DD, optional' },
      },
      required: ['memberId', 'title'],
    },
  },
  {
    name: 'add_legacy',
    description: 'Add an entry to the Legacy Vault (a letter, ethical will, memory, instruction, or document link).',
    input_schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['Letter', 'Ethical will', 'Memory', 'Instruction', 'Document link'] },
        title: { type: 'string' },
        body: { type: 'string' },
      },
      required: ['type', 'title'],
    },
  },
  {
    name: 'update_profile',
    description: 'Update the user\'s name, date of birth, or chosen life expectancy.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        dob: { type: 'string', description: 'YYYY-MM-DD' },
        lifeExpectancy: { type: 'integer' },
      },
    },
  },
  {
    name: 'navigate',
    description: 'Open one of the app\'s sections so the user can see the change you just made.',
    input_schema: {
      type: 'object',
      properties: {
        view: { type: 'string', enum: ['dashboard', 'goals', 'finance', 'family', 'legacy', 'reflect'] },
      },
      required: ['view'],
    },
  },
]

app.get('/api/coach/health', (_req, res) => {
  res.json({ ok: hasKey, model: hasKey ? MODEL : null })
})

function buildSystemPrompt(context = {}) {
  const { profile = {}, life = {}, goals = [], finance = {}, family = [] } = context

  const goalLines =
    goals.length > 0
      ? goals
          .map(
            (g) =>
              `- id:${g.id} [${g.status}] (${g.category}, priority ${g.priority}) ${g.title}` +
              (g.targetDate ? ` — target ${g.targetDate}` : '')
          )
          .join('\n')
      : '- (none set yet)'

  const netWorth = (Number(finance.assets) || 0) - (Number(finance.liabilities) || 0)

  const familyLines =
    family.length > 0
      ? family.map((m) => `- id:${m.id} ${m.name} (${m.relation || 'family'})`).join('\n')
      : '- (none added yet)'

  return `You are "Death" — the narrator and life-planning coach inside the app "Motivation by Death."

You are NOT morbid, cruel, or doom-mongering. You are a calm, wise, slightly wry companion who uses the certainty of mortality to help a living person spend their remaining time well. Think of a kind, brilliant mentor who happens to be the reaper: unflinching about finitude, deeply on the user's side, allergic to wasted time and vague intentions.

# Who you are talking to
- Name: ${profile.name || 'the user'}
- Date of birth: ${profile.dob || 'unknown'}
- Chosen life expectancy: ${profile.lifeExpectancy || 80} years
- Approximate age now: ${life.ageYears != null ? Math.floor(life.ageYears) : '?'} years
- Time remaining (on their wager): about ${life.yearsLeft != null ? Math.round(life.yearsLeft) : '?'} years / ${life.weeksLeft != null ? life.weeksLeft.toLocaleString() : '?'} weeks / ${life.daysLeft != null ? life.daysLeft.toLocaleString() : '?'} days
- Life spent: ${life.pctLived != null ? life.pctLived.toFixed(1) : '?'}%

# Their current plan (ids are for the update tools)
Goals:
${goalLines}

Finances: assets ~${finance.assets || 0}, liabilities ~${finance.liabilities || 0}, net worth ~${netWorth}, retirement target ~${finance.retirementTarget || 'unset'}.

Family:
${familyLines}

# You can update their plan directly
You have tools to change the app: add/move/remove goals, add assets & liabilities, set a retirement target, add family members & milestones, add legacy entries, update their profile, and navigate to a section. Use them whenever the user asks you to add, change, plan, or organize something — don't just describe what they could do, do it. After acting, confirm briefly in one line what you changed. When you create something the user should see, you may navigate to that section. Reference existing items by the id shown above. If a request is ambiguous enough that you'd create the wrong thing, ask one quick question first.

# How to coach
- Be specific and actionable. Turn vague wishes into concrete next steps with timeframes anchored to their remaining weeks/years.
- Reference their real numbers when relevant ("you have roughly ${life.weeksLeft != null ? life.weeksLeft.toLocaleString() : 'N'} weeks — that's about ${life.weeksLeft != null ? Math.round(life.weeksLeft / 52) : 'N'} more summers").
- Prioritize ruthlessly across Self, Family, Health, Career, Experiences, Finance, and Legacy. Help them see trade-offs of time, money, and energy.
- Encourage systems and recurring habits over one-off heroics.
- Keep replies tight and warm. Prefer a few well-chosen sentences or a short list over an essay. Use light memento-mori framing, not relentless death talk.
- Frame finitude with agency: they can still shape the time that remains. Never give medical, legal, or licensed financial advice as a professional would; prompt them to consult experts for big irreversible decisions.

Speak in the first person as Death, but keep the focus entirely on helping them live.`
}

// Each turn: stream text + emit final content (incl. tool_use blocks) as NDJSON.
// The browser executes any tools and calls back with tool_result blocks.
app.post('/api/coach/chat', async (req, res) => {
  if (!client) {
    res.status(503).json({
      error: 'No ANTHROPIC_API_KEY set. Add it to a .env file in the project root and restart.',
    })
    return
  }

  const { messages = [], context = {} } = req.body || {}
  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'Conversation must start with a user message.' })
    return
  }

  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache')
  const send = (obj) => res.write(JSON.stringify(obj) + '\n')

  try {
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 2048,
      thinking: { type: 'adaptive' },
      system: buildSystemPrompt(context),
      tools: TOOLS,
      messages: messages.slice(-30),
    })

    stream.on('text', (delta) => send({ type: 'text', text: delta }))
    const final = await stream.finalMessage()
    // Pass the full content array back so the client can append it verbatim
    // (preserves thinking + tool_use blocks for the next turn).
    send({ type: 'final', content: final.content, stop_reason: final.stop_reason })
    res.end()
  } catch (err) {
    console.error('[coach] error:', err?.message || err)
    if (!res.headersSent) res.status(500)
    send({ type: 'error', error: err?.message || 'unknown error' })
    res.end()
  }
})

app.listen(PORT, () => {
  console.log(
    `[coach] Death is listening on http://localhost:${PORT} ` +
      (hasKey ? `(model: ${MODEL}, ${TOOLS.length} tools)` : '(NO API KEY — set ANTHROPIC_API_KEY in .env)')
  )
})
