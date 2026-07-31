import { useEffect, useMemo, useState } from 'react'
import Sheet from './Sheet'
import { CATEGORIES, MOVE_CATEGORY, BUILD_LINES } from '../lib/constants'
import { periodDays, today, parseISO } from '../lib/calc'

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/**
 * One sheet for all three kinds of entry. Amount is focused the moment it
 * opens; date defaults to today; everything else is optional. Two taps and
 * a number is enough to log something.
 */
export default function AddEntry({ open, onClose, onSave, period, currency, mode, moveLine, saving }) {
  const [type, setType] = useState('OUT')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [line, setLine] = useState('saving')
  const [date, setDate] = useState(today())
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setType(mode === 'MOVE' ? 'MOVE' : mode || 'OUT')
    setLine(moveLine || 'saving')
    setAmount(''); setCategory(''); setNote(''); setError('')
    const start = period?.start_date
    const now = today()
    setDate(now > period?.end_date ? period.end_date : now < start ? start : now)
  }, [open, mode, moveLine, period])

  // Only days that have actually happened inside this period are selectable.
  const days = useMemo(() => {
    const all = periodDays(period, [])
    return all.filter((d) => !d.isFuture).reverse()
  }, [period])

  const submit = (e) => {
    e.preventDefault()
    const value = Number(String(amount).replace(/,/g, ''))
    if (!value || value <= 0) { setError('Enter an amount greater than zero.'); return }
    if (type === 'OUT' && !category) { setError('Pick where this money went.'); return }
    onSave({
      type,
      amount: value,
      date,
      category: type === 'OUT' ? category : type === 'MOVE' ? MOVE_CATEGORY[line] : null,
      note: note.trim() || null,
    })
  }

  const isMove = type === 'MOVE'

  return (
    <Sheet open={open} onClose={onClose}>
      <form onSubmit={submit} className="stack" style={{ gap: 18 }}>
        <div className="row-between">
          <h2 className="display d-md">
            {isMove ? 'money you moved' : type === 'IN' ? 'money in' : 'money out'}
          </h2>
          <button type="button" className="btn-link" onClick={onClose}>Close</button>
        </div>

        {!isMove && (
          <div className="type-toggle">
            <button type="button" className={type === 'IN' ? 'on' : ''} onClick={() => { setType('IN'); setError('') }}>
              Money in
            </button>
            <button type="button" className={type === 'OUT' ? 'on' : ''} onClick={() => { setType('OUT'); setError('') }}>
              Money out
            </button>
          </div>
        )}

        <div className="field">
          <label className="label">How much?</label>
          <div className="amount-field">
            <span className="cur">{currency}</span>
            <input
              autoFocus
              inputMode="decimal"
              placeholder="0"
              value={amount}
              onChange={(e) => { setAmount(e.target.value.replace(/[^\d.,]/g, '')); setError('') }}
            />
          </div>
        </div>

        {isMove && (
          <div className="field">
            <label className="label">Which line are you building?</label>
            <div className="cat-grid">
              {BUILD_LINES.map((l) => (
                <button
                  type="button" key={l.key}
                  className={`cat-chip${line === l.key ? ' on' : ''}`}
                  onClick={() => setLine(l.key)}
                >
                  <span className="ic">✦</span>{l.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {type === 'OUT' && (
          <div className="field">
            <label className="label">Where did it go?</label>
            <div className="cat-grid">
              {CATEGORIES.map((c) => (
                <button
                  type="button" key={c.key}
                  className={`cat-chip${category === c.key ? ' on' : ''}`}
                  onClick={() => { setCategory(c.key); setError('') }}
                >
                  <span className="ic">{c.icon}</span>{c.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="field">
          <label className="label">Which day?</label>
          <div className="date-strip">
            {days.map((d) => (
              <button
                type="button" key={d.date}
                className={`date-pill${date === d.date ? ' on' : ''}`}
                onClick={() => setDate(d.date)}
              >
                <div className="dw">{d.isToday ? 'Today' : DOW[parseISO(d.date).getDay()]}</div>
                <div className="dn">{parseISO(d.date).getDate()}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label className="label">
            {type === 'IN' ? 'Where did it come from? (optional)' : 'A quick note (optional)'}
          </label>
          <input
            className="input" value={note} maxLength={80}
            onChange={(e) => setNote(e.target.value)}
            placeholder={type === 'IN' ? 'Salary, business, gift…' : 'Anything you want to remember'}
          />
        </div>

        {error && <div className="error-note">{error}</div>}

        <button type="submit" className={`btn ${isMove ? 'btn-clay' : type === 'IN' ? 'btn-primary' : 'btn-wine'}`} disabled={saving}>
          {saving ? 'Saving…' : 'Add to my map'}
        </button>
      </form>
    </Sheet>
  )
}
