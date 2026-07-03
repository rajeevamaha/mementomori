import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import Reaper from './Reaper.jsx'
import { useStore, financeTotals } from '../store.js'
import { computeLife } from '../lib/time.js'

const SUGGESTIONS = [
  'What should I focus on this week?',
  'Add a goal: run a marathon next year',
  'Plan my finances toward freedom',
  'What would my dying self regret?',
]

// Execute a tool call against the local store. Returns a short result string
// for the model, and a human label for the UI chip.
function execTool(name, input) {
  const s = useStore.getState()
  try {
    switch (name) {
      case 'add_goal':
        s.addGoal(input)
        return [`Added goal "${input.title}" (${input.category}).`, `＋ Goal · ${input.title}`]
      case 'update_goal_status':
        s.setGoalStatus(input.id, input.status)
        return [`Goal moved to ${input.status}.`, `↺ Goal → ${input.status}`]
      case 'remove_goal':
        s.removeGoal(input.id)
        return ['Goal removed.', '✕ Goal removed']
      case 'add_asset':
        s.addAsset(input.label, input.value)
        return [`Added asset ${input.label} ($${input.value}).`, `＋ Asset · ${input.label}`]
      case 'add_liability':
        s.addLiability(input.label, input.value)
        return [`Added liability ${input.label} ($${input.value}).`, `＋ Liability · ${input.label}`]
      case 'set_retirement_target':
        s.setRetirementTarget(input.value)
        return [`Retirement target set to $${input.value}.`, `◎ Target · $${input.value}`]
      case 'add_family_member':
        s.addFamilyMember(input)
        return [`Added ${input.name} to the family hub.`, `＋ Family · ${input.name}`]
      case 'add_milestone':
        s.addMilestone(input.memberId, input.title, input.date || '')
        return [`Added milestone "${input.title}".`, `★ Milestone · ${input.title}`]
      case 'add_legacy':
        s.addLegacy(input)
        return [`Sealed ${input.type}: "${input.title}".`, `⚱ Legacy · ${input.title}`]
      case 'update_profile':
        s.updateProfile(input)
        return ['Profile updated.', '☰ Profile updated']
      case 'navigate':
        s.setView(input.view)
        return [`Opened ${input.view}.`, `→ ${input.view}`]
      default:
        return [`Unknown tool: ${name}`, `? ${name}`]
    }
  } catch (e) {
    return [`Error running ${name}: ${e.message}`, `⚠ ${name}`]
  }
}

export default function DeathDock() {
  const dockOpen = useStore((s) => s.dockOpen)
  const setDockOpen = useStore((s) => s.setDockOpen)

  const [display, setDisplay] = useState([]) // {role, text, actions?}
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [health, setHealth] = useState({ ok: null, model: null })
  const [lastModel, setLastModel] = useState(null) // model that answered the last turn
  const convoRef = useRef([]) // Anthropic-format message list
  const scrollRef = useRef(null)

  useEffect(() => {
    fetch('/api/coach/health').then((r) => r.json()).then(setHealth).catch(() => setHealth({ ok: false }))
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [display, busy])

  const buildContext = () => {
    const s = useStore.getState()
    const life = computeLife(s.profile.dob, s.profile.lifeExpectancy)
    const { assets, liabilities, netWorth } = financeTotals(s.finance)
    return {
      profile: s.profile,
      life: life
        ? { ageYears: life.ageYears, yearsLeft: life.yearsLeft, weeksLeft: life.weeksLeft, daysLeft: life.daysLeft, pctLived: life.pctLived }
        : {},
      goals: s.goals.map((g) => ({ id: g.id, category: g.category, title: g.title, status: g.status, priority: g.priority, targetDate: g.targetDate })),
      finance: { assets, liabilities, netWorth, retirementTarget: s.finance.retirementTarget },
      family: s.family.map((m) => ({ id: m.id, name: m.name, relation: m.relation })),
      tone: s.tone,
    }
  }

  // Append streamed text to the active (last) assistant bubble.
  const pushText = (t) =>
    setDisplay((d) => {
      const c = d.slice()
      const last = { ...c[c.length - 1] }
      last.text = (last.text || '') + t
      c[c.length - 1] = last
      return c
    })

  const pushAction = (label) =>
    setDisplay((d) => {
      const c = d.slice()
      const last = { ...c[c.length - 1] }
      last.actions = [...(last.actions || []), label]
      c[c.length - 1] = last
      return c
    })

  const setBubbleText = (t) =>
    setDisplay((d) => {
      const c = d.slice()
      const last = { ...c[c.length - 1] }
      last.text = t
      c[c.length - 1] = last
      return c
    })

  async function streamTurn() {
    const resp = await fetch('/api/coach/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: convoRef.current, context: buildContext() }),
    })
    if (!resp.ok || !resp.body) {
      const e = await resp.json().catch(() => ({}))
      throw new Error(e.error || `Request failed (${resp.status})`)
    }
    const reader = resp.body.getReader()
    const dec = new TextDecoder()
    let buf = ''
    let final = null
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buf += dec.decode(value, { stream: true })
      let nl
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl).trim()
        buf = buf.slice(nl + 1)
        if (!line) continue
        const ev = JSON.parse(line)
        if (ev.type === 'text') pushText(ev.text)
        else if (ev.type === 'final') {
          final = ev
          if (ev.model) setLastModel(ev.model)
        } else if (ev.type === 'error') throw new Error(ev.error)
      }
    }
    return final
  }

  async function send(text) {
    const content = (text ?? input).trim()
    if (!content || busy || health.ok === false) return
    setInput('')
    convoRef.current.push({ role: 'user', content })
    setDisplay((d) => [...d, { role: 'user', text: content }, { role: 'assistant', text: '', actions: [] }])
    setBusy(true)

    try {
      let guard = 0
      let bubbleBase = '' // text settled by finished rounds of this turn
      while (guard++ < 6) {
        const final = await streamTurn()
        // A stream that ends without a final event was cut off (server killed
        // mid-reply, e.g. a serverless timeout) — surface it, don't go silent.
        if (!final) throw new Error('The thread was cut mid-reply. Ask me again.')
        // Replace the streamed deltas with the settled text from `final` — the
        // server may have stripped tool-call markup Llama wrote into the text.
        bubbleBase += (final.content || [])
          .filter((b) => b.type === 'text')
          .map((b) => b.text)
          .join('')
        setBubbleText(bubbleBase)
        convoRef.current.push({ role: 'assistant', content: final.content })
        if (final.stop_reason !== 'tool_use') break

        const toolResults = []
        for (const block of final.content) {
          if (block.type === 'tool_use') {
            const [result, label] = execTool(block.name, block.input)
            pushAction(label)
            toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result })
          }
        }
        convoRef.current.push({ role: 'user', content: toolResults })
        // loop: Death continues after seeing the tool results
      }
    } catch (err) {
      pushText((display.length ? '\n\n' : '') + `⚠ ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <aside className={`death-dock ${dockOpen ? 'open' : 'closed'}`}>
        <div className="dock-head">
          <Reaper size={44} />
          <div className="dock-head-text">
            <div className="dock-title">DEATH</div>
            <div className="dock-status">
              {health.ok === false ? (
                <span className="warn">No API key — set ANTHROPIC_API_KEY or GROQ_API_KEY (.env locally, env vars on Vercel)</span>
              ) : health.ok ? (
                <span className="muted">always listening · {lastModel || health.model}</span>
              ) : (
                '…'
              )}
            </div>
          </div>
          <button className="dock-x" onClick={() => setDockOpen(false)} title="Hide Death">—</button>
        </div>

        <div className="dock-chat" ref={scrollRef}>
          {display.length === 0 && (
            <div className="dock-empty">
              <p>I've read your timeline. Tell me what you want to do with the time you have left — I can update your plan as we talk.</p>
              <div className="suggestions">
                {SUGGESTIONS.map((s) => (
                  <button key={s} className="chip" onClick={() => send(s)} disabled={health.ok === false}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {display.map((m, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`bubble ${m.role}`}>
              {m.role === 'assistant' && <span className="bubble-tag">☠ Death</span>}
              <div className="bubble-body">
                {m.text || (busy && i === display.length - 1 && !(m.actions || []).length ? <span className="typing">…</span> : '')}
              </div>
              {(m.actions || []).length > 0 && (
                <div className="bubble-actions">
                  {m.actions.map((a, j) => (
                    <span key={j} className="action-chip">{a}</span>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>

        <form className="dock-input" onSubmit={(e) => { e.preventDefault(); send() }}>
          <input
            className="field-input grow"
            placeholder={health.ok === false ? 'Add an API key to chat…' : 'Speak with Death…'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={busy || health.ok === false}
          />
          <button className="btn btn-primary" type="submit" disabled={busy || health.ok === false || !input.trim()}>
            {busy ? '…' : '↑'}
          </button>
        </form>
      </aside>

      {/* Floating toggle — reopen Death, or open on mobile */}
      <button
        className={`dock-fab ${dockOpen ? 'hide-when-open' : ''}`}
        onClick={() => setDockOpen(!dockOpen)}
        title="Speak with Death"
      >
        💀
      </button>
    </>
  )
}
