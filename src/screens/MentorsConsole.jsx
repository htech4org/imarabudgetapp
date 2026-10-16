import { useEffect, useMemo, useState } from 'react'

const MONTH_NAMES = ['January','February','March','April','May','June','July','August',
  'September','October','November','December']
const WEEKDAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

function monthLabel(iso) {
  if (!iso) return ''
  const [y, m] = String(iso).split('-')
  return `${MONTH_NAMES[Number(m) - 1]} ${y}`
}
function thisMonthIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}
function shiftMonth(iso, by) {
  const [y, m] = String(iso).split('-').map(Number)
  const d = new Date(y, m - 1 + by, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}
const num = (v) => Number(v) || 0
const pctOf = (a, b) => (b > 0 ? Math.round((a / b) * 100) : null)
const shortDate = (iso) => {
  if (!iso) return ''
  return new Date(`${String(iso).slice(0, 10)}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
function daysUntil(iso) {
  if (!iso) return null
  const a = new Date(); a.setHours(0, 0, 0, 0)
  return Math.round((new Date(`${String(iso).slice(0, 10)}T00:00:00`) - a) / 86400000)
}

// Admin's Mentors tab. Three views:
//   This month   — the report: every mentor rolled up, click one for her mentees
//   Mentors      — only mentors who have a team (open one to move / remove women)
//   Assign teams — only women who don't have a mentor yet
// All data arrives as props; every action calls back up to the parent, which
// owns the admin password and reloads after each write.
export default function MentorsConsole({
  busy,
  mentors,        // [{ mentor_id, first_name, phone, email, team_size }]
  women,          // [{ woman_id, first_name, phone, email, is_mentor, mentor_id, mentor_name }]
  unassigned,     // [{ woman_id, first_name, phone, email, joined, access_status }]
  report,         // { month, mentors: [...], rows: [...] } | null
  onRefreshAll,
  onSetMentor,        // (womanId, isMentor)
  onAssignMentor,     // (womanId, mentorId|null)
  onAssignMany,       // ([womanId], mentorId)
  onLoadReport,       // (monthIso)
}) {
  const [tab, setTab] = useState('month')
  const [error, setError] = useState('')

  useEffect(() => { onRefreshAll?.() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (fn) => {
    setError('')
    try { await fn() } catch (e) { setError(e.message) }
  }

  return (
    <div className="stack" style={{ gap: 18 }}>
      <style>{CSS}</style>
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        {[['month', 'This month'], ['mentors', 'Mentors'], ['assign', `Assign teams${unassigned?.length ? ` (${unassigned.length})` : ''}`]].map(([k, label]) => (
          <button key={k} className={`btn-sm ${tab === k ? 'btn-primary' : 'btn-soft'}`} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>

      {error && <div className="error-note">{error}</div>}

      {tab === 'month' && <MonthReport report={report} busy={busy} onLoad={(m) => run(() => onLoadReport(m))} />}
      {tab === 'mentors' && (
        <MentorsList
          mentors={mentors} women={women} report={report} busy={busy}
          onSetMentor={(id, on) => run(() => onSetMentor(id, on))}
          onAssignMentor={(id, mid) => run(() => onAssignMentor(id, mid))}
        />
      )}
      {tab === 'assign' && (
        <AssignTeams
          unassigned={unassigned} mentors={mentors} busy={busy}
          onAssign={(ids, mid) => run(() => onAssignMany(ids, mid))}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
//  This month
// ---------------------------------------------------------------------------

function roll(rows) {
  const tracked = rows.filter((r) => r.tracked)
  const present = tracked.reduce((n, r) => n + num(r.circle_present), 0)
  const recC = tracked.reduce((n, r) => n + num(r.circle_recorded), 0)
  const presentS = tracked.reduce((n, r) => n + num(r.sisters_present), 0)
  const recS = tracked.reduce((n, r) => n + num(r.sisters_recorded), 0)
  const expected = tracked.reduce((n, r) => n + num(r.circle_held) + num(r.sisters_held), 0)
  const recorded = tracked.reduce((n, r) => n + num(r.circle_recorded) + num(r.sisters_recorded), 0)
  return {
    n: rows.length,
    reading: rows.filter((r) => num(r.reading_days) > 0).length,
    invested: rows.filter((r) => r.invested).length,
    circlePct: pctOf(present, recC),
    sistersPct: pctOf(presentS, recS),
    expected, recorded,
    recordedPct: pctOf(recorded, expected),
    paid: rows.filter((r) => r.tracked).length,
  }
}
const tone = (p) => (p == null ? 'no' : p >= 70 ? 'yes' : p >= 40 ? 'mid' : 'bad')
const barColour = (p) => (p >= 70 ? '#59BA8E' : p >= 40 ? '#F2C46B' : '#F3A0B0')

function Bar({ value, total }) {
  const p = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <span className="am-cell">
      <span className="am-bar"><i style={{ width: `${p}%`, background: barColour(p) }} /></span>
      {value}/{total}
    </span>
  )
}

function MonthReport({ report, busy, onLoad }) {
  const [openMentor, setOpenMentor] = useState(null)
  const month = report?.month || thisMonthIso()

  const groups = useMemo(() => {
    const rows = report?.rows || []
    const by = new Map()
    rows.forEach((r) => {
      if (!by.has(r.mentor_id)) by.set(r.mentor_id, { id: r.mentor_id, name: r.mentor_name, rows: [] })
      by.get(r.mentor_id).rows.push(r)
    })
    return [...by.values()].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  }, [report])

  if (!report) return <p className="small muted">Loading…</p>

  const all = roll(report.rows)
  const opened = groups.find((g) => g.id === openMentor)

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="row-between" style={{ flexWrap: 'wrap', gap: 10 }}>
        <div>
          <span className="small" style={{ fontWeight: 700 }}>{monthLabel(month)} · all mentors</span>
          <p className="tiny muted">Every mentor's team rolled up. Click a mentor to see each of her mentees.</p>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <button className="btn-sm btn-soft" disabled={busy} onClick={() => onLoad(shiftMonth(month, -1))}>‹</button>
          <button className="btn-sm btn-soft" disabled={busy} onClick={() => onLoad(thisMonthIso())}>Today</button>
          <button className="btn-sm btn-soft" disabled={busy} onClick={() => onLoad(shiftMonth(month, 1))}>›</button>
        </div>
      </div>

      {report.rows.length === 0 ? (
        <div className="empty-state"><p className="small muted">No woman has an assigned mentor yet.</p></div>
      ) : (
        <>
          <div className="am-stats">
            <Stat k="Mentees" v={all.n} s={`across ${groups.length} mentor${groups.length === 1 ? '' : 's'}`} />
            <Stat k="Reading" v={all.n ? `${pctOf(all.reading, all.n)}%` : '–'} s={`${all.reading} of ${all.n} read this month`} />
            <Stat k="Invested" v={all.n ? `${pctOf(all.invested, all.n)}%` : '–'} s={`${all.invested} of ${all.n} invested`} />
            <Stat k="Circle" v={all.circlePct == null ? '–' : `${all.circlePct}%`} s="came, out of sessions recorded" />
            <Stat k="Sisters Connect" v={all.sistersPct == null ? '–' : `${all.sistersPct}%`} s="came, out of sessions recorded" />
            <Stat k="Recorded" v={all.recordedPct == null ? '–' : `${all.recordedPct}%`} s={`${all.recorded} of ${all.expected} marked by mentors`} />
          </div>

          <div className="card am-scroll">
            <table className="am-table">
              <thead>
                <tr><th>Mentor</th><th className="c">Team</th><th>Reading</th><th>Invested</th><th className="c">Circle</th><th className="c">Sisters</th><th>Recorded</th><th className="c">Renewed</th></tr>
              </thead>
              <tbody>
                {groups.map((g) => {
                  const t = roll(g.rows)
                  const behind = t.expected - t.recorded
                  return (
                    <tr key={g.id} className={`clk${openMentor === g.id ? ' sel' : ''}`} onClick={() => setOpenMentor(openMentor === g.id ? null : g.id)}>
                      <td><b>{g.name}</b></td>
                      <td className="c">{t.n}</td>
                      <td><Bar value={t.reading} total={t.n} /></td>
                      <td><Bar value={t.invested} total={t.n} /></td>
                      <td className={`c ${tone(t.circlePct)}`}>{t.circlePct == null ? '–' : `${t.circlePct}%`}</td>
                      <td className={`c ${tone(t.sistersPct)}`}>{t.sistersPct == null ? '–' : `${t.sistersPct}%`}</td>
                      <td>
                        <span className={`am-pill ${t.expected === 0 ? 'n' : behind === 0 ? 'g' : t.recordedPct < 50 ? 'r' : 'o'}`}>
                          {t.expected === 0 ? 'none held' : `${t.recorded} of ${t.expected}`}
                        </span>
                      </td>
                      <td className="c">{t.paid} of {t.n}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {opened && <MentorDetail g={opened} onClose={() => setOpenMentor(null)} />}
        </>
      )}
    </div>
  )
}

function Stat({ k, v, s }) {
  return (
    <div className="card am-stat">
      <span className="am-lbl">{k}</span>
      <b>{v}</b>
      <small>{s}</small>
    </div>
  )
}

function SessionCount({ present, held, recorded, tracked }) {
  if (num(held) === 0) return <span className="no">–</span>
  const open = tracked && num(recorded) < num(held)
  const full = num(present) === num(held) && !open
  return <span className={full ? 'yes' : num(present) === 0 ? 'no' : 'mid'}>{num(present)}/{num(held)}{open ? ' ?' : ''}</span>
}

function MentorDetail({ g, onClose }) {
  const t = roll(g.rows)
  return (
    <div className="card am-drill">
      <button className="btn-link" onClick={onClose}>‹ All mentors</button>
      <div className="row-between" style={{ margin: '8px 0 10px', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <span className="small" style={{ fontWeight: 700 }}>{g.name}'s team</span>
          <p className="tiny muted">Reading, investing and attendance for each mentee. A "?" means the mentor has not recorded it yet.</p>
        </div>
        <span className={`am-pill ${t.expected === 0 ? 'n' : t.expected === t.recorded ? 'g' : 'o'}`}>{t.recorded} of {t.expected} recorded</span>
      </div>
      <div className="am-scroll">
        <table className="am-table">
          <thead>
            <tr><th>Mentee</th><th>Access</th><th className="c">Reading</th><th className="c">Invested</th><th className="c">Circle</th><th className="c">Sisters</th><th>Last Tuesday tap</th></tr>
          </thead>
          <tbody>
            {g.rows.map((r) => {
              const left = r.access_status === 'active' ? daysUntil(r.paid_until) : null
              return (
                <tr key={r.woman_id} style={r.tracked ? undefined : { opacity: 0.7 }}>
                  <td><b>{r.first_name}</b></td>
                  <td>
                    {r.access_status === 'expired' ? <span className="am-pill r">ended</span>
                      : r.access_status === 'pending' || r.access_status === 'none' ? <span className="am-pill r">unpaid</span>
                      : left != null && left >= 0 && left <= 8 ? <span className="am-pill o">ends {shortDate(r.paid_until)}</span>
                      : <span className="am-pill g">active</span>}
                  </td>
                  <td className={`c ${num(r.reading_days) > 0 ? 'yes' : 'no'}`}>{num(r.reading_days) > 0 ? `${num(r.reading_days)} day${num(r.reading_days) === 1 ? '' : 's'}` : '–'}</td>
                  <td className={`c ${r.invested ? 'yes' : 'no'}`}>{r.invested ? '✓' : '–'}</td>
                  <td className="c"><SessionCount present={r.circle_present} held={r.circle_held} recorded={r.circle_recorded} tracked={r.tracked} /></td>
                  <td className="c"><SessionCount present={r.sisters_present} held={r.sisters_held} recorded={r.sisters_recorded} tracked={r.tracked} /></td>
                  <td>{r.last_tap || <span className="no">—</span>}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
//  Mentors (only those with a team)
// ---------------------------------------------------------------------------

function MentorsList({ mentors, women, report, busy, onSetMentor, onAssignMentor }) {
  const [openId, setOpenId] = useState(null)
  const [adding, setAdding] = useState(false)
  const [query, setQuery] = useState('')

  const extra = useMemo(() => {
    const m = new Map()
    ;(report?.mentors || []).forEach((x) => m.set(x.mentor_id, x))
    return m
  }, [report])

  const withTeam = mentors.filter((m) => num(m.team_size) > 0)
  const noTeam = mentors.filter((m) => num(m.team_size) === 0)

  const q = query.trim().toLowerCase()
  const found = q
    ? women.filter((w) => (w.first_name || '').toLowerCase().includes(q) || (w.phone || '').includes(q) || (w.email || '').toLowerCase().includes(q)).slice(0, 8)
    : []

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="row-between" style={{ flexWrap: 'wrap', gap: 10 }}>
        <div>
          <span className="small" style={{ fontWeight: 700 }}>Mentors</span>
          <p className="tiny muted">Only mentors who have a team. Open one to see her mentees and move or remove them.</p>
        </div>
        <button className="btn-sm btn-soft" onClick={() => setAdding(!adding)}>{adding ? 'Close' : '+ Make someone a mentor'}</button>
      </div>

      {adding && (
        <div className="card">
          <p className="tiny muted" style={{ marginBottom: 8 }}>
            Search for a woman to make her a mentor, or to remove her. Removing a mentor also clears her whole team's assignment to her.
          </p>
          <input className="input" placeholder="Search by name, phone or email" value={query} onChange={(e) => setQuery(e.target.value)} />
          <div className="stack-s" style={{ marginTop: 10 }}>
            {found.map((w) => (
              <div className="row-between" key={w.woman_id}>
                <span className="small"><b>{w.first_name}</b> <span className="muted">{w.phone || w.email || ''}</span></span>
                <button className={`btn btn-sm ${w.is_mentor ? 'btn-clay' : 'btn-soft'}`} disabled={busy} onClick={() => onSetMentor(w.woman_id, !w.is_mentor)}>
                  {w.is_mentor ? 'Mentor · remove' : 'Make mentor'}
                </button>
              </div>
            ))}
            {q && found.length === 0 && <p className="tiny muted">No matches.</p>}
          </div>
        </div>
      )}

      {withTeam.length === 0 ? (
        <div className="empty-state"><p className="small muted">No mentor has a team yet. Give them women under Assign teams.</p></div>
      ) : (
        <div className="card am-scroll">
          <table className="am-table">
            <thead>
              <tr><th>Mentor</th><th className="c">Team</th><th>Sisters Connect day</th><th>Team payment link</th><th /></tr>
            </thead>
            <tbody>
              {withTeam.map((m) => {
                const x = extra.get(m.mentor_id)
                const team = women.filter((w) => w.mentor_id === m.mentor_id)
                const open = openId === m.mentor_id
                return (
                  <FragmentRow
                    key={m.mentor_id}
                    main={
                      <tr className={`clk${open ? ' sel' : ''}`} onClick={() => setOpenId(open ? null : m.mentor_id)}>
                        <td><b>{m.first_name}</b></td>
                        <td className="c">{num(m.team_size)}</td>
                        <td>{x ? (x.sisters_connect_weekday != null ? `${WEEKDAYS[x.sisters_connect_weekday]}s` : <span className="am-pill o">not picked</span>) : '…'}</td>
                        <td>{x ? (x.has_team_link ? <span className="am-pill g">added</span> : <span className="am-pill r">missing</span>) : '…'}</td>
                        <td className="c"><span className="am-open">{open ? 'Close ▾' : 'Open team ›'}</span></td>
                      </tr>
                    }
                    detail={open && (
                      <tr><td colSpan={5} className="am-sub">
                        {team.map((w) => (
                          <div className="row-between" key={w.woman_id} style={{ padding: '6px 0', gap: 8, flexWrap: 'wrap' }}>
                            <span className="small"><b>{w.first_name}</b> <span className="muted">{w.phone || w.email || ''}</span></span>
                            <select
                              className="input" style={{ maxWidth: 220 }} disabled={busy} value={w.mentor_id || ''}
                              onChange={(e) => onAssignMentor(w.woman_id, e.target.value || null)}
                            >
                              <option value="">— Remove from team —</option>
                              {mentors.filter((mm) => mm.mentor_id !== w.woman_id).map((mm) => (
                                <option key={mm.mentor_id} value={mm.mentor_id}>{mm.first_name}</option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </td></tr>
                    )}
                  />
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {noTeam.length > 0 && (
        <p className="tiny muted">
          Mentors with no team yet: {noTeam.map((m) => m.first_name).join(', ')}. Give them women under Assign teams.
        </p>
      )}
    </div>
  )
}

function FragmentRow({ main, detail }) {
  return <>{main}{detail}</>
}

// ---------------------------------------------------------------------------
//  Assign teams (only women with no mentor)
// ---------------------------------------------------------------------------

function AssignTeams({ unassigned, mentors, busy, onAssign }) {
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState([])
  const [mentorId, setMentorId] = useState('')

  const list = (unassigned || []).filter((w) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return (w.first_name || '').toLowerCase().includes(q) || (w.phone || '').includes(q) || (w.email || '').toLowerCase().includes(q)
  })

  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  const stillPicked = picked.filter((id) => (unassigned || []).some((w) => w.woman_id === id))

  const go = async () => {
    await onAssign(stillPicked, mentorId)
    setPicked([]); setMentorId('')
  }

  return (
    <div className="am-assign">
      <div className="card">
        <div className="row-between" style={{ gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          <div>
            <span className="am-lbl">Not assigned · {unassigned?.length ?? 0} women</span>
            <p className="tiny muted">Once you assign her she leaves this list. Mentors are not listed, they do not need a mentor.</p>
          </div>
          <input className="input" style={{ maxWidth: 220 }} placeholder="Search by name, phone or email" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        {!unassigned ? <p className="small muted">Loading…</p> : list.length === 0 ? (
          <p className="small muted">{unassigned.length === 0 ? 'Everyone has a mentor.' : 'No matches.'}</p>
        ) : (
          <div className="am-scroll">
            <table className="am-table">
              <thead><tr><th /><th>Woman</th><th>Joined</th><th>Access</th></tr></thead>
              <tbody>
                {list.map((w) => (
                  <tr key={w.woman_id} className="clk" onClick={() => toggle(w.woman_id)}>
                    <td style={{ width: 28 }}><input type="checkbox" checked={picked.includes(w.woman_id)} onChange={() => toggle(w.woman_id)} onClick={(e) => e.stopPropagation()} /></td>
                    <td><b>{w.first_name}</b> <span className="muted">{w.phone || w.email || ''}</span></td>
                    <td>{w.joined}</td>
                    <td>{w.access_status === 'active' || w.access_status === 'exempt' ? <span className="am-pill g">active</span> : <span className="am-pill n">{w.access_status === 'expired' ? 'ended' : 'unpaid'}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card" style={{ alignSelf: 'start' }}>
        <span className="am-lbl">Assign {stillPicked.length} selected to</span>
        <select className="input" style={{ margin: '10px 0' }} value={mentorId} onChange={(e) => setMentorId(e.target.value)}>
          <option value="">Choose a mentor</option>
          {mentors.map((m) => <option key={m.mentor_id} value={m.mentor_id}>{m.first_name} · team of {num(m.team_size)}</option>)}
        </select>
        <p className="tiny muted" style={{ marginBottom: 12 }}>Team sizes are shown so you can balance them.</p>
        <button className="btn btn-sm btn-primary" disabled={busy || !mentorId || stillPicked.length === 0} onClick={go}>
          {busy ? 'Assigning…' : 'Assign'}
        </button>
        <p className="tiny muted" style={{ marginTop: 14 }}>To move someone who already has a mentor, open that mentor under Mentors.</p>
      </div>
    </div>
  )
}

const CSS = `
.am-stats{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px}
@media(max-width:900px){.am-stats{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:520px){.am-stats{grid-template-columns:repeat(2,minmax(0,1fr))}}
.am-stat{padding:14px}
.am-stat b{font-family:var(--font-display);font-size:26px;display:block;margin:4px 0 2px}
.am-stat small{font-size:11px;color:var(--text-soft);line-height:1.4;display:block}
.am-lbl{font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;font-weight:700;color:var(--text-soft)}
.am-scroll{overflow-x:auto}
.am-table{width:100%;border-collapse:collapse;font-size:12.5px;min-width:560px}
.am-table th{font-size:10px;letter-spacing:.09em;text-transform:uppercase;color:var(--text-soft);text-align:left;padding:0 8px 10px;font-weight:700;white-space:nowrap}
.am-table td{padding:11px 8px;border-top:1px solid var(--line);vertical-align:middle}
.am-table th.c,.am-table td.c{text-align:center}
.am-table tr.clk{cursor:pointer}.am-table tr.clk:hover td,.am-table tr.sel td{background:var(--surface-2)}
.am-sub{background:var(--surface-2);padding:6px 14px 10px!important}
.am-cell{display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
.am-bar{height:7px;width:84px;border-radius:9px;background:var(--surface-2);overflow:hidden;display:inline-block}
.am-bar i{display:block;height:100%;border-radius:9px}
.am-pill{display:inline-block;font-size:10px;font-weight:700;padding:3px 9px;border-radius:99px;white-space:nowrap}
.am-pill.g{background:#DDF3E8;color:#1f7a55}.am-pill.o{background:#FFE7BF;color:#9a5d00}.am-pill.r{background:#FFD9DF;color:var(--wine)}.am-pill.n{background:#eee;color:#777}
.yes{color:#1f7a55;font-weight:700}.no{color:rgba(42,20,16,.3)}.mid{color:#9a5d00;font-weight:700}.bad{color:var(--wine);font-weight:700}
.am-drill{border:2px solid var(--peach)}
.am-open{font-size:12px;font-weight:600;color:var(--clay)}
.am-assign{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:16px}
@media(max-width:760px){.am-assign{grid-template-columns:1fr}}
`
