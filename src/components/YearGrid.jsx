import { memo, useMemo, useState } from 'react'
import { useStore } from '../store.js'
import { parseDate } from '../lib/time.js'
import YearModal from './YearModal.jsx'

// "Your life in years" — one box per year of the chosen lifespan. Lived years
// are crossed off, the current year burns, upcoming years are clickable to add
// annual / 5-year goals. Year-scoped goals are shown ONLY here.
function YearGrid() {
  const profile = useStore((s) => s.profile)
  const goals = useStore((s) => s.goals)
  const [modal, setModal] = useState(null) // { year, age }

  const { rows, lived, total, planned } = useMemo(() => {
    const dob = parseDate(profile.dob)
    if (!dob) return { rows: [], lived: 0, total: 0, planned: 0 }
    const birthYear = dob.getFullYear()
    const le = profile.lifeExpectancy || 80
    const now = new Date()
    const ny = now.getFullYear()

    const annualBy = {} // year -> goals[]
    const fiveStartBy = {} // startYear -> goals[]
    const fiveCover = new Set() // years covered by any 5-year goal
    let planned = 0
    goals.forEach((g) => {
      if (g.horizon === 'annual' && g.year) {
        ;(annualBy[g.year] = annualBy[g.year] || []).push(g)
        planned++
      } else if (g.horizon === 'fiveyear' && g.year) {
        ;(fiveStartBy[g.year] = fiveStartBy[g.year] || []).push(g)
        for (let k = 0; k < 5; k++) fiveCover.add(g.year + k)
        planned++
      }
    })

    const cells = []
    for (let i = 0; i < le; i++) {
      const y = birthYear + i
      cells.push({
        y,
        age: i,
        lived: y < ny,
        current: y === ny,
        future: y > ny,
        annual: annualBy[y] || [],
        fiveStart: fiveStartBy[y] || [],
        inFive: fiveCover.has(y),
      })
    }
    const livedCount = cells.filter((c) => c.lived).length
    return { rows: cells, lived: livedCount, total: le, planned }
  }, [profile.dob, profile.lifeExpectancy, goals])

  return (
    <div>
      <div className="weeks-legend">
        <span className="legend-chip"><span className="legend-sq legend-cross" /> Lived ({lived})</span>
        <span className="legend-chip"><span className="legend-sq" style={{ background: 'var(--ember)', boxShadow: '0 0 6px var(--ember)' }} /> This year</span>
        <span className="legend-chip"><span className="legend-sq" style={{ background: 'rgba(233,230,218,0.18)' }} /> Yet to come ({Math.max(0, total - lived)})</span>
        <span className="legend-chip"><span className="legend-sq" style={{ background: 'rgba(217,180,106,0.5)' }} /> 5-year horizon</span>
      </div>
      <p className="month-hint">Each square is a year of your life · click an upcoming year to set an annual or 5-year goal{planned ? ` · ${planned} planned` : ''}.</p>

      <div className="year-grid">
        {rows.map((c, i) => {
          const clickable = c.future || c.current
          const cls = `yr ${c.lived ? 'lived' : ''} ${c.current ? 'current' : ''} ${c.future ? 'future' : ''} ${c.inFive ? 'in-five' : ''} ${c.fiveStart.length ? 'five-start' : ''}`
          const labels = [
            ...c.annual.map((g) => `◆ ${g.title}`),
            ...c.fiveStart.map((g) => `❯ ${g.title} (${g.year}–${g.year + 4})`),
          ]
          const tip = `Age ${c.age} · ${c.y}` + (labels.length ? ' — ' + labels.join(', ') : '')
          return (
            <button
              key={i}
              className={cls}
              title={tip}
              disabled={!clickable}
              onClick={() => clickable && setModal({ year: c.y, age: c.age })}
            >
              <span className="yr-age">{c.age}</span>
              {(c.annual.length > 0 || c.fiveStart.length > 0) && (
                <span className="yr-dots">
                  {c.annual.length > 0 && <span className="yr-dot annual" />}
                  {c.fiveStart.length > 0 && <span className="yr-dot five" />}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {modal && <YearModal year={modal.year} age={modal.age} onClose={() => setModal(null)} />}
    </div>
  )
}

export default memo(YearGrid)
