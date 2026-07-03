import { useEffect, useRef, useState } from 'react'
import { useStore } from '../../store.js'
import DateSelect from '../DateSelect.jsx'

const TONES = [
  { key: 'gentle', label: 'Gentle', hint: 'A softer hand — encouragement over confrontation.' },
  { key: 'balanced', label: 'Balanced', hint: 'Honest but humane — the default.' },
  { key: 'unflinching', label: 'Unflinching', hint: 'No cushioning. The clock, plainly.' },
]

// Shrink an uploaded image in-browser so it fits comfortably in localStorage.
function downscale(file, maxDim, type, quality) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
      const w = Math.max(1, Math.round(img.width * scale))
      const h = Math.max(1, Math.round(img.height * scale))
      const c = document.createElement('canvas')
      c.width = w
      c.height = h
      c.getContext('2d').drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      try {
        resolve(c.toDataURL(type, quality))
      } catch (e) {
        reject(e)
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('bad image'))
    }
    img.src = url
  })
}

function ImageSlot({ label, hint, slot, value, onPick, onClear }) {
  return (
    <div className="img-slot">
      <div className="img-thumb" style={value ? { backgroundImage: `url(${value})` } : undefined}>
        {!value && <span className="img-thumb-empty">none</span>}
      </div>
      <div className="img-slot-meta">
        <div className="img-slot-label">{label}</div>
        <p className="field-hint">{hint}</p>
        <div className="img-slot-actions">
          <label className="btn btn-primary img-upload-btn">
            {value ? 'Replace' : 'Upload'}
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => onPick(slot, e)} />
          </label>
          {value && <button className="btn btn-ghost" onClick={() => onClear(slot)}>Remove</button>}
        </div>
      </div>
    </div>
  )
}

export default function SettingsView() {
  const profile = useStore((s) => s.profile)
  const updateProfile = useStore((s) => s.updateProfile)
  const tone = useStore((s) => s.tone)
  const setTone = useStore((s) => s.setTone)
  const importData = useStore((s) => s.importData)
  const resetAll = useStore((s) => s.resetAll)
  const images = useStore((s) => s.images)
  const setImage = useStore((s) => s.setImage)
  const clearImage = useStore((s) => s.clearImage)
  const [imgErr, setImgErr] = useState('')

  const onPickImage = async (slot, e) => {
    setImgErr('')
    const file = e.target.files?.[0]
    if (e.target) e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setImgErr('Please choose an image file (PNG or JPG).')
      return
    }
    try {
      const dataUrl =
        slot === 'reaper'
          ? await downscale(file, 420, file.type.includes('png') ? 'image/png' : 'image/jpeg', 0.92)
          : await downscale(file, 1600, 'image/jpeg', 0.72)
      if (dataUrl.length > 3_600_000) {
        setImgErr('That image is too large even after shrinking — try a smaller one.')
        return
      }
      try {
        setImage(slot, dataUrl)
      } catch {
        setImgErr('Ran out of local storage — remove another image and try again.')
      }
    } catch {
      setImgErr('Could not read that image.')
    }
  }

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

  const onReset = () => {
    if (window.confirm('Reset everything — profile, goals, finances, family, legacy? This cannot be undone.')) {
      resetAll()
    }
  }

  return (
    <div>
      <h2 className="view-title">Settings</h2>
      <p className="view-sub">
        Your details, how Death addresses you, and a backup of everything — stored only on this device.
      </p>

      <div className="grid">
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

        {/* Appearance — wolf & backgrounds */}
        <div className="card span-2">
          <div className="card-title">Appearance — your wolf & backgrounds</div>
          <p className="field-hint">
            Upload the images you have. They're used everywhere instantly and stored on this device.
            A transparent PNG cut-out looks best for the wolf.
          </p>
          <div className="img-slots">
            <ImageSlot
              label="Wolf avatar"
              hint="Shown in the Death dock and the countdown. A square/cut-out wolf works best."
              slot="reaper"
              value={images?.reaper}
              onPick={onPickImage}
              onClear={clearImage}
            />
            <ImageSlot
              label="Page background"
              hint="The moonlit graveyard behind every screen."
              slot="bg"
              value={images?.bg}
              onPick={onPickImage}
              onClear={clearImage}
            />
            <ImageSlot
              label="Onboarding background"
              hint="The wolf + moon scene on the welcome screen."
              slot="hero"
              value={images?.hero}
              onPick={onPickImage}
              onClear={clearImage}
            />
          </div>
          {imgErr && <p className="settings-error">{imgErr}</p>}
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
