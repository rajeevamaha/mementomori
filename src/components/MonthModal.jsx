import { useState } from 'react'
import { motion } from 'framer-motion'
import { useStore, GOAL_CATEGORIES } from '../store.js'
import { parseDate } from '../lib/time.js'

const FULLMON = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// Popup opened when an upcoming month tile is clicked: add an event or a goal
// anchored to that month.
export default function MonthModal({ year, month, onClose }) {
  const addEvent = useStore((s) => s.addEvent)
  const addGoal = useStore((s) => s.addGoal)
  const events = useStore((s) => s.events)
  const goals = useStore((s) => s.goals)
  const profile = useStore((s) => s.profile)
  const removeEvent = useStore((s) => s.removeEvent)
  const removeGoal = useStore((s) => s.removeGoal)

  const [tab, setTab] = useState('event')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('Experiences')

  const date = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const label = `${FULLMON[month]} ${year}`

  // Everything already marked on this month/year.
  const existing = []
  const dob = parseDate(profile.dob)
  if (dob && year === dob.getFullYear() + 50 && month === dob.getMonth()) {
    existing.push({ key: 'b50', emoji: '🎂', label: '50th birthday' })
  }
  events.forEach((e) => {
    const d = parseDate(e.date)
    if (!d) return
    if (e.kind === 'anniversary') {
      if (d.getMonth() === month && year >= d.getFullYear()) {
        existing.push({ key: e.id, emoji: '❤', label: e.title || 'Anniversary', onRemove: () => removeEvent(e.id) })
      }
    } else if (d.getFullYear() === year && d.getMonth() === month) {
      existing.push({ key: e.id, emoji: e.kind === 'birthday' ? '🎂' : '📌', label: e.title, onRemove: () => removeEvent(e.id) })
    }
  })
  goals.forEach((g) => {
    const d = parseDate(g.targetDate)
    if (d && d.getFullYear() === year && d.getMonth() === month) {
      existing.push({ key: g.id, emoji: '🎯', label: g.title, onRemove: () => removeGoal(g.id) })
    }
  })

  const save = (e) => {
    e.preventDefault()
    if (!title.trim()) return
    if (tab === 'event') {
      addEvent({ title: title.trim(), date, kind: 'event' })
    } else {
      addGoal({ title: title.trim(), category, targetDate: date, status: 'BACKLOG', priority: 2 })
    }
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
            <div className="modal-eyebrow">A month yet to come</div>
            <div className="modal-title">{label}</div>
          </div>
          <button className="dock-x" onClick={onClose} title="Close">✕</button>
        </div>

        <p className="modal-note">
          This is your <strong>life calendar</strong> — reserve it for milestones, not meetings.
          Add only what you'd remember on your last day; skip the everyday (that sales meeting
          doesn't belong here).
        </p>

        {existing.length > 0 && (
          <div className="modal-existing">
            <div className="modal-existing-label">Already on this month</div>
            {existing.map((x) => (
              <div className="exist-item" key={x.key}>
                <span className="exist-emoji">{x.emoji}</span>
                <span className="exist-label">{x.label}</span>
                {x.onRemove && (
                  <button className="mini danger" onClick={x.onRemove} title="Remove">✕</button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="seg modal-seg">
          <button className={`seg-btn ${tab === 'event' ? 'active' : ''}`} onClick={() => setTab('event')}>Add event</button>
          <button className={`seg-btn ${tab === 'goal' ? 'active' : ''}`} onClick={() => setTab('goal')}>Add goal</button>
        </div>

        <form className="modal-form" onSubmit={save}>
          <input
            className="field-input"
            autoFocus
            placeholder={tab === 'event' ? 'What happens this month?' : 'A goal to reach by then…'}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          {tab === 'goal' && (
            <select className="field-input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {GOAL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">
              {tab === 'event' ? 'Mark it' : 'Add goal'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
