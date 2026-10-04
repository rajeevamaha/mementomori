// MongoDB Atlas backend — same store interface as Postgres / JSON files.
// Env: MONGODB_URI (Atlas → Connect → Drivers → Node.js connection string).

import { randomUUID } from 'node:crypto'

const URI = () => process.env.MONGODB_URI || ''

let _clientPromise = null
let _indexesReady = null

async function client() {
  if (!_clientPromise) {
    const { MongoClient } = await import('mongodb')
    _clientPromise = MongoClient.connect(URI(), { maxPoolSize: 5 })
    _clientPromise.catch(() => {
      _clientPromise = null
    })
  }
  return _clientPromise
}

async function db() {
  const c = await client()
  const name = process.env.MONGODB_DB || 'mementomori'
  return c.db(name)
}

async function ensureIndexes() {
  if (_indexesReady) return _indexesReady
  _indexesReady = (async () => {
    const database = await db()
    await database.collection('mbd_users').createIndex({ login: 1 }, { unique: true })
    await database.collection('mbd_users').createIndex({ googleId: 1 }, { sparse: true })
    await database.collection('mbd_state').createIndex({ userId: 1 }, { unique: true })
    await database.collection('mbd_convo').createIndex({ userId: 1 }, { unique: true })
  })()
  _indexesReady = _indexesReady.catch((err) => {
    _indexesReady = null
    throw err
  })
  await _indexesReady
}

function docToUser(d) {
  if (!d) return null
  return {
    id: d.id,
    login: d.login,
    name: d.name ?? '',
    passwordHash: d.passwordHash ?? null,
    googleId: d.googleId ?? null,
    createdAt: d.createdAt,
  }
}

export const mongoUri = URI

export const mongoStore = {
  kind: 'mongodb',
  async getUserById(id) {
    await ensureIndexes()
    const d = await (await db()).collection('mbd_users').findOne({ id })
    return docToUser(d)
  },
  async getUserByLogin(login) {
    await ensureIndexes()
    const d = await (await db()).collection('mbd_users').findOne({ login })
    return docToUser(d)
  },
  async getUserByGoogleId(googleId) {
    await ensureIndexes()
    const d = await (await db()).collection('mbd_users').findOne({ googleId })
    return docToUser(d)
  },
  async createUser({ login, name, passwordHash = null, googleId = null }) {
    await ensureIndexes()
    const user = {
      id: randomUUID(),
      login,
      name,
      passwordHash,
      googleId,
      createdAt: new Date(),
    }
    await (await db()).collection('mbd_users').insertOne(user)
    return docToUser(user)
  },
  async updateUser(id, patch) {
    const u = await this.getUserById(id)
    if (!u) return null
    const next = { ...u, ...patch }
    await (await db()).collection('mbd_users').updateOne(
      { id },
      { $set: { name: next.name, passwordHash: next.passwordHash, googleId: next.googleId } }
    )
    return next
  },
  async loadState(userId) {
    await ensureIndexes()
    const d = await (await db()).collection('mbd_state').findOne({ userId })
    return d?.state ?? null
  },
  async saveState(userId, state) {
    await ensureIndexes()
    await (await db()).collection('mbd_state').updateOne(
      { userId },
      { $set: { state, updatedAt: new Date() } },
      { upsert: true }
    )
  },
  async loadConvo(userId) {
    await ensureIndexes()
    const d = await (await db()).collection('mbd_convo').findOne({ userId })
    return d?.convo ?? null
  },
  async saveConvo(userId, convo) {
    await ensureIndexes()
    await (await db()).collection('mbd_convo').updateOne(
      { userId },
      { $set: { convo, updatedAt: new Date() } },
      { upsert: true }
    )
  },
}

/** Atomic fixed-window counter (shared across Vercel instances). */
export async function mongoRateLimitCheck(bucket, limit, windowMs, now) {
  await ensureIndexes()
  const col = (await db()).collection('mbd_rate')
  const resetAt = now + windowMs
  const result = await col.findOneAndUpdate(
    { _id: bucket },
    [
      {
        $set: {
          count: {
            $cond: {
              if: {
                $or: [{ $eq: [{ $type: '$resetAt' }, 'missing'] }, { $lt: ['$resetAt', now] }],
              },
              then: 1,
              else: { $add: [{ $ifNull: ['$count', 0] }, 1] },
            },
          },
          resetAt: {
            $cond: {
              if: {
                $or: [{ $eq: [{ $type: '$resetAt' }, 'missing'] }, { $lt: ['$resetAt', now] }],
              },
              then: resetAt,
              else: '$resetAt',
            },
          },
        },
      },
    ],
    { upsert: true, returnDocument: 'after' }
  )
  const doc = result ?? { count: 1, resetAt }
  const count = doc.count ?? 1
  const storedReset = Number(doc.resetAt ?? resetAt)
  return { allowed: count <= limit, remaining: Math.max(0, limit - count), resetAt: storedReset }
}
