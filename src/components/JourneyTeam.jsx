import { useEffect, useState } from 'react'
import { rpc } from '../lib/supabase'
import { scoreColor } from './WeekBars'
import { nudgeLink } from '../lib/nudge'

/**
 * IMARA Journey scores for a mentor's team, or (mode "leader") for the Trybe
 * Leader's mentors. One bar per woman for this week, with her 6-week average
 * and what is missing this week.
 */
export default function JourneyTeam({ womanId, mode = 'mentor' }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let off = false
    const fn = mode === 'leader' ? 'imara_journey_leader' : 'imara_journey_team'
    const args = mode === 'leader' ? { p_leader_id: womanId } : { p_mentor_id: womanId }
    rpc(fn, args).then((d) => { if (!off) setData(d) }).catch((e) => { if (!off) setError(e.message) })
    return () => { off = true }
  }, [womanId, mode])

  if (error || !data || !data.week) return null
  const rows = (mode === 'leader' ? data.mentors : data.members) || []
  if (!rows.length) return null
  const avg = (() => {
    const s = rows.map((r) => r.sm?.score).filter((x) => x != null)
    return s.length ? Math.round(s.reduce((a, b) => a + b, 0) / s.length) : null
  })()

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div className="row-between" style={{ alignItems: 'baseline' }}>
        <span className="tiny muted" style={{ textTransform: 'uppercase', letterSpacing: '.12em', fontWeight: 700 }}>
          IMARA Journey · week {data.week}
        </span>
        {avg != null && <span className="tiny muted">{mode === 'leader' ? 'mentors' : 'team'} average {avg}%</span>}
      </div>
      <div style={{ marginTop: 6 }}>
        {rows.map((r, i) => {
          const s = r.sm?.score
          const flags = r.sm?.flags || []
          return (
            <div key={r.woman_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: i ? '1px solid var(--line)' : 0 }}>
              <span style={{ minWidth: 0 }}>
                <b style={{ fontSize: 13.5 }}>{r.first_name}</b>
                <small style={{ display: 'block', color: 'var(--text-soft)', fontSize: 11 }}>
                  {mode === 'leader' ? `Team of ${r.team_size} · ` : ''}6-week avg {r.sm?.average != null ? `${r.sm.average}%` : '–'}
                  {flags.length ? ` · missing: ${flags.join(', ').toLowerCase()}` : ''}
                </small>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 'none' }}>
                <span style={{ width: 70, height: 6, borderRadius: 9, background: 'var(--surface-2)', overflow: 'hidden' }}>
                  <i style={{ display: 'block', height: '100%', width: `${s || 0}%`, background: scoreColor(s) }} />
                </span>
                <b style={{ fontSize: 13, width: 36, textAlign: 'right' }}>{s != null ? `${s}%` : '–'}</b>
                {s != null && s < 40 && nudgeLink(r.phone, r.first_name, flags) && (
                  <a href={nudgeLink(r.phone, r.first_name, flags)} target="_blank" rel="noopener noreferrer"
                     style={{ fontSize: 11, fontWeight: 700, color: 'var(--clay)', textDecoration: 'none', border: '1px solid var(--clay)', borderRadius: 99, padding: '3px 9px' }}>
                    Nudge
                  </a>
                )}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
