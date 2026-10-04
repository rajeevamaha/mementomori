// Fixed-window rate limiter for the Death coach endpoint.
//
// Two backends, chosen automatically:
//   - MongoDB or Postgres (when MONGODB_URI / POSTGRES_URL is set) — shared
//     counters across Vercel serverless instances.
//   - In-memory Map (local dev / no DB) — per-process, fine for one machine.
//
// checkRate returns { allowed, remaining, resetAt } and never throws — a limiter
// that errors must not take the coach down, so failures fail OPEN (allowed).

import { distributedRateCheck, hasRemoteStore } from './store.mjs'

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

// ---- Public API --------------------------------------------------------------

// nowMs is injectable for tests; defaults to wall clock.
export async function checkRate(bucket, limit, windowMs, nowMs = Date.now()) {
  try {
    sweepMem(nowMs)
    if (hasRemoteStore()) return await distributedRateCheck(bucket, limit, windowMs, nowMs)
    return checkMem(bucket, limit, windowMs, nowMs)
  } catch (err) {
    // Fail open — a broken limiter must never block the coach.
    console.error('[ratelimit] check failed (allowing):', err?.message || err)
    return { allowed: true, remaining: 0, resetAt: nowMs + windowMs }
  }
}
