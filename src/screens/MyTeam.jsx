import { useState } from 'react'
import { CREED } from '../lib/constants'

const MONTH_NAMES = ['January','February','March','April','May','June','July','August',
  'September','October','November','December']
const WEEKDAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

function monthLabel(iso) {
  if (!iso) return ''
  const [y, m] = iso.split('-')
  return `${MONTH_NAMES[Number(m) - 1]} ${y}`
}

function shortDate(iso) {
  if (!iso) return ''
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Shown to a woman flagged as a mentor. Imara Circle meets every Tuesday,
// same for everyone; Sisters Connect meets weekly too, but on whichever day
// she picks for her own group below. Reading and investing stay as read-only
// facts pulled from the app itself. Attendance is per specific date — she
// taps a date chip to mark whether that woman was there, one tap per
// session, no separate save step.
export default function MyTeam({ mentorName, data, busy, onSetWeekday, onMarkAttendance, onSetMenteeLink, onSwitchApp, onSignOut }) {
  if (!data) {
    return (
      <div className="loading-wrap">
        <div className="spinner" />
        <p className="small muted">Opening your team…</p>
      </div>
    )
  }

  const { month, team, sisters_connect_weekday } = data

  return (
    <div className="shell fade-in">
      <div className="topbar">
        <div className="eyebrow" style={{ color: 'var(--peach)' }}>My Team</div>
        <h1 className="display d-lg" style={{ marginTop: 5 }}>{mentorName?.toLowerCase()}'s team</h1>
        <p className="tiny" style={{ color: 'rgba(255,226,204,0.66)', marginTop: 8 }}>
          Reporting for {monthLabel(month)}
        </p>
        <p className="tiny" style={{ color: 'rgba(255,226,204,0.5)', marginTop: 4 }}>
          Every date this month is shown so you can plan ahead — greyed-out dates haven't happened yet.
        </p>
      </div>

      <div className="pad" style={{ paddingTop: 24 }}>
        <SistersConnectSetup weekday={sisters_connect_weekday} busy={busy} onSet={onSetWeekday} />

        {team.length === 0 ? (
          <div className="empty-state">
            <p className="small muted">
              No one is on your team yet. Ask Admin to assign women to you.
            </p>
          </div>
        ) : (
          <div className="stack" style={{ gap: 12 }}>
            {team.map((w) => (
              <TeamRow
                key={w.woman_id}
                woman={w}
                busy={busy}
                onMark={onMarkAttendance}
                onSaveLink={onSetMenteeLink}
                hasSistersConnect={sisters_connect_weekday != null}
              />
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

function SistersConnectSetup({ weekday, busy, onSet }) {
  const [editing, setEditing] = useState(weekday == null)
  const [choice, setChoice] = useState(weekday ?? 3)

  if (!editing) {
    return (
      <div className="row-between" style={{ marginBottom: 18, flexWrap: 'wrap', gap: 6 }}>
        <span className="tiny muted">Your Sisters Connect group meets on {WEEKDAYS[weekday]}s</span>
        <button className="btn-link" onClick={() => setEditing(true)}>Change</button>
      </div>
    )
  }

  return (
    <div className="card" style={{ marginBottom: 18 }}>
      <p className="small" style={{ fontWeight: 600, marginBottom: 10 }}>
        Which day does your Sisters Connect group meet?
      </p>
      <p className="tiny muted" style={{ marginBottom: 12 }}>
        This sets up every session date for the rest of the quarter automatically,
        so you only need to pick it once.
      </p>
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <select
          className="input" style={{ maxWidth: 200 }}
          value={choice}
          onChange={(e) => setChoice(Number(e.target.value))}
        >
          {WEEKDAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
        </select>
        <button
          className="btn btn-sm btn-primary" disabled={busy}
          onClick={async () => { await onSet(choice); setEditing(false) }}
        >
          Save
        </button>
        {weekday != null && <button className="btn-link" onClick={() => setEditing(false)}>Cancel</button>}
      </div>
    </div>
  )
}

function AccessRow({ woman, busy, onSaveLink }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [err, setErr] = useState('')
  const status = woman.access_status || 'active'
  const hasLink = Boolean(woman.renewal_link)

  let tag = null
  if (status === 'active' && woman.paid_until) {
    tag = <span className="tag tag-good">Access until {shortDate(woman.paid_until)}</span>
  } else if (status === 'expired') {
    tag = <span className="tag tag-unassigned">Access ended {shortDate(woman.paid_until)}</span>
  } else if (status === 'pending') {
    tag = <span className="tag tag-unassigned">Awaiting payment</span>
  }

  const save = async () => {
    setErr('')
    try {
      await onSaveLink(woman.woman_id, draft.trim())
      setEditing(false)
    } catch (e) {
      setErr(e.message)
    }
  }

  return (
    <div style={{ marginTop: 13 }}>
      {tag}
      {!editing ? (
        <div className="row" style={{ gap: 10, marginTop: tag ? 8 : 0, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="tiny" style={{ color: hasLink ? 'var(--text-soft)' : undefined }}>
            {hasLink ? '✓ Payment link added' : 'No payment link for her yet'}
          </span>
          <button
            className="btn-link" disabled={busy}
            onClick={() => { setDraft(woman.renewal_link || ''); setErr(''); setEditing(true) }}
          >
            {hasLink ? 'Edit' : 'Add her payment link'}
          </button>
        </div>
      ) : (
        <div style={{ marginTop: 8 }}>
          <div className="row" style={{ gap: 8 }}>
            <input
              className="input" style={{ flex: 1, minWidth: 0 }}
              placeholder="Paste her Selar link (https://…)"
              value={draft} onChange={(e) => setDraft(e.target.value)}
            />
            <button className="btn btn-sm btn-primary" disabled={busy || !draft.trim()} onClick={save}>Save</button>
            <button className="btn-link" onClick={() => setEditing(false)}>Cancel</button>
          </div>
          {err && <div className="error-note" style={{ marginTop: 8 }}>{err}</div>}
        </div>
      )}
    </div>
  )
}

function TeamRow({ woman, busy, onMark, onSaveLink, hasSistersConnect }) {
  const cur = woman.currency || '₦'
  const invested = Number(woman.invested_amount) > 0
  const readDays = Number(woman.reading_active_days) || 0
  const chaptersPassed = Number(woman.chapters_passed) || 0

  return (
    <div className="card">
      <span className="small" style={{ fontWeight: 700, fontSize: 15 }}>{woman.first_name}</span>

      {/* ---- Auto-pulled facts ---- */}
      <div className="row" style={{ gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
        <span className={`tag ${readDays > 0 ? 'tag-good' : 'tag-unassigned'}`}>
          {readDays > 0 ? `Read ${readDays} day${readDays === 1 ? '' : 's'} · ${chaptersPassed} ch. passed` : 'No reading logged'}
        </span>
        <span className={`tag ${invested ? 'tag-good' : 'tag-unassigned'}`}>
          {invested ? `Invested ${cur}${Number(woman.invested_amount).toLocaleString('en-US')}` : 'No investing logged'}
        </span>
      </div>

      {onSaveLink && <AccessRow woman={woman} busy={busy} onSaveLink={onSaveLink} />}

      {/* ---- Per-session attendance ---- */}
      <SessionRow
        label="Imara Circle" sessions={woman.circle} sessionType="circle"
        womanId={woman.woman_id} busy={busy} onMark={onMark}
      />
      {hasSistersConnect && (
        <SessionRow
          label="Sisters Connect" sessions={woman.sisters_connect} sessionType="sisters_connect"
          womanId={woman.woman_id} busy={busy} onMark={onMark}
        />
      )}
    </div>
  )
}

function SessionRow({ label, sessions, sessionType, womanId, busy, onMark }) {
  return (
    <div style={{ marginTop: 13 }}>
      <p className="tiny muted" style={{ marginBottom: 7 }}>{label}</p>
      {sessions.length === 0 ? (
        <p className="tiny" style={{ color: 'var(--text-soft)' }}>No sessions set up yet this month.</p>
      ) : (
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {sessions.map((s) => (
            <button
              key={s.session_id}
              type="button"
              className={`cat-chip ${s.attended ? 'on' : ''} ${s.future ? 'future' : ''}`}
              disabled={busy || s.future}
              onClick={() => onMark(womanId, sessionType, s.session_id, !s.attended)}
              title={
                s.future
                  ? "This date hasn't happened yet — you can plan around it, but can't mark it yet"
                  : s.attended ? 'Marked present — tap to undo' : 'Tap if she was there'
              }
              style={s.future ? { opacity: 0.45, cursor: 'default' } : undefined}
            >
              {s.attended ? '✓ ' : ''}{shortDate(s.session_date)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
