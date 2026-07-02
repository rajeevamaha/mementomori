// Age/sex-based preventive-screening catalog + helpers for the Health tab.
//
// The catalog is GENERAL EDUCATIONAL INFORMATION drawn from public guidelines
// (USPSTF grade A/B, CDC/ACIP, American Cancer Society, ADA). It is NOT medical
// advice — the right schedule depends on personal and family history. The app
// surfaces "what to stay vigilant about at your age" and lets the user track it.
//
// Entry shape (kept in sync with the research pipeline schema):
//   { id, name, category, screensFor, sex('all'|'female'|'male'),
//     startAge, stopAge|null, frequency, frequencyMonths|null, test,
//     condition|null, guideline, note }
// `condition` gates a risk-based screen: null = general population, otherwise one
// of RISK_CONDITIONS[].key. `frequencyMonths` drives next-due math on the checklist.
//
// The catalog itself lives in ./screenings.json — a verified pass over USPSTF /
// CDC-ACIP / ACS / ADA guidelines (breast 40, colorectal 45, pneumococcal 50,
// RSV 75, osteoporosis 2025, kidney testing for diabetes/hypertension, etc.).
import SCREENINGS from './screenings.json'
export { SCREENINGS }

export const RISK_CONDITIONS = [
  { key: 'ever-smoker', label: 'Smoke(d) tobacco' },
  { key: 'diabetes', label: 'Diabetes' },
  { key: 'hypertension', label: 'High blood pressure' },
  { key: 'overweight', label: 'Overweight / obese' },
  { key: 'family-history', label: 'Family history' },
  { key: 'high-risk', label: 'Other elevated risk' },
]

export const CATEGORY_ORDER = [
  'Cardiovascular',
  'Metabolic',
  'Cancer',
  'Kidney',
  'Bone',
  'Infectious disease',
  'Sexual & reproductive',
  'Vision & hearing',
  'Mental health',
  'Immunization',
  'General',
]

// Age of the user from a YYYY-MM-DD dob (whole years).
export function ageFromDob(dob) {
  if (!dob) return null
  const b = new Date(dob)
  if (isNaN(b.getTime())) return null
  const now = new Date()
  let a = now.getFullYear() - b.getFullYear()
  const m = now.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) a--
  return a
}

// Age-based recommendation status for a screening, independent of tracking.
export function ageStatus(entry, age) {
  if (age == null) return { key: 'unknown', label: `From age ${entry.startAge}` }
  if (age < entry.startAge) {
    const yrs = entry.startAge - age
    return { key: 'upcoming', label: yrs <= 1 ? `Starts at ${entry.startAge}` : `In ${yrs} yrs · age ${entry.startAge}` }
  }
  if (entry.stopAge != null && age > entry.stopAge) {
    return { key: 'past', label: `Usually ends by ${entry.stopAge}` }
  }
  return { key: 'active', label: 'Recommended now' }
}

export function appliesToSex(entry, sex) {
  return entry.sex === 'all' || !sex || entry.sex === sex
}

// Add whole months to a YYYY-MM-DD date, returning YYYY-MM-DD.
export function addMonths(dateStr, months) {
  if (!dateStr || !months) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}

export function isOverdue(nextDue) {
  if (!nextDue) return false
  const d = new Date(nextDue)
  return !isNaN(d.getTime()) && d < new Date()
}

export const DISCLAIMER =
  'General educational information based on public guidelines (USPSTF, CDC, ACS, ADA). This is not medical advice — the right schedule depends on your personal and family history. Talk to your clinician.'
