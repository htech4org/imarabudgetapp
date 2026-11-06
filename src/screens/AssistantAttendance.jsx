import { useEffect, useState } from 'react'
import { rpc } from '../lib/supabase'
import { CREED } from '../lib/constants'

// An assistant ticks attendance for her mentor's team. She sees first names
// and dates only. She can tick herself only at the Circle, and only on a date
// the Tuesday class log picked her up.

const shortDay = (iso) =>
  new Date(`${String(iso).slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
const WEEKDAYS = ['Sundays','Mondays','Tuesdays','Wednesdays','Thursdays','Fridays','Saturdays']

export default function AssistantAttendance({ womanId, onError, onSwitchApp, onSignOut }) {
  const [d, setD] = useState(null)
  const [busy, setBusy] = useState(false)
  const [pick, setPick] = useState(null)   // { personId, type, sessionId }

  useEffect(() => {
    rpc('imara_assistant_attendance', { p_assistant_id: womanId }).then(setD).catch((e) => onError(e.message))
    // eslint-disable-next-line
  }, [womanId])

  const mark = async (person, type, sessionId, attended) => {
    setBusy(true)
    try {
      setD(await rpc('imara_assistant_mark_attendance', {
        p_assistant_id: womanId, p_woman_id: person.woman_id,
        p_session_type: type, p_session_id: sessionId, p_attended: attended,
      }))
      setPick(null)
    } catch (e) { onError(e.message) } finally { setBusy(false) }
  }

  if (!d) return <div className="loading-wrap"><div className="spinner" /><p className="small muted">Opening attendance…</p></div>

  const meetingName = d.for_leader ? 'Trybe meeting' : 'Mastermind meeting'

  const section = (type, title, key) => (
    <div className="stack" style={{ gap: 10 }}>
      <div className="small" style={{ fontWeight: 700 }}>{title}</div>
      {d.people.map((p) => {
        const sessions = p[key]
        if (sessions.length === 0) return null
        return (
          <div className="card" key={p.woman_id} style={{ padding: 12 }}>
            <div className="small" style={{ fontWeight: 600 }}>
              {p.first_name}{p.is_self && ' (you)'}
              {p.is_self && type === 'meeting' && (
                <span className="tiny muted" style={{ fontWeight: 400 }}> · {d.mentor_name} ticks this one</span>
              )}
            </div>
            <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              {sessions.map((s) => {
                const state = s.future ? 'f' : !s.recorded ? 'u' : s.attended ? 'p' : 'a'
                const mk = state === 'p' ? '✓ ' : state === 'a' ? '✗ ' : state === 'u' ? '? ' : ''
                const bg = state === 'p' ? '#E6F6EE' : state === 'a' ? '#FBE3E6' : state === 'u' ? '#FFF1D6' : 'transparent'
                const active = pick && pick.personId === p.woman_id && pick.type === type && pick.sessionId === s.session_id
                const off = busy || s.future || !s.can_tick
                return (
                  <button key={s.session_id} type="button" disabled={off}
                    onClick={() => setPick(active ? null : { personId: p.woman_id, type, sessionId: s.session_id })}
                    style={{ border: '1.5px solid rgba(76,5,11,.15)', background: bg, borderRadius: 99, padding: '5px 11px', fontSize: 12, opacity: off && !s.recorded ? 0.4 : 1, cursor: off ? 'default' : 'pointer' }}>
                    {mk}{shortDay(s.session_date)}
                  </button>
                )
              })}
            </div>
            {p.is_self && type === 'circle' && (
              <p className="tiny muted" style={{ marginTop: 8 }}>You can tick yourself only on a day the class log picked you up.</p>
            )}
            {pick && pick.personId === p.woman_id && pick.type === type && (
              <div className="row" style={{ gap: 8, marginTop: 10, alignItems: 'center' }}>
                <span className="tiny">{p.is_self ? 'Were you there?' : `Was ${p.first_name} there?`}</span>
                <button className="btn btn-sm btn-primary" disabled={busy} onClick={() => mark(p, type, pick.sessionId, true)}>✓ Present</button>
                {!p.is_self && <button className="btn btn-sm btn-soft" disabled={busy} onClick={() => mark(p, type, pick.sessionId, false)}>✗ Absent</button>}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )

  return (
    <div className="shell fade-in">
      <div className="topbar">
        <div className="eyebrow" style={{ color: 'var(--peach)' }}>Helping {d.mentor_name}</div>
        <h1 className="display d-lg" style={{ marginTop: 5 }}>attendance</h1>
        <p className="tiny" style={{ color: 'rgba(255,226,204,0.66)', marginTop: 8 }}>
          {meetingName}{d.meeting_weekday != null ? ` · ${WEEKDAYS[d.meeting_weekday]}` : ''} and IMARA Circle
        </p>
      </div>

      <div className="pad" style={{ paddingTop: 20 }}>
        <p className="tiny muted" style={{ lineHeight: 1.7, marginBottom: 16 }}>
          Tap a date, then mark who was there. ? means not recorded yet.
        </p>
        <div className="stack" style={{ gap: 24 }}>
          {section('meeting', meetingName, 'meeting')}
          {section('circle', 'IMARA Circle · Tuesdays', 'circle')}
        </div>
      </div>

      <div className="footer-note">
        <p className="creed">{CREED}</p>
        <p style={{ marginBottom: 12 }}>© IMARA Wealth Trybe · Leading Ladies Foundation</p>
        <div className="row" style={{ justifyContent: 'center', gap: 18 }}>
          {onSwitchApp && <button className="btn-link" onClick={onSwitchApp}>Back to home</button>}
          <button className="btn-link" onClick={onSignOut}>Sign out of this device</button>
        </div>
      </div>
    </div>
  )
}
