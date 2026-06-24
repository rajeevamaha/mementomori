import { motion } from 'framer-motion'
import Onboarding from './components/Onboarding.jsx'
import Shell from './components/Shell.jsx'
import { useStore } from './store.js'

export default function App() {
  const profile = useStore((s) => s.profile)
  const completeOnboarding = useStore((s) => s.completeOnboarding)

  return (
    <>
      <div className="void-bg" />
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
