import { useState } from 'react'
import { useStore, financeTotals } from '../../store.js'
import { fmt } from '../../lib/time.js'
import { toneViews } from '../../lib/tone.js'

const DONUT_COLORS = ['#e63946', '#d9b46a', '#7fffb0', '#9d8cff', '#5ab0e6', '#e68a5a', '#b0b6c2']

function Donut({ items }) {
  const total = items.reduce((a, x) => a + (Number(x.value) || 0), 0)
  if (total <= 0) return <div className="donut-empty">Add assets to see allocation.</div>
  const R = 60
  const C = 2 * Math.PI * R
  let offset = 0
  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 160 160" width="160" height="160">
        <g transform="translate(80,80) rotate(-90)">
          {items.map((x, i) => {
            const frac = (Number(x.value) || 0) / total
            const len = frac * C
            const seg = (
              <circle
                key={x.id}
                r={R}
                fill="none"
                stroke={DONUT_COLORS[i % DONUT_COLORS.length]}
                strokeWidth="20"
                strokeDasharray={`${len} ${C - len}`}
                strokeDashoffset={-offset}
              />
            )
            offset += len
            return seg
          })}
        </g>
      </svg>
      <div className="donut-legend">
        {items.map((x, i) => (
          <div className="legend-chip" key={x.id}>
            <span className="legend-sq" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
            {x.label} — ${fmt(x.value)}
          </div>
        ))}
      </div>
    </div>
  )
}

function LedgerRow({ kind, item, onRemove, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [label, setLabel] = useState(item.label)
  const [value, setValue] = useState(String(item.value))
  const startEdit = () => { setLabel(item.label); setValue(String(item.value)); setEditing(true) }
  const save = () => {
    onUpdate(kind, item.id, { label: label.trim() || item.label, value: Number(value) || 0 })
    setEditing(false)
  }
  if (editing) {
    return (
      <li className="ledger-edit">
        <div className="gedit">
          <input className="field-input grow" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label" />
          <input className="field-input" type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder="$" />
          <div className="gedit-actions">
            <button className="mini" onClick={save}>Save</button>
            <button className="mini" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      </li>
    )
  }
  return (
    <li>
      <span>{item.label}</span>
      <span className="ledger-val">
        ${fmt(item.value)}
        <button className="mini" aria-label="Edit item" onClick={startEdit}>✎</button>
        <button className="mini danger" aria-label="Remove item" onClick={() => onRemove(kind, item.id)}>✕</button>
      </span>
    </li>
  )
}

function Ledger({ kind, items, onAdd, onRemove, onUpdate, accent }) {
  const [label, setLabel] = useState('')
  const [value, setValue] = useState('')
  const submit = (e) => {
    e.preventDefault()
    if (!label.trim() || !value) return
    onAdd(label.trim(), value)
    setLabel('')
    setValue('')
  }
  const total = items.reduce((a, x) => a + (Number(x.value) || 0), 0)
  return (
    <div className="card">
      <div className="card-title" style={{ color: accent }}>
        {kind === 'assets' ? '↑ Assets' : '↓ Liabilities'} — ${fmt(total)}
      </div>
      <form className="inline-form tight" onSubmit={submit}>
        <input className="field-input grow" placeholder={kind === 'assets' ? 'e.g. Brokerage' : 'e.g. Mortgage'} value={label} onChange={(e) => setLabel(e.target.value)} />
        <input className="field-input narrow" type="number" placeholder="$" value={value} onChange={(e) => setValue(e.target.value)} />
        <button className="btn btn-primary" type="submit">+</button>
      </form>
      <ul className="ledger">
        {items.length === 0 && <li className="kempty">Nothing recorded.</li>}
        {items.map((x) => (
          <LedgerRow key={x.id} kind={kind} item={x} onRemove={onRemove} onUpdate={onUpdate} />
        ))}
      </ul>
    </div>
  )
}

export default function FinanceView() {
  const finance = useStore((s) => s.finance)
  const addAsset = useStore((s) => s.addAsset)
  const addLiability = useStore((s) => s.addLiability)
  const removeFinanceItem = useStore((s) => s.removeFinanceItem)
  const updateFinanceItem = useStore((s) => s.updateFinanceItem)
  const setRetirementTarget = useStore((s) => s.setRetirementTarget)
  const tone = useStore((s) => s.tone)
  const tv = toneViews(tone)

  const { assets, liabilities, netWorth } = financeTotals(finance)
  const target = finance.retirementTarget || 0
  const progress = target > 0 ? Math.min(100, Math.max(0, (netWorth / target) * 100)) : 0

  return (
    <div>
      <h2 className="view-title">Financial Planner</h2>
      <p className="view-sub">{tv.finance.sub}</p>

      <div className="grid">
        <div className="card span-2 networth-card">
          <div className="card-title">Net worth</div>
          <div className="networth-big" style={{ color: netWorth >= 0 ? 'var(--spectral)' : 'var(--ember)' }}>
            {netWorth < 0 ? '-' : ''}${fmt(Math.abs(netWorth))}
          </div>
          <div className="networth-sub">${fmt(assets)} assets − ${fmt(liabilities)} liabilities</div>

          <div className="retire-row">
            <label className="field-label">Retirement / freedom target</label>
            <input
              className="field-input narrow"
              type="number"
              value={target || ''}
              placeholder="$"
              onChange={(e) => setRetirementTarget(e.target.value)}
            />
          </div>
          {target > 0 && (
            <div className="lifebar">
              <div className="lifebar-track">
                <div className="lifebar-fill" style={{ width: `${progress}%`, background: 'linear-gradient(90deg, var(--spectral-dim), var(--spectral))' }} />
              </div>
              <div className="lifebar-meta">
                <span>{progress.toFixed(1)}% of ${fmt(target)}</span>
                <span>${fmt(Math.max(0, target - netWorth))} to go</span>
              </div>
            </div>
          )}
        </div>

        <Ledger kind="assets" items={finance.assets} onAdd={addAsset} onRemove={removeFinanceItem} onUpdate={updateFinanceItem} accent="var(--spectral)" />
        <Ledger kind="liabilities" items={finance.liabilities} onAdd={addLiability} onRemove={removeFinanceItem} onUpdate={updateFinanceItem} accent="var(--ember)" />

        <div className="card span-2">
          <div className="card-title">Asset allocation</div>
          <Donut items={finance.assets} />
        </div>
      </div>
    </div>
  )
}
