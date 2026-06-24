import { useState } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '../../store.js'

const TYPES = ['Letter', 'Ethical will', 'Memory', 'Instruction', 'Document link']

export default function LegacyView() {
  const legacy = useStore((s) => s.legacy)
  const addLegacy = useStore((s) => s.addLegacy)
  const updateLegacy = useStore((s) => s.updateLegacy)
  const removeLegacy = useStore((s) => s.removeLegacy)

  const [type, setType] = useState('Letter')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [editing, setEditing] = useState(null)

  const submit = (e) => {
    e.preventDefault()
    if (!title.trim()) return
    addLegacy({ type, title: title.trim(), body })
    setTitle('')
    setBody('')
  }

  return (
    <div>
      <h2 className="view-title">Legacy Vault</h2>
      <p className="view-sub">
        What you leave behind. Letters, an ethical will, memories, hand-off instructions.
        Stored only on this device.
      </p>

      <form className="legacy-form card" onSubmit={submit}>
        <div className="inline-form tight">
          <select className="field-input" value={type} onChange={(e) => setType(e.target.value)}>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input className="field-input grow" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <textarea
          className="field-input area"
          rows={4}
          placeholder="Write it down while you can…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <button className="btn btn-primary" type="submit">Seal entry</button>
      </form>

      <div className="grid">
        {legacy.length === 0 && <div className="card span-2 kempty">The vault is empty.</div>}
        {legacy.map((e) => (
          <motion.div key={e.id} className="card" layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="member-head">
              <div>
                <span className="gcat">{e.type}</span>
                <div className="member-name" style={{ marginTop: 6 }}>{e.title}</div>
              </div>
              <button className="mini danger" onClick={() => removeLegacy(e.id)}>✕</button>
            </div>
            {editing === e.id ? (
              <textarea
                className="field-input area"
                rows={5}
                defaultValue={e.body}
                onBlur={(ev) => { updateLegacy(e.id, { body: ev.target.value }); setEditing(null) }}
                autoFocus
              />
            ) : (
              <p className="legacy-body" onClick={() => setEditing(e.id)}>
                {e.body || <span className="kempty">Click to write…</span>}
              </p>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  )
}
