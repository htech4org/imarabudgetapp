import EntryList from '../components/EntryList'

const MONTHS = ['January','February','March','April','May','June','July','August',
  'September','October','November','December']

const monthName = (iso) => (iso ? MONTHS[Number(iso.split('-')[1]) - 1] : 'last month')
const dayLabel = (iso) => {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS[m - 1].slice(0, 3)}`
}

// A month that closed itself stays open for fixes for a few days. She can add
// what she forgot or remove what was wrong; the saved summary updates itself.
export default function ReviseMonth({ period, entries, currency, onAdd, onDelete, onBack }) {
  const name = monthName(period.start_date)
  return (
    <div className="shell fade-in">
      <div className="topbar">
        <div className="eyebrow" style={{ color: 'var(--peach)' }}>{name} · closed</div>
        <h1 className="display d-lg" style={{ marginTop: 5 }}>fix {name.toLowerCase()}</h1>
        <p className="tiny" style={{ color: 'rgba(255,226,204,0.66)', marginTop: 8, lineHeight: 1.6 }}>
          Forgot to log the last few days? Add them here until {dayLabel(period.grace_until)}.
          After that {name} is settled for good.
        </p>
      </div>

      <div className="pad" style={{ paddingTop: 22 }}>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
          <button className="btn btn-sm btn-primary" onClick={() => onAdd('IN')}>+ Money in</button>
          <button className="btn btn-sm btn-soft" onClick={() => onAdd('OUT')}>+ Money out</button>
          <button className="btn btn-sm btn-soft" onClick={() => onAdd('MOVE')}>+ Money moved</button>
        </div>
        <EntryList entries={entries} currency={currency} onDelete={onDelete} />
      </div>

      <div className="footer-note">
        <button className="btn-link" onClick={onBack}>Back to this month</button>
      </div>
    </div>
  )
}
