import { useState } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '../../store.js'
import { toneViews } from '../../lib/tone.js'

const QUESTIONS = [
  { key: 'proud', q: 'What did you do since last time that your dying self would thank you for?' },
  { key: 'wasted', q: 'Where did your finite time leak away?' },
  { key: 'focus', q: 'If these were your last seasons, what is the ONE thing to focus on next?' },
  { key: 'who', q: 'Who deserves more of your remaining weeks?' },
  { key: 'release', q: 'What will you stop carrying?' },
]

export default function ReflectView() {
  const reviews = useStore((s) => s.reviews)
  const addReview = useStore((s) => s.addReview)
  const tone = useStore((s) => s.tone)
  const tv = toneViews(tone)
  const [answers, setAnswers] = useState({})
  const [saved, setSaved] = useState(false)

  const setAns = (k, v) => setAnswers((a) => ({ ...a, [k]: v }))

  const submit = (e) => {
    e.preventDefault()
    if (Object.values(answers).every((v) => !v?.trim())) return
    addReview(answers)
    setAnswers({})
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div>
      <h2 className="view-title">Review Ritual</h2>
      <p className="view-sub">{tv.reflect.sub}</p>

      <form className="card ritual" onSubmit={submit}>
        {QUESTIONS.map((item, i) => (
          <motion.div
            key={item.key}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            className="ritual-q"
          >
            <label className="field-label">{item.q}</label>
            <textarea
              className="field-input area"
              rows={2}
              value={answers[item.key] || ''}
              onChange={(e) => setAns(item.key, e.target.value)}
            />
          </motion.div>
        ))}
        <button className="btn btn-primary" type="submit">Record this reflection</button>
        {saved && <span className="saved-flash">Sealed. ✦</span>}
      </form>

      {reviews.length > 0 && (
        <>
          <h3 className="view-title" style={{ fontSize: '1.1rem', marginTop: 30 }}>Past reflections</h3>
          <div className="grid">
            {reviews.map((r) => (
              <div className="card" key={r.id}>
                <div className="card-title">🕯 {r.date}</div>
                {QUESTIONS.filter((q) => r.answers[q.key]).map((q) => (
                  <div key={q.key} className="past-ans">
                    <div className="pa-q">{q.q}</div>
                    <div className="pa-a">{r.answers[q.key]}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
