import { motion } from 'framer-motion'
import { useStore } from '../store.js'
import { isSignedIn, logout } from '../lib/sync.js'
import DashboardView from './views/DashboardView.jsx'
import GoalsView from './views/GoalsView.jsx'
import FinanceView from './views/FinanceView.jsx'
import FamilyView from './views/FamilyView.jsx'
import HealthView from './views/HealthView.jsx'
import ReflectView from './views/ReflectView.jsx'
import WillView from './views/WillView.jsx'
import SettingsView from './views/SettingsView.jsx'
import DeathDock from './DeathDock.jsx'

const NAV = [
  { key: 'dashboard', label: 'Timeline', glyph: '☠' },
  { key: 'family', label: 'Family', glyph: '🜨' },
  { key: 'health', label: 'Health', glyph: '⚕' },
  { key: 'finance', label: 'Money', glyph: '⚖' },
  { key: 'goals', label: 'Goals', glyph: '🎯' },
  { key: 'reflect', label: 'Reflect', glyph: '🕯' },
  { key: 'will', label: 'Will', glyph: '📜' },
  { key: 'settings', label: 'Settings', glyph: '⚙' },
]

// ReflectView now renders the reflection ritual + the Legacy vault (merged tab).
// 'legacy' is kept as an alias so old persisted view state / coach navigation
// still resolves to the combined screen.
const VIEWS = {
  dashboard: DashboardView,
  family: FamilyView,
  health: HealthView,
  finance: FinanceView,
  goals: GoalsView,
  reflect: ReflectView,
  legacy: ReflectView,
  will: WillView,
  settings: SettingsView,
}

function SkullMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 48 48" fill="none">
      <path
        d="M24 4C13.5 4 6 11.8 6 22c0 5.6 2.6 9.4 6 12v6a2 2 0 002 2h20a2 2 0 002-2v-6c3.4-2.6 6-6.4 6-12 0-10.2-7.5-18-18-18z"
        fill="#15161d"
        stroke="#2c2e3a"
        strokeWidth="1.5"
      />
      <circle cx="17" cy="23" r="5" fill="#e63946" />
      <circle cx="31" cy="23" r="5" fill="#e63946" />
      <path d="M24 30l-2.4 5h4.8L24 30z" fill="#2c2e3a" />
      <path d="M19 41v-3M24 41v-4M29 41v-3" stroke="#2c2e3a" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export default function Shell() {
  const view = useStore((s) => s.view)
  const setView = useStore((s) => s.setView)
  const resetAll = useStore((s) => s.resetAll)
  const profile = useStore((s) => s.profile)
  const user = useStore((s) => s.user)

  const ActiveView = VIEWS[view] || DashboardView

  const onReset = async () => {
    // Signed in: reset clears THIS DEVICE only — sign out first (which flushes
    // the current plan up) so the account's cloud copy is preserved and can be
    // restored by signing back in. Guests: it's a straight local wipe.
    if (isSignedIn()) {
      if (
        window.confirm(
          'Clear this device and sign out? Your account keeps its saved plan — sign back in to restore it.'
        )
      ) {
        await logout()
        resetAll()
      }
      return
    }
    if (window.confirm('Reset everything — profile, goals, finances, family, legacy? This cannot be undone.')) {
      resetAll()
    }
  }

  return (
    <div className="shell">
      {/* Sidebar (desktop) */}
      <aside className="sidebar">
        <div className="brand">
          <SkullMark />
          <div className="brand-text">
            <h1>MBD</h1>
            <p>memento mori</p>
          </div>
        </div>
        <nav className="nav">
          {NAV.map((n) => (
            <button
              key={n.key}
              className={`nav-item ${view === n.key ? 'active' : ''}`}
              onClick={() => setView(n.key)}
            >
              <span className="nav-glyph">{n.glyph}</span>
              <span className="nav-label">{n.label}</span>
            </button>
          ))}
        </nav>
        <button
          className="account-chip"
          onClick={() => setView('settings')}
          title={user ? 'Manage your account in Settings' : 'Sign in from Settings'}
        >
          ⚷ {user ? user.name || user.login : 'Sign in'}
        </button>
        <button className="reset-link sidebar-reset" onClick={onReset}>
          ↺ Reset
        </button>
      </aside>

      {/* Main content */}
      <main className="main">
        <motion.div
          key={view}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: 'easeOut' }}
          className="view"
        >
          <ActiveView />
        </motion.div>
      </main>

      {/* Death — persistent side dock, present on every view */}
      <DeathDock />

      {/* Bottom tab bar (mobile) */}
      <nav className="tabbar">
        {NAV.map((n) => (
          <button
            key={n.key}
            className={`tab ${view === n.key ? 'active' : ''}`}
            onClick={() => setView(n.key)}
          >
            <span className="tab-glyph">{n.glyph}</span>
            <span className="tab-label">{n.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
