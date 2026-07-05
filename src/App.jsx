import { useEffect } from 'react'
import { motion } from 'framer-motion'
import Onboarding from './components/Onboarding.jsx'
import Shell from './components/Shell.jsx'
import { useStore } from './store.js'
import { initAccount } from './lib/sync.js'

export default function App() {
  const profile = useStore((s) => s.profile)
  const completeOnboarding = useStore((s) => s.completeOnboarding)
  const images = useStore((s) => s.images)

  // Restore the account session (HttpOnly cookie) and adopt the server copy
  // of the plan if signed in. No-op for guests.
  useEffect(() => {
    initAccount()
  }, [])

  // Uploaded images (from Settings) win; otherwise the CSS classes use the
  // public/*.jpg files; otherwise the CSS moon + clouds carry the theme.
  const sceneImg = profile ? images?.bg : images?.hero
  const sceneStyle = sceneImg ? { backgroundImage: `url(${sceneImg})` } : undefined

  return (
    <>
      {/* Moonlit-graveyard scene. */}
      <div
        className={`scene-bg ${profile ? 'scene-app' : 'scene-onboard'}`}
        style={sceneStyle}
      />
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
