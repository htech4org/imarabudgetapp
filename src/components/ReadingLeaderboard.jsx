export default function ReadingLeaderboard({ rows }) {
  return (
    <div className="board">
      <div className="board-head">
        <span className="small" style={{ fontWeight: 700 }}>Reader{rows?.length === 1 ? '' : 's'} of the month</span>
      </div>
      <p className="board-sub">Chapters passed this month — most consistent, not most read at once.</p>

      {!rows || rows.length === 0 ? (
        <p className="small muted" style={{ padding: '6px 0 2px' }}>
          Nobody has passed a chapter yet this month. Yours could be the first.
        </p>
      ) : (
        <ul className="board-list">
          {rows.map((r, i) => (
            <li className={`board-row ${r.is_you ? 'is-you' : ''}`} key={`${r.first_name}-${i}`}>
              <span className={`board-rank ${i === 0 ? 'medal-1' : i === 1 ? 'medal-2' : i === 2 ? 'medal-3' : ''}`}>
                {i + 1}
              </span>
              <span className="board-name">
                {r.first_name}
                {r.is_you && <span className="board-you">You</span>}
              </span>
              <span className="board-pct">
                <b>{r.chapters_completed}</b>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
