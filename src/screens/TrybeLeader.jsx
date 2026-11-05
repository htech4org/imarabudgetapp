import { useEffect, useMemo, useState } from 'react'
import { rpc } from '../lib/supabase'
import { CREED } from '../lib/constants'
import { numbersLine } from '../components/LeaderReport'

// The Trybe Leader's view of every mentor: her team's numbers, her own
// tracking, whether Mastermind meetings are recorded, and whether weekly and
// monthly reports are in. Tap a mentor to read what she has written.

const pctOf = (a, b) => (b > 0 ? Math.round((a / b) * 100) : null)
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

const shortDay = (iso) =>
  new Date(`${String(iso).slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

const monthName = (iso) => `${MONTHS[Number(String(iso).slice(5, 7)) - 1]} ${String(iso).slice(0, 4)}`

// What is worrying about a mentor. Each one is a plain sentence.
function flagsFor(m) {
  const f = []
  if (m.access_status !== 'active') f.push('Her own access has ended')
  if (m.last_week_counts && !m.last_week_in) f.push("Last week's report is missing")
  if (m.missed_weeks >= 2) f.push(`${m.missed_weeks} weekly reports missed in the last 4 weeks`)
  if (m.team.mm_unrecorded > 0) f.push(`${m.team.mm_unrecorded} Mastermind meeting${m.team.mm_unrecorded > 1 ? 's' : ''} not recorded`)
  if (m.own.reading_days === 0) f.push('She has not read this month')
  if (m.own.classes_held > 0 && m.own.classes_came === 0) f.push('She has not joined a Tuesday class this month')
  if (m.team.team_active > 0 && m.team.reading === 0) f.push('No one on her team has read this month')
  return f
}

function tone(n) { return n === 0 ? 'good' : n <= 2 ? 'warn' : 'bad' }
const TONE_LABEL = { good: 'on track', warn: 'needs a nudge', bad: 'quiet' }

export default function TrybeLeader({ womanId, onError, onSwitchApp, onSignOut }) {
  const [data, setData] = useState(null)
  const [openId, setOpenId] = useState(null)
  const [detail, setDetail] = useState(null)

  useEffect(() => {
    rpc('imara_leader_overview', { p_leader_id: womanId }).then(setData).catch((e) => onError(e.message))
    // eslint-disable-next-line
  }, [womanId])

  const rows = useMemo(() => {
    if (!data) return []
    return data.mentors.map((m) => ({ m, flags: flagsFor(m) })).sort((a, b) => b.flags.length - a.flags.length || a.m.first_name.localeCompare(b.m.first_name))
  }, [data])

  const open = async (m) => {
    setOpenId(m.mentor_id); setDetail(null)
    try { setDetail(await rpc('imara_leader_mentor_reports', { p_leader_id: womanId, p_mentor_id: m.mentor_id })) }
    catch (e) { onError(e.message) }
  }

  if (!data) {
    return <div className="loading-wrap"><div className="spinner" /><p className="small muted">Opening your mentors…</p></div>
  }

  const behind = rows.filter((r) => r.flags.length > 0).length
  const weekIn = rows.filter((r) => r.m.week_in).length

  return (
    <div className="shell fade-in">
      <div className="topbar">
        <div className="eyebrow" style={{ color: 'var(--peach)' }}>Trybe Leader</div>
        <h1 className="display d-lg" style={{ marginTop: 5 }}>my mentors</h1>
        <p className="tiny" style={{ color: 'rgba(255,226,204,0.66)', marginTop: 8 }}>
          {monthName(data.month)} · {rows.length} mentor{rows.length === 1 ? '' : 's'} · {behind} need{behind === 1 ? 's' : ''} a look
        </p>
      </div>

      <div className="pad" style={{ paddingTop: 20 }}>
        <div className="card" style={{ padding: 14, marginBottom: 12 }}>
          <div className="small" style={{ fontWeight: 700 }}>This week's reports: {weekIn} of {rows.length} in</div>
          <p className="tiny muted" style={{ marginTop: 4 }}>
            Week of {shortDay(data.week_start)}. Due Sunday 10pm. Monthly reports are due {shortDay(data.month_due_on)}.
          </p>
        </div>

        {rows.length === 0 && (
          <div className="empty-state"><p className="small muted">No mentors yet. Mark women as mentors in Admin.</p></div>
        )}

        <div className="stack" style={{ gap: 10 }}>
          {rows.map(({ m, flags }) => {
            const t = tone(flags.length)
            const mm = pctOf(m.team.mm_att, m.team.mm_rec)
            const isOpen = openId === m.mentor_id
            return (
              <div className="card" key={m.mentor_id} style={{ padding: 14 }}>
                <button type="button" onClick={() => (isOpen ? setOpenId(null) : open(m))}
                  style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%' }}>
                  <div className="row-between" style={{ gap: 8 }}>
                    <span className="small" style={{ fontWeight: 700 }}>{m.first_name}</span>
                    <span className={`tag ${t === 'good' ? 'tag-good' : 'tag-unassigned'}`}
                      style={t === 'bad' ? { background: '#FBE3E6', color: '#A11D44' } : t === 'warn' ? { background: '#FFF1D6', color: '#B2730A' } : undefined}>
                      {TONE_LABEL[t]}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginTop: 10, textAlign: 'center' }}>
                    <Cell v={`${m.team.reading}/${m.team.team_active}`} k="reading" />
                    <Cell v={`${m.team.invested}/${m.team.team_active}`} k="invested" />
                    <Cell v={mm == null ? '–' : `${mm}%`} k="Mastermind" />
                    <Cell v={m.week_in ? 'In' : 'Due'} k="weekly" good={m.week_in} />
                  </div>
                  <p className="tiny muted" style={{ marginTop: 10, lineHeight: 1.7 }}>
                    Her own: read {m.own.reading_days} day{m.own.reading_days === 1 ? '' : 's'} ·
                    {m.own.invested ? ' invested' : ' not invested'} ·
                    came to {m.own.classes_came} of {m.own.classes_held} class{m.own.classes_held === 1 ? '' : 'es'}
                    {' '}· month report {m.month_in ? 'in' : 'not yet'}
                  </p>
                  {flags.length > 0 && (
                    <ul className="tiny" style={{ margin: '8px 0 0 16px', lineHeight: 1.7, color: '#A11D44' }}>
                      {flags.map((x) => <li key={x}>{x}</li>)}
                    </ul>
                  )}
                </button>

                {isOpen && (
                  <div style={{ marginTop: 12, borderTop: '1px solid rgba(76,5,11,.1)', paddingTop: 12 }}>
                    {!detail ? <p className="tiny muted">Loading her reports…</p>
                      : detail.reports.length === 0 ? <p className="tiny muted">No reports yet.</p>
                      : detail.reports.map((r) => (
                        <div key={`${r.period_type}${r.period_start}`} style={{ marginBottom: 14 }}>
                          <div className="small" style={{ fontWeight: 600 }}>
                            {r.period_type === 'week' ? `Week of ${shortDay(r.period_start)}` : monthName(r.period_start)}
                            <span className="tiny muted" style={{ fontWeight: 400 }}> · {r.on_time ? 'on time' : 'late'}</span>
                          </div>
                          {r.snapshot?.team && <p className="tiny muted" style={{ marginTop: 2 }}>{numbersLine(r.snapshot.team)}</p>}
                          <Para k="Went well" v={r.went_well} />
                          <Para k="Who needs help" v={r.needs_help} />
                          <Para k="Needs from you" v={r.needs_from_leader} />
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )
          })}
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

function Cell({ v, k, good }) {
  return (
    <div style={{ background: 'var(--surface-2)', borderRadius: 9, padding: '6px 2px' }}>
      <b style={{ display: 'block', fontSize: 13, color: good === false ? '#B2730A' : undefined }}>{v}</b>
      <small style={{ fontSize: 9, opacity: 0.65 }}>{k}</small>
    </div>
  )
}

function Para({ k, v }) {
  if (!v) return null
  return (
    <p className="tiny" style={{ marginTop: 6, lineHeight: 1.7 }}>
      <b>{k}:</b> {v}
    </p>
  )
}
