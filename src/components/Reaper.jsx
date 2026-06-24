import { useState } from 'react'
import { motion } from 'framer-motion'

// The wolf grim reaper. Renders the wolf-reaper portrait from /public/reaper.png
// inside a circular, ember-lit frame that gently floats. If the image isn't
// present yet, it falls back to the original hand-drawn SVG so nothing breaks.
//
// To use your own art: drop a square image at  public/reaper.png  (the circular
// bust portrait works best). Optional full-body art → public/reaper-full.png.
export default function Reaper({ size = 120, round = true }) {
  const [imgOk, setImgOk] = useState(true)

  return (
    <motion.div
      className="reaper-wrap"
      style={{ width: size, height: size }}
      animate={{ y: [0, -8, 0] }}
      transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
    >
      {imgOk ? (
        <div className={`reaper-frame ${round ? 'round' : ''}`} style={{ width: size, height: size }}>
          <img
            src="/reaper.png"
            alt="Wolf reaper"
            className="reaper-img"
            draggable={false}
            onError={() => setImgOk(false)}
          />
          <span className="reaper-glow" />
        </div>
      ) : (
        <FallbackReaper size={size} />
      )}
    </motion.div>
  )
}

// Original SVG reaper — used only if /reaper.png is missing.
function FallbackReaper({ size }) {
  return (
    <svg viewBox="0 0 200 220" width={size} height={size * 1.1} aria-label="Grim reaper">
      <defs>
        <radialGradient id="hoodGrad" cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#1b1d27" />
          <stop offset="100%" stopColor="#050507" />
        </radialGradient>
        <radialGradient id="faceVoid" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#000" />
          <stop offset="100%" stopColor="#0a0a0e" />
        </radialGradient>
        <radialGradient id="eyeGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#e63946" />
          <stop offset="70%" stopColor="#9d1c28" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
      </defs>

      <motion.g
        style={{ transformOrigin: '150px 40px' }}
        animate={{ rotate: [-2.5, 2.5, -2.5] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <line x1="150" y1="18" x2="150" y2="200" stroke="#3a3122" strokeWidth="4" strokeLinecap="round" />
        <path d="M150 22 Q 196 30 182 70 Q 168 48 150 44 Z" fill="#c9ccd4" opacity="0.92" />
        <path d="M150 22 Q 196 30 182 70" fill="none" stroke="#eef0f4" strokeWidth="1.4" />
      </motion.g>

      <path
        d="M100 60 C 60 60, 48 110, 52 200 C 70 188, 80 200, 100 192 C 120 200, 130 188, 148 200 C 152 110, 140 60, 100 60 Z"
        fill="url(#hoodGrad)"
        stroke="#23252f"
        strokeWidth="1.5"
      />
      <path
        d="M100 26 C 64 26, 54 64, 64 92 C 74 78, 82 74, 100 74 C 118 74, 126 78, 136 92 C 146 64, 136 26, 100 26 Z"
        fill="url(#hoodGrad)"
        stroke="#2a2c38"
        strokeWidth="1.5"
      />
      <ellipse cx="100" cy="62" rx="26" ry="30" fill="url(#faceVoid)" />
      <g className="eye-glow">
        <circle cx="90" cy="60" r="9" fill="url(#eyeGrad)" filter="url(#soft)" />
        <circle cx="110" cy="60" r="9" fill="url(#eyeGrad)" filter="url(#soft)" />
        <circle cx="90" cy="60" r="3" fill="#ffd5d8" />
        <circle cx="110" cy="60" r="3" fill="#ffd5d8" />
      </g>
    </svg>
  )
}
