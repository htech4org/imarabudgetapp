import { money, dayLabel } from '../lib/format'
import { today } from '../lib/calc'

const MARK = { IN: { cls: 'mark-in', sign: '+' }, OUT: { cls: 'mark-out', sign: '−' }, MOVE: { cls: 'mark-move', sign: '✦' } }

/** Her log, newest day first. */
export default function EntryList({ entries, currency, onDelete, limit }) {
  if (!entries.length) {
    return (
      <div className="empty-state">
        <p className="display d-sm" style={{ marginBottom: 6 }}>nothing logged yet</p>
        <p className="small muted">
          Start anywhere. One number today is a real beginning — you do not have to remember the whole month.
        </p>
      </div>
    )
  }

  const byDay = new Map()
  entries.forEach((e) => {
    if (!byDay.has(e.entry_date)) byDay.set(e.entry_date, [])
    byDay.get(e.entry_date).push(e)
  })
  let days = [...byDay.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1))
  if (limit) days = days.slice(0, limit)
  const now = today()

  return (
    <div>
      {days.map(([date, rows]) => {
        const dayIn = rows.filter((r) => r.type === 'IN').reduce((t, r) => t + Number(r.amount), 0)
        const dayOut = rows.filter((r) => r.type === 'OUT').reduce((t, r) => t + Number(r.amount), 0)
        return (
          <div className="day-block" key={date}>
            <div className="day-head">
              <span>{dayLabel(date, now)}</span>
              <span className="numeric faint">
                {dayIn > 0 && `+${money(dayIn, currency)}`}{dayIn > 0 && dayOut > 0 && '  ·  '}
                {dayOut > 0 && `−${money(dayOut, currency)}`}
              </span>
            </div>
            {rows.map((e) => {
              const m = MARK[e.type] || MARK.OUT
              return (
                <div className="entry-row" key={e.id}>
                  <div className={`entry-mark ${m.cls}`}>{m.sign}</div>
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="entry-label">
                      {e.type === 'IN' ? (e.note || 'Money in') : (e.category || 'Everything Else')}
                    </div>
                    {e.type !== 'IN' && e.note && <div className="entry-note">{e.note}</div>}
                    {e.type === 'MOVE' && <div className="entry-note">Moved into your split</div>}
                  </div>
                  <div className="entry-amount">{money(e.amount, currency)}</div>
                  {onDelete && (
                    <button className="entry-del" onClick={() => onDelete(e.id)} aria-label="Remove this entry">×</button>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
