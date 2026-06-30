import { useState } from 'react'
import { motion } from 'framer-motion'
import { useStore, GOAL_CATEGORIES } from '../store.js'

// Opened from the Years life-grid: add an annual goal (this year) or a
// 5-year goal (this year + 4), and review/remove what's already planned.
export default function YearModal({ year, age, onClose }) {
  const addGoal = useStore((s) => s.addGoal)
  const removeGoal = useStore((s) => s.removeGoal)
  const goals = useStore((s) => s.goals)

  const [tab, setTab] = useState('annual')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('Self')

  const existing = goals.filter(
    (g) =>
      (g.horizon === 'annual' && g.year === year) ||
      (g.horizon === 'fiveyear' && year >= g.year && year <= g.year + 4)
  )

  const save = (e) => {
    e.preventDefault()
    if (!title.trim()) return
    addGoal({
      title: title.trim(),
      category,
      horizon: tab,
      year,
      status: 'BACKLOG',
      priority: 2,
      targetDate: tab === 'annual' ? `${year}-12-31` : `${year + 4}-12-31`,
    })
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <motion.div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="modal-head">
          <div>
            <div className="modal-eyebrow">A year yet to come</div>
            <div className="modal-title">{year} · age {age}</div>
          </div>
          <button className="dock-x" onClick={onClose} title="Close">✕</button>
        </div>

        {existing.length > 0 && (
          <div className="modal-existing">
            <div className="modal-existing-label">Already planned</div>
            {existing.map((g) => (
              <div className="exist-item" key={g.id}>
                <span className="exist-emoji">{g.horizon === 'annual' ? '◆' : '❯'}</span>
                <span className="exist-label">
                  {g.title}
                  <span className="exist-meta">
                    {g.horizon === 'annual' ? ` · ${g.year}` : ` · ${g.year}–${g.year + 4}`}
                  </span>
                </span>
                <button className="mini danger" onClick={() => removeGoal(g.id)} title="Remove">✕</button>
              </div>
            ))}
          </div>
        )}

        <div className="seg modal-seg">
          <button className={`seg-btn ${tab === 'annual' ? 'active' : ''}`} onClick={() => setTab('annual')}>Annual goal</button>
          <button className={`seg-btn ${tab === 'fiveyear' ? 'active' : ''}`} onClick={() => setTab('fiveyear')}>5-year goal</button>
        </div>

        <p className="field-hint" style={{ marginTop: 0, marginBottom: 12 }}>
          {tab === 'annual'
            ? `A goal to reach within ${year}.`
            : `A horizon for ${year}–${year + 4} — five years to make it real.`}
        </p>

        <form className="modal-form" onSubmit={save}>
          <input
            className="field-input"
            autoFocus
            placeholder={tab === 'annual' ? `What will you achieve in ${year}?` : `Where do you want to be by ${year + 4}?`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <select className="field-input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {GOAL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">
              {tab === 'annual' ? 'Add annual goal' : 'Add 5-year goal'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
