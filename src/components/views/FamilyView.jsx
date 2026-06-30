import { useState } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '../../store.js'
import { toneViews } from '../../lib/tone.js'

function MemberCard({ m }) {
  const addMilestone = useStore((s) => s.addMilestone)
  const removeMilestone = useStore((s) => s.removeMilestone)
  const removeFamilyMember = useStore((s) => s.removeFamilyMember)
  const updateFamilyMember = useStore((s) => s.updateFamilyMember)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [editing, setEditing] = useState(false)
  const [eName, setEName] = useState(m.name)
  const [eRelation, setERelation] = useState(m.relation || '')
  const [eDob, setEDob] = useState(m.dob || '')

  const submit = (e) => {
    e.preventDefault()
    if (!title.trim()) return
    addMilestone(m.id, title.trim(), date)
    setTitle('')
    setDate('')
  }

  const startEdit = () => {
    setEName(m.name)
    setERelation(m.relation || '')
    setEDob(m.dob || '')
    setEditing(true)
  }

  const save = () => {
    updateFamilyMember(m.id, { name: eName.trim() || m.name, relation: eRelation.trim(), dob: eDob })
    setEditing(false)
  }

  return (
    <motion.div className="card" layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="member-head">
        {editing ? (
          <div className="gedit">
            <input className="field-input grow" placeholder="Name" value={eName} onChange={(e) => setEName(e.target.value)} />
            <input className="field-input" placeholder="Relation (spouse, child…)" value={eRelation} onChange={(e) => setERelation(e.target.value)} />
            <input className="field-input" type="date" value={eDob} onChange={(e) => setEDob(e.target.value)} />
            <div className="gedit-actions">
              <button className="mini" onClick={save}>Save</button>
              <button className="mini" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <div>
            <div className="member-name">{m.name}</div>
            <div className="member-rel">{m.relation || 'family'}{m.dob ? ` · b. ${m.dob}` : ''}</div>
          </div>
        )}
        <div className="member-actions">
          <button className="mini" aria-label="Edit family member" onClick={startEdit}>✎</button>
          <button className="mini danger" onClick={() => removeFamilyMember(m.id)}>✕</button>
        </div>
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
  const tone = useStore((s) => s.tone)
  const tv = toneViews(tone)
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
      <p className="view-sub">{tv.family.sub}</p>

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
