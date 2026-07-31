import { periodDays, currentStreak, daysLeft, parseISO } from '../lib/calc'

/**
 * The month at a glance — one square per day, filled on the days she logged.
 * Framed as days shown up for, never as days missed.
 */
export default function MonthGrid({ period, entries }) {
  const days = periodDays(period, entries)
  const streak = currentStreak(period, entries)
  const logged = days.filter((d) => d.logged).length
  const left = daysLeft(period)

  return (
    <div className="card">
      <div className="row-between" style={{ marginBottom: 14 }}>
        <div>
          <div className="small" style={{ fontWeight: 600 }}>
            {logged} {logged === 1 ? 'day' : 'days'} on the map
          </div>
          <div className="tiny muted">
            {left > 0 ? `${left} ${left === 1 ? 'day' : 'days'} left in this month` : 'This month is complete'}
          </div>
        </div>
        {streak > 1 && <span className="streak-pill">✦ {streak} in a row</span>}
      </div>

      <div className="month-grid">
        {days.map((d) => (
          <div
            key={d.date}
            className={`dot-day${d.logged ? ' logged' : ''}${d.isToday ? ' today' : ''}${d.isFuture ? ' future' : ''}`}
            title={`${d.date}${d.logged ? ' · logged' : ''}`}
          >
            {parseISO(d.date).getDate()}
          </div>
        ))}
      </div>

      <p className="tiny muted" style={{ marginTop: 12, lineHeight: 1.55 }}>
        A blank square is not a failure. It is just a day the map is still waiting for.
      </p>
    </div>
  )
}
