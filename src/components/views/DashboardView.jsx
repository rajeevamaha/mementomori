import { useState } from 'react'
import { motion } from 'framer-motion'
import Reaper from '../Reaper.jsx'
import LifeWeeks from '../LifeWeeks.jsx'
import { computeLife, remainingBreakdown, fmt } from '../../lib/time.js'
import { useNow } from '../../lib/storage.js'
import { useStore, financeTotals } from '../../store.js'
import { toneCopy, toneStart } from '../../lib/tone.js'

const QUOTES = [
  { t: 'The certainty of death and the uncertainty of its timing provides the freedom to enjoy life.', a: 'Paul Beard' },
  { t: 'It is not death that a man should fear, but he should fear never beginning to live.', a: 'Marcus Aurelius' },
  { t: 'You could leave life right now. Let that determine what you do and say and think.', a: 'Marcus Aurelius' },
  { t: 'The trouble is, you think you have time.', a: 'Buddha (attributed)' },
  { t: 'Remember that you are mortal — so make the most of your time.', a: 'Memento Mori' },
]

const fade = {
  hidden: { opacity: 0, y: 18 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: 0.06 * i, duration: 0.5, ease: 'easeOut' } }),
}

export default function DashboardView() {
  const now = useNow(1000)
  const profile = useStore((s) => s.profile)
  const goals = useStore((s) => s.goals)
  const finance = useStore((s) => s.finance)
  const family = useStore((s) => s.family)
  const setView = useStore((s) => s.setView)
  const setDockOpen = useStore((s) => s.setDockOpen)
  const images = useStore((s) => s.images)
  const tone = useStore((s) => s.tone)
  const t = toneCopy(tone)
  const start = toneStart(tone)

  const life = computeLife(profile.dob, profile.lifeExpectancy, now)
  if (!life) return <p>Check your birth date in the profile.</p>

  const rem = remainingBreakdown(life.msLeft)
  const quote = QUOTES[life.daysLived % QUOTES.length]
  const gone = life.msLeft <= 0

  // Year-scoped (annual / 5-year) goals are excluded from the kanban-style stats.
  const planGoals = goals.filter((g) => !g.horizon)
  const active = planGoals.filter((g) => g.status === 'ACTIVE').length
  const done = planGoals.filter((g) => g.status === 'COMPLETED').length
  const goalPct = planGoals.length ? Math.round((done / planGoals.length) * 100) : 0
  const { netWorth } = financeTotals(finance)

  const milestones = family
    .flatMap((m) => m.milestones.map((ms) => ({ ...ms, who: m.name })))
    .filter((ms) => ms.date)
    .sort((a, b) => a.date.localeCompare(b.date))
  const nextMilestone = milestones.find((ms) => ms.date >= new Date().toISOString().slice(0, 10))

  const isEmpty =
    goals.length === 0 &&
    family.length === 0 &&
    finance.assets.length === 0 &&
    finance.liabilities.length === 0 &&
    (finance.retirementTarget || 0) === 0

  return (
    <div>
      {/* Hero banner — greeting + actions on the left, the wolf reaper on the right */}
      <motion.section className="hero" variants={fade} initial="hidden" animate="show">
        <div className="hero-copy">
          <h2 className="greeting">
            {gone ? t.gone : t.running}
            <span className="name">{profile.name}</span>.
          </h2>
          <p className="greeting-sub">
            {t.sub.replace('{age}', fmt(life.ageYears))} {isEmpty ? '' : '— spend it like it is counted, because it is.'}
          </p>
          <div className="hero-cta">
            <button className="btn btn-primary" onClick={() => setView('goals')}>Set a goal →</button>
            <button className="btn btn-ghost" onClick={() => setView('family')}>Add a loved one</button>
            <button className="btn btn-ghost" onClick={() => setView('finance')}>Map finances</button>
          </div>
        </div>
        <HeroArt heroImg={images?.hero} />
      </motion.section>

      <div className="grid">
        {/* Countdown hero */}
        <motion.div className="card" variants={fade} custom={2} initial="hidden" animate="show">
          <div className="card-title">☠ Time remaining</div>
          <div className="countdown-hero">
            <Reaper size={120} />
            <div className="count-main">
              <div className="count-big">
                {fmt(life.yearsLeft)}<span className="unit">years left</span>
              </div>
              <div className="count-label">≈ {fmt(life.daysLeft)} days · {fmt(life.weeksLeft)} weeks</div>
              <div className="ticks">
                <div className="tick"><div className="v">{fmt(rem.days)}</div><div className="k">days</div></div>
                <div className="tick"><div className="v">{String(rem.hours).padStart(2, '0')}</div><div className="k">hrs</div></div>
                <div className="tick"><div className="v">{String(rem.minutes).padStart(2, '0')}</div><div className="k">min</div></div>
                <div className="tick"><div className="v sec">{String(rem.seconds).padStart(2, '0')}</div><div className="k">sec</div></div>
              </div>
            </div>
          </div>
          <div className="lifebar">
            <div className="lifebar-track">
              <motion.div
                className="lifebar-fill"
                initial={{ width: 0 }}
                animate={{ width: `${life.pctLived}%` }}
                transition={{ duration: 1.4, ease: 'easeOut' }}
              />
            </div>
            <div className="lifebar-meta">
              <span>{life.pctLived.toFixed(1)}% spent</span>
              <span>{(100 - life.pctLived).toFixed(1)}% remaining</span>
            </div>
          </div>
        </motion.div>

        {/* Cross-module summary */}
        <motion.div className="card" variants={fade} custom={3} initial="hidden" animate="show">
          <div className="card-title">⚰ Where you stand</div>
          <div className="stat-grid">
            <button className="stat ember linklike" onClick={() => setView('goals')}>
              <div className="v">{active}</div>
              <div className="k">Active goals</div>
            </button>
            <button className="stat spectral linklike" onClick={() => setView('goals')}>
              <div className="v">{goalPct}%</div>
              <div className="k">Goals done</div>
            </button>
            <button className="stat gold linklike" onClick={() => setView('finance')}>
              <div className="v">{netWorth >= 0 ? '' : '-'}${fmt(Math.abs(netWorth))}</div>
              <div className="k">Net worth</div>
            </button>
            <button className="stat linklike" onClick={() => setView('family')}>
              <div className="v">{family.length}</div>
              <div className="k">Loved ones</div>
            </button>
          </div>

          <div className="next-milestone">
            {nextMilestone ? (
              <>
                <span className="nm-label">Next milestone</span>
                <span className="nm-text">{nextMilestone.title} · {nextMilestone.who} · {nextMilestone.date}</span>
              </>
            ) : (
              <span className="nm-label">No upcoming family milestones yet.</span>
            )}
          </div>

          <button className="btn btn-primary coach-cta" onClick={() => setDockOpen(true)}>
            Ask Death what to focus on →
          </button>
        </motion.div>

        <LifeWeeks
          totalWeeks={life.totalWeeks}
          weeksLived={life.weeksLived}
          totalMonths={life.totalMonths}
          monthsLived={life.monthsLived}
        />

        <motion.div className="card quote-card span-2" variants={fade} custom={4} initial="hidden" animate="show">
          <p className="quote-text">“{quote.t}”</p>
          <div className="quote-author">— {quote.a}</div>
        </motion.div>
      </div>
    </div>
  )
}

// The big wolf figure in the hero. Prefers the user's uploaded image, then the
// shipped default (/hero-wolf.png), then the floating SVG wolf so the default
// design always looks complete.
function HeroArt({ heroImg }) {
  const [failed, setFailed] = useState(false)
  const src = heroImg || '/hero-wolf.png'
  if (failed && !heroImg) {
    return (
      <div className="hero-art hero-art-svg">
        <Reaper size={230} />
      </div>
    )
  }
  return (
    <div className="hero-art">
      <img
        className="hero-art-img"
        src={src}
        alt="The wolf reaper"
        draggable={false}
        onError={() => setFailed(true)}
      />
    </div>
  )
}
