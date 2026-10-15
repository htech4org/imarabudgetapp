import { useState } from 'react'

const MONTHS = ['January','February','March','April','May','June','July','August',
  'September','October','November','December']

// Shown after a month closed itself at midnight on its last day. The month is
// already archived; this only asks for the one line she would normally have
// written when closing it. "Later" hides it for this visit.
export default function RealisationPrompt({ period, busy, onSave, onLater }) {
  const [text, setText] = useState('')
  const [err, setErr] = useState('')
  const month = period?.start_date ? MONTHS[Number(period.start_date.split('-')[1]) - 1] : 'Your month'

  const save = async () => {
    setErr('')
    try { await onSave(period.id, text.trim()) } catch (e) { setErr(e.message) }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(40,4,8,0.55)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div className="card" style={{
        width: '100%', maxWidth: 520, borderRadius: '20px 20px 0 0', padding: '22px 20px 26px',
      }}>
        <span className="eyebrow">{month} has closed</span>
        <h2 className="display d-md" style={{ margin: '8px 0 6px' }}>one line to remember it by</h2>
        <p className="small muted" style={{ lineHeight: 1.65, marginBottom: 14 }}>
          Your {month} was closed and saved automatically, and a new month is open. What did
          {' '}{month} teach you about your money?
        </p>
        <textarea
          className="input" rows={3} maxLength={500} autoFocus
          placeholder="One sentence is plenty."
          value={text} onChange={(e) => setText(e.target.value)}
          style={{ width: '100%', resize: 'vertical' }}
        />
        {err && <div className="error-note" style={{ marginTop: 10 }}>{err}</div>}
        <div className="row" style={{ gap: 14, marginTop: 14, alignItems: 'center' }}>
          <button className="btn btn-primary" disabled={busy || !text.trim()} onClick={save}>
            Save my realisation
          </button>
          <button className="btn-link" onClick={onLater}>Later</button>
        </div>
      </div>
    </div>
  )
}
