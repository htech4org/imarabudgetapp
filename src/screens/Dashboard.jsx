import { ARCHETYPES, CREED } from '../lib/constants'
import { totals, dayOfPeriod, daysBetween, periodComplete } from '../lib/calc'
import { money, shortDate } from '../lib/format'
import SplitPanel from '../components/SplitPanel'
import MonthGrid from '../components/MonthGrid'
import EntryList from '../components/EntryList'

export default function Dashboard({
  woman, period, entries, pastPeriods, allEntries,
  onAdd, onDelete, onOpenSummary, onSignOut,
}) {
  const arch = ARCHETYPES[woman.archetype]
  const cur = woman.currency || '₦'
  const t = totals(entries)
  const day = dayOfPeriod(period)
  const span = daysBetween(period.start_date, period.end_date) + 1
  const ready = periodComplete(period)
  const hasIncome = t.moneyIn > 0
  const surplus = t.gap >= 0

  return (
    <div className="shell fade-in">
      <div className="topbar">
        <div className="row-between" style={{ alignItems: 'flex-start' }}>
          <div>
            <div className="eyebrow" style={{ color: 'var(--peach)' }}>Your map</div>
            <h1 className="display d-lg" style={{ marginTop: 5 }}>
              hello, {woman.first_name.toLowerCase()}
            </h1>
          </div>
          <span className="day-pill">Day {day} of {span}</span>
        </div>
        <p className="tiny" style={{ color: 'rgba(255,226,204,0.66)', marginTop: 8 }}>
          {shortDate(period.start_date)} — {shortDate(period.end_date)}
        </p>
      </div>

      {arch && (
        <div className="focus-card">
          <div className="eyebrow">{arch.name} · {arch.title} · your focus first</div>
          <p className="focus-line">{arch.focusLine}</p>
          <p className="mantra">"{arch.mantra}"</p>
        </div>
      )}

      <div className="pad" style={{ paddingTop: 24 }}>
        {/* ---- The Gap ---- */}
        <div className={`gap-card ${!hasIncome ? 'gap-empty' : surplus ? 'gap-surplus' : 'gap-shortfall'}`}>
          <div className="eyebrow" style={{ color: surplus && hasIncome ? '#2E7C5C' : 'var(--clay)' }}>
            The Gap · money in minus money out
          </div>
          <div className="gap-amount" style={{ marginTop: 6 }}>
            {hasIncome || t.moneyOut > 0 ? `${surplus ? '+' : '−'}${money(Math.abs(t.gap), cur)}` : `${cur}0`}
          </div>
          <p className="gap-note">
            {!hasIncome && t.moneyOut === 0
              ? 'Nothing logged yet. Your Gap appears the moment you write down your first number.'
              : surplus
                ? 'You have a surplus. This is the money that gets assigned — it is where your wealth actually starts.'
                : 'You have a shortfall this month. That is not a failure, it is a finding. Now you can see exactly what to move.'}
          </p>
        </div>

        <div className="inout" style={{ marginTop: 12 }}>
          <div className="inout-tile tile-in">
            <div className="tiny muted">Money in</div>
            <div className="amount">{money(t.moneyIn, cur)}</div>
          </div>
          <div className="inout-tile tile-out">
            <div className="tiny muted">Money out</div>
            <div className="amount">{money(t.moneyOut, cur)}</div>
          </div>
        </div>

        {t.moved > 0 && (
          <p className="tiny muted" style={{ marginTop: 10, lineHeight: 1.55 }}>
            You have also moved <b>{money(t.moved, cur)}</b> into your Saving, Investing and Growth
            lines. Money moved to yourself is not counted as spending — it comes out of your Gap.
          </p>
        )}

        {/* ---- Quick add ---- */}
        <div className="quick" style={{ marginTop: 18 }}>
          <button className="quick-btn quick-in" onClick={() => onAdd('IN')}>
            <span className="k">+ Add</span><span className="v">money in</span>
          </button>
          <button className="quick-btn quick-out" onClick={() => onAdd('OUT')}>
            <span className="k">− Add</span><span className="v">money out</span>
          </button>
        </div>

        {/* ---- The Rich Woman Split ---- */}
        <div className="section">
          <div className="section-head">
            <span className="eyebrow">The Rich Woman Split</span>
          </div>
          <SplitPanel
            entries={entries}
            currency={cur}
            focusOn={arch?.focusOn}
            onMove={(line) => onAdd('MOVE', line)}
          />
        </div>

        {/* ---- The month ---- */}
        <div className="section">
          <div className="section-head">
            <span className="eyebrow">Your thirty days</span>
          </div>
          <MonthGrid period={period} entries={entries} />
        </div>

        {/* ---- The log ---- */}
        <div className="section">
          <div className="section-head">
            <span className="eyebrow">Everything you have logged</span>
          </div>
          <EntryList entries={entries} currency={cur} onDelete={onDelete} />
        </div>

        {/* ---- Close out ---- */}
        <div className="section">
          <div className="card-flat">
            <h3 className="display d-sm" style={{ marginBottom: 6 }}>
              {ready ? 'your month is complete' : 'closing this month'}
            </h3>
            <p className="small muted" style={{ lineHeight: 1.65 }}>
              {ready
                ? 'Thirty days are done. Go and close out your map — see your Gap, name your biggest leak, and write down what you learned.'
                : `On day ${span} you will close this map out and write your one sentence. You can also close it early if you are ready.`}
            </p>
            <button className={`btn ${ready ? 'btn-clay' : 'btn-ghost'}`} style={{ marginTop: 14 }} onClick={onOpenSummary}>
              {ready ? 'Close out my month' : 'See my month so far'}
            </button>
          </div>
        </div>

        {/* ---- History ---- */}
        {pastPeriods.length > 0 && (
          <div className="section">
            <div className="section-head">
              <span className="eyebrow">Your past months</span>
            </div>
            <div className="stack" style={{ gap: 8 }}>
              {pastPeriods.map((p) => {
                const pt = totals(allEntries.filter((e) => e.period_id === p.id))
                return (
                  <div className="history-row" key={p.id}>
                    <div style={{ minWidth: 0 }}>
                      <div className="small" style={{ fontWeight: 600 }}>Month {p.period_number}</div>
                      <div className="tiny muted">{shortDate(p.start_date)} — {shortDate(p.end_date)}</div>
                      {p.realisation && (
                        <div className="tiny" style={{ color: 'var(--clay)', marginTop: 4, fontStyle: 'italic' }}>
                          "{p.realisation}"
                        </div>
                      )}
                    </div>
                    <span
                      className="numeric small"
                      style={{ fontWeight: 600, whiteSpace: 'nowrap', color: pt.gap >= 0 ? '#2E7C5C' : 'var(--clay)' }}
                    >
                      {pt.gap >= 0 ? '+' : '−'}{money(Math.abs(pt.gap), cur)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div className="footer-note">
        <p className="creed">{CREED}</p>
        <p style={{ marginBottom: 12 }}>© IMARA Wealth Trybe · Leading Ladies Foundation</p>
        <button className="btn-link" onClick={onSignOut}>Sign out of this device</button>
      </div>
    </div>
  )
}
