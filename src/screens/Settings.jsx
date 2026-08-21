import { useMemo, useState } from 'react'
import { SPLIT_LINES, DEFAULT_SPLIT, SPLIT_KEYS, splitOf, splitTotal } from '../lib/constants'
import { totals, splitPerformance } from '../lib/calc'
import { money } from '../lib/format'

/**
 * Her own Rich Woman Split.
 *
 * The teaching starts everyone at 10/10/10/10/60, and that stays the default —
 * but a woman with no rent to pay and a woman carrying a household are not
 * working with the same shape, and a target she cannot reach stops being a
 * target. She can move the five here as long as they still account for every
 * naira that comes in.
 *
 * The preview underneath uses her real income this month, so she can see what
 * a change actually means before she commits to it.
 */
export default function Settings({ woman, entries, onSave, onBack, busy }) {
  const cur = woman.currency || '₦'
  const [split, setSplit] = useState(() => splitOf(woman))
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const total = splitTotal(split)
  const balanced = total === 100
  const isDefault = SPLIT_KEYS.every((k) => split[k] === DEFAULT_SPLIT[k])
  const changed = SPLIT_KEYS.some((k) => split[k] !== splitOf(woman)[k])

  const t = useMemo(() => totals(entries), [entries])
  const preview = useMemo(() => splitPerformance(entries, split), [entries, split])

  const set = (key) => (value) => {
    const n = Math.max(0, Math.min(100, Math.round(Number(value) || 0)))
    setSplit((s) => ({ ...s, [key]: n }))
    setError(''); setSaved(false)
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!balanced) {
      setError(
        total > 100
          ? `That comes to ${total}%. It needs to be 100% — take ${total - 100} from somewhere.`
          : `That comes to ${total}%. It needs to be 100% — you have ${100 - total} still to place.`
      )
      return
    }
    try {
      await onSave(split)
      setSaved(true)
    } catch (err) {
      setError(err.message)
    }
  }

  const reset = () => { setSplit({ ...DEFAULT_SPLIT }); setError(''); setSaved(false) }

  return (
    <div className="shell fade-in">
      <div className="topbar">
        <button className="back-link" onClick={onBack}>← Back to my map</button>
        <div className="eyebrow" style={{ color: 'var(--peach)', marginTop: 14 }}>Your settings</div>
        <h1 className="display d-lg" style={{ marginTop: 5 }}>your split</h1>
        <p className="tiny" style={{ color: 'rgba(255,226,204,0.7)', marginTop: 8, lineHeight: 1.6 }}>
          Every naira that comes in gets a job. You decide the shape.
        </p>
      </div>

      <form className="pad" style={{ paddingTop: 24 }} onSubmit={submit}>
        <div className={`total-badge ${balanced ? 'ok' : 'off'}`}>
          <span className="small" style={{ fontWeight: 600 }}>
            {balanced ? 'Adds up to 100%' : 'Needs to add up to 100%'}
          </span>
          <span className="total-figure numeric">{total}%</span>
        </div>

        <div className="stack" style={{ gap: 14, marginTop: 16 }}>
          {SPLIT_LINES.map((line) => (
            <div className="pct-row" key={line.key}>
              <div className="row-between" style={{ alignItems: 'baseline' }}>
                <div>
                  <div className="small" style={{ fontWeight: 600 }}>{line.label}</div>
                  <div className="tiny muted">{line.note}</div>
                </div>
                <div className="stepper">
                  <button type="button" onClick={() => set(line.key)(split[line.key] - 1)} aria-label={`Less ${line.label}`}>−</button>
                  <input
                    className="pct-input numeric" inputMode="numeric" value={split[line.key]}
                    onChange={(e) => set(line.key)(e.target.value.replace(/[^\d]/g, ''))}
                    aria-label={`${line.label} percentage`}
                  />
                  <span className="pct-sign">%</span>
                  <button type="button" onClick={() => set(line.key)(split[line.key] + 1)} aria-label={`More ${line.label}`}>+</button>
                </div>
              </div>
              <input
                className="slider" type="range" min="0" max="100" value={split[line.key]}
                onChange={(e) => set(line.key)(e.target.value)}
                aria-label={`${line.label} slider`}
              />
            </div>
          ))}
        </div>

        {error && <div className="error-note" style={{ marginTop: 16 }}>{error}</div>}
        {saved && !error && (
          <div className="saved-note" style={{ marginTop: 16 }}>
            Saved. Your map is already using it.
          </div>
        )}

        {/* Deliberately still clickable when the total is off — a disabled
            button cannot tell her she is 1% short. */}
        <button className="btn btn-primary" style={{ marginTop: 18 }} disabled={busy || (!changed && balanced)}>
          {busy ? 'Saving…' : changed ? 'Save my split' : 'Saved'}
        </button>
        {!isDefault && (
          <button type="button" className="btn btn-ghost" style={{ marginTop: 8 }} onClick={reset}>
            Reset to 10 / 10 / 10 / 10 / 60
          </button>
        )}

        {/* ---- What it means in real money ---- */}
        <div className="section">
          <div className="section-head"><span className="eyebrow">What that means this month</span></div>
          {t.moneyIn > 0 ? (
            <div className="card">
              <p className="tiny muted" style={{ marginBottom: 12, lineHeight: 1.6 }}>
                Against the {money(t.moneyIn, cur)} you have logged coming in so far.
              </p>
              {preview.lines.map((l) => (
                <div className="row-between" key={l.key} style={{ padding: '7px 0' }}>
                  <span className="small">{l.label} <span className="split-pct">{l.pct}%</span></span>
                  <span className="small numeric" style={{ fontWeight: 600 }}>{money(l.target, cur)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p className="small muted">
                Log your first money in and this will show you what each line is worth in real terms.
              </p>
            </div>
          )}
        </div>

        <p className="tiny muted safe-bottom" style={{ marginTop: 18, lineHeight: 1.65 }}>
          Changing these updates your current month straight away. Months you have already
          closed keep the percentages you were working to at the time — your history stays
          true to what actually happened.
        </p>
      </form>
    </div>
  )
}
