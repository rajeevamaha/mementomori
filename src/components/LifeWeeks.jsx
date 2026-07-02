import { memo, useState } from 'react'
import MonthCalendar from './MonthCalendar.jsx'
import YearGrid from './YearGrid.jsx'

// Life grid: "months" is a full calendar (MonthCalendar) with milestones;
// "years" (YearGrid) is one box per year with annual / 5-year goals shown only
// there. (The dense weekly grid was removed.)
function LifeWeeks({ totalMonths, monthsLived }) {
  const [mode, setMode] = useState('months')

  const MODES = [
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
