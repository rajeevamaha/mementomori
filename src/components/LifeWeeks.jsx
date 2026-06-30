import { memo, useState } from 'react'
import { motion } from 'framer-motion'
import MonthCalendar from './MonthCalendar.jsx'
import YearGrid from './YearGrid.jsx'

// "Weeks" is a dense since-birth grid; "months" is a full calendar (MonthCalendar)
// with milestones; "years" (YearGrid) is one box per year with annual / 5-year
// goals shown only there.
function LifeWeeks({ totalWeeks, weeksLived, totalMonths, monthsLived }) {
  const [mode, setMode] = useState('weeks')

  const cells = []
  const cap = Math.min(totalWeeks, 110 * 52)
  for (let i = 0; i < cap; i++) {
    let cls = 'wk wk-future'
    if (i < weeksLived) cls = 'wk wk-lived'
    if (i === weeksLived) cls = 'wk wk-now'
    cells.push(cls)
  }

  const MODES = [
    { key: 'weeks', label: 'Weeks' },
    { key: 'months', label: 'Months' },
    { key: 'years', label: 'Years' },
  ]

  return (
    <div className="card span-2">
      <div className="card-title life-title">
        <span>⌛ Your life in {mode}</span>
        <div className="seg">
          {MODES.map((m) => (
            <button key={m.key} className={`seg-btn ${mode === m.key ? 'active' : ''}`} onClick={() => setMode(m.key)}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'weeks' && (
        <>
          <div className="weeks-legend">
            <span className="legend-chip">
              <span className="legend-sq" style={{ background: 'var(--ash-faint)' }} /> Spent ({weeksLived.toLocaleString()})
            </span>
            <span className="legend-chip">
              <span className="legend-sq" style={{ background: 'var(--ember)', boxShadow: '0 0 6px var(--ember)' }} /> This week
            </span>
            <span className="legend-chip">
              <span className="legend-sq" style={{ background: 'rgba(233,230,218,0.18)' }} /> Yet to come ({Math.max(0, totalWeeks - weeksLived).toLocaleString()})
            </span>
          </div>
          <motion.div
            key="weeks"
            className="life-grid weeks"
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.0008 } } }}
          >
            {cells.map((cls, i) => (
              <motion.div
                key={i}
                className={cls}
                variants={{ hidden: { opacity: 0, scale: 0.4 }, show: { opacity: 1, scale: 1 } }}
              />
            ))}
          </motion.div>
        </>
      )}

      {mode === 'months' && (
        <>
          <div className="weeks-legend">
            <span className="legend-chip">
              <span className="legend-sq legend-cross" /> Lived ({monthsLived.toLocaleString()})
            </span>
            <span className="legend-chip">
              <span className="legend-sq" style={{ background: 'var(--ember)', boxShadow: '0 0 6px var(--ember)' }} /> This month
            </span>
            <span className="legend-chip">
              <span className="legend-sq" style={{ background: 'rgba(233,230,218,0.18)' }} /> Yet to come ({Math.max(0, totalMonths - monthsLived).toLocaleString()})
            </span>
          </div>
          <MonthCalendar />
        </>
      )}

      {mode === 'years' && <YearGrid />}
    </div>
  )
}

export default memo(LifeWeeks)
