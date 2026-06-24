import { useState } from 'react'
import { motion } from 'framer-motion'
import Reaper from './Reaper.jsx'
import { parseDate } from '../lib/time.js'

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [name, setName] = useState('')
  const [dob, setDob] = useState('')
  const [life, setLife] = useState(80)

  const today = new Date().toISOString().slice(0, 10)
  const dobValid = !!parseDate(dob) && new Date(dob) < new Date()

  const canAdvance = step === 0 ? name.trim().length > 0 : step === 1 ? dobValid : true

  const go = (delta) => {
    setDir(delta)
    setStep((s) => Math.min(2, Math.max(0, s + delta)))
  }

  const finish = () => {
    onComplete({ name: name.trim(), dob, lifeExpectancy: life })
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
          <input
            id="dob"
            type="date"
            className="field-input"
            max={today}
            value={dob}
            onChange={(e) => setDob(e.target.value)}
          />
          <p className="field-hint">
            {dob && !dobValid ? 'Choose a date in the past.' : 'We never share this — it lives only here.'}
          </p>
        </div>
      ),
    },
    {
      eyebrow: 'Chapter III — The Bargain',
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

          {step < 2 ? (
            <button className="btn btn-primary" disabled={!canAdvance} onClick={() => go(1)}>
              Continue
            </button>
          ) : (
            <button className="btn btn-primary" onClick={finish}>
              Reveal my time
            </button>
          )}
        </div>

        <p className="onboard-ethos">
          “The certainty of death and the uncertainty of its timing provides the freedom to enjoy life.”
        </p>
      </motion.div>
    </div>
  )
}
