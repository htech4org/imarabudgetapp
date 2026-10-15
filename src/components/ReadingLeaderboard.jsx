import { useState } from 'react'

const LIMIT = 10

// Top ten readers; if she is further down, her own row is pinned beneath them
// with her real position. "Show all" expands the whole list.
export default function ReadingLeaderboard({ rows }) {
  const [showAll, setShowAll] = useState(false)

  const list = rows || []
  const ranked = list.map((r, i) => ({ ...r, rank: i + 1 }))
  const visible = showAll ? ranked : ranked.slice(0, LIMIT)
  const me = ranked.find((r) => r.is_you)
  const pinMe = !showAll && me && me.rank > LIMIT
  const canExpand = ranked.length > LIMIT

  const renderRow = (r, key) => (
    <li className={`board-row ${r.is_you ? 'is-you' : ''}`} key={key}>
      <span className={`board-rank ${r.rank === 1 ? 'medal-1' : r.rank === 2 ? 'medal-2' : r.rank === 3 ? 'medal-3' : ''}`}>
        {r.rank}
      </span>
      <span className="board-name">
        {r.first_name}
        {r.is_you && <span className="board-you">You</span>}
      </span>
      <span className="board-pct">
        <b>{r.chapters_completed}</b>
      </span>
    </li>
  )

  return (
    <div className="board">
      <div className="board-head">
        <span className="small" style={{ fontWeight: 700 }}>Reader{list.length === 1 ? '' : 's'} of the month</span>
        {list.length > 0 && <span className="tiny faint">{list.length} {list.length === 1 ? 'woman' : 'women'}</span>}
      </div>
      <p className="board-sub">Chapters passed this month — most consistent, not most read at once.</p>

      {list.length === 0 ? (
        <p className="small muted" style={{ padding: '6px 0 2px' }}>
          Nobody has passed a chapter yet this month. Yours could be the first.
        </p>
      ) : (
        <>
          <ul className="board-list">
            {visible.map((r, i) => renderRow(r, `${r.first_name}-${i}`))}
            {pinMe && (
              <>
                <li aria-hidden="true" className="tiny faint" style={{ textAlign: 'center', padding: '2px 0', letterSpacing: 4 }}>
                  ···
                </li>
                {renderRow(me, 'me')}
              </>
            )}
          </ul>
          {canExpand && (
            <div style={{ textAlign: 'center', marginTop: 10 }}>
              <button type="button" className="btn-link" onClick={() => setShowAll((v) => !v)}>
                {showAll ? 'Show top 10' : `Show all ${list.length}`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
