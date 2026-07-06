import { useEffect } from 'react'
import { motion } from 'framer-motion'
import Onboarding from './components/Onboarding.jsx'
import Shell from './components/Shell.jsx'
import { useStore } from './store.js'
import { initAccount } from './lib/sync.js'

export default function App() {
  const profile = useStore((s) => s.profile)
  const completeOnboarding = useStore((s) => s.completeOnboarding)

  // Restore the account session (HttpOnly cookie) and adopt the server copy
  // of the plan if signed in. No-op for guests.
  useEffect(() => {
    initAccount()
  }, [])

  // The scene is the shipped app art (public/*.jpg via the CSS classes); the
  // aesthetic is fixed — users can't override it.
  return (
    <>
      {/* Moonlit-graveyard scene. */}
      <div className={`scene-bg ${profile ? 'scene-app' : 'scene-onboard'}`} />
      <div className="void-bg" />
      <div className="clouds" aria-hidden="true" />
      <div className="fog" />
      <div className="app">
        <motion.div
          key={profile ? 'shell' : 'onboard'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
        >
          {profile ? <Shell /> : <Onboarding onComplete={completeOnboarding} />}
        </motion.div>
      </div>
    </>
  )
}
