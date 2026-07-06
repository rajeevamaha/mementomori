import { useEffect, useState } from 'react'
import { useStore } from '../store.js'
import { login, register, logout, updateAccountProfile, getAccountMeta } from '../lib/sync.js'

// Sign-in / account management panel. Rendered inside Settings (and offered
// from onboarding). Sessions are HttpOnly cookies; this only renders state.

export default function AccountPanel({ compact = false }) {
  const user = useStore((s) => s.user)
  const [meta, setMeta] = useState(getAccountMeta())
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [loginName, setLoginName] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [flash, setFlash] = useState('')

  // Meta may not be ready if this mounts before initAccount resolves.
  useEffect(() => {
    if (meta) return
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((me) => setMeta({ accountsAvailable: !!me.accountsAvailable, google: !!me.google }))
      .catch(() => setMeta({ accountsAvailable: false, google: false }))
  }, [meta])

  // Surface ?auth_error=… from a failed Google redirect, once.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const e = p.get('auth_error')
    if (e) {
      setError(e)
      p.delete('auth_error')
      const q = p.toString()
      window.history.replaceState({}, '', window.location.pathname + (q ? `?${q}` : ''))
    }
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'register') await register(loginName, password, name)
      else await login(loginName, password)
      setPassword('')
      setFlash('Welcome back. Your plan follows you now.')
      setTimeout(() => setFlash(''), 4000)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const onLogout = async () => {
    setBusy(true)
    try {
      await logout()
    } finally {
      setBusy(false)
    }
  }

  if (!meta) return null

  if (!meta.accountsAvailable) {
    return (
      <div className="account-panel">
        <p className="muted small">
          Accounts are not available on this deployment yet — the server has no database.
          Your data still lives safely on this device.
        </p>
      </div>
    )
  }

  if (user) {
    return (
      <div className="account-panel">
        <p className="account-signed">
          Signed in as <strong>{user.name || user.login}</strong>
          <span className="muted"> · {user.login}</span>
          {user.google ? <span className="muted"> · Google linked</span> : null}
        </p>
        <p className="muted small">
          Your plan and your conversations with Death sync to your account and follow you across devices.
        </p>
        {!compact && <LoggedInProfile user={user} />}
        <div className="account-actions">
          <button className="btn" onClick={onLogout} disabled={busy}>
            Sign out
          </button>
        </div>
        {flash && <p className="account-flash">{flash}</p>}
      </div>
    )
  }

  return (
    <div className="account-panel">
      <div className="auth-tabs">
        <button className={`mini ${mode === 'login' ? 'active' : ''}`} onClick={() => setMode('login')}>
          Sign in
        </button>
        <button className={`mini ${mode === 'register' ? 'active' : ''}`} onClick={() => setMode('register')}>
          Create account
        </button>
      </div>

      <form onSubmit={submit} className="account-form">
        {mode === 'register' && (
          <input
            className="field-input"
            placeholder="Your name (optional)"
            value={name}
            autoComplete="name"
            onChange={(e) => setName(e.target.value)}
          />
        )}
        <input
          className="field-input"
          placeholder="Username or email"
          value={loginName}
          autoComplete="username"
          onChange={(e) => setLoginName(e.target.value)}
        />
        <input
          className="field-input"
          type="password"
          placeholder={mode === 'register' ? 'Password (8+ characters)' : 'Password'}
          value={password}
          autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="btn btn-primary" type="submit" disabled={busy || !loginName || !password}>
          {busy ? '…' : mode === 'register' ? 'Create account' : 'Sign in'}
        </button>
      </form>

      {meta.google && (
        <a className="btn google-btn" href="/api/auth/google">
          Continue with Google
        </a>
      )}

      {error && <p className="account-error">⚠ {error}</p>}
      <p className="muted small">
        Your plan and Death's memory of your conversations are kept safe to your account and follow you
        across every device you sign in on.
      </p>
    </div>
  )
}

function LoggedInProfile({ user }) {
  const [name, setName] = useState(user.name || '')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const save = async () => {
    setBusy(true)
    setMsg('')
    try {
      await updateAccountProfile({ name, ...(password ? { password } : {}) })
      setPassword('')
      setMsg('Account updated.')
      setTimeout(() => setMsg(''), 2500)
    } catch (err) {
      setMsg(`⚠ ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="account-form" style={{ marginTop: 10 }}>
      <input className="field-input" placeholder="Display name" value={name} onChange={(e) => setName(e.target.value)} />
      <input
        className="field-input"
        type="password"
        placeholder="New password (leave empty to keep)"
        value={password}
        autoComplete="new-password"
        onChange={(e) => setPassword(e.target.value)}
      />
      <button className="mini" onClick={save} disabled={busy}>
        Update account
      </button>
      {msg && <p className="muted small">{msg}</p>}
    </div>
  )
}
