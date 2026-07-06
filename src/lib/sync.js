// Account/session client + server sync for the Zustand store.
//
// Model: the app stays local-first (localStorage) exactly as before. When the
// user signs in, their account's server copy becomes the source of truth —
// it is pulled and adopted on login, and every local change while signed in is
// pushed (debounced) to /api/state. First login from a device with existing
// local data uploads that data instead (the server copy is empty).
//
// The session itself is an HttpOnly cookie — nothing secret lives in JS.

import { useStore } from '../store.js'

// Keys that travel with the account. Deliberately excludes per-device bits:
// view/dockOpen (ephemeral UI) and images (device art overrides, can be MBs).
const SYNC_KEYS = [
  'profile',
  'goals',
  'finance',
  'family',
  'insurance',
  'health',
  'will',
  'legacy',
  'reviews',
  'events',
  'anniversaryAsked',
  'tone',
]

function snapshot() {
  const s = useStore.getState()
  const out = {}
  for (const k of SYNC_KEYS) out[k] = s[k]
  return out
}

async function jsonFetch(url, opts = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`)
  return body
}

// Whether a signed-in user has server sync active (used to gate destructive
// local actions like "reset everything" that would otherwise sync the wipe up).
export const isSignedIn = () => !!useStore.getState().user

// ---- auto-push (debounced store subscription) --------------------------------

// syncPaused suppresses *scheduling* pushes; applyingServerState suppresses the
// store subscription while we write the adopted state. dirty means the last
// push attempt failed and must be retried. lastPushed dedupes identical pushes.
let applyingServerState = false
let syncPaused = false
let dirty = false
let pushTimer = null
let subscribed = false
let lastPushed = ''

export async function pushStateNow({ keepalive = false } = {}) {
  if (!useStore.getState().user || syncPaused) return
  const state = snapshot()
  const fingerprint = JSON.stringify(state)
  if (!dirty && fingerprint === lastPushed) return
  try {
    await jsonFetch('/api/state', { method: 'PUT', body: JSON.stringify({ state }), keepalive })
    lastPushed = fingerprint
    dirty = false
  } catch (e) {
    // Offline / transient — mark dirty so we retry (next change, or the timer).
    dirty = true
    console.warn('[sync] push failed (will retry):', e.message)
  }
}

function schedulePush() {
  clearTimeout(pushTimer)
  pushTimer = setTimeout(pushStateNow, 1500)
}

function ensureSubscribed() {
  if (subscribed) return
  subscribed = true
  useStore.subscribe(() => {
    if (applyingServerState || syncPaused || !useStore.getState().user) return
    schedulePush()
  })
  // Safety net: if a push failed and no further edits arrive, retry on a timer.
  setInterval(() => {
    if (dirty && !syncPaused && useStore.getState().user) pushStateNow()
  }, 15000)
}

// Flush pending changes when the tab is closing/hidden. keepalive lets the
// request outlive the page (fetch caps keepalive bodies at ~64kb; SYNC_KEYS
// excludes images, so the payload stays well under that).
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') pushStateNow({ keepalive: true })
  })
}

// ---- login/adopt flow -----------------------------------------------------------

async function adoptServerState() {
  // Pause auto-push so a debounce scheduled by setUser (which runs before this)
  // can't fire the pre-adoption snapshot and clobber the account's copy.
  syncPaused = true
  clearTimeout(pushTimer)
  try {
    const { state } = await jsonFetch('/api/state')
    const local = useStore.getState()
    if (state && state.profile) {
      // The account has data — it wins over this device. Before overwriting,
      // stash any local guest data that would be lost so it is recoverable.
      if (local.profile && JSON.stringify(snapshot()) !== JSON.stringify(pick(state))) {
        try {
          localStorage.setItem('mbd.guest-backup', JSON.stringify({ savedAt: Date.now(), state: snapshot() }))
        } catch {
          /* quota — best effort */
        }
      }
      applyingServerState = true
      try {
        local.applyServerState(state)
        lastPushed = JSON.stringify(snapshot())
        dirty = false
      } finally {
        applyingServerState = false
      }
    } else {
      // Fresh account — seed it with this device's data.
      syncPaused = false
      await pushStateNow()
    }
  } finally {
    syncPaused = false
    ensureSubscribed()
  }
}

// Keep only the SYNC_KEYS of an arbitrary state object (for comparison).
function pick(obj) {
  const out = {}
  for (const k of SYNC_KEYS) out[k] = obj?.[k]
  return out
}

// Whether accounts are usable at all (server has storage) and whether the
// Google button should render. Filled by initAccount; UI reads it via getter.
let accountMeta = null
export const getAccountMeta = () => accountMeta

// Called once at app start: restores the session if the cookie is valid.
// Returns { user, accountsAvailable, google } for the UI.
export async function initAccount() {
  try {
    const me = await jsonFetch('/api/auth/me')
    accountMeta = { accountsAvailable: !!me.accountsAvailable, google: !!me.google }
    useStore.getState().setUser(me.user)
    if (me.user) await adoptServerState()
    return me
  } catch {
    accountMeta = { accountsAvailable: false, google: false }
    useStore.getState().setUser(null)
    return { user: null, accountsAvailable: false, google: false }
  }
}

export async function login(loginName, password) {
  const { user } = await jsonFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ login: loginName, password }),
  })
  useStore.getState().setUser(user)
  await adoptServerState()
  return user
}

export async function register(loginName, password, name) {
  const { user } = await jsonFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ login: loginName, password, name }),
  })
  useStore.getState().setUser(user)
  await adoptServerState() // empty account -> uploads this device's data
  return user
}

export async function logout() {
  await pushStateNow() // flush the latest edits to the account first
  try {
    await jsonFetch('/api/auth/logout', { method: 'POST' })
  } catch {
    // Even if the request fails, drop the local session + data below.
  }
  // Safety net: stash the device snapshot in case that final push didn't reach
  // the server (offline) — recoverable, never silently lost.
  try {
    localStorage.setItem('mbd.logout-backup', JSON.stringify({ savedAt: Date.now(), state: snapshot() }))
  } catch {
    /* quota — best effort */
  }
  // Clear the session mirror FIRST so the store subscription won't push the
  // wipe up to the account, then clear the device — the plan is safe on the
  // server and returns on the next sign-in. App now shows the entry screen.
  useStore.getState().setUser(null)
  useStore.getState().resetAll()
  lastPushed = ''
  dirty = false
}

export async function updateAccountProfile(patch) {
  const { user } = await jsonFetch('/api/auth/profile', { method: 'POST', body: JSON.stringify(patch) })
  useStore.getState().setUser(user)
  return user
}

// ---- Death conversation persistence ----------------------------------------------

let convoTimer = null

// Debounced save of the coach conversation (Anthropic-format messages + the
// rendered bubbles), bounded so the payload stays small.
export function saveConvo(messages, display) {
  if (!useStore.getState().user) return
  clearTimeout(convoTimer)
  convoTimer = setTimeout(() => {
    jsonFetch('/api/convo', {
      method: 'PUT',
      body: JSON.stringify({
        convo: { messages: messages.slice(-60), display: display.slice(-80), savedAt: Date.now() },
      }),
    }).catch((e) => console.warn('[sync] convo save failed:', e.message))
  }, 800)
}

export async function loadConvo() {
  if (!useStore.getState().user) return null
  try {
    const { convo } = await jsonFetch('/api/convo')
    return convo
  } catch {
    return null
  }
}
