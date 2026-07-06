import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Onboarding from './components/Onboarding.jsx'
import Shell from './components/Shell.jsx'
import AuthScreen from './components/AuthScreen.jsx'
import Reaper from './components/Reaper.jsx'
import { useStore } from './store.js'
import { initAccount } from './lib/sync.js'

export default function App() {
  const profile = useStore((s) => s.profile)
  const user = useStore((s) => s.user)
  const completeOnboarding = useStore((s) => s.completeOnboarding)
  const [phase, setPhase] = useState('booting') // 'booting' | 'ready'
  const [accountsAvailable, setAccountsAvailable] = useState(true)

  // Restore the session (HttpOnly cookie) and adopt the account's data before
  // deciding what to show — avoids flashing the login screen for a signed-in
  // user whose cookie is still valid.
  useEffect(() => {
    initAccount()
      .then((m) => setAccountsAvailable(!!m.accountsAvailable))
      .finally(() => setPhase('ready'))
  }, [])

  // The app is account-only: nothing but the login gate is reachable until a
  // user signs in. Order: boot → (no DB → setup notice) → not signed in → login
  // → signed in but no profile → onboarding → the app.
  const isApp = !!user && !!profile
  let screen
  let key
  if (phase === 'booting') {
    screen = <BootSplash />
    key = 'boot'
  } else if (!accountsAvailable) {
    screen = <SetupNotice />
    key = 'setup'
  } else if (!user) {
    screen = <AuthScreen />
    key = 'auth'
  } else if (!profile) {
    screen = <Onboarding onComplete={completeOnboarding} />
    key = 'onboard'
  } else {
    screen = <Shell />
    key = 'shell'
  }

  return (
    <>
      {/* Moonlit-graveyard scene (fixed app art). */}
      <div className={`scene-bg ${isApp ? 'scene-app' : 'scene-onboard'}`} />
      <div className="void-bg" />
      <div className="clouds" aria-hidden="true" />
      <div className="fog" />
      <div className="app">
        <motion.div
          key={key}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
        >
          {screen}
        </motion.div>
      </div>
    </>
  )
}

// Brief splash while the session is restored, so we don't flash the login form.
function BootSplash() {
  return (
    <div className="onboard">
      <div className="onboard-card" style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <Reaper size={108} />
        </div>
        <p className="onboard-sub">Summoning Death…</p>
      </div>
    </div>
  )
}

// Shown when the server has no database, so accounts can't work yet. The app is
// account-only, so there is nothing to fall back to — this is a clear "not yet"
// rather than a broken page. (Provision Postgres + AUTH_SECRET to enable it.)
function SetupNotice() {
  return (
    <div className="onboard">
      <div className="onboard-card" style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <Reaper size={108} />
        </div>
        <div className="eyebrow">Not yet</div>
        <h2 className="onboard-title">Death is not ready.</h2>
        <p className="onboard-sub">
          This reckoning needs its ledger before it can hold your account. Return once it is bound.
        </p>
      </div>
    </div>
  )
}
