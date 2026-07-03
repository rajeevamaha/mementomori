import { useState } from 'react'

// Month/Day/Year three-select birth-date picker. Selects open native wheels on
// iOS/Android, so reaching a year decades back is one flick instead of endless
// scrolling through a calendar.
//
// value:    'YYYY-MM-DD' or ''
// onChange: called with the full 'YYYY-MM-DD' once all three parts are chosen,
//           and with '' when a part of a previously complete date is cleared.
//           Nothing is emitted while a fresh selection is still partial.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const pad2 = (n) => String(n).padStart(2, '0')

// Days in a month (month is 1-12). With no month yet, allow 31; with no year
// yet, assume a leap year (2000) so Feb 29 stays selectable until the year
// disambiguates it.
function daysInMonth(year, month) {
  if (!month) return 31
  return new Date(year || 2000, month, 0).getDate()
}

function parseValue(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '')
  if (!m) return { y: '', mo: '', d: '' }
  return { y: String(+m[1]), mo: String(+m[2]), d: String(+m[3]) }
}

function compose({ y, mo, d }) {
  return y && mo && d ? `${y}-${pad2(mo)}-${pad2(d)}` : ''
}

// Today in LOCAL time (toISOString would be UTC and could be tomorrow).
function localToday() {
  const t = new Date()
  return `${t.getFullYear()}-${pad2(t.getMonth() + 1)}-${pad2(t.getDate())}`
}

export default function DateSelect({
  value = '',
  onChange,
  max, // latest selectable 'YYYY-MM-DD'; defaults to today (birth dates only)
  minYear,
  id,
}) {
  const maxParts = parseValue(max || localToday())
  const maxYear = +maxParts.y
  const lowYear = minYear ?? maxYear - 110

  // Parts are strings; '' = not chosen yet. Partial states live only here and
  // never reach the parent as a bogus date.
  const [parts, setParts] = useState(() => parseValue(value))

  // External sync (render-time adjust): when the value PROP itself changes
  // (e.g. Death's update_profile writes a new dob to the store), re-derive the
  // parts — unless it already matches what our parts compose, which is just
  // our own onChange echoing back. In-progress partial edits are untouched
  // because they never change the prop.
  const [prevValue, setPrevValue] = useState(value)
  if (value !== prevValue) {
    setPrevValue(value)
    if ((value || '') !== compose(parts)) setParts(parseValue(value))
  }

  const update = (patch) => {
    const next = { ...parts, ...patch }
    // Recompute month length (leap years included); clamp an overflowing day
    // (e.g. Jan 31 -> Feb, or Feb 29 -> a non-leap year).
    if (next.d) {
      const dmax = daysInMonth(next.y ? +next.y : null, next.mo ? +next.mo : null)
      if (+next.d > dmax) next.d = String(dmax)
    }
    // Never allow a date past `max` — clamp month, then day, at the boundary.
    if (next.y === maxParts.y) {
      if (next.mo && +next.mo > +maxParts.mo) next.mo = maxParts.mo
      if (next.mo === maxParts.mo && next.d && +next.d > +maxParts.d) next.d = maxParts.d
    }
    setParts(next)
    const full = compose(next)
    if (full) {
      if (full !== (value || '')) onChange(full)
    } else if (value) {
      onChange('') // a part of a previously complete date was cleared
    }
  }

  // At the max boundary, offer only months/days that keep the date <= max.
  const atMaxYear = parts.y === maxParts.y
  const monthCount = atMaxYear ? +maxParts.mo : 12
  const dayCount = Math.min(
    daysInMonth(parts.y ? +parts.y : null, parts.mo ? +parts.mo : null),
    atMaxYear && parts.mo === maxParts.mo ? +maxParts.d : 31
  )
  const years = []
  for (let y = maxYear; y >= lowYear; y--) years.push(y)

  return (
    <div className="date-select">
      <select
        id={id}
        className="field-input"
        aria-label="Birth month"
        value={parts.mo}
        onChange={(e) => update({ mo: e.target.value })}
      >
        <option value="">Month</option>
        {MONTHS.slice(0, monthCount).map((m, i) => (
          <option key={m} value={String(i + 1)}>{m}</option>
        ))}
      </select>

      <select
        className="field-input"
        aria-label="Birth day"
        value={parts.d}
        onChange={(e) => update({ d: e.target.value })}
      >
        <option value="">Day</option>
        {Array.from({ length: dayCount }, (_, i) => (
          <option key={i + 1} value={String(i + 1)}>{i + 1}</option>
        ))}
      </select>

      <select
        className="field-input"
        aria-label="Birth year"
        value={parts.y}
        onChange={(e) => update({ y: e.target.value })}
      >
        <option value="">Year</option>
        {years.map((y) => (
          <option key={y} value={String(y)}>{y}</option>
        ))}
      </select>
    </div>
  )
}
