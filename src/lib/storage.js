import { useState, useEffect } from 'react'

const KEY = 'mbd.profile.v1'

export function loadProfile() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveProfile(profile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(profile))
  } catch {
    /* ignore quota errors */
  }
}

export function clearProfile() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

// Small hook so the dashboard re-ticks every interval.
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}
