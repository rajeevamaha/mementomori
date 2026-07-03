import { useState } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '../../store.js'
import { toneViews } from '../../lib/tone.js'
import DateSelect from '../DateSelect.jsx'

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
            <DateSelect value={eDob} onChange={setEDob} />
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

const money = (n) => '$' + (Number(n) || 0).toLocaleString()
const POLICY_KINDS = ['Term', 'Whole', 'Universal', 'Group', 'Other']

function PolicyCard({ p }) {
  const updatePolicy = useStore((s) => s.updatePolicy)
  const removePolicy = useStore((s) => s.removePolicy)
  const [editing, setEditing] = useState(false)
  const [d, setD] = useState(p)

  const save = () => {
    updatePolicy(p.id, {
      insurer: d.insurer.trim() || p.insurer,
      kind: d.kind,
      coverage: Number(d.coverage) || 0,
      beneficiary: d.beneficiary,
      premium: Number(d.premium) || 0,
      premiumFreq: d.premiumFreq,
      renewal: d.renewal,
    })
    setEditing(false)
  }

  return (
    <motion.div className="card" layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      {editing ? (
        <div className="gedit">
          <input className="field-input grow" placeholder="Insurer" value={d.insurer} onChange={(e) => setD({ ...d, insurer: e.target.value })} />
          <select className="field-input" value={d.kind} onChange={(e) => setD({ ...d, kind: e.target.value })}>
            {POLICY_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <input className="field-input" type="number" placeholder="Coverage $" value={d.coverage} onChange={(e) => setD({ ...d, coverage: e.target.value })} />
          <input className="field-input grow" placeholder="Beneficiary" value={d.beneficiary} onChange={(e) => setD({ ...d, beneficiary: e.target.value })} />
          <input className="field-input" type="number" placeholder="Premium $" value={d.premium} onChange={(e) => setD({ ...d, premium: e.target.value })} />
          <select className="field-input" value={d.premiumFreq} onChange={(e) => setD({ ...d, premiumFreq: e.target.value })}>
            <option value="yr">/yr</option>
            <option value="mo">/mo</option>
          </select>
          <input className="field-input" type="date" title="Renewal / expiry" value={d.renewal} onChange={(e) => setD({ ...d, renewal: e.target.value })} />
          <div className="gedit-actions">
            <button className="mini" onClick={save}>Save</button>
            <button className="mini" onClick={() => { setD(p); setEditing(false) }}>Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <div className="member-head">
            <div>
              <span className="gcat">{p.kind} life</span>
              <div className="member-name" style={{ marginTop: 6 }}>{p.insurer || 'Policy'}</div>
              <div className="member-rel">{money(p.coverage)} cover{p.beneficiary ? ` → ${p.beneficiary}` : ''}</div>
            </div>
            <div className="member-actions">
              <button className="mini" aria-label="Edit policy" onClick={() => { setD(p); setEditing(true) }}>✎</button>
              <button className="mini danger" onClick={() => removePolicy(p.id)}>✕</button>
            </div>
          </div>
          <div className="policy-meta">
            {p.premium > 0 && <span>{money(p.premium)}/{p.premiumFreq}</span>}
            {p.renewal && <span>renews {p.renewal}</span>}
          </div>
        </>
      )}
    </motion.div>
  )
}

function InsuranceSection() {
  const insurance = useStore((s) => s.insurance)
  const setInsuranceStatus = useStore((s) => s.setInsuranceStatus)
  const addPolicy = useStore((s) => s.addPolicy)
  const [f, setF] = useState({ insurer: '', kind: 'Term', coverage: '', beneficiary: '', premium: '', premiumFreq: 'yr', renewal: '' })
  const [adding, setAdding] = useState(false)

  const submit = (e) => {
    e.preventDefault()
    if (!f.insurer.trim() && !f.coverage) return
    addPolicy(f)
    setF({ insurer: '', kind: 'Term', coverage: '', beneficiary: '', premium: '', premiumFreq: 'yr', renewal: '' })
    setAdding(false)
  }

  const has = insurance.hasPolicy
  const policies = insurance.policies || []

  return (
    <section className="insurance-section">
      <h3 className="section-title">Life insurance</h3>
      <p className="section-sub">Have you taken life insurance? It is the one gift you leave that arrives exactly when it is needed.</p>

      {has == null && policies.length === 0 && (
        <div className="card insurance-prompt">
          <div className="ip-q">Do you have a life insurance policy?</div>
          <div className="ip-actions">
            <button className="btn btn-primary" onClick={() => { setInsuranceStatus(true); setAdding(true) }}>Yes — record it</button>
            <button className="btn" onClick={() => setInsuranceStatus(false)}>Not yet</button>
          </div>
        </div>
      )}

      {has === false && policies.length === 0 && (
        <div className="card insurance-prompt no-cover">
          <div className="ip-q">No cover recorded.</div>
          <p className="kempty" style={{ margin: '4px 0 12px' }}>
            If anyone depends on your income, a term policy is a cheap way to make sure your death does not become their financial ruin.
          </p>
          <button className="btn btn-primary" onClick={() => { setInsuranceStatus(true); setAdding(true) }}>I have one — record it</button>
        </div>
      )}

      {(has === true || policies.length > 0) && (
        <>
          <div className="grid">
            {policies.map((p) => <PolicyCard key={p.id} p={p} />)}
            {policies.length === 0 && <div className="card span-2 kempty">No policy details yet.</div>}
          </div>

          {adding ? (
            <form className="legacy-form card" onSubmit={submit} style={{ marginTop: 14 }}>
              <div className="inline-form tight">
                <input className="field-input grow" placeholder="Insurer" value={f.insurer} onChange={(e) => setF({ ...f, insurer: e.target.value })} />
                <select className="field-input" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
                  {POLICY_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
                <input className="field-input" type="number" placeholder="Coverage $" value={f.coverage} onChange={(e) => setF({ ...f, coverage: e.target.value })} />
              </div>
              <div className="inline-form tight">
                <input className="field-input grow" placeholder="Beneficiary" value={f.beneficiary} onChange={(e) => setF({ ...f, beneficiary: e.target.value })} />
                <input className="field-input" type="number" placeholder="Premium $" value={f.premium} onChange={(e) => setF({ ...f, premium: e.target.value })} />
                <select className="field-input" value={f.premiumFreq} onChange={(e) => setF({ ...f, premiumFreq: e.target.value })}>
                  <option value="yr">/yr</option>
                  <option value="mo">/mo</option>
                </select>
                <input className="field-input" type="date" title="Renewal / expiry" value={f.renewal} onChange={(e) => setF({ ...f, renewal: e.target.value })} />
              </div>
              <div className="ip-actions">
                <button className="btn btn-primary" type="submit">Save policy</button>
                <button className="btn" type="button" onClick={() => setAdding(false)}>Cancel</button>
              </div>
            </form>
          ) : (
            <button className="btn" style={{ marginTop: 14 }} onClick={() => setAdding(true)}>＋ Add a policy</button>
          )}
        </>
      )}
    </section>
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
        <DateSelect value={dob} onChange={setDob} />
        <button className="btn btn-primary" type="submit">Add</button>
      </form>

      <div className="grid">
        {family.length === 0 && <div className="card span-2 kempty">No one added yet. Add the people who matter.</div>}
        {family.map((m) => <MemberCard key={m.id} m={m} />)}
      </div>

      <InsuranceSection />
    </div>
  )
}
