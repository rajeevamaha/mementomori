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

  // Accounts are used when the server has a database + AUTH_SECRET
  // (accountsAvailable). When they are, the login gate comes first. When they
  // are NOT (e.g. this Vercel deployment has no Postgres yet), the app degrades
  // to LOCAL-ONLY mode — the original local-first experience, data in
  // localStorage — instead of hard-blocking. Provisioning a DB flips accounts
  // back on with no code change; a local profile then seeds the account on the
  // first sign-in. Order: boot → (accounts on & signed out → login) →
  // no profile → onboarding → the app.
  let screen
  let key
  if (phase === 'booting') {
    screen = <BootSplash />
    key = 'boot'
  } else if (accountsAvailable && !user) {
    screen = <AuthScreen />
    key = 'auth'
  } else if (!profile) {
    // Signed in with no profile yet, or running local-only — either way, onboard.
    screen = <Onboarding onComplete={completeOnboarding} />
    key = 'onboard'
  } else {
    screen = <Shell />
    key = 'shell'
  }
  const isApp = key === 'shell'

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
