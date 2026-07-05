// Account system for Motivation by Death — sessions, password + Google login,
// and per-user sync of app state + Death's conversation.
//
// Framework-agnostic like server/coach.mjs: every export is a (req, res)
// handler that runs under both the local Express server and Vercel functions.
// No auth libraries — sessions are HMAC-signed cookies (node:crypto), passwords
// are scrypt hashes, Google is the plain OAuth 2.0 code flow over fetch().
//
// Env: AUTH_SECRET (required — signs sessions), GOOGLE_CLIENT_ID +
// GOOGLE_CLIENT_SECRET (optional — enables "Continue with Google").

import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { getStore, storeUnavailableMessage } from './store.mjs'

const COOKIE = 'mbd_session'
const SESSION_DAYS = 30

const authSecret = () => process.env.AUTH_SECRET || ''
const googleId = () => process.env.GOOGLE_CLIENT_ID || ''
const googleSecret = () => process.env.GOOGLE_CLIENT_SECRET || ''

// ---- Passwords (scrypt) ------------------------------------------------------

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `scrypt:${salt}:${hash}`
}

function verifyPassword(password, stored) {
  const [scheme, salt, hash] = String(stored || '').split(':')
  if (scheme !== 'scrypt' || !salt || !hash) return false
  const candidate = scryptSync(password, salt, 64)
  const expected = Buffer.from(hash, 'hex')
  return candidate.length === expected.length && timingSafeEqual(candidate, expected)
}

// ---- Session tokens (HMAC-signed, stateless) ---------------------------------

const b64url = (buf) => Buffer.from(buf).toString('base64url')

function sign(payload) {
  return createHmac('sha256', authSecret()).update(payload).digest('base64url')
}

// A session-version stamp derived from the user's secret material. Changing the
// password (or linking Google) changes this, so all previously issued tokens
// stop verifying — that's how logout-everywhere / password-reset revocation
// works without a server-side session table.
function sessionVersion(user) {
  return createHmac('sha256', authSecret())
    .update(`${user.passwordHash || ''}|${user.googleId || ''}`)
    .digest('base64url')
    .slice(0, 16)
}

function makeToken(user) {
  const exp = Date.now() + SESSION_DAYS * 24 * 3600 * 1000
  const payload = `${b64url(user.id)}.${exp}.${sessionVersion(user)}`
  return `${payload}.${sign(payload)}`
}

// Returns { userId, sv } on a valid signature + unexpired token, else null.
function verifyToken(token) {
  const parts = String(token || '').split('.')
  if (parts.length !== 4) return null
  const payload = `${parts[0]}.${parts[1]}.${parts[2]}`
  const expected = Buffer.from(sign(payload))
  const got = Buffer.from(parts[3])
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) return null
  if (Number(parts[1]) < Date.now()) return null
  try {
    return { userId: Buffer.from(parts[0], 'base64url').toString('utf8'), sv: parts[2] }
  } catch {
    return null
  }
}

// Only these HTTP methods reach a handler. Express already restricts by route;
// this matters on Vercel, where a function's default export runs for ANY method.
function methodNotAllowed(req, res, allowed) {
  if (req.method && req.method !== allowed) {
    res.status(405).json({ error: 'Method not allowed.' })
    return true
  }
  return false
}

// ---- Cookies / request helpers ------------------------------------------------

function parseCookies(req) {
  const out = {}
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=')
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim())
  }
  return out
}

function isHttps(req) {
  return (req.headers['x-forwarded-proto'] || '').includes('https')
}

function requestOrigin(req) {
  const proto = req.headers['x-forwarded-proto'] || 'http'
  const host = req.headers['x-forwarded-host'] || req.headers.host
  return `${proto}://${host}`
}

function setSessionCookie(req, res, token) {
  const secure = isHttps(req) ? '; Secure' : ''
  res.setHeader(
    'Set-Cookie',
    `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 24 * 3600}${secure}`
  )
}

function clearSessionCookie(req, res) {
  const secure = isHttps(req) ? '; Secure' : ''
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`)
}

// Short-lived cookie holding the per-flow OAuth nonce (CSRF binding for the
// Google login round-trip). Appended to the response, not replacing an existing
// Set-Cookie, so it can accompany other cookies if ever needed.
const OAUTH_COOKIE = 'mbd_oauth'
function setOAuthCookie(req, res, nonce) {
  const secure = isHttps(req) ? '; Secure' : ''
  res.setHeader('Set-Cookie', `${OAUTH_COOKIE}=${nonce}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600${secure}`)
}

function publicUser(u) {
  return { id: u.id, login: u.login, name: u.name, hasPassword: !!u.passwordHash, google: !!u.googleId }
}

// Resolve the logged-in user from the session cookie, or null. Also enforces
// the session-version stamp so a password change / relink invalidates old
// tokens (see sessionVersion).
export async function getSessionUser(req) {
  if (!authSecret()) return null
  const store = getStore()
  if (!store) return null
  const claim = verifyToken(parseCookies(req)[COOKIE])
  if (!claim) return null
  const user = await store.getUserById(claim.userId)
  if (!user || sessionVersion(user) !== claim.sv) return null
  return user
}

// Guards shared by every handler: config + storage must exist.
function readyCheck(res) {
  if (!authSecret()) {
    res.status(503).json({ error: 'AUTH_SECRET is not set. Add it to .env locally or to Vercel env vars.' })
    return null
  }
  const store = getStore()
  if (!store) {
    res.status(503).json({ error: storeUnavailableMessage() })
    return null
  }
  return store
}

// ---- Throttle (in-memory; per warm instance) ----------------------------------

const attempts = new Map() // key -> { count, resetAt }
function throttled(key, max = 20, windowMs = 10 * 60 * 1000) {
  const now = Date.now()
  const a = attempts.get(key)
  if (!a || now > a.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + windowMs })
    return false
  }
  a.count += 1
  return a.count > max
}

const clientIp = (req) =>
  String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim()

// A dummy scrypt matching verifyPassword's cost, run on the login miss path so
// "no such user" and "wrong password" take the same time (no user enumeration).
const DUMMY_HASH = hashPassword(randomBytes(16).toString('hex'))
function burnPasswordTime() {
  try {
    verifyPassword('x', DUMMY_HASH)
  } catch {
    /* timing only */
  }
}

// ---- Handlers ------------------------------------------------------------------

// POST /api/auth/register {login, password, name?}
async function registerImpl(req, res) {
  if (methodNotAllowed(req, res, 'POST')) return
  const store = readyCheck(res)
  if (!store) return
  if (throttled(`reg:${clientIp(req)}`)) {
    res.status(429).json({ error: 'Too many attempts. Try again later.' })
    return
  }
  const { login, password, name = '' } = req.body || {}
  const cleanLogin = String(login || '').trim().toLowerCase()
  if (cleanLogin.length < 3 || cleanLogin.length > 100) {
    res.status(400).json({ error: 'Pick a username or email of at least 3 characters.' })
    return
  }
  if (typeof password !== 'string' || password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters.' })
    return
  }
  if (await store.getUserByLogin(cleanLogin)) {
    res.status(409).json({ error: 'That username is already taken.' })
    return
  }
  // createUser can still throw a unique-violation on a race — the safe() wrapper
  // maps that to a clean 409.
  const user = await store.createUser({
    login: cleanLogin,
    name: String(name || '').slice(0, 120),
    passwordHash: hashPassword(password),
  })
  setSessionCookie(req, res, makeToken(user))
  res.status(200).json({ user: publicUser(user) })
}

// POST /api/auth/login {login, password}
async function loginImpl(req, res) {
  if (methodNotAllowed(req, res, 'POST')) return
  const store = readyCheck(res)
  if (!store) return
  const ip = clientIp(req)
  const cleanLogin = String(req.body?.login || '').trim().toLowerCase()
  // Throttle per-IP AND per-target-account: rotating X-Forwarded-For can't
  // grant unlimited guesses against one account (10 tries / 10 min per login).
  if (throttled(`login:${ip}`) || (cleanLogin && throttled(`login-id:${cleanLogin}`, 10))) {
    res.status(429).json({ error: 'Too many attempts. Try again later.' })
    return
  }
  const { password } = req.body || {}
  const user = await store.getUserByLogin(cleanLogin)
  if (!user || !user.passwordHash || !verifyPassword(String(password || ''), user.passwordHash)) {
    // Spend the KDF cost even on a miss so timing can't reveal which accounts
    // exist (verifyPassword only runs when a passwordHash is present).
    if (!user || !user.passwordHash) burnPasswordTime()
    res.status(401).json({ error: 'Wrong username or password.' })
    return
  }
  setSessionCookie(req, res, makeToken(user))
  res.status(200).json({ user: publicUser(user) })
}

// POST /api/auth/logout
async function logoutImpl(req, res) {
  if (methodNotAllowed(req, res, 'POST')) return
  clearSessionCookie(req, res)
  res.status(200).json({ ok: true })
}

// GET /api/auth/me
async function meImpl(req, res) {
  if (!authSecret() || !getStore()) {
    // Not an error — the client uses this to decide whether to show account UI.
    res.status(200).json({ user: null, accountsAvailable: false, google: !!(googleId() && googleSecret()) })
    return
  }
  const user = await getSessionUser(req)
  res.status(200).json({
    user: user ? publicUser(user) : null,
    accountsAvailable: true,
    google: !!(googleId() && googleSecret()),
  })
}

// POST /api/auth/profile {name?, password?} — update display name / password.
async function profileImpl(req, res) {
  if (methodNotAllowed(req, res, 'POST')) return
  const store = readyCheck(res)
  if (!store) return
  const user = await getSessionUser(req)
  if (!user) {
    res.status(401).json({ error: 'Not signed in.' })
    return
  }
  const patch = {}
  const { name, password } = req.body || {}
  if (typeof name === 'string') patch.name = name.slice(0, 120)
  if (typeof password === 'string' && password.length > 0) {
    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters.' })
      return
    }
    patch.passwordHash = hashPassword(password)
  }
  const updated = await store.updateUser(user.id, patch)
  // A password change rotates the session version (invalidating all tokens,
  // including this request's) — re-issue the cookie so the current device stays
  // signed in while other sessions are dropped.
  if (patch.passwordHash) setSessionCookie(req, res, makeToken(updated))
  res.status(200).json({ user: publicUser(updated) })
}

// ---- Google OAuth (code flow) ---------------------------------------------------

// GET /api/auth/google — redirect to Google's consent screen.
async function googleStartImpl(req, res) {
  if (methodNotAllowed(req, res, 'GET')) return
  if (!googleId() || !googleSecret()) {
    res.status(501).json({ error: 'Google sign-in is not configured (set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET).' })
    return
  }
  if (!readyCheck(res)) return
  // Per-flow random nonce, bound to the initiating browser via a short-lived
  // cookie and echoed as the OAuth `state`. The callback requires both to match,
  // which defeats login-CSRF (an attacker can't plant their code in the victim's
  // browser without also setting this HttpOnly cookie).
  const nonce = randomBytes(24).toString('base64url')
  setOAuthCookie(req, res, nonce)
  const params = new URLSearchParams({
    client_id: googleId(),
    redirect_uri: `${requestOrigin(req)}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state: nonce,
    prompt: 'select_account',
  })
  res.statusCode = 302
  res.setHeader('Location', `https://accounts.google.com/o/oauth2/v2/auth?${params}`)
  res.end()
}

// GET /api/auth/google/callback?code=…&state=…
async function googleCallbackImpl(req, res) {
  const fail = (msg) => {
    res.statusCode = 302
    res.setHeader('Location', `/?auth_error=${encodeURIComponent(msg)}`)
    res.end()
  }
  if (req.method && req.method !== 'GET') return fail('Sign-in was interrupted. Try again.')
  const store = getStore()
  if (!store || !authSecret() || !googleId() || !googleSecret()) return fail('Google sign-in is not configured.')

  const url = new URL(req.url, requestOrigin(req))
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const nonce = parseCookies(req)[OAUTH_COOKIE]
  // state must match the nonce we set on THIS browser (CSRF binding).
  if (!code || !state || !nonce || state !== nonce) return fail('Sign-in was interrupted. Try again.')

  try {
    const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: googleId(),
        client_secret: googleSecret(),
        redirect_uri: `${requestOrigin(req)}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    })
    if (!tokenResp.ok) throw new Error(`token exchange failed (${tokenResp.status})`)
    const tokens = await tokenResp.json()
    // The id_token came straight from Google's token endpoint over TLS,
    // authenticated with our client_secret, so signature re-verification is not
    // needed — but we DO require a verified email before trusting it as an
    // identity we can link to an existing account.
    const claims = JSON.parse(Buffer.from(tokens.id_token.split('.')[1], 'base64url').toString('utf8'))
    const email = String(claims.email || '').toLowerCase()
    const sub = String(claims.sub || '')
    const emailVerified = claims.email_verified === true || claims.email_verified === 'true'
    if (!sub) throw new Error('Google returned no identity')
    if (!email || !emailVerified) return fail('Your Google account has no verified email.')

    // Match by Google id first. Only fall back to email-linking when Google has
    // verified that email — without this, an unverified-email Google account
    // could hijack a same-email password account.
    let user = await store.getUserByGoogleId(sub)
    if (!user) user = await store.getUserByLogin(email)
    if (user && !user.googleId) user = await store.updateUser(user.id, { googleId: sub })
    if (!user) {
      user = await store.createUser({ login: email, name: String(claims.name || ''), googleId: sub })
    }
    // Clear the one-time OAuth nonce and issue the session.
    const secure = isHttps(req) ? '; Secure' : ''
    res.setHeader('Set-Cookie', [
      `${OAUTH_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`,
      `${COOKIE}=${encodeURIComponent(makeToken(user))}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 24 * 3600}${secure}`,
    ])
    res.statusCode = 302
    res.setHeader('Location', '/')
    res.end()
  } catch (err) {
    console.error('[auth] google callback error:', err?.message || err)
    return fail('Google sign-in failed. Try again.')
  }
}

// ---- Per-user app state + conversation sync -------------------------------------

// GET /api/state | PUT /api/state {state}
async function stateImpl(req, res) {
  const store = readyCheck(res)
  if (!store) return
  const user = await getSessionUser(req)
  if (!user) {
    res.status(401).json({ error: 'Not signed in.' })
    return
  }
  if (req.method === 'GET') {
    res.status(200).json({ state: await store.loadState(user.id) })
    return
  }
  if (req.method === 'PUT' || req.method === 'POST') {
    const { state } = req.body || {}
    if (!state || typeof state !== 'object') {
      res.status(400).json({ error: 'Missing state.' })
      return
    }
    await store.saveState(user.id, state)
    res.status(200).json({ ok: true })
    return
  }
  res.status(405).json({ error: 'Method not allowed.' })
}

// GET /api/convo | PUT /api/convo {convo} — Death's conversation, so a
// returning user picks up where they left off (messages + rendered bubbles).
async function convoImpl(req, res) {
  const store = readyCheck(res)
  if (!store) return
  const user = await getSessionUser(req)
  if (!user) {
    res.status(401).json({ error: 'Not signed in.' })
    return
  }
  if (req.method === 'GET') {
    res.status(200).json({ convo: await store.loadConvo(user.id) })
    return
  }
  if (req.method === 'PUT' || req.method === 'POST') {
    const { convo } = req.body || {}
    if (!convo || typeof convo !== 'object') {
      res.status(400).json({ error: 'Missing convo.' })
      return
    }
    await store.saveConvo(user.id, convo)
    res.status(200).json({ ok: true })
    return
  }
  res.status(405).json({ error: 'Method not allowed.' })
}

// ---- Crash-proofing ---------------------------------------------------------
// Handlers run as bare async functions under Express 4 (which does not catch
// async rejections) and as Vercel functions. A storage hiccup must become a
// JSON 500, never an unhandled rejection that kills the process.

function safe(handler) {
  return async (req, res) => {
    try {
      await handler(req, res)
    } catch (err) {
      // Unique-violation race (two simultaneous registers/links) -> friendly 409.
      if (err?.code === '23505') {
        if (!res.headersSent) res.status(409).json({ error: 'That username is already taken.' })
        return
      }
      console.error('[auth] handler error:', err?.message || err)
      if (!res.headersSent) res.status(500).json({ error: 'Something failed on the server. Try again.' })
      else res.end()
    }
  }
}

export const registerHandler = safe(registerImpl)
export const loginHandler = safe(loginImpl)
export const logoutHandler = safe(logoutImpl)
export const meHandler = safe(meImpl)
export const profileHandler = safe(profileImpl)
export const googleStartHandler = safe(googleStartImpl)
export const googleCallbackHandler = safe(googleCallbackImpl)
export const stateHandler = safe(stateImpl)
export const convoHandler = safe(convoImpl)
