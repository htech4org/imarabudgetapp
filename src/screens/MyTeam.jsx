import { useState } from 'react'
import { CREED } from '../lib/constants'

const MONTH_NAMES = ['January','February','March','April','May','June','July','August',
  'September','October','November','December']

function monthLabel(iso) {
  if (!iso) return ''
  const [y, m] = iso.split('-')
  return `${MONTH_NAMES[Number(m) - 1]} ${y}`
}

// Shown to a woman flagged as a mentor. One row per woman on her team, for
// the currently selected month. Reading and investing are shown as read-only
// facts pulled from the app itself; attendance is the only thing she fills
// in and saves, one woman at a time.
export default function MyTeam({ mentorName, data, busy, onSubmit, onSwitchApp, onSignOut }) {
  if (!data) {
    return (
      <div className="loading-wrap">
        <div className="spinner" />
        <p className="small muted">Opening your team…</p>
      </div>
    )
  }

  const { month, team } = data

  return (
    <div className="shell fade-in">
      <div className="topbar">
        <div className="eyebrow" style={{ color: 'var(--peach)' }}>My Team</div>
        <h1 className="display d-lg" style={{ marginTop: 5 }}>{mentorName?.toLowerCase()}'s team</h1>
        <p className="tiny" style={{ color: 'rgba(255,226,204,0.66)', marginTop: 8 }}>
          Reporting for {monthLabel(month)}
        </p>
      </div>

      <div className="pad" style={{ paddingTop: 24 }}>
        {team.length === 0 ? (
          <div className="empty-state">
            <p className="small muted">
              No one is on your team yet. Ask Admin to assign women to you.
            </p>
          </div>
        ) : (
          <div className="stack" style={{ gap: 12 }}>
            {team.map((w) => (
              <TeamRow key={w.woman_id} woman={w} month={month} busy={busy} onSubmit={onSubmit} />
            ))}
          </div>
        )}
      </div>

      <div className="footer-note">
        <p className="creed">{CREED}</p>
        <p style={{ marginBottom: 12 }}>© IMARA Wealth Trybe · Leading Ladies Foundation</p>
        <div className="row" style={{ justifyContent: 'center', gap: 18 }}>
          {onSwitchApp && <button className="btn-link" onClick={onSwitchApp}>Back to Budget / Reading</button>}
          <button className="btn-link" onClick={onSignOut}>Sign out of this device</button>
        </div>
      </div>
    </div>
  )
}

function TeamRow({ woman, month, busy, onSubmit }) {
  const [circle, setCircle] = useState(Boolean(woman.attended_circle))
  const [sisters, setSisters] = useState(Boolean(woman.attended_sisters_connect))
  const [notes, setNotes] = useState(woman.notes || '')
  const [saved, setSaved] = useState(Boolean(woman.reported_at))
  const [dirty, setDirty] = useState(false)

  const cur = woman.currency || '₦'
  const invested = Number(woman.invested_amount) > 0
  const readDays = Number(woman.reading_active_days) || 0
  const chaptersPassed = Number(woman.chapters_passed) || 0

  const save = async () => {
    await onSubmit(woman.woman_id, month, circle, sisters, notes)
    setSaved(true); setDirty(false)
  }

  return (
    <div className="card">
      <div className="row-between" style={{ alignItems: 'flex-start' }}>
        <span className="small" style={{ fontWeight: 700, fontSize: 15 }}>{woman.first_name}</span>
        {saved && !dirty && <span className="tag tag-good">Filed</span>}
      </div>

      {/* ---- Auto-pulled facts ---- */}
      <div className="row" style={{ gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
        <span className={`tag ${readDays > 0 ? 'tag-good' : 'tag-unassigned'}`}>
          {readDays > 0 ? `Read ${readDays} day${readDays === 1 ? '' : 's'} · ${chaptersPassed} ch. passed` : 'No reading logged'}
        </span>
        <span className={`tag ${invested ? 'tag-good' : 'tag-unassigned'}`}>
          {invested ? `Invested ${cur}${Number(woman.invested_amount).toLocaleString('en-US')}` : 'No investing logged'}
        </span>
      </div>

      {/* ---- Manual attendance ---- */}
      <div className="stack-s" style={{ marginTop: 14 }}>
        <label className="row" style={{ gap: 9, cursor: 'pointer' }}>
          <input type="checkbox" checked={circle}
            onChange={(e) => { setCircle(e.target.checked); setDirty(true); setSaved(false) }} />
          <span className="small">Attended Imara Circle</span>
        </label>
        <label className="row" style={{ gap: 9, cursor: 'pointer' }}>
          <input type="checkbox" checked={sisters}
            onChange={(e) => { setSisters(e.target.checked); setDirty(true); setSaved(false) }} />
          <span className="small">Attended Sisters Connect</span>
        </label>
      </div>

      <div className="field" style={{ marginTop: 10 }}>
        <textarea
          className="textarea" placeholder="Notes for admin (optional)"
          value={notes}
          onChange={(e) => { setNotes(e.target.value); setDirty(true); setSaved(false) }}
          style={{ minHeight: 60 }}
        />
      </div>

      <button
        className={`btn btn-sm ${dirty ? 'btn-primary' : 'btn-soft'}`}
        style={{ marginTop: 10 }}
        disabled={busy || !dirty}
        onClick={save}
      >
        {busy ? 'Saving…' : dirty ? 'Save report' : 'Saved'}
      </button>
    </div>
  )
}
