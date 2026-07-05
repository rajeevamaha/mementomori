// Persistence layer for user accounts, per-user app state, and Death's
// conversation memory. Two backends behind one interface:
//
//   - Postgres  — used when POSTGRES_URL (or DATABASE_URL) is set. This is the
//                 production path (Vercel → Storage → Postgres). Tables are
//                 created on first use; `pg` is imported lazily so local dev
//                 never touches it.
//   - JSON files — local fallback under .data/ (gitignored). Zero setup, so
//                 `npm run dev` gives working accounts out of the box. Not
//                 usable on Vercel (serverless filesystems are ephemeral) —
//                 endpoints report that clearly instead of silently losing data.
//
// Users: { id, login (unique, lowercased), name, passwordHash (null for
// Google-only accounts), googleId (null for password accounts), createdAt }.

import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PG_URL = () => process.env.POSTGRES_URL || process.env.DATABASE_URL || ''
const onVercel = () => !!process.env.VERCEL

// ---- Postgres backend -------------------------------------------------------

let _pool = null
let _tablesReady = null

async function pool() {
  if (!_pool) {
    const { default: pg } = await import('pg')
    const url = PG_URL()
    _pool = new pg.Pool({
      connectionString: url,
      max: 3, // serverless: keep the per-instance footprint small
      // Hosted Postgres (Vercel/Neon/Supabase) requires TLS; local PG usually
      // doesn't. Respect an explicit sslmode in the URL; otherwise apply the
      // host heuristic.
      ssl: /[?&]sslmode=/.test(url)
        ? undefined
        : /localhost|127\.0\.0\.1/.test(url)
          ? undefined
          : { rejectUnauthorized: false },
    })
    // An idle pooled client can emit 'error' (server restart, network drop);
    // without a listener that crashes the whole process.
    _pool.on('error', (err) => console.error('[store] idle pg client error:', err.message))
  }
  if (!_tablesReady) {
    _tablesReady = _pool.query(`
      CREATE TABLE IF NOT EXISTS mbd_users (
        id TEXT PRIMARY KEY,
        login TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL DEFAULT '',
        password_hash TEXT,
        google_id TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS mbd_state (
        user_id TEXT PRIMARY KEY REFERENCES mbd_users(id) ON DELETE CASCADE,
        state JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS mbd_convo (
        user_id TEXT PRIMARY KEY REFERENCES mbd_users(id) ON DELETE CASCADE,
        convo JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `)
    // A transient failure (e.g. serverless PG waking from scale-to-zero) must
    // not brick the warm instance — clear the cache so the next call retries.
    _tablesReady = _tablesReady.catch((err) => {
      _tablesReady = null
      throw err
    })
  }
  await _tablesReady
  return _pool
}

function rowToUser(r) {
  if (!r) return null
  return {
    id: r.id,
    login: r.login,
    name: r.name,
    passwordHash: r.password_hash,
    googleId: r.google_id,
    createdAt: r.created_at,
  }
}

const pgStore = {
  kind: 'postgres',
  async getUserById(id) {
    const { rows } = await (await pool()).query('SELECT * FROM mbd_users WHERE id = $1', [id])
    return rowToUser(rows[0])
  },
  async getUserByLogin(login) {
    const { rows } = await (await pool()).query('SELECT * FROM mbd_users WHERE login = $1', [login])
    return rowToUser(rows[0])
  },
  async getUserByGoogleId(googleId) {
    const { rows } = await (await pool()).query('SELECT * FROM mbd_users WHERE google_id = $1', [googleId])
    return rowToUser(rows[0])
  },
  async createUser({ login, name, passwordHash = null, googleId = null }) {
    const id = randomUUID()
    const { rows } = await (await pool()).query(
      'INSERT INTO mbd_users (id, login, name, password_hash, google_id) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [id, login, name, passwordHash, googleId]
    )
    return rowToUser(rows[0])
  },
  async updateUser(id, patch) {
    const u = await this.getUserById(id)
    if (!u) return null
    const next = { ...u, ...patch }
    await (await pool()).query('UPDATE mbd_users SET name = $2, password_hash = $3, google_id = $4 WHERE id = $1', [
      id,
      next.name,
      next.passwordHash,
      next.googleId,
    ])
    return next
  },
  async loadState(userId) {
    const { rows } = await (await pool()).query('SELECT state FROM mbd_state WHERE user_id = $1', [userId])
    return rows[0]?.state ?? null
  },
  async saveState(userId, state) {
    // Stringify + cast: node-postgres serializes JS *arrays* as Postgres array
    // literals, not JSON — an explicit ::jsonb makes the shape unambiguous.
    await (await pool()).query(
      `INSERT INTO mbd_state (user_id, state, updated_at) VALUES ($1, $2::jsonb, now())
       ON CONFLICT (user_id) DO UPDATE SET state = $2::jsonb, updated_at = now()`,
      [userId, JSON.stringify(state)]
    )
  },
  async loadConvo(userId) {
    const { rows } = await (await pool()).query('SELECT convo FROM mbd_convo WHERE user_id = $1', [userId])
    return rows[0]?.convo ?? null
  },
  async saveConvo(userId, convo) {
    await (await pool()).query(
      `INSERT INTO mbd_convo (user_id, convo, updated_at) VALUES ($1, $2::jsonb, now())
       ON CONFLICT (user_id) DO UPDATE SET convo = $2::jsonb, updated_at = now()`,
      [userId, JSON.stringify(convo)]
    )
  },
}

// ---- JSON file backend (local dev) ------------------------------------------

const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.data')

function ensureDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'))
  } catch {
    return fallback
  }
}

function writeJson(file, value) {
  ensureDir()
  const p = path.join(DATA_DIR, file)
  // Write-then-rename so a crash mid-write never corrupts the file.
  fs.writeFileSync(p + '.tmp', JSON.stringify(value, null, 2))
  fs.renameSync(p + '.tmp', p)
}

const fileStore = {
  kind: 'file',
  async getUserById(id) {
    return readJson('users.json', []).find((u) => u.id === id) || null
  },
  async getUserByLogin(login) {
    return readJson('users.json', []).find((u) => u.login === login) || null
  },
  async getUserByGoogleId(googleId) {
    return readJson('users.json', []).find((u) => u.googleId === googleId) || null
  },
  async createUser({ login, name, passwordHash = null, googleId = null }) {
    const users = readJson('users.json', [])
    const user = { id: randomUUID(), login, name, passwordHash, googleId, createdAt: new Date().toISOString() }
    users.push(user)
    writeJson('users.json', users)
    return user
  },
  async updateUser(id, patch) {
    const users = readJson('users.json', [])
    const i = users.findIndex((u) => u.id === id)
    if (i < 0) return null
    users[i] = { ...users[i], ...patch }
    writeJson('users.json', users)
    return users[i]
  },
  async loadState(userId) {
    return readJson(`state-${userId}.json`, null)
  },
  async saveState(userId, state) {
    writeJson(`state-${userId}.json`, state)
  },
  async loadConvo(userId) {
    return readJson(`convo-${userId}.json`, null)
  },
  async saveConvo(userId, convo) {
    writeJson(`convo-${userId}.json`, convo)
  },
}

// ---- Selection ---------------------------------------------------------------

// Postgres when configured; JSON files locally; nothing on Vercel without a DB
// (accounts need durable storage — an ephemeral serverless FS would silently
// drop users, which is worse than a clear error).
export function getStore() {
  if (PG_URL()) return pgStore
  if (onVercel()) return null
  return fileStore
}

export function storeUnavailableMessage() {
  return (
    'Accounts need a database. On Vercel: create one under Storage → Postgres ' +
    '(or Neon) and connect it to this project so POSTGRES_URL is set, then redeploy.'
  )
}
