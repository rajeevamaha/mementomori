import { useEffect, useRef, useState } from 'react'
import { useStore } from '../../store.js'
import DateSelect from '../DateSelect.jsx'
import AccountPanel from '../AccountPanel.jsx'
import { isSignedIn, logout } from '../../lib/sync.js'

const TONES = [
  { key: 'gentle', label: 'Gentle', hint: 'A softer hand — encouragement over confrontation.' },
  { key: 'balanced', label: 'Balanced', hint: 'Honest but humane — the default.' },
  { key: 'unflinching', label: 'Unflinching', hint: 'No cushioning. The clock, plainly.' },
]

export default function SettingsView() {
  const profile = useStore((s) => s.profile)
  const updateProfile = useStore((s) => s.updateProfile)
  const tone = useStore((s) => s.tone)
  const setTone = useStore((s) => s.setTone)
  const importData = useStore((s) => s.importData)
  const resetAll = useStore((s) => s.resetAll)

  const [name, setName] = useState(profile?.name || '')
  const [dob, setDob] = useState(profile?.dob || '')
  const [life, setLife] = useState(profile?.lifeExpectancy ?? 80)
  const [savedProfile, setSavedProfile] = useState(false)

  // Re-seed when the store profile changes underneath us (e.g. Death's
  // update_profile tool writes while this view is open) — the external
  // change wins over unsaved edits, and Save no longer clobbers it.
  useEffect(() => {
    setName(profile?.name || '')
    setDob(profile?.dob || '')
    setLife(profile?.lifeExpectancy ?? 80)
  }, [profile])

  const [dataFlash, setDataFlash] = useState('')
  const [dataError, setDataError] = useState('')
  const fileRef = useRef(null)

  const saveProfile = () => {
    const t = new Date()
    const todayStr = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
    const patch = { name, lifeExpectancy: life }
    // A future birth date makes the life math negative — never persist one.
    if (!dob || dob <= todayStr) patch.dob = dob
    updateProfile(patch)
    setSavedProfile(true)
    setTimeout(() => setSavedProfile(false), 2500)
  }

  const exportBackup = () => {
    const s = useStore.getState()
    const payload = {
      profile: s.profile,
      goals: s.goals,
      finance: s.finance,
      family: s.family,
      legacy: s.legacy,
      reviews: s.reviews,
      events: s.events,
      tone: s.tone,
      _v: 1,
      _exportedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mbd-backup-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const onImportFile = (e) => {
    setDataError('')
    setDataFlash('')
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      let parsed
      try {
        parsed = JSON.parse(reader.result)
      } catch (err) {
        setDataError('That file is not valid JSON. Choose a backup exported from MBD.')
        if (fileRef.current) fileRef.current.value = ''
        return
      }
      if (window.confirm('Restoring will replace your current data with the backup. Continue?')) {
        importData(parsed)
        setDataFlash('Restored ✦')
        setTimeout(() => setDataFlash(''), 2500)
      }
      if (fileRef.current) fileRef.current.value = ''
    }
    reader.onerror = () => {
      setDataError('Could not read that file.')
      if (fileRef.current) fileRef.current.value = ''
    }
    reader.readAsText(file)
  }

  const onReset = async () => {
    // Signed in: reset is device-only — sign out first (flushes the plan up) so
    // the account's cloud copy survives and can be restored by signing back in.
    if (isSignedIn()) {
      if (
        window.confirm(
          'Clear this device and sign out? Your account keeps its saved plan — sign back in to restore it.'
        )
      ) {
        await logout()
        resetAll()
      }
      return
    }
    if (window.confirm('Reset everything — profile, goals, finances, family, legacy? This cannot be undone.')) {
      resetAll()
    }
  }

  return (
    <div>
      <h2 className="view-title">Settings</h2>
      <p className="view-sub">
        Your account, your details, how Death addresses you, and a backup of everything.
      </p>

      <div className="grid">
        {/* Account */}
        <div className="card">
          <div className="card-title">Account</div>
          <AccountPanel />
        </div>

        {/* Your details */}
        <div className="card">
          <div className="card-title">Your details</div>

          <label className="field-label">Name</label>
          <input
            className="field-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <label className="field-label" style={{ marginTop: 14 }}>Date of birth</label>
          <DateSelect value={dob} onChange={setDob} />

          <label className="field-label" style={{ marginTop: 14 }}>Life expectancy</label>
          <div className="range-row">
            <input
              type="range"
              min="40"
              max="110"
              value={life}
              onChange={(e) => setLife(Number(e.target.value))}
            />
            <div className="range-value">
              {life}<small>yrs</small>
            </div>
          </div>

          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center' }}>
            <button className="btn btn-primary" onClick={saveProfile}>Save</button>
            {savedProfile && <span className="settings-flash">Saved ✦</span>}
          </div>
          <p className="field-hint">Stored only on this device.</p>
        </div>

        {/* How Death speaks */}
        <div className="card settings-tone">
          <div className="card-title">How Death speaks</div>
          {TONES.map((t) => (
            <div key={t.key} style={{ marginBottom: 14 }}>
              <div className="seg">
                <button
                  className={`seg-btn ${tone === t.key ? 'active' : ''}`}
                  onClick={() => setTone(t.key)}
                >
                  {t.label}
                </button>
              </div>
              <p className="field-hint">{t.hint}</p>
            </div>
          ))}
        </div>

        {/* Your data */}
        <div className="card">
          <div className="card-title">Your data</div>
          <p className="field-hint">
            Everything lives in this browser. Keep a backup so a cleared cache never erases your letters, reflections, goals and family.
          </p>

          <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <button className="btn btn-primary" onClick={exportBackup}>Download backup</button>
            <button className="btn btn-ghost" onClick={() => fileRef.current?.click()}>Restore from backup</button>
            {dataFlash && <span className="settings-flash">{dataFlash}</span>}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            onChange={onImportFile}
            style={{ display: 'none' }}
          />
          {dataError && <p className="settings-error">{dataError}</p>}

          <div style={{ marginTop: 22, borderTop: '1px solid var(--ash-faint)', paddingTop: 16 }}>
            <button className="btn btn-ghost" onClick={onReset}>↺ Reset everything</button>
            <p className="field-hint">This erases all data on this device and cannot be undone. Export a backup first.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
