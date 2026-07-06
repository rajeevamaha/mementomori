import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

// The wolf grim reaper — the shipped app art (public/reaper.png) with a
// self-contained SVG fallback, shown inside a circular, ember-lit frame that
// gently floats. The aesthetic is fixed — users can't swap it.
const WOLF_SVG = `<svg width="100%" height="100%" preserveAspectRatio="xMidYMid slice" viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" role="img"><title>Grim reaper wolf</title><desc>A menacing grey wolf face with glowing red eyes inside a tattered black hood, a bone scythe curving behind, on a dark backdrop.</desc><defs><radialGradient id="r1_bg" cx="50%" cy="42%" r="68%"><stop offset="0%" stop-color="#14151c"/><stop offset="60%" stop-color="#0d0e13"/><stop offset="100%" stop-color="#0a0a0e"/></radialGradient><linearGradient id="r1_hood" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1b1d27"/><stop offset="100%" stop-color="#0a0a0e"/></linearGradient><radialGradient id="r1_face" cx="50%" cy="38%" r="70%"><stop offset="0%" stop-color="#aab0bb"/><stop offset="45%" stop-color="#6c6f7a"/><stop offset="80%" stop-color="#3a3d47"/><stop offset="100%" stop-color="#2a2d36"/></radialGradient><linearGradient id="r1_snout" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#e9e6da"/><stop offset="55%" stop-color="#9aa0ab"/><stop offset="100%" stop-color="#4a4d57"/></linearGradient><linearGradient id="r1_ear" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#9aa0ab"/><stop offset="100%" stop-color="#2a2d36"/></linearGradient><linearGradient id="r1_scythe" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#c9ccd4"/><stop offset="60%" stop-color="#8a8e98"/><stop offset="100%" stop-color="#3a3d47"/></linearGradient><radialGradient id="r1_eye" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#ff6b75"/><stop offset="40%" stop-color="#e63946"/><stop offset="100%" stop-color="#7a1620"/></radialGradient><filter id="r1_glow" x="-120%" y="-120%" width="340%" height="340%"><feGaussianBlur stdDeviation="3.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><filter id="r1_soft" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="1.1"/></filter></defs><rect x="0" y="0" width="240" height="240" fill="url(#r1_bg)"/><g opacity="0.85"><path d="M205 30 C150 40 120 88 120 132 C120 96 148 56 196 44 C170 50 150 70 142 96 C156 64 184 44 214 44 Z" fill="url(#r1_scythe)" filter="url(#r1_soft)"/><rect x="196" y="36" width="7" height="150" rx="3" transform="rotate(14 199 110)" fill="#2a2d36"/><rect x="197.5" y="36" width="2.5" height="150" transform="rotate(14 199 110)" fill="#4a4d57"/></g><path d="M60 210 C36 150 40 96 78 60 C100 40 140 40 162 60 C200 96 204 150 180 210 C150 196 90 196 60 210 Z" fill="url(#r1_hood)"/><path d="M84 64 C70 96 70 150 86 200 L100 200 C84 150 86 100 102 70 Z" fill="#000" opacity="0.55"/><path d="M156 64 C170 96 170 150 154 200 L140 200 C156 150 154 100 138 70 Z" fill="#000" opacity="0.55"/><path d="M82 56 C70 44 58 42 50 48 C66 54 74 66 80 80 Z" fill="url(#r1_ear)"/><path d="M158 56 C170 44 182 42 190 48 C174 54 166 66 160 80 Z" fill="url(#r1_ear)"/><path d="M84 70 C76 64 70 64 66 68 C74 70 80 78 84 86 Z" fill="#2a2d36"/><path d="M156 70 C164 64 170 64 174 68 C166 70 160 78 156 86 Z" fill="#2a2d36"/><ellipse cx="120" cy="126" rx="46" ry="56" fill="url(#r1_face)"/><path d="M120 80 C104 84 92 100 90 124 C90 100 102 86 120 82 C138 86 150 100 150 124 C148 100 136 84 120 80 Z" fill="#2a2d36" opacity="0.6"/><path d="M120 96 C112 110 110 140 112 168 C108 144 110 112 120 96 Z" fill="#e9e6da" opacity="0.5"/><path d="M120 96 C128 110 130 140 128 168 C132 144 130 112 120 96 Z" fill="#2a2d36" opacity="0.45"/><path d="M104 168 C108 184 116 192 120 192 C124 192 132 184 136 168 C132 158 126 152 120 152 C114 152 108 158 104 168 Z" fill="url(#r1_snout)"/><path d="M112 182 C112 188 116 192 120 192 C124 192 128 188 128 182 C128 178 124 176 120 176 C116 176 112 178 112 182 Z" fill="#15161c"/><path d="M120 176 C124 176 128 178 128 182 C126 180 122 179 120 179 C118 179 114 180 112 182 C112 178 116 176 120 176 Z" fill="#3a3d47"/><path d="M88 132 C82 130 76 132 74 138 C82 138 88 140 92 144 Z" fill="#2a2d36" opacity="0.7"/><path d="M152 132 C158 130 164 132 166 138 C158 138 152 140 148 144 Z" fill="#2a2d36" opacity="0.7"/><g filter="url(#r1_glow)"><ellipse cx="101" cy="128" rx="9.5" ry="7" fill="url(#r1_eye)"/><ellipse cx="139" cy="128" rx="9.5" ry="7" fill="url(#r1_eye)"/></g><ellipse cx="99.5" cy="126" rx="3" ry="2.4" fill="#ff6b75"/><ellipse cx="137.5" cy="126" rx="3" ry="2.4" fill="#ff6b75"/><path d="M90 122 C95 117 107 117 112 122 C106 120 96 120 90 122 Z" fill="#15161c"/><path d="M128 122 C133 117 145 117 150 122 C144 120 134 120 128 122 Z" fill="#15161c"/><path d="M60 210 C72 198 96 194 120 194 C144 194 168 198 180 210 C150 202 90 202 60 210 Z" fill="#000" opacity="0.6"/></svg>`

export default function Reaper({ size = 120, round = true }) {
  // The shipped wolf art; falls back to the inline SVG if the file is missing.
  const src = '/reaper.png'
  const [imgOk, setImgOk] = useState(true)
  useEffect(() => setImgOk(true), [src]) // re-try when the source changes

  return (
    <motion.div
      className="reaper-wrap"
      style={{ width: size, height: size }}
      animate={{ y: [0, -8, 0] }}
      transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
    >
      <div className={`reaper-frame ${round ? 'round' : ''}`} style={{ width: size, height: size }}>
        {imgOk ? (
          <img
            src={src}
            alt="Wolf reaper"
            className="reaper-img"
            draggable={false}
            onError={() => setImgOk(false)}
          />
        ) : (
          <div className="reaper-svg" style={{ width: '100%', height: '100%' }} dangerouslySetInnerHTML={{ __html: WOLF_SVG }} />
        )}
        <span className="reaper-glow" />
      </div>
    </motion.div>
  )
}
