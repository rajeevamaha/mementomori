import { motion } from 'framer-motion'
import Reaper from './Reaper.jsx'
import AccountPanel from './AccountPanel.jsx'

// The gate. Shown before anything else when no one is signed in — the app is
// account-only, so this is the first thing a visitor meets. AccountPanel holds
// the sign-in / create-account form (and Google, when configured); the moment
// it authenticates, App advances past this screen.
export default function AuthScreen() {
  return (
    <div className="onboard">
      <motion.div
        className="onboard-card"
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
          <Reaper size={108} />
        </div>
        <div className="eyebrow">Memento mori</div>
        <h2 className="onboard-title">Death keeps the ledger.</h2>
        <p className="onboard-sub">
          Sign in to face the time you have left. Your plan is kept safe and follows you wherever you go.
        </p>

        <AccountPanel compact />

        <p className="onboard-ethos">
          “The certainty of death and the uncertainty of its timing provides the freedom to enjoy life.”
        </p>
      </motion.div>
    </div>
  )
}
