import { useState } from 'react'
import { motion } from 'framer-motion'
import Reaper from './Reaper.jsx'
import DateSelect from './DateSelect.jsx'
import AccountPanel from './AccountPanel.jsx'
import { parseDate } from '../lib/time.js'

const LAST = 3 // index of the final step (0-based); keep in sync with `steps`

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0)
  const [signIn, setSignIn] = useState(false) // returning user: sign in instead
  const [dir, setDir] = useState(1)
  const [name, setName] = useState('')
  const [dob, setDob] = useState('')
  const [sex, setSex] = useState(null) // null = not chosen; 'female' | 'male' | '' (declined)
  const [life, setLife] = useState(80)

  // Compare via the same local-midnight parse as lib/time.js — new Date(dob)
  // parses as UTC and would accept "tomorrow" at night in western timezones.
  const parsedDob = parseDate(dob)
  const dobValid = !!parsedDob && parsedDob <= new Date()

  const canAdvance =
    step === 0 ? name.trim().length > 0 : step === 1 ? dobValid : step === 2 ? sex !== null : true

  const go = (delta) => {
    setDir(delta)
    setStep((s) => Math.min(LAST, Math.max(0, s + delta)))
  }

  const finish = () => {
    onComplete({ name: name.trim(), dob, sex: sex || '', lifeExpectancy: life })
  }

  const steps = [
    {
      eyebrow: 'Chapter I — Identity',
      title: 'Death knows no name.\nWhat is yours?',
      sub: 'Before we count what remains, the reaper would like to know who walks this path.',
      body: (
        <div>
          <label className="field-label" htmlFor="name">Your name</label>
          <input
            id="name"
            className="field-input"
            placeholder="e.g. Rajeev"
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && canAdvance && go(1)}
          />
          <p className="field-hint">Used only to greet you. Stored on this device alone.</p>
        </div>
      ),
    },
    {
      eyebrow: 'Chapter II — Arrival',
      title: 'When did your\nhourglass turn?',
      sub: 'The day you arrived sets the sand falling. Every grain since has been spent.',
      body: (
        <div>
          <label className="field-label" htmlFor="dob">Date of birth</label>
          <DateSelect id="dob" value={dob} onChange={setDob} />
          <p className="field-hint">
            {dob && !dobValid ? 'Choose a date in the past.' : 'We never share this — it lives only here.'}
          </p>
        </div>
      ),
    },
    {
      eyebrow: 'Chapter III — The Vessel',
      title: 'What vessel carries\nyou through this?',
      sub: "Some of the body's warnings are written by sex. Tell the reaper which, and it will know what to watch for.",
      body: (
        <div>
          <label className="field-label">Sex at birth</label>
          <div className="sex-choice">
            {[
              { k: 'female', l: 'Female' },
              { k: 'male', l: 'Male' },
              { k: '', l: 'Prefer not to say' },
            ].map((o) => (
              <button
                key={o.l}
                type="button"
                className={`btn ${sex === o.k ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setSex(o.k)}
              >
                {o.l}
              </button>
            ))}
          </div>
          <p className="field-hint">
            Used only to tailor age-appropriate health screenings (mammograms, prostate, and the like). Stored on this device alone.
          </p>
        </div>
      ),
    },
    {
      eyebrow: 'Chapter IV — The Bargain',
      title: 'How long do you\nintend to last?',
      sub: 'The world average is roughly 73. The hopeful aim for 80, the stubborn for 90. Set your wager.',
      body: (
        <div>
          <label className="field-label">Life expectancy</label>
          <div className="range-row">
            <input
              type="range"
              min="40"
              max="110"
              value={life}
              onChange={(e) => setLife(Number(e.target.value))}
            />
            <div className="range-value">
              {life}<small>yrs</small>
            </div>
          </div>
          <p className="field-hint">You can change this any time. The reaper is flexible — for now.</p>
        </div>
      ),
    },
  ]

  const cur = steps[step]

  // Returning user path: sign in and the account's plan is adopted — App
  // switches to the Shell the moment the profile lands in the store.
  if (signIn) {
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
          <div className="eyebrow">The reaper remembers</div>
          <h2 className="onboard-title">Welcome back.</h2>
          <p className="onboard-sub">Sign in and your plan — and Death's memory of you — returns.</p>
          <AccountPanel compact />
          <div className="onboard-actions">
            <button className="btn btn-ghost" onClick={() => setSignIn(false)}>← I'm new here</button>
          </div>
        </motion.div>
      </div>
    )
  }

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

        {/* Keyed enter-animation per step — no AnimatePresence (its mode="wait"
            exit tracking hangs here); changing key remounts and re-runs initial. */}
        <motion.div
          key={step}
          initial={{ opacity: 0, x: dir > 0 ? 50 : -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        >
          <div className="eyebrow">{cur.eyebrow}</div>
          <h2 className="onboard-title" style={{ whiteSpace: 'pre-line' }}>{cur.title}</h2>
          <p className="onboard-sub">{cur.sub}</p>
          {cur.body}
        </motion.div>

        <div className="onboard-actions">
          {step > 0 ? (
            <button className="btn btn-ghost" onClick={() => go(-1)}>Back</button>
          ) : (
            <span className="steps-dots">
              {steps.map((_, i) => (
                <span key={i} className={`dot ${i === step ? 'active' : ''}`} />
              ))}
            </span>
          )}

          {step > 0 && (
            <span className="steps-dots">
              {steps.map((_, i) => (
                <span key={i} className={`dot ${i === step ? 'active' : ''}`} />
              ))}
            </span>
          )}

          {step < LAST ? (
            <button className="btn btn-primary" disabled={!canAdvance} onClick={() => go(1)}>
              Continue
            </button>
          ) : (
            <button className="btn btn-primary" onClick={finish}>
              Reveal my time
            </button>
          )}
        </div>

        {step === 0 && (
          <p className="onboard-signin">
            Been here before?{' '}
            <button className="link-btn" onClick={() => setSignIn(true)}>
              Sign in
            </button>
          </p>
        )}

        <p className="onboard-ethos">
          “The certainty of death and the uncertainty of its timing provides the freedom to enjoy life.”
        </p>
      </motion.div>
    </div>
  )
}
