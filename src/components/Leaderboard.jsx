/**
 * Saver / Investor of the Month.
 *
 * Names and percentages only — never an amount. A percentage of her own target
 * means a woman earning a little can lead a woman earning a lot, and nobody's
 * income can be read off the board. That is the whole reason it is safe to
 * show every woman the full list.
 */
export default function Leaderboard({ title, subtitle, rows, accent = 'saving', emptyNote }) {
  if (!rows || rows.length === 0) {
    return (
      <div className="board">
        <div className="board-head">
          <span className="eyebrow">{title}</span>
        </div>
        <p className="small muted" style={{ lineHeight: 1.6 }}>{emptyNote}</p>
      </div>
    )
  }

  return (
    <div className="board">
      <div className="board-head">
        <span className="eyebrow">{title}</span>
        <span className="tiny faint">{rows.length} {rows.length === 1 ? 'woman' : 'women'}</span>
      </div>
      <p className="board-sub">{subtitle}</p>

      <ol className="board-list">
        {rows.map((r, i) => (
          <li key={`${r.name}-${i}`} className={`board-row${r.is_you ? ' is-you' : ''}`}>
            <span className={`board-rank${r.rank <= 3 ? ` medal-${r.rank}` : ''}`}>{r.rank}</span>
            <span className="board-name">
              {r.name}
              {r.is_you && <span className="board-you">you</span>}
            </span>
            <span className={`board-pct bar-${accent}`}>
              <span className="board-bar">
                <span style={{ width: `${Math.min(100, r.pct)}%` }} />
              </span>
              <b>{formatPct(r.pct)}</b>
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

// One decimal only when it earns its place.
const formatPct = (n) => `${Number.isInteger(n) ? n : Number(n).toFixed(1)}%`
