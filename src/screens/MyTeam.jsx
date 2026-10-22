import { useMemo, useState } from 'react'
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
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Counts for one list of sessions: held (already happened), present, and how
// many of the held ones the mentor has not recorded yet.
function tally(sessions = []) {
  const held = sessions.filter((s) => !s.future)
  return {
    held: held.length,
    present: held.filter((s) => s.recorded && s.attended).length,
    toRecord: held.filter((s) => !s.recorded).length,
  }
}

function daysUntil(iso) {
  if (!iso) return null
  const a = new Date(); a.setHours(0, 0, 0, 0)
  const b = new Date(`${String(iso).slice(0, 10)}T00:00:00`)
  return Math.round((b - a) / 86400000)
}

// Everything a mentor needs to judge her team at a glance. One row per
// mentee in shared columns; tap a name to open her dates and mark attendance.
// A past session is one of three things: present, absent, or not recorded yet.
export default function MyTeam({ mentorName, data, busy, onSetWeekday, onMarkAttendance, onSetTeamLink, onSwitchApp, onSignOut }) {
  const [filter, setFilter] = useState('all')   // all | attention | record | renew
  const [openId, setOpenId] = useState(null)

  const rows = useMemo(() => {
    const team = data?.team || []
    return team.map((w) => {
      const circle = tally(w.circle)
      const sisters = tally(w.sisters_connect)
      const readDays = Number(w.reading_active_days) || 0
      const status = w.access_status || 'active'
      const left = status === 'active' ? daysUntil(w.paid_until) : null
      const notRenewed = status === 'expired' || status === 'pending'
      // A woman who has not paid is not asked of the mentor: nothing to record,
      // and she is not "needing attention" either (she is under Not renewed).
      const tracked = w.tracked !== false && !notRenewed
      const absences = [...(w.circle || []), ...(w.sisters_connect || [])]
        .filter((x) => !x.future && x.recorded && !x.attended).length
      return {
        w, circle, sisters, readDays, status, left, notRenewed,
        invested: Boolean(w.invested),
        tracked,
        toRecord: tracked ? circle.toRecord + sisters.toRecord : 0,
        // Needs attention: a paid-up woman who has not read at all this month,
        // or who has been marked absent from a session.
        attention: tracked && (readDays === 0 || absences > 0),
      }
    })
  }, [data])

  if (!data) {
    return (
      <div className="loading-wrap">
        <div className="spinner" />
        <p className="small muted">Opening your team…</p>
      </div>
    )
  }

  const { month, sisters_connect_weekday } = data
  const toRecordTotal = rows.reduce((n, r) => n + r.toRecord, 0)
  const shown = rows.filter((r) =>
    filter === 'attention' ? r.attention
      : filter === 'record' ? r.toRecord > 0
      : filter === 'renew' ? r.notRenewed
      : true)

  return (
    <div className="shell fade-in tm">
      <style>{CSS}</style>

      <div className="topbar">
        <div className="eyebrow" style={{ color: 'var(--peach)' }}>My Team</div>
        <h1 className="display d-lg" style={{ marginTop: 5 }}>{mentorName?.toLowerCase()}'s team</h1>
        <p className="tiny" style={{ color: 'rgba(255,226,204,0.66)', marginTop: 8 }}>
          Reporting for {monthLabel(month)}
        </p>
      </div>

      <div className="pad" style={{ paddingTop: 20 }}>
        <div className="stack" style={{ gap: 12 }}>
          <TeamLink link={data.team_link} busy={busy} onSave={onSetTeamLink} />
          <SistersConnectSetup weekday={sisters_connect_weekday} busy={busy} onSet={onSetWeekday} />

          {rows.length === 0 ? (
            <div className="empty-state">
              <p className="small muted">No one is on your team yet. Ask Admin to assign women to you.</p>
            </div>
          ) : (
            <>
              {toRecordTotal > 0 && (
                <div className="tm-todo">
                  <div>
                    <b>{toRecordTotal} session{toRecordTotal === 1 ? '' : 's'} to record</b>
                    <small>Mark each woman present or absent</small>
                  </div>
                  <button type="button" className="tm-go" onClick={() => { setFilter('record'); setOpenId(null) }}>Record now</button>
                </div>
              )}

              <div className="card tm-sum">
                <div><b>{rows.length}</b><small>mentees</small></div>
                <div><b>{rows.filter((r) => r.readDays > 0).length}</b><small>reading</small></div>
                <div><b>{rows.filter((r) => r.invested).length}</b><small>invested</small></div>
                <div><b>{rows.filter((r) => r.attention).length}</b><small>need a nudge</small></div>
              </div>

              <div className="tm-filters">
                {[['all', 'Everyone'], ['attention', 'Needs attention'], ['record', 'To record'], ['renew', 'Not renewed']].map(([k, label]) => (
                  <button key={k} type="button" className={`tm-fl${filter === k ? ' on' : ''}`} onClick={() => setFilter(k)}>{label}</button>
                ))}
              </div>

              <div className="tm-list">
                <div className="tm-head">
                  <span>Mentee</span><span>Reading</span><span>Invested</span><span>Circle</span><span>Sisters</span><span>Quiz</span><span />
                </div>
                {shown.length === 0 && <p className="tiny muted" style={{ padding: 14 }}>No one in this view.</p>}
                {shown.map((r) => (
                  <TeamRow
                    key={r.w.woman_id} r={r} busy={busy}
                    open={openId === r.w.woman_id}
                    onToggle={() => setOpenId(openId === r.w.woman_id ? null : r.w.woman_id)}
                    onMark={onMarkAttendance}
                    hasSistersConnect={sisters_connect_weekday != null}
                    quizList={data.quizzes}
                  />
                ))}
              </div>
              <p className="tm-legend">
                Reading = days read this month · Quiz = class quizzes passed · Circle and Sisters = times she came out of sessions held · an amber dot means some are not recorded yet · tap a name for dates
              </p>
            </>
          )}
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

// One payment link for the whole team. Mentees see it when it is time to renew.
function TeamLink({ link, busy, onSave }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [err, setErr] = useState('')

  const save = async () => {
    setErr('')
    try { await onSave(draft.trim()); setEditing(false) }
    catch (e) { setErr(e.message) }
  }

  return (
    <div className="card">
      <div className="tm-lbl">Your team's payment link · one for everyone</div>
      {!editing ? (
        <div className="tm-link">
          <div className={`f${link ? '' : ' empty'}`}>{link || 'Not added yet'}</div>
          <button
            type="button" className="b" disabled={busy}
            onClick={() => { setDraft(link || ''); setErr(''); setEditing(true) }}
          >
            {link ? 'Edit' : 'Add'}
          </button>
        </div>
      ) : (
        <div style={{ marginTop: 8 }}>
          <div className="row" style={{ gap: 8 }}>
            <input
              className="input" style={{ flex: 1, minWidth: 0 }}
              placeholder="Paste your Selar link (https://…)"
              value={draft} onChange={(e) => setDraft(e.target.value)}
            />
            <button className="btn btn-sm btn-primary" disabled={busy} onClick={save}>Save</button>
            <button className="btn-link" onClick={() => setEditing(false)}>Cancel</button>
          </div>
          {err && <div className="error-note" style={{ marginTop: 8 }}>{err}</div>}
        </div>
      )}
      <p className="tm-note">
        {link
          ? 'Your mentees see this link when it is time to renew.'
          : 'Add it once. Your mentees will see it when it is time to renew, so you do not need to send it to each woman.'}
      </p>
    </div>
  )
}

function SistersConnectSetup({ weekday, busy, onSet }) {
  const [editing, setEditing] = useState(weekday == null)
  const [choice, setChoice] = useState(weekday ?? 3)

  if (!editing) {
    return (
      <div className="row-between" style={{ flexWrap: 'wrap', gap: 6 }}>
        <span className="tiny muted">Your Sisters Connect group meets on {WEEKDAYS[weekday]}s</span>
        <button className="btn-link" onClick={() => setEditing(true)}>Change</button>
      </div>
    )
  }

  return (
    <div className="card">
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

function AccessTag({ status, left, paidUntil }) {
  if (status === 'pending') return <span className="tm-t r">unpaid</span>
  if (status === 'expired') return <span className="tm-t r">ended</span>
  if (status === 'active' && left != null && left >= 0 && left <= 8) {
    return <span className="tm-t o">ends {shortDate(paidUntil)}</span>
  }
  return <span className="tm-t g">active</span>
}

function Cell({ value, good }) {
  return <div className={`tm-c ${good === true ? 'yes' : good === false ? 'no' : 'mid'}`}>{value}</div>
}

function SessionCell({ t, quiet }) {
  if (t.held === 0) return <Cell value="–" good={false} />
  const all = t.present === t.held && t.toRecord === 0
  return (
    <div className={`tm-c ${all ? 'yes' : t.present === 0 ? 'no' : 'mid'}`}>
      {t.present}/{t.held}{!quiet && t.toRecord > 0 && <i className="tm-dot" title={`${t.toRecord} not recorded yet`} />}
    </div>
  )
}

const data_quizzes = (l) => l || []

function TeamRow({ r, busy, open, onToggle, onMark, hasSistersConnect, quizList }) {
  const { w } = r
  const quizTotal = (quizList || []).length
  const quizPassed = (w.quizzes || []).filter((x) => x.passed).length
  return (
    <div className={`tm-row${open ? ' open' : ''}`}>
      <button type="button" className="tm-main" onClick={onToggle}>
        <div className="tm-who">
          <b>{w.first_name}</b>
          <AccessTag status={r.status} left={r.left} paidUntil={w.paid_until} />
        </div>
        <Cell value={r.readDays > 0 ? `${r.readDays} day${r.readDays === 1 ? '' : 's'}` : '–'} good={r.readDays > 0} />
        <Cell value={r.invested ? '✓' : '–'} good={r.invested} />
        <SessionCell t={r.circle} quiet={!r.tracked} />
        {hasSistersConnect ? <SessionCell t={r.sisters} quiet={!r.tracked} /> : <Cell value="–" good={false} />}
        <Cell value={quizTotal ? `${quizPassed}/${quizTotal}` : '–'} good={quizTotal ? (quizPassed === quizTotal ? true : quizPassed === 0 ? false : null) : false} />
        <div className="tm-chev">{open ? '▾' : '›'}</div>
      </button>

      {open && (
        <div className="tm-det">
          {!r.tracked && (
            <p className="tm-hint" style={{ margin: '4px 0 0' }}>
              She has not renewed, so there is nothing for you to record for her. You can still mark a date if she came.
            </p>
          )}
          <SessionRow
            label="Imara Circle" sessions={w.circle} type="circle"
            womanId={w.woman_id} name={w.first_name} busy={busy} onMark={onMark}
          />
          {hasSistersConnect && (
            <SessionRow
              label="Sisters Connect" sessions={w.sisters_connect} type="sisters_connect"
              womanId={w.woman_id} name={w.first_name} busy={busy} onMark={onMark}
            />
          )}
          <ClassJoins joins={w.class_joins} />
          {(data_quizzes(quizList)).length > 0 && (
            <>
              <p className="tm-dl">Class quizzes</p>
              {quizList.map((qz) => {
                const m = (w.quizzes || []).find((x) => x.quiz_id === qz.quiz_id)
                return (
                  <p key={qz.quiz_id} className="tm-hint">
                    {qz.short_title}: {m && m.attempts > 0 ? `${m.best}/${m.total}${m.passed ? ' · passed' : ' · not passed yet'} (${m.attempts} attempt${m.attempts === 1 ? '' : 's'})` : 'not taken'}
                  </p>
                )
              })}
            </>
          )}
          <p className="tm-dl">Access</p>
          <p className="tm-hint">
            {r.status === 'pending' ? 'Awaiting payment'
              : r.status === 'expired' ? `Ended ${shortDate(w.paid_until)}`
              : w.paid_until ? `Active until ${shortDate(w.paid_until)}` : 'Active'}
          </p>
        </div>
      )}
    </div>
  )
}

// A hint from the app, not a record of attendance: the time she tapped the
// class link between 8pm and 10pm on each past Tuesday. Mentors still confirm.
function ClassJoins({ joins }) {
  const rows = (joins || []).filter((j) => j.circle_at || j.foundation_at)
  if (rows.length === 0) return null
  return (
    <>
      <p className="tm-dl">Class taps (a hint, not a record)</p>
      {rows.map((j) => (
        <p key={j.session_date} className="tm-hint">
          {shortDate(j.session_date)}:{' '}
          {[j.circle_at && `Zoom ${j.circle_at}`, j.foundation_at && `YouTube ${j.foundation_at}`].filter(Boolean).join(' · ')}
        </p>
      ))}
    </>
  )
}

function SessionRow({ label, sessions, type, womanId, name, busy, onMark }) {
  const [picking, setPicking] = useState(null)   // session_id being decided

  const choose = async (s, attended) => {
    await onMark(womanId, type, s.session_id, attended)
    setPicking(null)
  }

  return (
    <>
      <p className="tm-dl">{label}</p>
      {sessions.length === 0 ? (
        <p className="tm-hint">No sessions set up yet this month.</p>
      ) : (
        <div className="tm-chips">
          {sessions.map((s) => {
            const state = s.future ? 'f' : !s.recorded ? 'u' : s.attended ? 'p' : 'a'
            const mark = state === 'p' ? '✓ ' : state === 'a' ? '✗ ' : state === 'u' ? '? ' : ''
            return (
              <button
                key={s.session_id} type="button"
                className={`tm-chip ${state}`}
                disabled={busy || s.future}
                onClick={() => setPicking(picking === s.session_id ? null : s.session_id)}
                title={s.future ? "This date hasn't happened yet" : state === 'u' ? 'Not recorded yet — tap to record' : 'Tap to change'}
              >
                {mark}{shortDate(s.session_date)}
              </button>
            )
          })}
        </div>
      )}
      {picking && sessions.some((s) => s.session_id === picking) && (
        <div className="tm-pop">
          <p>Was {name} at {label} on {shortDate(sessions.find((s) => s.session_id === picking).session_date)}?</p>
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="tm-pb yes" disabled={busy} onClick={() => choose(sessions.find((s) => s.session_id === picking), true)}>✓ Present</button>
            <button type="button" className="tm-pb no" disabled={busy} onClick={() => choose(sessions.find((s) => s.session_id === picking), false)}>✗ Absent</button>
          </div>
        </div>
      )}
    </>
  )
}

const CSS = `
.tm-lbl{font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;font-weight:700;color:var(--text-soft)}
.tm-link{display:flex;gap:8px;align-items:center;margin-top:8px}
.tm-link .f{flex:1;min-width:0;background:var(--surface-2);border-radius:11px;padding:9px 11px;font-size:11.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tm-link .f.empty{color:var(--text-soft)}
.tm-link .b{background:var(--maroon-900);color:#fff;border:0;border-radius:11px;padding:9px 14px;font-size:12px;font-weight:600;cursor:pointer}
.tm-note{font-size:11px;color:var(--text-soft);line-height:1.5;margin-top:8px}
.tm-todo{background:#FFF0D1;border:1px solid #F2C46B;border-radius:16px;padding:12px 14px;display:flex;justify-content:space-between;gap:10px;align-items:center}
.tm-todo b{font-family:var(--font-display);font-size:15.5px;text-transform:lowercase;display:block}
.tm-todo small{font-size:11.5px;color:var(--text-soft)}
.tm-go{background:var(--maroon-900);color:#fff;border:0;font-size:12px;font-weight:700;padding:8px 12px;border-radius:11px;white-space:nowrap;cursor:pointer}
.tm-sum{display:grid;grid-template-columns:repeat(4,1fr);text-align:center;padding:12px 6px}
.tm-sum>div+div{border-left:1px solid var(--line)}
.tm-sum b{font-family:var(--font-display);font-size:21px;display:block}
.tm-sum small{font-size:10px;color:var(--text-soft)}
.tm-filters{display:flex;gap:6px;flex-wrap:wrap}
.tm-fl{font-size:11.5px;font-weight:600;padding:6px 12px;border-radius:99px;background:var(--surface);border:1px solid var(--line);cursor:pointer;color:var(--text)}
.tm-fl.on{background:var(--maroon-900);color:#fff;border-color:var(--maroon-900)}
.tm-list{background:var(--surface);border-radius:18px;box-shadow:var(--shadow);overflow:hidden}
.tm-head,.tm-main{display:grid;grid-template-columns:1.4fr .9fr .55fr .58fr .58fr .5fr 14px;gap:4px;align-items:center;padding:0 12px;width:100%}
.tm-head{padding-top:11px;padding-bottom:8px;font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;color:var(--text-soft);border-bottom:1px solid var(--line);text-align:center}
.tm-head span:first-child{text-align:left}
.tm-row{border-bottom:1px solid var(--line)}.tm-row:last-child{border:0}
.tm-row.open{background:var(--surface-2)}
.tm-main{padding-top:11px;padding-bottom:11px;background:none;border:0;text-align:left;cursor:pointer;font:inherit;color:inherit}
.tm-who b{font-size:13.5px;display:block;overflow-wrap:anywhere}
.tm-t{display:inline-block;font-size:9.5px;font-weight:700;padding:2px 7px;border-radius:99px;margin-top:3px}
.tm-t.g{background:#DDF3E8;color:#1f7a55}.tm-t.o{background:#FFE7BF;color:#9a5d00}.tm-t.r{background:#FFD9DF;color:var(--wine)}
.tm-c{text-align:center;font-size:12px;font-weight:600}
.tm-c.yes{color:#1f7a55}.tm-c.no{color:rgba(42,20,16,.3)}.tm-c.mid{color:#9a5d00}
.tm-dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:#E0A020;margin-left:3px;vertical-align:2px}
.tm-chev{color:var(--text-soft);font-size:15px}
.tm-det{padding:0 14px 14px}
.tm-dl{font-size:10px;letter-spacing:.1em;text-transform:uppercase;font-weight:700;color:var(--text-soft);margin:12px 0 6px}
.tm-chips{display:flex;gap:6px;flex-wrap:wrap}
.tm-chip{font-size:11.5px;font-weight:600;padding:6px 11px;border-radius:99px;border:1.5px solid var(--peach);background:#fff;cursor:pointer;color:var(--text)}
.tm-chip.p{background:var(--green);border-color:var(--green);color:#fff}
.tm-chip.a{background:#FFD9DF;border-color:#F3A0B0;color:var(--wine)}
.tm-chip.u{border:1.5px dashed #D9962B;background:#FFF0D1;color:#9a5d00}
.tm-chip.f{opacity:.4;cursor:default}
.tm-hint{font-size:12px;color:var(--text-soft);line-height:1.6}
.tm-pop{margin-top:10px;background:#fff;border-radius:14px;padding:11px 12px;border:1px solid var(--line)}
.tm-pop p{font-size:12px;margin-bottom:8px}
.tm-pb{flex:1;font-size:12.5px;font-weight:700;padding:9px;border-radius:11px;cursor:pointer}
.tm-pb.yes{background:var(--green);color:#fff;border:0}
.tm-pb.no{background:#fff;border:1.5px solid #F3A0B0;color:var(--wine)}
.tm-legend{font-size:10.5px;color:var(--text-soft);text-align:center;line-height:1.6}
`
