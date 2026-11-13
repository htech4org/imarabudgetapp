import { useMemo, useState } from 'react'
import { nudgeLink, reportNudgeLink } from '../lib/nudge'

const LOW = 40
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const num = (v) => Number(v) || 0
const pctOf = (a, b) => (b > 0 ? Math.round((a / b) * 100) : null)
const col = (n) => (n == null ? 'inherit' : n >= 70 ? '#1f7a55' : n >= LOW ? '#9a5d00' : 'var(--wine)')

/**
 * Admin → Mentors → Trybe Leader.
 * One block per Trybe Leader: her own month, then each mentor assigned to her,
 * showing the mentor herself and her team. Mentors with no Trybe Leader are
 * listed at the bottom so none drop out of sight.
 *
 *   data     imara_admin_trybe_tab result
 *   journey  rows of imara_admin_journey (everyone with access)
 */
export default function TrybeLeaderAdmin({ data, journey, busy, onAssign, onSetLeader, onRemoveMentor }) {
  const [open, setOpen] = useState({})
  const [pick, setPick] = useState({})
  const [newLeader, setNewLeader] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const jr = useMemo(() => {
    const m = new Map()
    ;(journey || []).forEach((r) => m.set(r.woman_id, r))
    return m
  }, [journey])
  const teamOf = (id) => (journey || []).filter((r) => r.mentor_id === id && r.woman_id !== id)
    .sort((a, b) => (scoreOf(a) ?? 999) - (scoreOf(b) ?? 999) || String(a.first_name).localeCompare(b.first_name))
  const scoreOf = (r) => (r?.sm?.score == null ? null : Number(r.sm.score))

  if (!data) return <p className="small muted">Loading…</p>
  const leaders = data.leaders || []
  const unassigned = data.unassigned || []
  const candidates = data.candidates || []

  const run = async (fn, ok) => {
    setErr(''); setMsg('')
    try { await fn(); if (ok) setMsg(ok) } catch (e) { setErr(e.message) }
  }
  const sure = (text) => window.confirm(text)

  const WaBtn = ({ href }) => (href ? (
    <a className="am-wa" href={href} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>WhatsApp</a>
  ) : null)

  const Pill = ({ tone, children }) => (
    <span className={`am-pill ${tone}`}>{children}</span>
  )

  const Mini = ({ k, v, c }) => (
    <div><span style={{ display: 'block', fontSize: 10.5, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{k}</span><b style={{ fontSize: 13, color: c }}>{v}</b></div>
  )

  function MentorRow({ m, leader }) {
    const j = jr.get(m.mentor_id)
    const own = m.own || {}
    const att = m.att || {}
    const tm = m.team || {}
    const sc = scoreOf(j)
    const team = teamOf(m.mentor_id)
    const teamScores = team.map(scoreOf).filter((x) => x != null)
    const tAvg = teamScores.length ? Math.round(teamScores.reduce((a, b) => a + b, 0) / teamScores.length) : null
    const low = teamScores.filter((x) => x < LOW).length
    const missed = num(m.missed_weeks)
    const isOpen = !!open[m.mentor_id]
    const href = missed > 0 ? reportNudgeLink(m.phone, m.first_name, missed)
      : (sc != null && sc < LOW ? nudgeLink(m.phone, m.first_name, j?.sm?.flags) : '')
    return (
      <div style={{ borderTop: '1px solid var(--line)', padding: '12px 0' }}>
        <div onClick={() => setOpen({ ...open, [m.mentor_id]: !isOpen })} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', cursor: 'pointer' }}>
          <b style={{ flex: 1, minWidth: 100, fontSize: 14 }}>{m.first_name}</b>
          <Pill tone={missed === 0 ? 'g' : missed > 1 ? 'r' : 'o'}>{missed === 0 ? 'reports up to date' : `${missed} report${missed > 1 ? 's' : ''} missed`}</Pill>
          <Pill tone={sc == null ? 'n' : sc >= 70 ? 'g' : sc >= LOW ? 'o' : 'r'}>{sc == null ? 'no score' : `own journey ${sc}%`}</Pill>
          <WaBtn href={href} />
          <span style={{ opacity: 0.6 }}>{isOpen ? '▲' : '▼'}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', gap: 8, marginTop: 8 }}>
          <div className="am-box">
            <span className="am-lbl">{m.first_name} herself</span>
            <div className="am-mini">
              <Mini k="Reading" v={`${num(own.reading_days)} day${num(own.reading_days) === 1 ? '' : 's'}`} />
              <Mini k="Invested" v={own.invested ? 'yes' : 'no'} />
              <Mini k="Circle" v={`${num(own.classes_came)}/${num(own.classes_held)}`} />
              <Mini k="Trybe mtg" v={`${num(att.meeting_present)}/${num(att.meeting_held)}`} />
            </div>
          </div>
          <div className="am-box">
            <span className="am-lbl">Her team of {num(tm.team_active) || team.length}</span>
            <div className="am-mini">
              <Mini k="Reading" v={pctOf(num(tm.reading), num(tm.team_active)) == null ? '–' : `${pctOf(num(tm.reading), num(tm.team_active))}%`} />
              <Mini k="Invested" v={pctOf(num(tm.invested), num(tm.team_active)) == null ? '–' : `${pctOf(num(tm.invested), num(tm.team_active))}%`} />
              <Mini k="Journey" v={tAvg == null ? '–' : `${tAvg}%`} c={col(tAvg)} />
              <Mini k={`Below ${LOW}`} v={low} c={low > 0 ? 'var(--wine)' : undefined} />
            </div>
          </div>
        </div>
        {isOpen && (
          <div style={{ marginTop: 10 }}>
            {team.length === 0 && <p className="tiny muted">No women on her team with active access.</p>}
            {team.map((r) => {
              const s = scoreOf(r)
              const flags = r.sm?.flags || []
              return (
                <div key={r.woman_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: '1px solid var(--line)', fontSize: 12.5, flexWrap: 'wrap' }}>
                  <b style={{ flex: 1, minWidth: 90 }}>{r.first_name}</b>
                  <b style={{ width: 44, color: col(s) }}>{s == null ? '—' : `${s}%`}</b>
                  <span style={{ flex: 2, minWidth: 150, opacity: 0.75 }}>
                    avg {r.sm?.average == null ? '–' : `${r.sm.average}%`}{flags.length ? ` · missing: ${flags.join(', ').toLowerCase()}` : ''}
                  </span>
                  {s != null && s < LOW && <WaBtn href={nudgeLink(r.phone, r.first_name, flags)} />}
                </div>
              )
            })}
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 10, alignItems: 'center' }}>
              <span className="tiny muted">Move {m.first_name} to:</span>
              <select className="input" style={{ maxWidth: 180, padding: '6px 10px' }} value={pick[`mv${m.mentor_id}`] || ''} onChange={(e) => setPick({ ...pick, [`mv${m.mentor_id}`]: e.target.value })}>
                <option value="">Choose…</option>
                {leaders.filter((x) => x.id !== leader.id).map((x) => <option key={x.id} value={x.id}>{x.first_name}</option>)}
                <option value="none">No Trybe Leader</option>
              </select>
              <button className="btn-sm btn-soft" disabled={busy || !pick[`mv${m.mentor_id}`]}
                onClick={() => run(() => onAssign(m.mentor_id, pick[`mv${m.mentor_id}`] === 'none' ? null : pick[`mv${m.mentor_id}`]), `${m.first_name} moved.`)}>Move</button>
              <button className="btn-link" disabled={busy} style={{ color: 'var(--wine)' }}
                onClick={() => sure(`Remove ${m.first_name} as a mentor? She stays in IMARA as a member.`) && run(() => onRemoveMentor(m.mentor_id), `${m.first_name} is no longer a mentor.`)}>
                Remove as mentor
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  function LeaderBlock({ l }) {
    const ms = [...(l.overview?.mentors || [])]
    const own = l.own || {}
    const upToDate = ms.filter((m) => num(m.missed_weeks) === 0).length
    const missed2 = ms.filter((m) => num(m.missed_weeks) >= 2).length
    const meetRec = ms.reduce((n, m) => n + num(m.att?.meeting_recorded), 0)
    const meetPres = ms.reduce((n, m) => n + num(m.att?.meeting_present), 0)
    const meetPct = pctOf(meetPres, meetRec)
    const scores = ms.map((m) => scoreOf(jr.get(m.mentor_id))).filter((x) => x != null)
    const jAvg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null
    ms.sort((a, b) => num(b.missed_weeks) - num(a.missed_weeks)
      || (scoreOf(jr.get(a.mentor_id)) ?? 999) - (scoreOf(jr.get(b.mentor_id)) ?? 999)
      || String(a.first_name).localeCompare(b.first_name))
    const tile = (k, v, warn) => (
      <div className="am-lt"><span>{k}</span><b style={warn ? { color: '#F5A58B' } : undefined}>{v}</b></div>
    )
    return (
      <div className="stack" style={{ gap: 12 }}>
        <div className="am-leader">
          <div className="row-between" style={{ flexWrap: 'wrap', gap: 10, alignItems: 'flex-start' }}>
            <div>
              <span className="am-lead-eb">TRYBE LEADER</span>
              <b className="am-lead-name">{l.first_name}</b>
              <small>{ms.length} mentor{ms.length === 1 ? '' : 's'} assigned{l.meeting_weekday != null ? ` · Trybe meeting ${WEEKDAYS[l.meeting_weekday]}s` : ''}</small>
            </div>
            <div className="am-lead-own">
              Her own month: reading {num(own.reading_days)} day{num(own.reading_days) === 1 ? '' : 's'} · invested {own.invested ? 'yes' : 'not yet'} · Circle {num(own.classes_came)}/{num(own.classes_held)}
            </div>
          </div>
          {l.overview ? (
            <div className="am-lt-grid">
              {tile('Reports up to date', `${upToDate} of ${ms.length}`)}
              {tile('Trybe meeting', meetPct == null ? '–' : `${meetPct}%`)}
              {tile("Mentors' Journey avg", jAvg == null ? '–' : `${jAvg}%`)}
              {tile('Missed 2+ reports', missed2, missed2 > 0)}
            </div>
          ) : (
            <p className="tiny" style={{ marginTop: 10, color: '#E8B9A0' }}>Her mentor numbers can't load right now{l.error ? ` (${l.error})` : ''}. Check that her account has access.</p>
          )}
        </div>
        <div className="card">
          <div className="row-between" style={{ flexWrap: 'wrap', gap: 6 }}>
            <span className="small" style={{ fontWeight: 700 }}>{l.first_name}'s mentors</span>
            <span className="tiny muted">Those who need a nudge first. Tap a mentor to open her team.</span>
          </div>
          {ms.length === 0 && <p className="small muted" style={{ marginTop: 10 }}>No mentors assigned to her yet. Assign them from "Mentors without a Trybe Leader" below.</p>}
          {ms.map((m) => <MentorRow key={m.mentor_id} m={m} leader={l} />)}
          <div style={{ marginTop: 10 }}>
            <button className="btn-link" disabled={busy} style={{ color: 'var(--wine)' }}
              onClick={() => sure(`Remove ${l.first_name} as a Trybe Leader?`) && run(() => onSetLeader(l.id, false), `${l.first_name} is no longer a Trybe Leader.`)}>
              Remove {l.first_name} as Trybe Leader
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="stack" style={{ gap: 18 }}>
      {err && <div className="error-note">{err}</div>}
      {msg && <p className="small" style={{ color: '#1f7a55' }}>{msg}</p>}

      {leaders.length === 0 && <div className="empty-state"><p className="small muted">No Trybe Leader yet. Add one below.</p></div>}
      {leaders.map((l) => <LeaderBlock key={l.id} l={l} />)}

      <div className="card">
        <span className="small" style={{ fontWeight: 700 }}>Mentors without a Trybe Leader · {unassigned.length}</span>
        <p className="tiny muted" style={{ margin: '4px 0 8px' }}>
          These mentors don't report to anyone yet, so they are not in any leader's list above. Assign each one, or remove her as a mentor if she isn't one.
        </p>
        {unassigned.length === 0 && <p className="small muted">Every mentor has a Trybe Leader.</p>}
        {leaders.length === 1 && unassigned.length > 1 && (
          <button className="btn-sm btn-soft" disabled={busy} style={{ marginBottom: 8 }}
            onClick={() => sure(`Assign all ${unassigned.length} mentors below to ${leaders[0].first_name}? Remove anyone who isn't a mentor first.`)
              && run(async () => { for (const u of unassigned) await onAssign(u.woman_id, leaders[0].id) }, 'Assigned.')}>
            Assign all {unassigned.length} to {leaders[0].first_name}
          </button>
        )}
        {unassigned.map((u) => (
          <div key={u.woman_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderTop: '1px solid var(--line)', flexWrap: 'wrap', fontSize: 13 }}>
            <b style={{ flex: 1, minWidth: 100 }}>{u.first_name}</b>
            <span className="tiny muted">team of {num(u.team_size)}</span>
            <select className="input" style={{ maxWidth: 170, padding: '6px 10px' }} value={pick[`u${u.woman_id}`] || ''} onChange={(e) => setPick({ ...pick, [`u${u.woman_id}`]: e.target.value })}>
              <option value="">Trybe Leader…</option>
              {leaders.map((x) => <option key={x.id} value={x.id}>{x.first_name}</option>)}
            </select>
            <button className="btn-sm btn-soft" disabled={busy || !pick[`u${u.woman_id}`]}
              onClick={() => run(() => onAssign(u.woman_id, pick[`u${u.woman_id}`]), `${u.first_name} assigned.`)}>Assign</button>
            <button className="btn-link" disabled={busy} style={{ color: 'var(--wine)' }}
              onClick={() => sure(`Remove ${u.first_name} as a mentor? She stays in IMARA as a member.`) && run(() => onRemoveMentor(u.woman_id), `${u.first_name} is no longer a mentor.`)}>
              Remove as mentor
            </button>
          </div>
        ))}
      </div>

      <div className="card">
        <span className="small" style={{ fontWeight: 700 }}>Add a Trybe Leader</span>
        <p className="tiny muted" style={{ margin: '4px 0 8px' }}>Pick one of your mentors. Her mentors are then assigned to her above.</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <select className="input" style={{ maxWidth: 220 }} value={newLeader} onChange={(e) => setNewLeader(e.target.value)}>
            <option value="">Choose a mentor…</option>
            {candidates.map((c) => <option key={c.woman_id} value={c.woman_id}>{c.first_name}</option>)}
          </select>
          <button className="btn-sm btn-soft" disabled={busy || !newLeader}
            onClick={() => sure('Make her a Trybe Leader? She will no longer report to another Trybe Leader.') && run(async () => { await onSetLeader(newLeader, true); setNewLeader('') }, 'Trybe Leader added.')}>
            Make Trybe Leader
          </button>
        </div>
      </div>
    </div>
  )
}
