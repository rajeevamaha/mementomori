// Local dev server for the "Death" coach — a thin Express wrapper around the
// shared coach core (server/coach.mjs). In production the same handlers run as
// Vercel serverless functions (api/coach/*.mjs); this file exists so
// `npm run dev` serves the identical API on :8787 for Vite to proxy.

import 'dotenv/config'
import express from 'express'
import { healthHandler, chatHandler, coachHealth, coachModel, groqModel, openrouterModel, TOOLS } from './coach.mjs'
import {
  registerHandler,
  loginHandler,
  logoutHandler,
  meHandler,
  profileHandler,
  googleStartHandler,
  googleCallbackHandler,
  stateHandler,
  convoHandler,
} from './auth.mjs'

const PORT = process.env.MBD_API_PORT || 8787

const app = express()
// 4mb: the synced app state can carry small data-URL image overrides.
app.use(express.json({ limit: '4mb' }))

app.get('/api/coach/health', healthHandler)
app.post('/api/coach/chat', chatHandler)

app.post('/api/auth/register', registerHandler)
app.post('/api/auth/login', loginHandler)
app.post('/api/auth/logout', logoutHandler)
app.get('/api/auth/me', meHandler)
app.post('/api/auth/profile', profileHandler)
app.get('/api/auth/google', googleStartHandler)
app.get('/api/auth/google/callback', googleCallbackHandler)
app.all('/api/state', stateHandler)
app.all('/api/convo', convoHandler)

// MBD_NO_LISTEN lets tests import the app without binding the port.
if (!process.env.MBD_NO_LISTEN) {
  app.listen(PORT, () => {
    const h = coachHealth()
    // Ordered by the actual failover chain: anthropic → groq → openrouter.
    const providers = [
      h.providers.anthropic ? `anthropic: ${coachModel()}` : null,
      h.providers.groq ? `groq: ${groqModel()}` : null,
      h.providers.openrouter ? `openrouter: ${openrouterModel()}` : null,
    ].filter(Boolean)
    const chain = providers.length > 1 ? providers.join(' → ') : providers[0]
    console.log(
      `[coach] Death is listening on http://localhost:${PORT} ` +
        (providers.length
          ? `(${chain} — ${TOOLS.length} tools)`
          : '(NO API KEY — set ANTHROPIC_API_KEY, GROQ_API_KEY, or OPENROUTER_API_KEY in .env)')
    )
  })
}
