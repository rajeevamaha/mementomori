import { useState } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '../../store.js'

function MemberCard({ m }) {
  const addMilestone = useStore((s) => s.addMilestone)
  const removeMilestone = useStore((s) => s.removeMilestone)
  const removeFamilyMember = useStore((s) => s.removeFamilyMember)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')

  const submit = (e) => {
    e.preventDefault()
    if (!title.trim()) return
    addMilestone(m.id, title.trim(), date)
    setTitle('')
    setDate('')
  }

  return (
    <motion.div className="card" layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="member-head">
        <div>
          <div className="member-name">{m.name}</div>
          <div className="member-rel">{m.relation || 'family'}{m.dob ? ` · b. ${m.dob}` : ''}</div>
        </div>
        <button className="mini danger" onClick={() => removeFamilyMember(m.id)}>✕</button>
      </div>
      <ul className="ms-list">
        {m.milestones.length === 0 && <li className="kempty">No milestones yet.</li>}
        {m.milestones
          .slice()
          .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
          .map((ms) => (
            <li key={ms.id}>
              <span>★ {ms.title}{ms.date ? ` — ${ms.date}` : ''}</span>
              <button className="mini danger" onClick={() => removeMilestone(m.id, ms.id)}>✕</button>
            </li>
          ))}
      </ul>
      <form className="inline-form tight" onSubmit={submit}>
        <input className="field-input grow" placeholder="Milestone (college fund, wedding, trip…)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className="field-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <button className="btn btn-primary" type="submit">+</button>
      </form>
    </motion.div>
  )
}

export default function FamilyView() {
  const family = useStore((s) => s.family)
  const addFamilyMember = useStore((s) => s.addFamilyMember)
  const [name, setName] = useState('')
  const [relation, setRelation] = useState('')
  const [dob, setDob] = useState('')

  const submit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    addFamilyMember({ name: name.trim(), relation, dob })
    setName('')
    setRelation('')
    setDob('')
  }

  return (
    <div>
      <h2 className="view-title">Family Hub</h2>
      <p className="view-sub">The people your time is really for. Track them and the milestones you want to be there for.</p>

      <form className="inline-form" onSubmit={submit}>
        <input className="field-input grow" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="field-input" placeholder="Relation (spouse, child…)" value={relation} onChange={(e) => setRelation(e.target.value)} />
        <input className="field-input" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
        <button className="btn btn-primary" type="submit">Add</button>
      </form>

      <div className="grid">
        {family.length === 0 && <div className="card span-2 kempty">No one added yet. Add the people who matter.</div>}
        {family.map((m) => <MemberCard key={m.id} m={m} />)}
      </div>
    </div>
  )
}
