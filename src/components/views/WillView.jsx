import { useState } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '../../store.js'
import { toneViews } from '../../lib/tone.js'
import WILL from '../../lib/will.json'

const STATUS = [
  { key: 'yes', label: 'Yes, I have one' },
  { key: 'no', label: 'Not yet' },
  { key: 'unsure', label: 'Not sure' },
]

export default function WillView() {
  const will = useStore((s) => s.will)
  const setWill = useStore((s) => s.setWill)
  const toggleWillStep = useStore((s) => s.toggleWillStep)
  const tone = useStore((s) => s.tone)
  const tv = toneViews(tone)
  const [open, setOpen] = useState(null)

  const done = will.checklist || {}
  const doneCount = WILL.checklist.filter((_, i) => done[i]).length
  const pct = Math.round((doneCount / WILL.checklist.length) * 100)

  return (
    <div>
      <h2 className="view-title">Will Planning</h2>
      <p className="view-sub">{tv.will.sub}</p>

      <p className="will-intro">{WILL.intro}</p>

      {/* Personal status tracker */}
      <div className="card will-status">
        <div className="ws-q">Do you have a will?</div>
        <div className="ip-actions">
          {STATUS.map((s) => (
            <button
              key={s.key}
              className={`btn ${will.hasWill === s.key ? 'btn-primary' : ''}`}
              onClick={() => setWill({ hasWill: s.key })}
            >
              {s.label}
            </button>
          ))}
        </div>

        {will.hasWill === 'yes' && (
          <div className="will-details">
            <label className="field-label">Where the signed original is kept</label>
            <input className="field-input" placeholder="e.g. fireproof safe, attorney's office…" value={will.location} onChange={(e) => setWill({ location: e.target.value })} />
            <div className="inline-form tight">
              <input className="field-input grow" placeholder="Executor" value={will.executor} onChange={(e) => setWill({ executor: e.target.value })} />
              <input className="field-input grow" placeholder="Guardian (if children)" value={will.guardian} onChange={(e) => setWill({ guardian: e.target.value })} />
              <input className="field-input" type="date" title="Last updated" value={will.lastUpdated} onChange={(e) => setWill({ lastUpdated: e.target.value })} />
            </div>
          </div>
        )}
        {(will.hasWill === 'no' || will.hasWill === 'unsure') && (
          <p className="kempty" style={{ margin: '10px 0 0' }}>
            Then the state has written one for you — and it is not the one you would choose. Walk the checklist below.
          </p>
        )}
      </div>

      {/* Actionable checklist */}
      <section className="will-block">
        <div className="wb-head">
          <h3 className="section-title">Steps to get it done</h3>
          <span className="wb-progress">{doneCount}/{WILL.checklist.length}</span>
        </div>
        <div className="will-progress-track"><div className="will-progress-fill" style={{ width: `${pct}%` }} /></div>
        <ul className="will-checklist">
          {WILL.checklist.map((c, i) => (
            <li key={i} className={done[i] ? 'wc-done' : ''}>
              <label>
                <input type="checkbox" checked={!!done[i]} onChange={() => toggleWillStep(i)} />
                <span>{c}</span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      {/* The guide */}
      <section className="will-block">
        <h3 className="section-title">How to write a will</h3>
        <div className="will-sections">
          {WILL.sections.map((sec, i) => (
            <div className={`will-section ${open === i ? 'open' : ''}`} key={i}>
              <button className="ws-toggle" onClick={() => setOpen(open === i ? null : i)}>
                <span>{sec.title}</span>
                <span className="ws-chevron">{open === i ? '−' : '+'}</span>
              </button>
              {open === i && (
                <motion.div className="ws-content" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                  <p className="ws-body">{sec.body}</p>
                  <ul>{sec.points.map((p, j) => <li key={j}>{p}</li>)}</ul>
                </motion.div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Common mistakes */}
      <section className="will-block">
        <h3 className="section-title">Common mistakes</h3>
        <ul className="mistakes-list">
          {WILL.mistakes.map((m, i) => <li key={i}>{m}</li>)}
        </ul>
      </section>

      <p className="med-disclaimer">{WILL.disclaimer}</p>
    </div>
  )
}
