import { CREED } from '../../lib/constants'
import ReadingLeaderboard from '../../components/ReadingLeaderboard'

export default function ReadingHome({
  firstName, books, progress, board, busy,
  onStart, onOpenChapter, onSwitchApp, onSignOut,
}) {
  const startedIds = new Set(progress.map((p) => p.book_id))
  const notStarted = books.filter((b) => !startedIds.has(b.book_id))

  return (
    <div className="shell fade-in">
      <div className="topbar">
        <div className="eyebrow" style={{ color: 'var(--peach)' }}>Book Reading</div>
        <h1 className="display d-lg" style={{ marginTop: 5 }}>hi, {firstName}</h1>
      </div>

      <div className="pad" style={{ paddingTop: 24 }}>
        {/* ---- Continue reading ---- */}
        {progress.length > 0 && (
          <div className="section" style={{ marginTop: 0 }}>
            <div className="section-head">
              <span className="eyebrow">Continue reading</span>
            </div>
            <div className="stack" style={{ gap: 10 }}>
              {progress.map((p) => {
                const done = p.status === 'completed'
                const doneChapters = Math.max(0, Math.min(p.current_chapter - 1, p.total_chapters))
                const pct = p.total_chapters > 0 ? doneChapters / p.total_chapters : 0
                return (
                  <button
                    key={p.book_id}
                    className="book-card"
                    disabled={busy}
                    onClick={() => onOpenChapter(
                      p.book_id, p.title, p.total_chapters,
                      done ? p.total_chapters : p.current_chapter
                    )}
                  >
                    <div className="row-between">
                      <span className="small" style={{ fontWeight: 600 }}>{p.title}</span>
                      {done && <span className="tag tag-good">Completed</span>}
                    </div>
                    <p className="tiny muted" style={{ marginTop: 3 }}>
                      {done ? `All ${p.total_chapters} chapters done` : `Chapter ${p.current_chapter} of ${p.total_chapters}`}
                    </p>
                    <div className="bar bar-reading"><span style={{ width: `${Math.min(100, pct * 100)}%` }} /></div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ---- Available books ---- */}
        <div className="section">
          <div className="section-head">
            <span className="eyebrow">{progress.length > 0 ? 'More books' : 'Available books'}</span>
          </div>
          {notStarted.length === 0 ? (
            <div className="empty-state">
              <p className="small muted">
                {progress.length > 0 ? "You're on every book we have right now." : 'No books are open yet — check back soon.'}
              </p>
            </div>
          ) : (
            <div className="stack" style={{ gap: 10 }}>
              {notStarted.map((b) => (
                <button
                  key={b.book_id}
                  className="book-card"
                  disabled={busy}
                  onClick={() => onStart(b.book_id, b.title, Number(b.chapter_count))}
                >
                  <span className="small" style={{ fontWeight: 600 }}>{b.title}</span>
                  {b.author && <p className="tiny muted" style={{ marginTop: 2 }}>by {b.author}</p>}
                  {b.description && <p className="tiny muted" style={{ marginTop: 6, lineHeight: 1.5 }}>{b.description}</p>}
                  <p className="tiny" style={{ marginTop: 8, color: 'var(--clay)', fontWeight: 600 }}>
                    {b.chapter_count} {Number(b.chapter_count) === 1 ? 'chapter' : 'chapters'} · Start reading →
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ---- Reader(s) of the month ---- */}
        <div className="section">
          <div className="section-head">
            <span className="eyebrow">This month across the trybe</span>
          </div>
          <ReadingLeaderboard rows={board} />
        </div>
      </div>

      <div className="footer-note">
        <p className="creed">{CREED}</p>
        <p style={{ marginBottom: 12 }}>© IMARA Wealth Trybe · Leading Ladies Foundation</p>
        <div className="row" style={{ justifyContent: 'center', gap: 18 }}>
          <button className="btn-link" onClick={onSwitchApp}>Budget Tracker</button>
          <button className="btn-link" onClick={onSignOut}>Sign out of this device</button>
        </div>
      </div>
    </div>
  )
}
