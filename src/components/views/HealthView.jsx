import { useState } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '../../store.js'
import { toneViews } from '../../lib/tone.js'
import {
  SCREENINGS,
  RISK_CONDITIONS,
  CATEGORY_ORDER,
  ageFromDob,
  ageStatus,
  appliesToSex,
  addMonths,
  isOverdue,
  DISCLAIMER,
} from '../../lib/health.js'

const today = () => new Date().toISOString().slice(0, 10)
const STATUS_ORDER = { active: 0, upcoming: 1, unknown: 2, past: 3 }

function ScreeningCard({ entry, age }) {
  const item = useStore((s) => s.health.items[entry.id])
  const setHealthItem = useStore((s) => s.setHealthItem)
  const clearHealthItem = useStore((s) => s.clearHealthItem)
  const [mode, setMode] = useState(null) // 'done' | 'schedule' | null
  const [date, setDate] = useState(today())
  const st = ageStatus(entry, age)

  const confirmDone = () => {
    setHealthItem(entry.id, {
      status: 'done',
      lastDone: date,
      nextDue: addMonths(date, entry.frequencyMonths),
      scheduledFor: '',
    })
    setMode(null)
  }
  const confirmSchedule = () => {
    setHealthItem(entry.id, { status: 'scheduled', scheduledFor: date })
    setMode(null)
  }
  const openMode = (m) => { setDate(today()); setMode(m) }

  const overdue = item?.status === 'done' && isOverdue(item.nextDue)

  return (
    <motion.div layout className={`card screen-card status-${st.key}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="screen-head">
        <div className="screen-name">
          {entry.name}
          {entry.sex !== 'all' && <span className="sex-tag" title={entry.sex}>{entry.sex === 'female' ? '♀' : '♂'}</span>}
        </div>
        <span className={`pill pill-${st.key}`}>{st.label}</span>
      </div>

      <div className="screen-for">{entry.screensFor}</div>
      <div className="screen-meta">
        <span className="sm-freq">🗓 {entry.frequency}</span>
        <span className="sm-test">{entry.test}</span>
      </div>
      {entry.note && <p className="screen-note">{entry.note}</p>}
      <div className="screen-src">{entry.guideline}</div>

      <div className="screen-track">
        {!item && !mode && (
          <>
            <button className="mini" onClick={() => openMode('done')}>✓ Mark done</button>
            <button className="mini" onClick={() => openMode('schedule')}>🗓 Schedule</button>
          </>
        )}
        {mode && (
          <div className="track-form">
            <input className="field-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <button className="mini" onClick={mode === 'done' ? confirmDone : confirmSchedule}>Save</button>
            <button className="mini" onClick={() => setMode(null)}>Cancel</button>
          </div>
        )}
        {item?.status === 'done' && !mode && (
          <div className="track-state">
            <span className="ts-done">✓ Done {item.lastDone}</span>
            {item.nextDue && <span className={overdue ? 'ts-overdue' : 'ts-ok'}>{overdue ? '⚠ due again' : 'next'} {item.nextDue}</span>}
            <button className="mini" onClick={() => openMode('done')}>Update</button>
            <button className="mini danger" onClick={() => clearHealthItem(entry.id)}>✕</button>
          </div>
        )}
        {item?.status === 'scheduled' && !mode && (
          <div className="track-state">
            <span className="ts-sched">🗓 Booked {item.scheduledFor}</span>
            <button className="mini" onClick={() => openMode('done')}>Mark done</button>
            <button className="mini danger" onClick={() => clearHealthItem(entry.id)}>✕</button>
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default function HealthView() {
  const profile = useStore((s) => s.profile)
  const updateProfile = useStore((s) => s.updateProfile)
  const conditions = useStore((s) => s.health.conditions)
  const items = useStore((s) => s.health.items)
  const toggleCondition = useStore((s) => s.toggleCondition)
  const tone = useStore((s) => s.tone)
  const tv = toneViews(tone)

  const age = ageFromDob(profile?.dob)
  const sex = profile?.sex || ''

  const applicable = SCREENINGS.filter(
    (e) => appliesToSex(e, sex) && (e.condition == null || conditions.includes(e.condition))
  )

  const dueNow = applicable.filter((e) => {
    if (ageStatus(e, age).key !== 'active') return false
    const it = items[e.id]
    if (it?.status === 'done' && !isOverdue(it.nextDue)) return false
    if (it?.status === 'scheduled') return false
    return true
  })

  const groups = CATEGORY_ORDER.map((cat) => ({
    cat,
    entries: applicable
      .filter((e) => e.category === cat)
      .sort((a, b) => STATUS_ORDER[ageStatus(a, age).key] - STATUS_ORDER[ageStatus(b, age).key]),
  })).filter((g) => g.entries.length)

  return (
    <div>
      <h2 className="view-title">Health Watch</h2>
      <p className="view-sub">{tv.health.sub}</p>

      {!sex && (
        <div className="card health-setup">
          <div className="hs-q">To tailor sex-specific screenings (mammograms, cervical, prostate, aneurysm), tell me your sex at birth:</div>
          <div className="ip-actions">
            <button className="btn btn-primary" onClick={() => updateProfile({ sex: 'female' })}>Female</button>
            <button className="btn btn-primary" onClick={() => updateProfile({ sex: 'male' })}>Male</button>
          </div>
        </div>
      )}

      <div className="health-topbar">
        <div className="health-summary">
          {age != null ? (
            <>
              <strong>{dueNow.length}</strong> screening{dueNow.length === 1 ? '' : 's'} to act on
              <span className="hs-age"> · age {age}{sex ? ` · ${sex}` : ''}</span>
            </>
          ) : (
            <>Set your date of birth to see age-based screenings.</>
          )}
        </div>
        {sex && <button className="mini" onClick={() => updateProfile({ sex: '' })}>change sex</button>}
      </div>

      <div className="risk-row">
        <span className="risk-label">Flag your risks to unlock the screenings that apply to you:</span>
        <div className="risk-chips">
          {RISK_CONDITIONS.map((rc) => (
            <button
              key={rc.key}
              className={`risk-chip ${conditions.includes(rc.key) ? 'on' : ''}`}
              onClick={() => toggleCondition(rc.key)}
            >
              {rc.label}
            </button>
          ))}
        </div>
      </div>

      {groups.map((g) => (
        <section key={g.cat} className="screen-group">
          <h3 className="section-title">{g.cat}</h3>
          <div className="grid">
            {g.entries.map((e) => <ScreeningCard key={e.id} entry={e} age={age} />)}
          </div>
        </section>
      ))}

      <p className="med-disclaimer">{DISCLAIMER}</p>
    </div>
  )
}
