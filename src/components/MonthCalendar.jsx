import { memo, useMemo, useState } from 'react'
import { useStore } from '../store.js'
import { parseDate } from '../lib/time.js'
import MonthModal from './MonthModal.jsx'

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// A true calendar of your remaining life, one tile per month. Lived months are
// crossed off; the 50th birthday, anniversaries, events and goal deadlines are
// marked; upcoming months are clickable to add an event or goal.
function MonthCalendar() {
  const profile = useStore((s) => s.profile)
  const events = useStore((s) => s.events)
  const goals = useStore((s) => s.goals)
  const anniversaryAsked = useStore((s) => s.anniversaryAsked)
  const addEvent = useStore((s) => s.addEvent)
  const setAnniversaryAsked = useStore((s) => s.setAnniversaryAsked)

  const [modal, setModal] = useState(null) // { year, month }
  const [annivDate, setAnnivDate] = useState('')

  const { rows } = useMemo(() => {
    const dob = parseDate(profile.dob)
    if (!dob) return { rows: [] }
    const birthYear = dob.getFullYear()
    const birthMonth = dob.getMonth()
    const le = profile.lifeExpectancy || 80
    const deathYear = birthYear + le
    const now = new Date()
    const ny = now.getFullYear()
    const nm = now.getMonth()

    // ---- markers ----
    const markers = {}
    const add = (y, m, mk) => {
      const k = `${y}-${m}`
      ;(markers[k] = markers[k] || []).push(mk)
    }
    if (le >= 50) add(birthYear + 50, birthMonth, { emoji: '🎂', label: '50th birthday' })
    events.forEach((e) => {
      const d = parseDate(e.date)
      if (!d) return
      const m = d.getMonth()
      if (e.kind === 'anniversary') {
        for (let y = d.getFullYear(); y <= deathYear; y++) add(y, m, { emoji: '❤', label: e.title || 'Anniversary' })
      } else {
        add(d.getFullYear(), m, { emoji: e.kind === 'birthday' ? '🎂' : '📌', label: e.title })
      }
    })
    goals.forEach((g) => {
      const d = parseDate(g.targetDate)
      if (!d) return
      add(d.getFullYear(), d.getMonth(), { emoji: '🎯', label: g.title })
    })

    // ---- rows ----
    const rows = []
    for (let y = birthYear; y <= deathYear; y++) {
      const tiles = []
      for (let m = 0; m < 12; m++) {
        const inLife = (y > birthYear || m >= birthMonth) && (y < deathYear || m < birthMonth)
        if (!inLife) {
          tiles.push({ y, m, empty: true })
          continue
        }
        const lived = y < ny || (y === ny && m < nm)
        const current = y === ny && m === nm
        tiles.push({ y, m, empty: false, lived, current, future: !lived && !current, mk: markers[`${y}-${m}`] || [] })
      }
      rows.push({ y, tiles })
    }
    return { rows }
  }, [profile.dob, profile.lifeExpectancy, events, goals])

  const markAnniversary = () => {
    if (annivDate) addEvent({ title: 'Anniversary', date: annivDate, kind: 'anniversary' })
    setAnniversaryAsked(true)
  }

  return (
    <div>
      {!anniversaryAsked && (
        <div className="anniv-banner">
          <span className="anniv-text">❤ Shall I mark your anniversary on your life calendar?</span>
          <input className="field-input narrow" type="date" value={annivDate} onChange={(e) => setAnnivDate(e.target.value)} />
          <button className="btn btn-primary" onClick={markAnniversary} disabled={!annivDate}>Mark it</button>
          <button className="btn btn-ghost" onClick={() => setAnniversaryAsked(true)}>Not now</button>
        </div>
      )}

      <p className="month-hint">Hover a tile for its month · click an upcoming month to add an event or goal.</p>

      <div className="month-cal-scroll">
        <div className="month-cal">
          <div className="mc-corner" />
          {MON.map((mo) => <div className="mc-mhead" key={mo}>{mo}</div>)}
          {rows.map((r) => (
            <Row key={r.y} row={r} onPick={(y, m) => setModal({ year: y, month: m })} />
          ))}
        </div>
      </div>

      {modal && <MonthModal year={modal.year} month={modal.month} onClose={() => setModal(null)} />}
    </div>
  )
}

function Row({ row, onPick }) {
  return (
    <>
      <div className="mc-year">{row.y}</div>
      {row.tiles.map((t, i) => {
        if (t.empty) return <div className="mc-tile empty" key={i} />
        const cls = `mc-tile ${t.lived ? 'lived' : ''} ${t.current ? 'current' : ''} ${t.future ? 'future' : ''} ${t.mk.length ? 'marked' : ''}`
        const clickable = t.future || t.current
        const tip = `${MON[t.m]}/${t.y}` + (t.mk.length ? ' — ' + t.mk.map((x) => x.label).join(', ') : '')
        return (
          <button
            key={i}
            className={cls}
            title={tip}
            disabled={!clickable}
            onClick={() => clickable && onPick(t.y, t.m)}
          >
            {t.mk.length > 0 && <span className="mc-mk">{t.mk[0].emoji}</span>}
          </button>
        )
      })}
    </>
  )
}

export default memo(MonthCalendar)
