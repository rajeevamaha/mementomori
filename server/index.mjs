// Local dev server for the "Death" coach — a thin Express wrapper around the
// shared coach core (server/coach.mjs). In production the same handlers run as
// Vercel serverless functions (api/coach/*.mjs); this file exists so
// `npm run dev` serves the identical API on :8787 for Vite to proxy.

import 'dotenv/config'
import express from 'express'
import { healthHandler, chatHandler, coachHealth, coachModel, groqModel, TOOLS } from './coach.mjs'

const PORT = process.env.MBD_API_PORT || 8787

const app = express()
app.use(express.json({ limit: '2mb' }))

app.get('/api/coach/health', healthHandler)
app.post('/api/coach/chat', chatHandler)

// MBD_NO_LISTEN lets tests import the app without binding the port.
if (!process.env.MBD_NO_LISTEN) {
  app.listen(PORT, () => {
    const h = coachHealth()
    const providers = [
      h.providers.anthropic ? `anthropic: ${coachModel()}` : null,
      h.providers.groq ? `groq: ${groqModel()}${h.providers.anthropic ? ' (fallback)' : ''}` : null,
    ].filter(Boolean)
    console.log(
      `[coach] Death is listening on http://localhost:${PORT} ` +
        (providers.length
          ? `(${providers.join(', ')} — ${TOOLS.length} tools)`
          : '(NO API KEY — set ANTHROPIC_API_KEY or GROQ_API_KEY in .env)')
    )
  })
}
