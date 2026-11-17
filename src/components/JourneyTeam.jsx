import { useEffect, useMemo, useState } from 'react'
import { rpc } from '../lib/supabase'
import { nudgeLink } from '../lib/nudge'

/**
 * IMARA Journey, week by week, for a mentor's team (mode "mentor") or for the
 * Trybe Leader's mentors (mode "leader"). Every row is lowest score first.
 * Tap a name or a week to see the five parts of that week. In leader mode,
 * tap a mentor to open her team underneath.
 */
const LOW = 50     // below this she is red and needs a nudge
const GOOD = 70    // this and above is green
const DROP = 20    // a fall of this many points since last week is flagged

const GRID = { display: 'grid', gridTemplateColumns: 'minmax(64px,1fr) repeat(6, 27px) 33px', gap: 3, alignItems: 'center' }

const box = (n, picked, clickable) => ({
  height: 27, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 11.5, fontWeight: n == null ? 400 : 700, cursor: clickable && n != null ? 'pointer' : 'default',
  background: n == null ? 'rgba(128,128,128,.10)' : n >= GOOD ? '#DDF3E8' : n >= LOW ? '#FCEBD3' : '#FFD9DF',
  color: n == null ? 'rgba(128,128,128,.8)' : n >= GOOD ? '#1f7a55' : n >= LOW ? '#8a5a12' : 'var(--wine)',
  outline: picked ? '2px solid var(--maroon-900, #4C050B)' : 'none',
})

const wk = (r, i) => {
  const w = (r.weeks || [])[i]
  return w && w.score != null ? Number(w.score) : null
}
const latest = (r, cur) => {
  for (let i = Math.min(cur, 6) - 1; i >= 0; i--) if (wk(r, i) != null) return i
  return -1
}
const latestScore = (r, cur) => { const i = latest(r, cur); return i < 0 ? null : wk(r, i) }
const dropping = (r, cur) => {
  const i = latest(r, cur)
  if (i < 1) return false
  const a = wk(r, i), b = wk(r, i - 1)
  return a != null && b != null && b - a >= DROP
}
const mean = (vals) => {
  const v = vals.filter((x) => x != null)
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null
}
const avgOf = (r) => (r.sm?.average == null ? null : Number(r.sm.average))
const lowestFirst = (cur) => (a, b) =>
  (latestScore(a, cur) ?? 999) - (latestScore(b, cur) ?? 999) || String(a.first_name).localeCompare(b.first_name)

function Head() {
  return (
    <div style={{ ...GRID, marginBottom: 3 }}>
      <span />
      {[1, 2, 3, 4, 5, 6].map((w) => <span key={w} className="tiny muted" style={{ textAlign: 'center' }}>W{w}</span>)}
      <span className="tiny muted" style={{ textAlign: 'center' }}>Avg</span>
    </div>
  )
}

function AvgRow({ label, list, cur }) {
  const per = [0, 1, 2, 3, 4, 5].map((i) => (i < cur ? mean(list.map((r) => wk(r, i))) : null))
  const all = mean(list.map((r) => avgOf(r)))
  return (
    <div style={{ ...GRID, marginBottom: 6, paddingBottom: 6, borderBottom: '1px solid var(--line)' }}>
      <b style={{ fontSize: 12.5 }}>{label}</b>
      {per.map((n, i) => <span key={i} style={box(n, false, false)}>{n == null ? '–' : n}</span>)}
      <span style={box(all, false, false)}>{all == null ? '–' : all}</span>
    </div>
  )
}

function Row({ r, cur, picked, pickWeek, onPick, sub, onName, chevron }) {
  const down = dropping(r, cur)
  const open = picked != null
  const w = open ? (r.weeks || [])[picked] : null
  const s = latestScore(r, cur)
  const href = s != null && s < LOW ? nudgeLink(r.phone, r.first_name, r.sm?.flags) : ''
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ ...GRID, background: open ? 'rgba(128,128,128,.10)' : 'transparent', borderRadius: 8, padding: '2px 0' }}>
        <span onClick={onName} style={{ fontSize: 13, cursor: 'pointer', minWidth: 0 }}>
          <b style={{ fontWeight: 600 }}>{r.first_name}</b>
          {down && <span style={{ color: 'var(--wine)', fontSize: 11 }}> ▼</span>}
          {chevron}
          {sub && <small style={{ display: 'block', color: 'var(--text-soft)', fontSize: 10.5, lineHeight: 1.3 }}>{sub}</small>}
        </span>
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const n = i < cur ? wk(r, i) : null
          return <span key={i} style={box(n, picked === i, true)} onClick={() => { if (n != null) onPick(picked === i ? null : i) }}>{n == null ? '–' : n}</span>
        })}
        <span style={box(avgOf(r), false, false)}>{avgOf(r) == null ? '–' : avgOf(r)}</span>
      </div>
      {open && (
        <div style={{ background: 'rgba(128,128,128,.10)', borderRadius: 8, padding: '8px 10px', margin: '4px 0 6px', fontSize: 12, lineHeight: 1.7 }}>
          {w && w.score != null ? (
            <>
              <b>{r.first_name}, week {w.week}: {w.score}%</b>
              {(w.items || []).filter((it) => it.applicable).map((it) => (
                <div key={it.key}>{it.label}: {it.detail} <span style={{ opacity: 0.55 }}>({it.points}/{it.max})</span></div>
              ))}
              {(w.items || []).filter((it) => !it.applicable).map((it) => (
                <div key={it.key} style={{ opacity: 0.55 }}>{it.label}: {it.detail}</div>
              ))}
            </>
          ) : <span className="muted">No score for this week yet.</span>}
          {href && (
            <div style={{ marginTop: 6 }}>
              <a href={href} target="_blank" rel="noopener noreferrer"
                 style={{ fontSize: 11, fontWeight: 700, color: 'var(--clay)', textDecoration: 'none', border: '1px solid var(--clay)', borderRadius: 99, padding: '3px 10px' }}>
                Nudge on WhatsApp
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function JourneyTeam({ womanId, mode = 'mentor' }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [pick, setPick] = useState(null)        // { id, week }
  const [openMentor, setOpenMentor] = useState(null)

  useEffect(() => {
    let off = false
    const fn = mode === 'leader' ? 'imara_journey_leader_weeks' : 'imara_journey_team_weeks'
    const args = mode === 'leader' ? { p_leader_id: womanId } : { p_mentor_id: womanId }
    rpc(fn, args).then((d) => { if (!off) setData(d) }).catch((e) => { if (!off) setError(e.message) })
    return () => { off = true }
  }, [womanId, mode])

  const cur = data?.week || 0
  const rows = useMemo(() => {
    const list = (mode === 'leader' ? data?.mentors : data?.members) || []
    return [...list].sort(lowestFirst(cur))
  }, [data, mode, cur])

  if (error || !data || !cur || !rows.length) return null

  const pickedFor = (id) => (pick && pick.id === id ? pick.week : null)
  const toggle = (id, r) => (pick && pick.id === id ? setPick(null) : setPick({ id, week: Math.max(latest(r, cur), 0) }))
  const mentorTeam = (m) => [...(m.team || [])].sort(lowestFirst(cur))
  const low = rows.filter((r) => (latestScore(r, cur) ?? 999) < LOW || dropping(r, cur)).length

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div className="row-between" style={{ alignItems: 'baseline' }}>
        <span className="tiny muted" style={{ textTransform: 'uppercase', letterSpacing: '.12em', fontWeight: 700 }}>
          IMARA Journey · week {cur} of 6
        </span>
        <span className="tiny muted">{low > 0 ? `${low} need follow-up` : 'all on track'}</span>
      </div>
      <p className="tiny muted" style={{ margin: '4px 0 10px' }}>
        Lowest scores first. Green {GOOD}+, amber {LOW} to {GOOD - 1}, red under {LOW}. ▼ means down {DROP}+ since last week. Tap a name or a box to see why.
        {mode === 'leader' ? ' Tap an arrow to open a mentor’s team.' : ''}
      </p>
      <Head />
      <AvgRow label={mode === 'leader' ? 'Mentors average' : 'Team average'} list={rows} cur={cur} />
      {rows.map((r) => {
        const id = (mode === 'leader' ? 'm-' : '') + r.woman_id
        const team = mode === 'leader' ? mentorTeam(r) : []
        const isOpen = openMentor === r.woman_id
        const teamAvg = mode === 'leader' ? mean(team.map((t) => latestScore(t, cur))) : null
        return (
          <div key={r.woman_id}>
            <Row
              r={r} cur={cur} picked={pickedFor(id)} pickWeek
              onPick={(i) => setPick(i == null ? null : { id, week: i })}
              onName={() => toggle(id, r)}
              sub={mode === 'leader' ? `team of ${team.length}${teamAvg != null ? ` · avg ${teamAvg}` : ''}` : null}
              chevron={mode === 'leader' ? (
                <span onClick={(e) => { e.stopPropagation(); setOpenMentor(isOpen ? null : r.woman_id) }}
                      style={{ marginLeft: 6, padding: '0 6px', opacity: 0.7, cursor: 'pointer' }}>{isOpen ? '▲' : '▼'}</span>
              ) : null}
            />
            {mode === 'leader' && isOpen && (
              <div style={{ margin: '2px 0 10px 8px', paddingLeft: 8, borderLeft: '2px solid var(--line)' }}>
                {team.length === 0 ? <p className="tiny muted">No women on her team with active access.</p> : (
                  <>
                    <Head />
                    <AvgRow label="Her team" list={team} cur={cur} />
                    {team.map((t) => {
                      const tid = `t-${r.woman_id}-${t.woman_id}`
                      return (
                        <Row key={t.woman_id} r={t} cur={cur} picked={pickedFor(tid)}
                             onPick={(i) => setPick(i == null ? null : { id: tid, week: i })}
                             onName={() => toggle(tid, t)} />
                      )
                    })}
                  </>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
