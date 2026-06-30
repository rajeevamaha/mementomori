import { useState } from 'react'
import { motion } from 'framer-motion'
import { useStore, GOAL_CATEGORIES, GOAL_STATUSES } from '../../store.js'
import { toneViews } from '../../lib/tone.js'

const COLUMNS = [
  { key: 'BACKLOG', label: 'Backlog' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'COMPLETED', label: 'Completed' },
]

const PRIORITY = { 1: 'High', 2: 'Medium', 3: 'Low' }

function GoalCard({ g, move, removeGoal, updateGoal }) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(g.title)
  const [category, setCategory] = useState(g.category)
  const [priority, setPriority] = useState(g.priority)
  const [targetDate, setTargetDate] = useState(g.targetDate || '')

  const startEdit = () => {
    setTitle(g.title)
    setCategory(g.category)
    setPriority(g.priority)
    setTargetDate(g.targetDate || '')
    setEditing(true)
  }

  const save = () => {
    updateGoal(g.id, { title: title.trim() || g.title, category, priority: Number(priority), targetDate })
    setEditing(false)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`gcard prio-${g.priority}`}
    >
      {editing ? (
        <div className="gedit">
          <input
            className="field-input grow"
            placeholder="Goal title…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <select className="field-input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {GOAL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="field-input" value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value={1}>High</option>
            <option value={2}>Medium</option>
            <option value={3}>Low</option>
          </select>
          <input
            className="field-input"
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
          />
          <div className="gedit-actions">
            <button className="mini" onClick={save}>Save</button>
            <button className="mini" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <div className="gcard-top">
            <span className={`gcat cat-${g.category.toLowerCase()}`}>{g.category}</span>
            <span className="gprio">{PRIORITY[g.priority]}</span>
          </div>
          <div className="gtitle">{g.title}</div>
          {g.targetDate && <div className="gdate">⌛ {g.targetDate}</div>}
          <div className="gcard-actions">
            <button className="mini" disabled={g.status === 'BACKLOG'} onClick={() => move(g, -1)}>←</button>
            <button className="mini" aria-label="Edit goal" onClick={startEdit}>✎</button>
            <button className="mini danger" onClick={() => removeGoal(g.id)}>✕</button>
            <button className="mini" disabled={g.status === 'COMPLETED'} onClick={() => move(g, 1)}>→</button>
          </div>
        </>
      )}
    </motion.div>
  )
}

export default function GoalsView() {
  const goals = useStore((s) => s.goals)
  const addGoal = useStore((s) => s.addGoal)
  const setGoalStatus = useStore((s) => s.setGoalStatus)
  const removeGoal = useStore((s) => s.removeGoal)
  const updateGoal = useStore((s) => s.updateGoal)
  const tone = useStore((s) => s.tone)
  const tv = toneViews(tone)

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('Self')
  const [priority, setPriority] = useState(2)
  const [targetDate, setTargetDate] = useState('')

  const submit = (e) => {
    e.preventDefault()
    if (!title.trim()) return
    addGoal({ title: title.trim(), category, priority: Number(priority), targetDate, status: 'BACKLOG' })
    setTitle('')
    setTargetDate('')
  }

  const move = (g, dir) => {
    const i = GOAL_STATUSES.indexOf(g.status)
    const next = GOAL_STATUSES[Math.min(GOAL_STATUSES.length - 1, Math.max(0, i + dir))]
    setGoalStatus(g.id, next)
  }

  return (
    <div>
      <h2 className="view-title">Goal Engine</h2>
      <p className="view-sub">{tv.goals.sub}</p>

      <form className="inline-form" onSubmit={submit}>
        <input
          className="field-input grow"
          placeholder="A goal worth your remaining weeks…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <select className="field-input" value={category} onChange={(e) => setCategory(e.target.value)}>
          {GOAL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="field-input" value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value={1}>High</option>
          <option value={2}>Medium</option>
          <option value={3}>Low</option>
        </select>
        <input
          className="field-input"
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
        />
        <button className="btn btn-primary" type="submit">Add</button>
      </form>

      <div className="kanban">
        {COLUMNS.map((col) => {
          // Year-scoped (annual / 5-year) goals live only in the Years life-grid.
          const items = goals.filter((g) => g.status === col.key && !g.horizon)
          return (
            <div className="kcol" key={col.key}>
              <div className="kcol-head">
                {col.label} <span className="kcount">{items.length}</span>
              </div>
              <div className="kcol-body">
                {items.length === 0 && <div className="kempty">Nothing here yet.</div>}
                {items.map((g) => (
                  <GoalCard key={g.id} g={g} move={move} removeGoal={removeGoal} updateGoal={updateGoal} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
