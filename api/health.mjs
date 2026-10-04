// GET /api/health — quick deploy check (Vercel + database + auth config).
import { databaseKind, getStore } from '../server/store.mjs'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed.' })
    return
  }
  const hasAuth = !!process.env.AUTH_SECRET
  const store = getStore()
  const kind = databaseKind()
  res.status(200).json({
    ok: true,
    vercel: !!process.env.VERCEL,
    database: kind,
    postgres: kind === 'postgres',
    mongodb: kind === 'mongodb',
    accountsReady: hasAuth && !!store,
    needsAuthSecret: !hasAuth,
    needsDatabase: !store && !!process.env.VERCEL,
  })
}
