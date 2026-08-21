import { useState } from 'react'
import { ARCHETYPES, splitOf } from '../lib/constants'
import { totals, biggestLeak, splitPerformance, periodComplete, daysBetween } from '../lib/calc'
import { money, pct, shortDate } from '../lib/format'

/**
 * Day 30. This is meant to feel like closing a workbook — the numbers, the
 * one thing that leaked, and her own sentence written in her own words.
 */
export default function Summary({ woman, period, entries, onSave, onNewPeriod, onBack, busy }) {
  const cur = woman.currency || '₦'
  const closed = period.status === 'closed'
  const [realisation, setRealisation] = useState(period.realisation || '')
  const [error, setError] = useState('')

  const t = totals(entries)
  const leak = biggestLeak(entries)
  // A month that has closed carries the percentages it ran under; a live one
  // follows her current settings.
  const perf = splitPerformance(entries, closed ? splitOf(period) : splitOf(woman))
  const arch = ARCHETYPES[woman.archetype]
  const span = daysBetween(period.start_date, period.end_date) + 1
  const daysLogged = new Set(entries.map((e) => e.entry_date)).size
  const surplus = t.gap >= 0
  const ready = periodComplete(period)

  const save = async () => {
    if (!realisation.trim()) { setError('Write one sentence. Even a short one. It is the part you will come back to.'); return }
    try { await onSave(realisation.trim()) } catch (e) { setError(e.message) }
  }

  return (
    <div className="shell fade-in">
      <div className="workbook">
        <div className="eyebrow" style={{ color: 'var(--peach)' }}>
          {closed ? `Month ${period.period_number} · closed` : ready ? 'Day 30 · closing out' : 'Where you are so far'}
        </div>
        <h1 className="display d-lg" style={{ margin: '12px 0 10px' }}>
          {closed ? 'your map, closed out' : ready ? 'you made the map' : 'your map so far'}
        </h1>
        <p style={{ fontSize: 13.5, lineHeight: 1.7, color: 'rgba(255,226,204,0.8)' }}>
          {shortDate(period.start_date)} — {shortDate(period.end_date)} · you showed up on{' '}
          {daysLogged} of {span} days
        </p>
      </div>

      <div className="pad" style={{ paddingTop: 24 }}>
        {!ready && !closed && (
          <div className="privacy-note" style={{ marginBottom: 20 }}>
            <p>
              This month is still open — these are your numbers so far. Come back on day {span}
              {' '}to close it out properly, or close it early if you are ready.
            </p>
          </div>
        )}

        {/* ---- The ledger ---- */}
        <div className="ledger">
          <div className="ledger-row">
            <span className="k">Total money in</span>
            <span className="v" style={{ color: 'var(--forest)' }}>{money(t.moneyIn, cur)}</span>
          </div>
          <div className="ledger-row">
            <span className="k">Total money out</span>
            <span className="v" style={{ color: 'var(--wine)' }}>{money(t.moneyOut, cur)}</span>
          </div>
          <div className="ledger-row total">
            <span className="k">{surplus ? 'Your Gap — surplus' : 'Your Gap — shortfall'}</span>
            <span className="v" style={{ color: surplus ? '#2E7C5C' : 'var(--clay)' }}>
              {surplus ? '+' : '−'}{money(Math.abs(t.gap), cur)}
            </span>
          </div>
          {/* Below the total on purpose — moves are what she did WITH the Gap,
              not part of the sum that produced it. */}
          {t.moved > 0 && (
            <div className="ledger-row">
              <span className="k">Of that, moved into your split</span>
              <span className="v" style={{ color: 'var(--clay)' }}>{money(t.moved, cur)}</span>
            </div>
          )}
          {t.moved > 0 && surplus && (
            <div className="ledger-row">
              <span className="k">Surplus left unassigned</span>
              <span className="v" style={{ color: 'var(--text-soft)' }}>{money(t.unassigned, cur)}</span>
            </div>
          )}
        </div>

        <p className="small muted" style={{ marginTop: 12, lineHeight: 1.7 }}>
          {surplus
            ? 'You ended with more coming in than going out. That surplus is not spare change — it is the raw material of everything you are building.'
            : 'More went out than came in. Now you know the exact size of it, and a number you can see is a number you can move.'}
        </p>

        {/* ---- The leak ---- */}
        <div className="section">
          <div className="section-head"><span className="eyebrow">Your biggest leak</span></div>
          {leak ? (
            <div className="leak-card">
              <div className="display d-md" style={{ marginBottom: 4 }}>{leak.category.toLowerCase()}</div>
              <div className="leak-amount">{money(leak.amount, cur)}</div>
              <p className="small" style={{ marginTop: 10, lineHeight: 1.65, color: 'var(--maroon-700)' }}>
                That is {pct(leak.share)} of everything that went out this month — your single
                largest category. Not a wrong choice. Just the loudest one on your map.
              </p>
            </div>
          ) : (
            <div className="empty-state"><p className="small muted">No spending was logged this month.</p></div>
          )}
        </div>

        {/* ---- Split recap ---- */}
        <div className="section">
          <div className="section-head"><span className="eyebrow">Your Rich Woman Split</span></div>
          <div className="card">
            {perf.moneyIn > 0 ? (
              <>
                {perf.lines.map((l) => (
                  <div className="row-between" key={l.key} style={{ padding: '9px 0', borderBottom: '1px solid var(--line-soft)' }}>
                    <span className="small">
                      {l.label}
                      <span className="split-pct">{l.pct}%</span>
                    </span>
                    <span className="small numeric muted">
                      <b style={{ color: 'var(--text)' }}>{money(l.actual, cur)}</b> / {money(l.target, cur)}
                      {l.onMap && <span className="tag tag-good" style={{ marginLeft: 8 }}>on the map</span>}
                    </span>
                  </div>
                ))}
                <p className="tiny muted" style={{ marginTop: 12, lineHeight: 1.6 }}>
                  {perf.linesOnMap} of 5 lines landed this month.
                  {arch && ` Your focus line was ${arch.focusOn === 'start' ? 'simply starting' : arch.focusOn}.`}
                </p>
              </>
            ) : (
              <p className="small muted">No income was logged, so there were no split targets to aim at this month.</p>
            )}
          </div>
        </div>

        {/* ---- Her sentence ---- */}
        <div className="section">
          <div className="section-head"><span className="eyebrow">Your one sentence</span></div>
          {closed ? (
            <div className="realisation-card">
              <p className="realisation-quote">"{period.realisation || 'No realisation was written.'}"</p>
              <p className="tiny muted" style={{ marginTop: 12 }}>Written when you closed this month.</p>
            </div>
          ) : (
            <>
              <p className="small muted" style={{ marginBottom: 12, lineHeight: 1.7 }}>
                Looking at everything above — what is the one thing you now know that you did not
                know thirty days ago? One sentence. Your words, not ours.
              </p>
              <textarea
                className="textarea"
                value={realisation}
                onChange={(e) => { setRealisation(e.target.value); setError('') }}
                maxLength={280}
                placeholder="What I now know is…"
              />
              <p className="tiny faint" style={{ marginTop: 6 }}>{realisation.length}/280</p>
              {error && <div className="error-note" style={{ marginTop: 12 }}>{error}</div>}
              <button className="btn btn-clay" style={{ marginTop: 14 }} onClick={save} disabled={busy}>
                {busy ? 'Saving…' : 'Save and close this month'}
              </button>
            </>
          )}
        </div>

        {/* ---- What now ---- */}
        <div className="section safe-bottom">
          {closed ? (
            <div className="card-flat">
              <h3 className="display d-sm" style={{ marginBottom: 6 }}>ready for the next thirty days?</h3>
              <p className="small muted" style={{ lineHeight: 1.65 }}>
                Everything you have done stays exactly where it is — this month, your archetype,
                your whole history. A new map simply opens on top of it.
              </p>
              <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={onNewPeriod} disabled={busy}>
                {busy ? 'Opening…' : 'Start a new month'}
              </button>
              {onBack && <button className="btn btn-ghost" style={{ marginTop: 8 }} onClick={onBack}>Back</button>}
            </div>
          ) : (
            onBack && <button className="btn btn-ghost" onClick={onBack}>Back to my map</button>
          )}
        </div>
      </div>

      <div className="footer-note">
        <p className="creed">the map is not the judgment, it's the way out.</p>
        <p>© IMARA Wealth Trybe · Leading Ladies Foundation</p>
      </div>
    </div>
  )
}
