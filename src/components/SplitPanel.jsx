import { splitPerformance } from '../lib/calc'
import { money } from '../lib/format'

/**
 * The Rich Woman Split, deliberately shown as two different kinds of line:
 *
 *   MONEY YOU SPEND  (Giving 10%, Living 60%)
 *     These she can already see in her OUT entries, so the bar is a
 *     measurement — here is what actually left, against what you assigned.
 *
 *   MONEY YOU BUILD  (Saving 10%, Investing 10%, Personal Growth 10%)
 *     These have no spending category, because they are not spending. They
 *     are money she has to deliberately move to herself. So they get their
 *     own warmer panel, show what is still owed to that line, and carry the
 *     button that logs the move.
 */
export default function SplitPanel({ entries, currency, focusOn, onMove, split, onEditSplit }) {
  const perf = splitPerformance(entries, split)
  const spend = perf.lines.filter((l) => l.kind === 'spend')
  const build = perf.lines.filter((l) => l.kind === 'build')
  const spendPct = spend.reduce((t, l) => t + l.pct, 0)
  const buildPct = build.reduce((t, l) => t + l.pct, 0)

  if (perf.moneyIn <= 0) {
    return (
      <div className="empty-state">
        <p className="display d-sm" style={{ marginBottom: 6 }}>your split is waiting</p>
        <p className="small muted">
          Log your first money in, and every one of the five lines will fill in with a real number to aim at.
        </p>
      </div>
    )
  }

  return (
    <div className="stack">
      <div className="split-group split-spend">
        <div className="split-group-head">
          <span className="eyebrow">Money you spend</span>
          <span className="tiny faint">{spendPct}% of what comes in</span>
        </div>
        <p className="split-group-note">Measured straight from what you have logged going out.</p>
        {spend.map((line) => (
          <SpendLine key={line.key} line={line} currency={currency} focused={focusOn === line.key} />
        ))}
      </div>

      <div className="split-group split-build">
        <div className="split-group-head">
          <span className="eyebrow" style={{ color: 'var(--maroon-900)' }}>Money you build</span>
          <span className="tiny" style={{ color: 'var(--maroon-700)' }}>{buildPct}% of what comes in</span>
        </div>
        <p className="split-group-note">
          These are not expenses, so they will never show up in your spending. This is money you
          move to yourself on purpose. Log it here so the map knows you did it.
        </p>
        {build.map((line) => (
          <BuildLine
            key={line.key}
            line={line}
            currency={currency}
            focused={focusOn === line.key}
            onMove={() => onMove(line.key)}
          />
        ))}
      </div>

      {onEditSplit && (
        <button className="btn btn-soft btn-adjust" onClick={onEditSplit}>
          Adjust my split percentages
        </button>
      )}
    </div>
  )
}

function SpendLine({ line, currency, focused }) {
  const over = line.actual > line.target
  const width = Math.min(100, line.progress * 100)
  return (
    <div className="split-line">
      <div className={focused ? 'split-focus' : undefined}>
        {focused && <span className="split-focus-tag">your focus first</span>}
        <div className="split-top">
          <span className="split-name">
            {line.label}<span className="split-pct">{line.pct}%</span>
          </span>
          <span className="split-figs">
            <b>{money(line.actual, currency)}</b> / {money(line.target, currency)}
          </span>
        </div>
        <div className={`bar ${over ? 'bar-over' : `bar-${line.key}`}`}>
          <span style={{ width: `${width}%` }} />
        </div>
        <p className="split-hint">
          {line.key === 'living'
            ? over
              ? `Living is ${money(line.over, currency)} above your 60%. That is information, not a verdict — it tells you exactly where to look.`
              : `${money(line.remaining, currency)} of room still inside your 60%.`
            : over
              ? `You have given ${money(line.over, currency)} beyond your 10% line.`
              : `${money(line.remaining, currency)} left to reach your 10% giving line.`}
        </p>
      </div>
    </div>
  )
}

function BuildLine({ line, currency, focused, onMove }) {
  const width = Math.min(100, line.progress * 100)
  return (
    <div className="split-line">
      <div className={focused ? 'split-focus' : undefined}>
        {focused && <span className="split-focus-tag">your focus first</span>}
        <div className="split-top">
          <span className="split-name">
            {line.label}<span className="split-pct">{line.pct}%</span>
          </span>
          <span className="split-figs">
            <b>{money(line.actual, currency)}</b> / {money(line.target, currency)}
          </span>
        </div>
        <div className={`bar bar-${line.key}`}>
          <span style={{ width: `${width}%` }} />
        </div>
        <p className="split-hint">
          {line.remaining > 0
            ? `${money(line.remaining, currency)} still owed to this line. ${line.note}.`
            : `This line is covered. ${line.note}.`}
        </p>
        <button className="move-btn" onClick={onMove}>
          ✦ I moved money into {line.label}
        </button>
      </div>
    </div>
  )
}
