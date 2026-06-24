// Mortality math. All derived from date of birth + chosen life expectancy.

const MS_PER_DAY = 1000 * 60 * 60 * 24
const DAYS_PER_YEAR = 365.2425
const WEEKS_PER_YEAR = 52

export function parseDate(str) {
  // str = "YYYY-MM-DD"
  const d = new Date(str + 'T00:00:00')
  return isNaN(d.getTime()) ? null : d
}

export function computeLife(dobStr, lifeExpectancy = 80, now = new Date()) {
  const dob = parseDate(dobStr)
  if (!dob) return null

  const death = new Date(dob)
  death.setFullYear(death.getFullYear() + lifeExpectancy)

  const msLived = now - dob
  const msTotal = death - dob
  const msLeft = Math.max(0, death - now)

  const daysLived = Math.floor(msLived / MS_PER_DAY)
  const daysTotal = Math.round(msTotal / MS_PER_DAY)
  const daysLeft = Math.max(0, daysTotal - daysLived)

  const ageYears = msLived / (DAYS_PER_YEAR * MS_PER_DAY)
  const yearsLeft = Math.max(0, lifeExpectancy - ageYears)

  const totalWeeks = lifeExpectancy * WEEKS_PER_YEAR
  const weeksLived = Math.floor(daysLived / 7)
  const weeksLeft = Math.max(0, totalWeeks - weeksLived)

  const totalMonths = lifeExpectancy * 12
  const monthsLived = Math.min(totalMonths, Math.max(0, Math.floor(ageYears * 12)))
  const monthsLeft = Math.max(0, totalMonths - monthsLived)

  const pctLived = Math.min(100, Math.max(0, (msLived / msTotal) * 100))

  return {
    dob,
    death,
    ageYears,
    yearsLeft,
    daysLived,
    daysLeft,
    daysTotal,
    totalWeeks,
    weeksLived,
    weeksLeft,
    totalMonths,
    monthsLived,
    monthsLeft,
    pctLived,
    msLeft,
  }
}

// Live-ticking breakdown of remaining time.
export function remainingBreakdown(msLeft) {
  let s = Math.floor(msLeft / 1000)
  const seconds = s % 60
  s = Math.floor(s / 60)
  const minutes = s % 60
  s = Math.floor(s / 60)
  const hours = s % 24
  s = Math.floor(s / 24)
  const days = s

  return { days, hours, minutes, seconds }
}

export function fmt(n) {
  return Math.round(n).toLocaleString('en-US')
}
