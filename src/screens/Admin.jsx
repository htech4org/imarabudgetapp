import { useEffect, useMemo, useState } from 'react'
import { rpc } from '../lib/supabase'
import { cohort } from '../lib/calc'
import { ARCHETYPES } from '../lib/constants'
import { money, moneyShort, pct, shortDate } from '../lib/format'
import PasswordInput from '../components/PasswordInput'
import EntryList from '../components/EntryList'
import Leaderboard from '../components/Leaderboard'
import ReadingLeaderboard from '../components/ReadingLeaderboard'
import MentorsConsole from './MentorsConsole'
import AccessConsole from './AccessConsole'

const KEY = 'imara_admin_pw'

export default function Admin() {
  const [password, setPassword] = useState(() => sessionStorage.getItem(KEY) || '')
  const [authed, setAuthed] = useState(false)
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = async (pw) => {
    setBusy(true); setError('')
    try {
      const payload = await rpc('imara_admin_dashboard', { p_password: pw })
      sessionStorage.setItem(KEY, pw)
      setData(payload); setAuthed(true)
    } catch (e) {
      setError(e.message); setAuthed(false); sessionStorage.removeItem(KEY)
    } finally { setBusy(false) }
  }

  // Silently resume if the password is still in this tab's session.
  useEffect(() => {
    const saved = sessionStorage.getItem(KEY)
    if (saved) load(saved)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!authed) {
    return (
      <div className="login-wrap">
        <div className="login-card">
          <div className="eyebrow">IMARA Admin</div>
          <h1 className="display d-lg" style={{ margin: '10px 0 8px' }}>the team view</h1>
          <p className="small muted" style={{ marginBottom: 22, lineHeight: 1.7 }}>
            Everything behind this password belongs to a woman who trusted us with it.
            We look so we can walk with her — not to grade her.
          </p>
          <form onSubmit={(e) => { e.preventDefault(); load(password) }} className="stack">
            <div className="field">
              <label className="label">Shared team password</label>
              <PasswordInput
                value={password} autoFocus
                onChange={(e) => { setPassword(e.target.value); setError('') }}
              />
            </div>
            {error && <div className="error-note">{error}</div>}
            <button className="btn btn-primary" disabled={busy || !password}>
              {busy ? 'Checking…' : 'Open the console'}
            </button>
          </form>
          <p className="tiny faint center" style={{ marginTop: 20 }}>
            © IMARA Wealth Trybe · Leading Ladies Foundation
          </p>
        </div>
      </div>
    )
  }

  return <Console data={data} password={password} onRefresh={() => load(password)} busy={busy} onLock={() => {
    sessionStorage.removeItem(KEY); setAuthed(false); setPassword(''); setData(null)
  }} />
}

// ---------------------------------------------------------------------------

function Console({ data, password, onRefresh, busy, onLock }) {
  const [tab, setTab] = useState('budget')   // 'budget' | 'reading' | 'mentors' | 'attendance' | 'access'
  const [query, setQuery] = useState('')
  const [archFilter, setArchFilter] = useState('all')
  const [openId, setOpenId] = useState(null)

  const c = useMemo(() => cohort(data), [data])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return c.snapshots.filter((s) => {
      if (archFilter !== 'all' && (s.woman.archetype || 'unassigned') !== archFilter) return false
      if (!q) return true
      return [s.woman.first_name, s.woman.phone, s.woman.email]
        .filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
    })
  }, [c.snapshots, query, archFilter])

  const open = c.snapshots.find((s) => s.woman.id === openId)

  return (
    <>
      <style>{`
        .admin-bar{padding-bottom:0!important}
        .adm-tabs{display:flex;gap:4px;flex-wrap:wrap}
        .adm-tabs button{padding:11px 20px;border-radius:10px 10px 0 0;font-size:13.5px;font-weight:600;color:rgba(255,226,204,.75);background:none;border:0;cursor:pointer}
        .adm-tabs button:hover{color:#fff}
        .adm-tabs button.on{background:var(--bg);color:var(--maroon-900)}
      `}</style>
      <div className="admin-bar">
        <div className="admin-bar-inner">
          <div>
            <div className="eyebrow" style={{ color: 'var(--peach)' }}>IMARA Admin · The Map</div>
            <h1 className="display d-md" style={{ marginTop: 4 }}>the trybe at a glance</h1>
          </div>
          <div className="row" style={{ gap: 8 }}>
            {tab === 'budget' && (
              <button className="btn btn-sm btn-soft" onClick={onRefresh} disabled={busy}>
                {busy ? 'Refreshing…' : 'Refresh'}
              </button>
            )}
            <button className="btn btn-sm btn-soft" onClick={onLock}>Lock</button>
          </div>
        </div>
        <div className="admin-bar-inner" style={{ paddingTop: 0, marginTop: 6 }}>
          <div className="adm-tabs">
            {[['budget', 'Budget'], ['reading', 'Book Reading'], ['mentors', 'Mentors'], ['attendance', 'Attendance'], ['quizzes', 'Quizzes'], ['access', 'Access']].map(([k, label]) => (
              <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      {tab === 'reading' ? (
        <ReadingConsole password={password} />
      ) : tab === 'mentors' ? (
        <MentorsTab password={password} />
      ) : tab === 'attendance' ? (
        <AttendanceTab password={password} />
      ) : tab === 'quizzes' ? (
        <QuizTab password={password} />
      ) : tab === 'access' ? (
        <AccessTab password={password} />
      ) : (
      <div className="admin">
        {/* ---- Headline metrics ---- */}
        <div className="metrics">
          <Metric k="Women tracking" v={c.activeWomen} s={`${c.totalWomen} signed up in total`} tone="ink" />
          <Metric k="Logging consistency" v={pct(c.consistency)} s="Share of days logged, cohort average" tone={c.consistency >= 0.6 ? 'good' : 'warn'} />
          <Metric
            k="Average Gap" v={moneyShort(c.avgGap, c.currency)}
            s={c.mixedCurrency
              ? `${pct(c.surplusShare)} in surplus · mixed currencies, read with care`
              : `${pct(c.surplusShare)} of women in surplus`}
            tone={c.avgGap >= 0 ? 'good' : 'warn'}
          />
          <Metric k="Hitting the Split" v={pct(c.onTrackShare)} s="3 or more of the 5 lines landing" tone={c.onTrackShare >= 0.5 ? 'good' : 'warn'} />
          <Metric k="Worth reaching out to" v={c.needsSupport.length} s="Quiet, or running a shortfall" tone="warn" />
        </div>

        <div className="grid-2" style={{ marginTop: 16 }}>
          {/* ---- Gap trend ---- */}
          <div className="panel">
            <div className="section-head" style={{ marginTop: 0 }}>
              <span className="eyebrow">Average Gap, month over month</span>
            </div>
            {c.gapTrend.length ? (
              <>
                <div className="trend">
                  {c.gapTrend.map((g) => {
                    const max = Math.max(...c.gapTrend.map((x) => Math.abs(x.avgGap)), 1)
                    const h = Math.max(4, (Math.abs(g.avgGap) / max) * 100)
                    return (
                      <div className="trend-col" key={g.month}>
                        <span className="trend-val" style={{ color: g.avgGap >= 0 ? '#2E7C5C' : 'var(--clay)' }}>
                          {moneyShort(g.avgGap, c.currency)}
                        </span>
                        <div className={`trend-bar ${g.avgGap >= 0 ? 'trend-pos' : 'trend-neg'}`} style={{ height: `${h}%` }} />
                        <span className="trend-lbl">Month {g.month}</span>
                        <span className="trend-lbl faint">{g.women} {g.women === 1 ? 'woman' : 'women'}</span>
                      </div>
                    )
                  })}
                </div>
                <p className="tiny muted" style={{ marginTop: 14, lineHeight: 1.6 }}>
                  Each bar is the average Gap across every woman in her Nth month of tracking.
                  Rising bars mean the cohort is closing its gap over time.
                </p>
              </>
            ) : <p className="small muted">No months with logged money yet.</p>}
          </div>

          {/* ---- Split lines ---- */}
          <div className="panel">
            <div className="section-head" style={{ marginTop: 0 }}>
              <span className="eyebrow">Which split lines are landing</span>
            </div>
            <div className="stack" style={{ gap: 13 }}>
              {c.lineHits.map((l) => (
                <div key={l.key}>
                  <div className="row-between" style={{ marginBottom: 5 }}>
                    <span className="small" style={{ fontWeight: 600 }}>{l.label}</span>
                    <span className="small numeric muted">{pct(l.share)} · {l.hits}/{l.of}</span>
                  </div>
                  <div className={`bar bar-${l.key}`}><span style={{ width: `${Math.min(100, l.share * 100)}%` }} /></div>
                </div>
              ))}
            </div>
            <p className="tiny muted" style={{ marginTop: 14, lineHeight: 1.6 }}>
              Each woman is measured against her own percentages, so there is no single target
              to quote here. A line counts as landing when she has reached 80% of whatever she
              set — except Living, which lands when she has stayed at or under hers.
              {c.customSplits > 0 && ` ${c.customSplits} of ${c.totalWomen} have moved off 10/10/10/10/60.`}
            </p>
          </div>
        </div>

        {/* ---- Leaderboards ---- */}
        <div className="grid-2" style={{ marginTop: 16 }}>
          <div className="panel">
            <Leaderboard
              title="Saver of the month"
              subtitle="Share of income moved to Saving, in each woman's own 30-day period"
              rows={c.boards.saving}
              accent="saving"
              emptyNote="No woman has logged income in an open month yet."
            />
          </div>
          <div className="panel">
            <Leaderboard
              title="Investor of the month"
              subtitle="Share of income moved to Investing, in each woman's own 30-day period"
              rows={c.boards.investing}
              accent="investing"
              emptyNote="No investing targets are running yet."
            />
          </div>
        </div>

        {/* ---- By archetype ---- */}
        <div className="panel" style={{ marginTop: 16 }}>
          <div className="section-head" style={{ marginTop: 0 }}>
            <span className="eyebrow">By archetype</span>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Archetype</th><th className="num">Women</th><th className="num">Consistency</th>
                  <th className="num">Average Gap</th><th className="num">In surplus</th><th className="num">Hitting split</th>
                </tr>
              </thead>
              <tbody>
                {c.byArchetype.map((a) => {
                  const meta = ARCHETYPES[a.key]
                  return (
                    <tr key={a.key} onClick={() => setArchFilter(a.key)}>
                      <td>
                        <span className={`tag tag-${a.key}`}>{meta ? `${meta.name} · ${meta.title}` : 'Not yet chosen'}</span>
                      </td>
                      <td className="num">{a.count}</td>
                      <td className="num">{pct(a.consistency)}</td>
                      <td className="num" style={{ color: a.avgGap >= 0 ? '#2E7C5C' : 'var(--clay)', fontWeight: 600 }}>
                        {moneyShort(a.avgGap, c.currency)}
                      </td>
                      <td className="num">{pct(a.surplusShare)}</td>
                      <td className="num">{pct(a.onTrackShare)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ---- Every woman ---- */}
        <div className="panel" style={{ marginTop: 16 }}>
          <div className="row-between" style={{ marginBottom: 14, flexWrap: 'wrap' }}>
            <span className="eyebrow">Every woman · {rows.length} shown</span>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <input
                className="input" style={{ width: 250, padding: '10px 14px', fontSize: 14 }}
                placeholder="Search name, phone or email"
                value={query} onChange={(e) => setQuery(e.target.value)}
              />
              <select
                className="select" style={{ width: 190, padding: '10px 36px 10px 14px', fontSize: 14 }}
                value={archFilter} onChange={(e) => setArchFilter(e.target.value)}
              >
                <option value="all">All archetypes</option>
                {Object.values(ARCHETYPES).map((a) => <option key={a.key} value={a.key}>{a.name} · {a.title}</option>)}
                <option value="unassigned">Not yet chosen</option>
              </select>
            </div>
          </div>

          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Name</th><th>Contact</th><th>Archetype</th><th>Month</th>
                  <th style={{ minWidth: 130 }}>Consistency</th>
                  <th className="num">In</th><th className="num">Out</th><th className="num">Gap</th>
                  <th className="num">Split</th><th>Last logged</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.woman.id} onClick={() => setOpenId(s.woman.id)}>
                    <td style={{ fontWeight: 600 }}>{s.woman.first_name}</td>
                    <td className="tiny muted">
                      {s.woman.phone}<br />{s.woman.email}
                    </td>
                    <td>
                      <span className={`tag tag-${s.woman.archetype || 'unassigned'}`}>
                        {s.woman.archetype ? ARCHETYPES[s.woman.archetype].name : 'Not chosen'}
                      </span>
                    </td>
                    <td className="tiny">
                      {s.period ? <>#{s.period.period_number}<br /><span className="muted">{s.period.status}</span></> : '—'}
                    </td>
                    <td>
                      <div className="row" style={{ gap: 8 }}>
                        <div className="mini-bar"><span style={{ width: `${Math.min(100, s.consistency * 100)}%` }} /></div>
                        <span className="tiny numeric muted">{s.daysLogged}/{s.daysElapsed}</span>
                      </div>
                    </td>
                    <td className="num">{moneyShort(s.totals.moneyIn, s.woman.currency)}</td>
                    <td className="num">{moneyShort(s.totals.moneyOut, s.woman.currency)}</td>
                    <td className="num" style={{ fontWeight: 700, color: s.totals.gap >= 0 ? '#2E7C5C' : 'var(--clay)' }}>
                      {moneyShort(s.totals.gap, s.woman.currency)}
                    </td>
                    <td className="num">
                      <span className={`tag ${s.split.onTrack ? 'tag-good' : 'tag-warn'}`}>{s.split.linesOnMap}/5</span>
                    </td>
                    <td className="tiny muted">{s.lastLogged ? shortDate(s.lastLogged) : 'Never'}</td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr><td colSpan={10} className="center muted" style={{ padding: 30 }}>No one matches that search.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ---- Reach out ---- */}
        {c.needsSupport.length > 0 && (
          <div className="panel" style={{ marginTop: 16 }}>
            <div className="section-head" style={{ marginTop: 0 }}>
              <span className="eyebrow">Worth a message this week</span>
            </div>
            <p className="small muted" style={{ marginBottom: 14, lineHeight: 1.65 }}>
              These women have either gone quiet for a stretch, or their numbers are showing a
              shortfall. Not a list of who is failing — a list of who to check in on.
            </p>
            <div className="stack" style={{ gap: 8 }}>
              {c.needsSupport.map((s) => (
                <div className="history-row" key={s.woman.id} onClick={() => setOpenId(s.woman.id)} style={{ cursor: 'pointer' }}>
                  <div>
                    <div className="small" style={{ fontWeight: 600 }}>
                      {s.woman.first_name}
                      {s.woman.archetype && (
                        <span className={`tag tag-${s.woman.archetype}`} style={{ marginLeft: 8 }}>
                          {ARCHETYPES[s.woman.archetype].name}
                        </span>
                      )}
                    </div>
                    <div className="tiny muted">
                      {s.woman.phone} · logged {s.daysLogged} of {s.daysElapsed} days
                      {s.totals.gap < 0 && ` · shortfall of ${money(Math.abs(s.totals.gap), s.woman.currency)}`}
                    </div>
                  </div>
                  <span className="tiny" style={{ color: 'var(--clay)', fontWeight: 600 }}>Open →</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="tiny faint center" style={{ marginTop: 30 }}>
          © IMARA Wealth Trybe · Leading Ladies Foundation · the map is not the judgment, it's the way out.
        </p>
      </div>
      )}

      {tab === 'budget' && open && <Drilldown s={open} onClose={() => setOpenId(null)} />}
    </>
  )
}

function Metric({ k, v, s, tone }) {
  return (
    <div className="metric">
      <div className="k">{k}</div>
      <div className={`v v-${tone || 'ink'}`}>{v}</div>
      <div className="s">{s}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------
//  Mentors tab
// ---------------------------------------------------------------------------

// Owns all the data-fetching for the mentor system and hands it down to
// MentorsConsole, which is purely presentational. Kept separate the same
// way ReadingConsole is kept separate below — one tab, one self-contained
// piece of state, no interference with the budget or reading tabs.
function MentorsTab({ password }) {
  const [mentors, setMentors] = useState([])
  const [women, setWomen] = useState([])
  const [unassigned, setUnassigned] = useState(null)
  const [report, setReport] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const loadMentors = () => rpc('imara_admin_mentors_list', { p_admin_password: password }).then(setMentors)
  const loadWomen = () => rpc('imara_admin_women_for_assignment', { p_admin_password: password }).then(setWomen)
  const loadUnassigned = () => rpc('imara_admin_unassigned', { p_admin_password: password }).then(setUnassigned)
  const loadReport = (monthIso) =>
    rpc('imara_admin_month_report', { p_admin_password: password, p_month: monthIso || null })
      .then((o) => { setReport(o); return o })

  const refreshAll = async () => {
    setBusy(true); setError('')
    try { await Promise.all([loadMentors(), loadWomen(), loadUnassigned(), loadReport()]) }
    catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }

  const setMentor = async (womanId, isMentor) => {
    setBusy(true)
    try {
      await rpc('imara_admin_set_mentor', { p_admin_password: password, p_woman_id: womanId, p_is_mentor: isMentor })
      await Promise.all([loadMentors(), loadWomen(), loadUnassigned(), loadReport(report?.month)])
    } finally { setBusy(false) }
  }

  const assignMentor = async (womanId, mentorId) => {
    setBusy(true)
    try {
      await rpc('imara_admin_assign_mentor', { p_admin_password: password, p_woman_id: womanId, p_mentor_id: mentorId })
      await Promise.all([loadMentors(), loadWomen(), loadUnassigned(), loadReport(report?.month)])
    } finally { setBusy(false) }
  }

  // Assign several women to one mentor, then reload once.
  const assignMany = async (womanIds, mentorId) => {
    setBusy(true)
    try {
      for (const id of womanIds) {
        await rpc('imara_admin_assign_mentor', { p_admin_password: password, p_woman_id: id, p_mentor_id: mentorId })
      }
      await Promise.all([loadMentors(), loadWomen(), loadUnassigned(), loadReport(report?.month)])
    } finally { setBusy(false) }
  }

  return (
    <div className="admin">
      {error && <div className="error-note" style={{ marginBottom: 16 }}>{error}</div>}
      <div className="panel">
        <MentorsConsole
          busy={busy}
          mentors={mentors}
          women={women}
          unassigned={unassigned}
          report={report}
          onRefreshAll={refreshAll}
          onSetMentor={setMentor}
          onAssignMentor={assignMentor}
          onAssignMany={assignMany}
          onLoadReport={loadReport}
        />
      </div>
      <p className="tiny faint center" style={{ marginTop: 30 }}>
        © IMARA Wealth Trybe · Leading Ladies Foundation
      </p>
    </div>
  )
}

// Has each mentor actually RECORDED attendance, or are sessions just sitting
// there blank? "Behind" counts sessions held so far this month that she has not
// marked present or absent for someone on her team.
function RecordingStatus({ password }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(null)

  useEffect(() => {
    rpc('imara_admin_recording_overview', { p_admin_password: password, p_month: null })
      .then(setData).catch((e) => setError(e.message))
  }, [password])

  const rows = data?.rows || []
  const expected = rows.reduce((n, r) => n + Number(r.expected || 0), 0)
  const recorded = rows.reduce((n, r) => n + Number(r.recorded || 0), 0)
  const pct = expected > 0 ? Math.round((recorded / expected) * 100) : 100
  const behindMentors = rows.filter((r) => Number(r.behind) > 0).length

  return (
    <div className="panel">
      <span className="small" style={{ fontWeight: 700 }}>Has each mentor recorded it?{data?.month ? ` · ${String(data.month).slice(0, 7)}` : ''}</span>
      <p className="tiny muted" style={{ margin: '6px 0 12px', lineHeight: 1.6 }}>
        Whether each mentor has marked her team present or absent for sessions held so far.
        Not recorded is different from absent. Women who have not renewed are not counted.
      </p>
      {error && <div className="error-note">{error}</div>}
      {!data && !error && <p className="small muted">Loading…</p>}
      {data && rows.length === 0 && <p className="small muted">No mentors with a team yet.</p>}
      {data && rows.length > 0 && (
        <>
          <p className="small" style={{ marginBottom: 12 }}>
            <b>{pct}%</b> recorded · <b>{behindMentors}</b> mentor{behindMentors === 1 ? '' : 's'} behind · <b>{expected - recorded}</b> still to record
          </p>
          <div className="stack" style={{ gap: 10 }}>
            {rows.map((r) => {
              const exp = Number(r.expected || 0), rec = Number(r.recorded || 0), behind = Number(r.behind || 0)
              const w = exp > 0 ? Math.round((rec / exp) * 100) : 100
              const colour = behind === 0 ? '#59BA8E' : w < 50 ? '#F3A0B0' : '#F2C46B'
              return (
                <div key={r.mentor_id}>
                  <button
                    type="button" onClick={() => setOpen(open === r.mentor_id ? null : r.mentor_id)}
                    style={{ all: 'unset', cursor: behind > 0 ? 'pointer' : 'default', display: 'block', width: '100%' }}
                  >
                    <div className="row-between" style={{ gap: 8, flexWrap: 'wrap' }}>
                      <span className="small"><b>{r.mentor_name}</b> <span className="muted">· team of {r.team_size}</span></span>
                      <span className="tiny muted">
                        {rec} of {exp} recorded{r.last_entry ? ` · last entry ${r.last_entry}` : ' · nothing recorded yet'}
                        {behind > 0 ? ' ›' : ' ✓'}
                      </span>
                    </div>
                    <div style={{ height: 6, borderRadius: 9, background: 'var(--surface-2)', overflow: 'hidden', marginTop: 5 }}>
                      <div style={{ width: `${w}%`, height: '100%', background: colour, borderRadius: 9 }} />
                    </div>
                  </button>
                  {r.no_sisters_day && (
                    <p className="tiny muted" style={{ marginTop: 4 }}>She has not picked her Sisters Connect day yet.</p>
                  )}
                  {open === r.mentor_id && (r.missing || []).length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      {r.missing.map((m, i) => (
                        <p key={i} className="tiny" style={{ lineHeight: 1.8 }}>
                          {m.kind} · {String(m.session_date).slice(5)}: {m.recorded} of {m.team} recorded
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// Subscription access: who has paid, who is exempt, the master lock, and the
// three links. Owns the fetching; AccessConsole is purely presentational.
// Action errors are thrown back to AccessConsole, which shows them.
// Attendance logs: who tapped a Tuesday class link, and whether each mentor
// has recorded attendance for her team.
function AttendanceTab({ password }) {
  return (
    <div className="admin">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16, alignItems: 'start' }}>
        <ClassTaps password={password} />
        <RecordingStatus password={password} />
      </div>
      <p className="tiny faint center" style={{ marginTop: 30 }}>
        © IMARA Wealth Trybe · Leading Ladies Foundation
      </p>
    </div>
  )
}

// A tap between 7:50pm and 10pm Lagos time counts as joined (taps before 8pm
// are labelled early). Anything else that day is only counted, with its time.
function ClassTaps({ password }) {
  const [date, setDate] = useState('')          // '' = latest Tuesday
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  const load = async (d) => {
    setLoading(true); setError('')
    try {
      setData(await rpc('imara_admin_class_clicks', { p_admin_password: password, p_date: d || null }))
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }
  useEffect(() => { load(date) }, [date]) // eslint-disable-line react-hooks/exhaustive-deps

  const rows = data?.rows || []
  const q = search.trim().toLowerCase()
  const shown = rows.filter((r) => !q || (r.first_name || '').toLowerCase().includes(q) || (r.mentor_name || '').toLowerCase().includes(q))
  const zoom = rows.filter((r) => r.circle_at).length
  const yt = rows.filter((r) => r.foundation_at).length
  const outside = rows.filter((r) => Number(r.outside_window_taps) > 0).length
  const cell = { padding: '9px 8px', borderTop: '1px solid var(--line)' }

  return (
    <div className="panel">
      <div className="row-between" style={{ gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <span className="small" style={{ fontWeight: 700 }}>
          Attendance logs{data?.date ? ` · ${data.date}` : ''}
        </span>
        <div className="row" style={{ gap: 8, alignItems: 'center' }}>
          <input
            className="input" type="date" style={{ maxWidth: 170 }}
            value={date || data?.date || ''} onChange={(e) => setDate(e.target.value)}
          />
          <button className="btn btn-sm btn-soft" onClick={() => load(date)} disabled={loading}>
            {loading ? '…' : 'Refresh'}
          </button>
        </div>
      </div>
      <p className="tiny muted" style={{ margin: '6px 0 12px', lineHeight: 1.6 }}>
        A tap from 7:50pm to 10:00pm Lagos time counts as joining. A tap shows she tried to join, not that she stayed.
      </p>
      {error && <div className="error-note">{error}</div>}

      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, marginBottom: 14 }}>
          {[['Joined Zoom', zoom, 'IMARA Circle'], ['Joined YouTube', yt, 'Foundation Arc'], ['Outside window', outside, 'before 7:50pm or after 10pm']].map(([k, v, sub]) => (
            <div key={k} className="card" style={{ padding: 12 }}>
              <span className="tiny muted" style={{ textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 700 }}>{k}</span>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600 }}>{v}</div>
              <span className="tiny muted">{sub}</span>
            </div>
          ))}
        </div>
      )}

      {!error && rows.length === 0 && <p className="small muted">No taps recorded for this day.</p>}
      {rows.length > 0 && (
        <>
          <input className="input" placeholder="Search by woman or mentor" value={search} onChange={(e) => setSearch(e.target.value)} style={{ marginBottom: 10 }} />
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, minWidth: 420 }}>
              <thead>
                <tr style={{ textAlign: 'left' }}>
                  {['Woman', 'Mentor', 'Zoom', 'YouTube'].map((h) => (
                    <th key={h} className="tiny muted" style={{ padding: '0 8px 8px', textTransform: 'uppercase', letterSpacing: '.09em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => {
                  const joined = r.circle_at || r.foundation_at
                  return (
                    <tr key={r.woman_id}>
                      <td style={cell}><b>{r.first_name}</b></td>
                      <td style={cell}>{r.mentor_name || '—'}</td>
                      {joined ? (
                        <>
                          <td style={cell}>{r.circle_at || '—'}{r.circle_early && <span className="tag tag-good" style={{ marginLeft: 6 }}>early</span>}</td>
                          <td style={cell}>{r.foundation_at || '—'}{r.foundation_early && <span className="tag tag-good" style={{ marginLeft: 6 }}>early</span>}</td>
                        </>
                      ) : (
                        <td colSpan={2} className="muted" style={cell}>
                          outside window only{r.outside_at ? ` · ${r.outside_at}` : ''}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {shown.length === 0 && <p className="small muted" style={{ marginTop: 8 }}>No matches.</p>}
        </>
      )}
    </div>
  )
}

function QuizTab({ password }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [openId, setOpenId] = useState(null)

  useEffect(() => {
    rpc('imara_admin_quiz_overview', { p_admin_password: password })
      .then(setData).catch((e) => setError(e.message))
  }, [password])

  if (error) return <div className="admin"><div className="error-note">{error}</div></div>
  if (!data) return <div className="admin"><p className="small muted">Loading quiz results…</p></div>

  return (
    <div className="admin">
      {data.length === 0 && <p className="small muted">No quizzes yet.</p>}
      <div className="stack">
        {data.map((q) => {
          const pctTaken = q.eligible ? Math.round((q.taken / q.eligible) * 100) : 0
          return (
            <div key={q.quiz_id} className="panel">
              <div className="row-between">
                <div>
                  <div className="eyebrow">{q.system === 'circle' ? 'IMARA Circle' : 'Foundation Arc'}</div>
                  <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-display)', fontSize: 22, textTransform: 'lowercase' }}>{q.title}</h3>
                </div>
                <span className={`tag ${q.closed ? 'tag-unassigned' : 'tag-good'}`}>{q.closed ? 'Closed' : 'Open'}</span>
              </div>
              <div className="metrics" style={{ marginTop: 14 }}>
                <Metric k="Taken" v={`${q.taken} / ${q.eligible}`} s={`${pctTaken}% of paid women`} tone="ink" />
                <Metric k="Passed" v={q.passed} s={`${q.pass_mark} of ${q.total} to pass`} tone="ink" />
                <Metric k="Average best" v={q.average_best == null ? '–' : `${q.average_best} / ${q.total}`} s="Across women who took it" tone="ink" />
              </div>
              {q.missed.length > 0 && (
                <p className="small" style={{ marginTop: 12 }}>
                  <b>Most missed:</b> {q.missed.map((m) => `${m.topic} (${m.misses})`).join(' · ')}
                </p>
              )}
              <button className="btn btn-soft btn-sm" style={{ marginTop: 12 }} onClick={() => setOpenId(openId === q.quiz_id ? null : q.quiz_id)}>
                {openId === q.quiz_id ? 'Hide' : 'Show'} who has not taken it ({q.not_taken.length})
              </button>
              {openId === q.quiz_id && (
                <div style={{ marginTop: 10 }}>
                  {q.not_taken.length === 0 ? <p className="small muted">Everyone has taken it.</p> : (
                    <p className="small" style={{ lineHeight: 1.9 }}>
                      {q.not_taken.map((w, i) => (
                        <span key={i}>{w.first_name}{w.mentor_name ? <span className="faint"> ({w.mentor_name})</span> : ''}{i < q.not_taken.length - 1 ? ', ' : ''}</span>
                      ))}
                    </p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AccessTab({ password }) {
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = () =>
    rpc('imara_admin_access_overview', { p_admin_password: password }).then(setData)

  const refresh = async () => {
    setBusy(true); setError('')
    try { await load() } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  // Run a write, then reload. Errors propagate to the caller.
  const act = async (fn, args) => {
    setBusy(true)
    try {
      await rpc(fn, { p_admin_password: password, ...args })
      await load()
    } finally { setBusy(false) }
  }

  return (
    <div className="admin">
      {error && <div className="error-note" style={{ marginBottom: 16 }}>{error}</div>}
      <div className="panel">
        <AccessConsole
          busy={busy}
          data={data}
          onRefresh={refresh}
          onMarkPaid={(ids, days) => act('imara_admin_mark_paid', { p_woman_ids: ids, p_days: days })}
          onSetPaidUntil={(id, iso) => act('imara_admin_set_paid_until', { p_woman_id: id, p_date: iso })}
          onSetExempt={(id, on) => act('imara_admin_set_exempt', { p_woman_id: id, p_exempt: on })}
          onSetEnforcement={(on) => act('imara_admin_set_enforcement', { p_on: on })}
          onSetLink={(key, value) => act('imara_admin_set_link', { p_key: key, p_value: value })}
          onResetPassword={(id) => act('imara_admin_reset_password', { p_woman_id: id })}
        />
      </div>
      <p className="tiny faint center" style={{ marginTop: 30 }}>
        © IMARA Wealth Trybe · Leading Ladies Foundation
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
//  Reading tab
// ---------------------------------------------------------------------------

const EMPTY_BOOK = { book_id: null, title: '', author: '', description: '', cover_url: '', is_active: true, sort_order: 0 }
const EMPTY_CHAPTER = { chapter_id: null, chapter_number: 1, title: '', content: '', sort_order: 0 }
const EMPTY_QUESTION = { question_id: null, question_text: '', options: ['', ''], correct_index: 0, sort_order: 0 }

function ReadingConsole({ password }) {
  const [books, setBooks] = useState(null)
  const [overview, setOverview] = useState(null)
  const [board, setBoard] = useState(null)
  const [selectedBookId, setSelectedBookId] = useState(null)
  const [chapters, setChapters] = useState(null)
  const [selectedChapterId, setSelectedChapterId] = useState(null)
  const [questions, setQuestions] = useState(null)

  const [bookForm, setBookForm] = useState(EMPTY_BOOK)
  const [chapterForm, setChapterForm] = useState(EMPTY_CHAPTER)
  const [questionForm, setQuestionForm] = useState(EMPTY_QUESTION)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const loadBooks = () => rpc('imara_admin_books_list', { p_admin_password: password }).then(setBooks)
  const loadOverview = () => rpc('imara_admin_reading_overview', { p_admin_password: password }).then(setOverview)
  const loadBoard = () => rpc('imara_reading_leaderboard', {}).then(setBoard)
  const loadChapters = (bookId) => rpc('imara_admin_book_chapters', { p_admin_password: password, p_book_id: bookId }).then(setChapters)
  const loadQuestions = (chapterId) => rpc('imara_admin_chapter_questions', { p_admin_password: password, p_chapter_id: chapterId }).then(setQuestions)

  useEffect(() => { loadBooks(); loadOverview(); loadBoard() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (selectedBookId) loadChapters(selectedBookId)
    else { setChapters(null); setSelectedChapterId(null); setQuestions(null) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBookId])
  useEffect(() => {
    if (selectedChapterId) loadQuestions(selectedChapterId)
    else setQuestions(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChapterId])

  const wrap = async (fn) => {
    setBusy(true); setError('')
    try { await fn() } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  const saveBook = () => wrap(async () => {
    await rpc('imara_admin_book_upsert', {
      p_admin_password: password, p_book_id: bookForm.book_id,
      p_title: bookForm.title, p_author: bookForm.author, p_description: bookForm.description,
      p_cover_url: bookForm.cover_url, p_is_active: bookForm.is_active, p_sort_order: Number(bookForm.sort_order) || 0,
    })
    setBookForm(EMPTY_BOOK)
    await loadBooks()
  })

  const saveChapter = () => wrap(async () => {
    await rpc('imara_admin_chapter_upsert', {
      p_admin_password: password, p_chapter_id: chapterForm.chapter_id, p_book_id: selectedBookId,
      p_chapter_number: Number(chapterForm.chapter_number) || 1, p_title: chapterForm.title,
      p_content: chapterForm.content, p_sort_order: Number(chapterForm.sort_order) || 0,
    })
    setChapterForm({ ...EMPTY_CHAPTER, chapter_number: (chapters?.length || 0) + 1 })
    await Promise.all([loadChapters(selectedBookId), loadBooks()])
  })

  const saveQuestion = () => wrap(async () => {
    const opts = questionForm.options.map((o) => o.trim()).filter(Boolean)
    if (opts.length < 2) throw new Error('A question needs at least two options.')
    if (questionForm.correct_index >= opts.length) throw new Error('Pick which option is correct.')
    await rpc('imara_admin_question_upsert', {
      p_admin_password: password, p_question_id: questionForm.question_id, p_chapter_id: selectedChapterId,
      p_question_text: questionForm.question_text, p_options: opts,
      p_correct_index: questionForm.correct_index, p_sort_order: Number(questionForm.sort_order) || 0,
    })
    setQuestionForm({ ...EMPTY_QUESTION, sort_order: (questions?.length || 0) })
    await loadQuestions(selectedChapterId)
  })

  const selectedBook = books?.find((b) => b.book_id === selectedBookId)
  const selectedChapter = chapters?.find((c) => c.chapter_id === selectedChapterId)

  return (
    <div className="admin">
      <div className="grid-2" style={{ marginTop: 16 }}>
        <div className="panel">
          <ReadingLeaderboard rows={board} />
        </div>
        <div className="panel">
          <div className="section-head" style={{ marginTop: 0 }}>
            <span className="eyebrow">Reading engagement</span>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr><th>Name</th><th className="num">Started</th><th className="num">Completed</th><th className="num">This month</th><th>Last activity</th></tr>
              </thead>
              <tbody>
                {(overview || []).map((r) => (
                  <tr key={r.woman_id}>
                    <td style={{ fontWeight: 600 }}>{r.first_name}</td>
                    <td className="num">{r.books_started}</td>
                    <td className="num">{r.books_completed}</td>
                    <td className="num">{r.chapters_this_month}</td>
                    <td className="tiny muted">{r.last_activity ? shortDate(r.last_activity.slice(0, 10)) : 'Never'}</td>
                  </tr>
                ))}
                {overview && overview.length === 0 && (
                  <tr><td colSpan={5} className="center muted" style={{ padding: 24 }}>Nobody has opened a book yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ---- Books ---- */}
      <div className="panel" style={{ marginTop: 16 }}>
        <div className="section-head" style={{ marginTop: 0 }}>
          <span className="eyebrow">Books</span>
        </div>
        <div className="stack" style={{ gap: 8, marginBottom: 18 }}>
          {(books || []).map((b) => (
            <div
              key={b.book_id} className="history-row"
              style={{ cursor: 'pointer', outline: selectedBookId === b.book_id ? '2px solid var(--maroon-900)' : 'none' }}
              onClick={() => setSelectedBookId(b.book_id === selectedBookId ? null : b.book_id)}
            >
              <div>
                <div className="small" style={{ fontWeight: 600 }}>
                  {b.title} {!b.is_active && <span className="tag tag-unassigned" style={{ marginLeft: 6 }}>Draft</span>}
                </div>
                <div className="tiny muted">{b.author || 'No author set'} · {b.chapter_count} chapters</div>
              </div>
              <button
                className="btn-link"
                onClick={(e) => { e.stopPropagation(); setBookForm({ ...b }); setSelectedBookId(b.book_id) }}
              >Edit</button>
            </div>
          ))}
          {books && books.length === 0 && <p className="small muted">No books yet — add the first one below.</p>}
        </div>

        <div className="card-flat">
          <p className="small" style={{ fontWeight: 600, marginBottom: 12 }}>
            {bookForm.book_id ? 'Edit book' : 'Add a book'}
          </p>
          <div className="stack" style={{ gap: 12 }}>
            <div className="field">
              <label className="label">Title</label>
              <input className="input" value={bookForm.title} onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })} />
            </div>
            <div className="field">
              <label className="label">Author</label>
              <input className="input" value={bookForm.author} onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })} />
            </div>
            <div className="field">
              <label className="label">Description</label>
              <textarea className="textarea" value={bookForm.description} onChange={(e) => setBookForm({ ...bookForm, description: e.target.value })} />
            </div>
            <div className="field">
              <label className="label">Cover image URL (optional)</label>
              <input className="input" value={bookForm.cover_url} onChange={(e) => setBookForm({ ...bookForm, cover_url: e.target.value })} />
            </div>
            <div className="row-between">
              <label className="row" style={{ gap: 8 }}>
                <input type="checkbox" checked={bookForm.is_active} onChange={(e) => setBookForm({ ...bookForm, is_active: e.target.checked })} />
                <span className="small">Visible to women now</span>
              </label>
            </div>
            {error && <div className="error-note">{error}</div>}
            <div className="row-between">
              <div />
              <div className="row" style={{ gap: 8 }}>
                {bookForm.book_id && <button className="btn-link" onClick={() => setBookForm(EMPTY_BOOK)}>Cancel</button>}
                <button className="btn btn-sm btn-primary" onClick={saveBook} disabled={busy || !bookForm.title}>
                  {bookForm.book_id ? 'Save book' : 'Add book'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Chapters ---- */}
      {selectedBook && (
        <div className="panel" style={{ marginTop: 16 }}>
          <div className="section-head" style={{ marginTop: 0 }}>
            <span className="eyebrow">Chapters · {selectedBook.title}</span>
          </div>
          <div className="stack" style={{ gap: 8, marginBottom: 18 }}>
            {(chapters || []).map((c) => (
              <div
                key={c.chapter_id} className="history-row"
                style={{ cursor: 'pointer', outline: selectedChapterId === c.chapter_id ? '2px solid var(--maroon-900)' : 'none' }}
                onClick={() => setSelectedChapterId(c.chapter_id === selectedChapterId ? null : c.chapter_id)}
              >
                <div>
                  <div className="small" style={{ fontWeight: 600 }}>Chapter {c.chapter_number} · {c.title}</div>
                  <div className="tiny muted">{c.question_count} questions</div>
                </div>
                <button className="btn-link" onClick={(e) => { e.stopPropagation(); setChapterForm({ ...c }); setSelectedChapterId(c.chapter_id) }}>Edit</button>
              </div>
            ))}
            {chapters && chapters.length === 0 && <p className="small muted">No chapters yet — add the first one below.</p>}
          </div>

          <div className="card-flat">
            <p className="small" style={{ fontWeight: 600, marginBottom: 12 }}>
              {chapterForm.chapter_id ? 'Edit chapter' : 'Add a chapter'}
            </p>
            <div className="stack" style={{ gap: 12 }}>
              <div className="row" style={{ gap: 12 }}>
                <div className="field" style={{ width: 120 }}>
                  <label className="label">Chapter #</label>
                  <input className="input" type="number" min="1" value={chapterForm.chapter_number}
                    onChange={(e) => setChapterForm({ ...chapterForm, chapter_number: e.target.value })} />
                </div>
                <div className="field grow">
                  <label className="label">Title</label>
                  <input className="input" value={chapterForm.title} onChange={(e) => setChapterForm({ ...chapterForm, title: e.target.value })} />
                </div>
              </div>
              <div className="field">
                <label className="label">Content shown before the test (optional)</label>
                <textarea className="textarea" style={{ minHeight: 140 }} value={chapterForm.content}
                  onChange={(e) => setChapterForm({ ...chapterForm, content: e.target.value })} />
              </div>
              {error && <div className="error-note">{error}</div>}
              <div className="row-between">
                {chapterForm.chapter_id && <button className="btn-link" onClick={() => setChapterForm(EMPTY_CHAPTER)}>Cancel</button>}
                <button className="btn btn-sm btn-primary" onClick={saveChapter} disabled={busy || !chapterForm.title} style={{ marginLeft: 'auto' }}>
                  {chapterForm.chapter_id ? 'Save chapter' : 'Add chapter'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---- Questions ---- */}
      {selectedChapter && (
        <div className="panel" style={{ marginTop: 16 }}>
          <div className="section-head" style={{ marginTop: 0 }}>
            <span className="eyebrow">Questions · Chapter {selectedChapter.chapter_number}</span>
          </div>
          <div className="stack" style={{ gap: 10, marginBottom: 18 }}>
            {(questions || []).map((q, i) => (
              <div className="card" key={q.question_id}>
                <div className="row-between">
                  <p className="small" style={{ fontWeight: 600 }}>{i + 1}. {q.question_text}</p>
                  <button className="btn-link" onClick={() => setQuestionForm({ ...q, options: [...q.options] })}>Edit</button>
                </div>
                <div className="stack-s" style={{ marginTop: 8 }}>
                  {q.options.map((opt, idx) => (
                    <div key={idx} className="tiny" style={{ color: idx === q.correct_index ? '#2E7C5C' : 'var(--text-soft)', fontWeight: idx === q.correct_index ? 700 : 400 }}>
                      {idx === q.correct_index ? '✓ ' : '· '}{opt}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {questions && questions.length === 0 && <p className="small muted">No questions yet — add the first one below.</p>}
          </div>

          <div className="card-flat">
            <p className="small" style={{ fontWeight: 600, marginBottom: 12 }}>
              {questionForm.question_id ? 'Edit question' : 'Add a question'}
            </p>
            <div className="stack" style={{ gap: 12 }}>
              <div className="field">
                <label className="label">Question</label>
                <textarea className="textarea" value={questionForm.question_text}
                  onChange={(e) => setQuestionForm({ ...questionForm, question_text: e.target.value })} />
              </div>
              <div className="field">
                <label className="label">Options — tap the one that's correct</label>
                <div className="stack-s">
                  {questionForm.options.map((opt, idx) => (
                    <div className="row" key={idx} style={{ gap: 8 }}>
                      <button
                        type="button"
                        className={`cat-chip ${questionForm.correct_index === idx ? 'on' : ''}`}
                        style={{ width: 40, flexShrink: 0, justifyContent: 'center' }}
                        onClick={() => setQuestionForm({ ...questionForm, correct_index: idx })}
                        title="Mark as correct"
                      >✓</button>
                      <input
                        className="input grow" value={opt} placeholder={`Option ${idx + 1}`}
                        onChange={(e) => {
                          const options = [...questionForm.options]; options[idx] = e.target.value
                          setQuestionForm({ ...questionForm, options })
                        }}
                      />
                      {questionForm.options.length > 2 && (
                        <button className="entry-del" onClick={() => {
                          const options = questionForm.options.filter((_, i2) => i2 !== idx)
                          const correct_index = questionForm.correct_index >= options.length ? 0 : questionForm.correct_index
                          setQuestionForm({ ...questionForm, options, correct_index })
                        }}>✕</button>
                      )}
                    </div>
                  ))}
                </div>
                <button className="btn-link" style={{ marginTop: 8 }}
                  onClick={() => setQuestionForm({ ...questionForm, options: [...questionForm.options, ''] })}>
                  + Add another option
                </button>
              </div>
              {error && <div className="error-note">{error}</div>}
              <div className="row-between">
                {questionForm.question_id && <button className="btn-link" onClick={() => setQuestionForm(EMPTY_QUESTION)}>Cancel</button>}
                <button className="btn btn-sm btn-primary" onClick={saveQuestion} disabled={busy || !questionForm.question_text} style={{ marginLeft: 'auto' }}>
                  {questionForm.question_id ? 'Save question' : 'Add question'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <p className="tiny faint center" style={{ marginTop: 30 }}>
        © IMARA Wealth Trybe · Leading Ladies Foundation
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------

function Drilldown({ s, onClose }) {
  const cur = s.woman.currency || '₦'
  const arch = ARCHETYPES[s.woman.archetype]

  return (
    <div className="drill" onClick={onClose}>
      <div className="drill-panel" onClick={(e) => e.stopPropagation()}>
        <div className="drill-head">
          <div className="row-between" style={{ alignItems: 'flex-start' }}>
            <div>
              <div className="eyebrow" style={{ color: 'var(--peach)' }}>
                {arch ? `${arch.name} · ${arch.title}` : 'Archetype not yet chosen'}
              </div>
              <h2 className="display d-lg" style={{ marginTop: 6 }}>{s.woman.first_name.toLowerCase()}</h2>
              <p className="tiny" style={{ color: 'rgba(255,226,204,0.7)', marginTop: 6 }}>
                {s.woman.phone} · {s.woman.email} · joined {shortDate(s.woman.created_at?.slice(0, 10))}
              </p>
            </div>
            <button className="btn btn-sm btn-soft" onClick={onClose}>Close</button>
          </div>
          {arch && (
            <p style={{ fontSize: 13, color: 'var(--blush)', fontStyle: 'italic', marginTop: 14 }}>
              "{arch.mantra}"
            </p>
          )}
        </div>

        <div className="drill-body">
          <div className="metrics">
            <Metric k="Money in" v={money(s.totals.moneyIn, cur)} s="This month" tone="ink" />
            <Metric k="Money out" v={money(s.totals.moneyOut, cur)} s="This month" tone="ink" />
            <Metric
              k="The Gap" v={`${s.totals.gap >= 0 ? '+' : '−'}${money(Math.abs(s.totals.gap), cur)}`}
              s={s.totals.gap >= 0 ? 'Surplus' : 'Shortfall'} tone={s.totals.gap >= 0 ? 'good' : 'warn'}
            />
            <Metric k="Consistency" v={pct(s.consistency)} s={`${s.daysLogged} of ${s.daysElapsed} days`} tone={s.consistency >= 0.6 ? 'good' : 'warn'} />
          </div>

          {/* Split performance */}
          <div className="section">
            <div className="section-head"><span className="eyebrow">Her split this month</span></div>
            <div className="card">
              {s.split.moneyIn > 0 ? s.split.lines.map((l) => (
                <div key={l.key} style={{ padding: '8px 0' }}>
                  <div className="row-between" style={{ marginBottom: 5 }}>
                    <span className="small" style={{ fontWeight: 600 }}>
                      {l.label} <span className="split-pct">{l.pct}%</span>
                      {l.kind === 'build' && <span className="tag tag-unassigned" style={{ marginLeft: 6 }}>moved, not spent</span>}
                    </span>
                    <span className="small numeric muted">
                      <b style={{ color: 'var(--text)' }}>{money(l.actual, cur)}</b> / {money(l.target, cur)}
                      {l.onMap && <span className="tag tag-good" style={{ marginLeft: 8 }}>landed</span>}
                    </span>
                  </div>
                  <div className={`bar bar-${l.key}`}><span style={{ width: `${Math.min(100, l.progress * 100)}%` }} /></div>
                </div>
              )) : <p className="small muted">No income logged this month yet.</p>}
            </div>
          </div>

          {/* Gap history */}
          {s.gapHistory.length > 0 && (
            <div className="section">
              <div className="section-head"><span className="eyebrow">Her Gap, month by month</span></div>
              <div className="stack" style={{ gap: 8 }}>
                {s.gapHistory.map((h) => (
                  <div className="history-row" key={h.period.id}>
                    <div>
                      <div className="small" style={{ fontWeight: 600 }}>
                        Month {h.period.period_number}
                        <span className={`tag ${h.period.status === 'active' ? 'tag-good' : 'tag-unassigned'}`} style={{ marginLeft: 8 }}>
                          {h.period.status}
                        </span>
                      </div>
                      <div className="tiny muted">
                        {shortDate(h.period.start_date)} — {shortDate(h.period.end_date)} ·
                        in {money(h.moneyIn, cur)} · out {money(h.moneyOut, cur)}
                      </div>
                      {h.period.realisation && (
                        <div className="tiny" style={{ color: 'var(--clay)', fontStyle: 'italic', marginTop: 4 }}>
                          "{h.period.realisation}"
                        </div>
                      )}
                    </div>
                    <span className="numeric small" style={{ fontWeight: 700, color: h.gap >= 0 ? '#2E7C5C' : 'var(--clay)' }}>
                      {h.gap >= 0 ? '+' : '−'}{money(Math.abs(h.gap), cur)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Day by day */}
          <div className="section">
            <div className="section-head"><span className="eyebrow">Her log, day by day</span></div>
            <div className="card">
              <EntryList entries={s.currentEntries} currency={cur} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
