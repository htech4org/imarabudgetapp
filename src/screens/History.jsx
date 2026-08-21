import { useState } from 'react'
import { ARCHETYPES, DEFAULT_SPLIT, SPLIT_KEYS, splitOf } from '../lib/constants'
import { archivedSplit, archivedTotals } from '../lib/calc'
import { money, pct, shortDate } from '../lib/format'

/**
 * Her past months. Each one was archived the moment it closed, holding the
 * figures AND the split percentages that were live at the time — so opening a
 * month from six months ago shows the targets she was actually working to,
 * even if she has changed them since.
 */
export default function History({ woman, archives, onBack }) {
  const [openId, setOpenId] = useState(null)
  const cur = woman.currency || '₦'
  const months = [...(archives || [])].sort((a, b) => b.period_number - a.period_number)
  const open = months.find((m) => m.id === openId)

  if (open) {
    return <ArchivedMonth woman={woman} archive={open} onBack={() => setOpenId(null)} />
  }

  return (
    <div className="shell fade-in">
      <div className="topbar">
        <button className="back-link" onClick={onBack}>← Back to my map</button>
        <div className="eyebrow" style={{ color: 'var(--peach)', marginTop: 14 }}>Where you have been</div>
        <h1 className="display d-lg" style={{ marginTop: 5 }}>your past months</h1>
        <p className="tiny" style={{ color: 'rgba(255,226,204,0.7)', marginTop: 8 }}>
          {months.length} {months.length === 1 ? 'month' : 'months'} closed out
        </p>
      </div>

      <div className="pad" style={{ paddingTop: 24 }}>
        {months.length === 0 ? (
          <div className="empty-state">
            <p className="display d-sm" style={{ marginBottom: 6 }}>nothing here yet</p>
            <p className="small muted" style={{ lineHeight: 1.65 }}>
              When you close your first thirty days, it lands here — the whole month kept
              exactly as it was, so you can come back and read it any time.
            </p>
          </div>
        ) : (
          <div className="stack" style={{ gap: 10 }}>
            {months.map((m) => {
              const t = archivedTotals(m)
              const surplus = t.gap >= 0
              return (
                <button className="month-card" key={m.id} onClick={() => setOpenId(m.id)}>
                  <div className="row-between" style={{ alignItems: 'flex-start' }}>
                    <div style={{ textAlign: 'left', minWidth: 0 }}>
                      <div className="small" style={{ fontWeight: 700 }}>Month {m.period_number}</div>
                      <div className="tiny muted">
                        {shortDate(m.start_date)} — {shortDate(m.end_date)}
                      </div>
                      <div className="tiny faint" style={{ marginTop: 3 }}>
                        {m.days_logged} of {m.days_in_period} days logged
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="tiny muted">The Gap</div>
                      <div
                        className="numeric"
                        style={{ fontWeight: 700, fontSize: 17, color: surplus ? '#2E7C5C' : 'var(--clay)' }}
                      >
                        {surplus ? '+' : '−'}{money(Math.abs(t.gap), cur)}
                      </div>
                    </div>
                  </div>
                  {m.realisation && (
                    <p className="month-card-quote">"{m.realisation}"</p>
                  )}
                  <span className="month-card-open">Open this month →</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="footer-note">
        <p className="creed">the map is not the judgment, it's the way out.</p>
        <p>© IMARA Wealth Trybe · Leading Ladies Foundation</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

/** One archived month, laid out like her close-out workbook. */
function ArchivedMonth({ woman, archive, onBack }) {
  const cur = woman.currency || '₦'
  const t = archivedTotals(archive)
  const perf = archivedSplit(archive)
  const arch = ARCHETYPES[woman.archetype]
  const surplus = t.gap >= 0
  const wasCustom = SPLIT_KEYS.some((k) => splitOf(archive)[k] !== DEFAULT_SPLIT[k])
  const nowDiffers = SPLIT_KEYS.some((k) => splitOf(archive)[k] !== splitOf(woman)[k])

  return (
    <div className="shell fade-in">
      <div className="workbook">
        <button className="back-link" onClick={onBack}>← All past months</button>
        <div className="eyebrow" style={{ color: 'var(--peach)', marginTop: 16 }}>
          Month {archive.period_number} · closed
        </div>
        <h1 className="display d-lg" style={{ margin: '12px 0 10px' }}>your map, closed out</h1>
        <p style={{ fontSize: 13.5, lineHeight: 1.7, color: 'rgba(255,226,204,0.8)' }}>
          {shortDate(archive.start_date)} — {shortDate(archive.end_date)} · you showed up on{' '}
          {archive.days_logged} of {archive.days_in_period} days
        </p>
      </div>

      <div className="pad" style={{ paddingTop: 24 }}>
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
          {t.moved > 0 && (
            <div className="ledger-row">
              <span className="k">Of that, moved into your split</span>
              <span className="v" style={{ color: 'var(--clay)' }}>{money(t.moved, cur)}</span>
            </div>
          )}
        </div>

        {/* ---- The leak ---- */}
        <div className="section">
          <div className="section-head"><span className="eyebrow">Your biggest leak</span></div>
          {archive.leak_category ? (
            <div className="leak-card">
              <div className="display d-md" style={{ marginBottom: 4 }}>
                {String(archive.leak_category).toLowerCase()}
              </div>
              <div className="leak-amount">{money(archive.leak_amount, cur)}</div>
              <p className="small" style={{ marginTop: 10, lineHeight: 1.65, color: 'var(--maroon-700)' }}>
                That was {pct(Number(archive.leak_share || 0))} of everything that went out that
                month — your single largest category.
              </p>
            </div>
          ) : (
            <div className="empty-state"><p className="small muted">No spending was logged that month.</p></div>
          )}
        </div>

        {/* ---- Where every category landed ---- */}
        <div className="section">
          <div className="section-head"><span className="eyebrow">Every category</span></div>
          <div className="card">
            {Object.entries(archive.categories || {}).sort((a, b) => b[1] - a[1]).length === 0 ? (
              <p className="small muted">Nothing was logged going out.</p>
            ) : (
              Object.entries(archive.categories || {})
                .sort((a, b) => Number(b[1]) - Number(a[1]))
                .map(([cat, amt]) => (
                  <div className="row-between" key={cat} style={{ padding: '8px 0', borderBottom: '1px solid var(--line-soft)' }}>
                    <span className="small">{cat}</span>
                    <span className="small numeric" style={{ fontWeight: 600 }}>{money(amt, cur)}</span>
                  </div>
                ))
            )}
          </div>
        </div>

        {/* ---- The split as it was ---- */}
        <div className="section">
          <div className="section-head"><span className="eyebrow">Your split that month</span></div>
          <div className="card">
            {perf.moneyIn > 0 ? (
              <>
                {perf.lines.map((l) => (
                  <div className="row-between" key={l.key} style={{ padding: '9px 0', borderBottom: '1px solid var(--line-soft)' }}>
                    <span className="small">
                      {l.label}<span className="split-pct">{l.pct}%</span>
                    </span>
                    <span className="small numeric muted">
                      <b style={{ color: 'var(--text)' }}>{money(l.actual, cur)}</b> / {money(l.target, cur)}
                      {l.onMap && <span className="tag tag-good" style={{ marginLeft: 8 }}>on the map</span>}
                    </span>
                  </div>
                ))}
                <p className="tiny muted" style={{ marginTop: 12, lineHeight: 1.6 }}>
                  {perf.linesOnMap} of 5 lines landed.
                  {arch && ` Your focus line was ${arch.focusOn === 'start' ? 'simply starting' : arch.focusOn}.`}
                </p>
              </>
            ) : (
              <p className="small muted">No income was logged, so there were no targets that month.</p>
            )}
          </div>
          {nowDiffers && (
            <p className="tiny muted" style={{ marginTop: 10, lineHeight: 1.6 }}>
              These are the percentages you were working to at the time
              {wasCustom ? '' : ' (the standard split)'} — not the ones you are on now. Your
              history is not rewritten when you change your settings.
            </p>
          )}
        </div>

        {/* ---- Her sentence ---- */}
        <div className="section safe-bottom">
          <div className="section-head"><span className="eyebrow">Your one sentence</span></div>
          <div className="realisation-card">
            <p className="realisation-quote">
              "{archive.realisation || 'No realisation was written for this month.'}"
            </p>
            <p className="tiny muted" style={{ marginTop: 12 }}>Written when you closed this month.</p>
          </div>
          <button className="btn btn-ghost" style={{ marginTop: 18 }} onClick={onBack}>
            Back to all months
          </button>
        </div>
      </div>

      <div className="footer-note">
        <p className="creed">the map is not the judgment, it's the way out.</p>
        <p>© IMARA Wealth Trybe · Leading Ladies Foundation</p>
      </div>
    </div>
  )
}
