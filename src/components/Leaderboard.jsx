import { useState } from 'react'

const LIMIT = 10

/**
 * Saver / Investor of the Month.
 *
 * Names and percentages only — never an amount. A percentage of her own income
 * means a woman earning a little can lead a woman earning a lot, and nobody's
 * income can be read off the board. That is the whole reason it is safe to
 * show every woman the full list.
 *
 * Shows the top ten. If she is further down, her own row is pinned under the
 * ten with her real rank, so she never has to expand the list to find herself.
 */
export default function Leaderboard({ title, subtitle, rows, accent = 'saving', emptyNote }) {
  const [showAll, setShowAll] = useState(false)

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

  const visible = showAll ? rows : rows.slice(0, LIMIT)
  const me = rows.find((r) => r.is_you)
  const pinMe = !showAll && me && !visible.includes(me)
  const canExpand = rows.length > LIMIT

  const renderRow = (r, key) => (
    <li key={key} className={`board-row${r.is_you ? ' is-you' : ''}`}>
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
  )

  return (
    <div className="board">
      <div className="board-head">
        <span className="eyebrow">{title}</span>
        <span className="tiny faint">{rows.length} {rows.length === 1 ? 'woman' : 'women'}</span>
      </div>
      <p className="board-sub">{subtitle}</p>

      <ol className="board-list">
        {visible.map((r, i) => renderRow(r, `${r.name}-${i}`))}
        {pinMe && (
          <>
            <li aria-hidden="true" className="tiny faint" style={{ textAlign: 'center', padding: '2px 0', letterSpacing: 4 }}>
              ···
            </li>
            {renderRow(me, 'me')}
          </>
        )}
      </ol>

      {canExpand && (
        <div style={{ textAlign: 'center', marginTop: 10 }}>
          <button type="button" className="btn-link" onClick={() => setShowAll((v) => !v)}>
            {showAll ? 'Show top 10' : `Show all ${rows.length}`}
          </button>
        </div>
      )}
    </div>
  )
}

// One decimal only when it earns its place.
const formatPct = (n) => `${Number.isInteger(n) ? n : Number(n).toFixed(1)}%`
