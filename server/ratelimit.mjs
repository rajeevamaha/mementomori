// Fixed-window rate limiter for the Death coach endpoint.
//
// Two backends, chosen automatically:
//   - Postgres (when POSTGRES_URL is set) — atomic INSERT ... ON CONFLICT so the
//     limit holds ACROSS serverless instances. This is the one that matters in
//     production: many Vercel function instances share one counter.
//   - In-memory Map (local dev / no DB) — per-process, fine for one machine.
//
// checkRate returns { allowed, remaining, resetAt } and never throws — a limiter
// that errors must not take the coach down, so failures fail OPEN (allowed).

import { hasPg, pgQuery } from './store.mjs'

// ---- In-memory fallback ------------------------------------------------------

const mem = new Map() // bucket -> { count, resetAt }

function checkMem(bucket, limit, windowMs, now) {
  const cur = mem.get(bucket)
  if (!cur || now >= cur.resetAt) {
    const resetAt = now + windowMs
    mem.set(bucket, { count: 1, resetAt })
    return { allowed: true, remaining: limit - 1, resetAt }
  }
  cur.count += 1
  return { allowed: cur.count <= limit, remaining: Math.max(0, limit - cur.count), resetAt: cur.resetAt }
}

// Opportunistic sweep so the Map can't grow unbounded on a long-lived process.
function sweepMem(now) {
  if (mem.size < 5000) return
  for (const [k, v] of mem) if (now >= v.resetAt) mem.delete(k)
}

// ---- Postgres backend --------------------------------------------------------

async function checkPg(bucket, limit, windowMs, now) {
  const resetAt = now + windowMs
  // Atomic: insert a fresh window, or bump the existing one — resetting the
  // count when the stored window has already elapsed. RETURNING gives the
  // post-increment count so the decision is race-free across instances.
  const { rows } = await pgQuery(
    `INSERT INTO mbd_rate (bucket, count, reset_at) VALUES ($1, 1, $2)
     ON CONFLICT (bucket) DO UPDATE SET
       count = CASE WHEN mbd_rate.reset_at < $3 THEN 1 ELSE mbd_rate.count + 1 END,
       reset_at = CASE WHEN mbd_rate.reset_at < $3 THEN $2 ELSE mbd_rate.reset_at END
     RETURNING count, reset_at`,
    [bucket, resetAt, now]
  )
  const count = rows[0]?.count ?? 1
  const storedReset = Number(rows[0]?.reset_at ?? resetAt)
  return { allowed: count <= limit, remaining: Math.max(0, limit - count), resetAt: storedReset }
}

// ---- Public API --------------------------------------------------------------

// nowMs is injectable for tests; defaults to wall clock.
export async function checkRate(bucket, limit, windowMs, nowMs = Date.now()) {
  try {
    sweepMem(nowMs)
    if (hasPg()) return await checkPg(bucket, limit, windowMs, nowMs)
    return checkMem(bucket, limit, windowMs, nowMs)
  } catch (err) {
    // Fail open — a broken limiter must never block the coach.
    console.error('[ratelimit] check failed (allowing):', err?.message || err)
    return { allowed: true, remaining: 0, resetAt: nowMs + windowMs }
  }
}
