import { useEffect, useState } from 'react'
import { rpc } from '../lib/supabase'

const proper = (s) =>
  String(s || '').trim().split(/(\s+|-)/).map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w)).join('')

/**
 * THE IMARA JOURNEY LEADERBOARD. Top 5 teams and top 10 Imarians, week by week.
 * Shown on Home, below everything. The database hides it for free-tier women
 * and a week after the Journey ends; this component then renders nothing.
 * Nobody sees where she (or her team) sits unless she is in the list.
 */
export default function JourneyLeaderboard({ womanId }) {
  const [data, setData] = useState(null)
  const [week, setWeek] = useState(null)
  const [view, setView] = useState('teams')   // 'teams' | 'women'
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!womanId) return undefined
    let off = false
    setBusy(true)
    rpc('imara_journey_leaderboard', { p_woman_id: womanId, p_week: week })
      .then((d) => { if (!off) setData(d) })
      .catch(() => { if (!off) setData(null) })
      .finally(() => { if (!off) setBusy(false) })
    return () => { off = true }
  }, [womanId, week])

  if (!data || !data.visible) return null
  const teams = data.teams || []
  const women = data.women || []
  if (!teams.length && !women.length && !(data.weeks || []).length) return null

  const medal = (rk) => (rk === 1 ? 'g' : rk === 2 ? 'c' : rk === 3 ? 'w' : '')
  const maxScore = (list) => Math.max(100, ...list.map((x) => Number(x.score) || 0))

  return (
    <section className="jlb">
      <style>{CSS}</style>
      <h2 className="jlb-t">THE IMARA JOURNEY LEADERBOARD</h2>
      <p className="jlb-s">Final every Monday. Score is out of 100.</p>

      <div className="jlb-chips">
        {(data.weeks || []).map((w) => (
          <button key={w.week} type="button"
            className={`jlb-chip${data.week === w.week ? ' on' : ''}${w.status === 'current' ? ' dash' : ''}`}
            onClick={() => setWeek(w.week)}>
            Week {w.week}{w.status === 'current' ? ' so far' : ''}
          </button>
        ))}
      </div>

      <div className="jlb-seg">
        <button type="button" className={view === 'teams' ? 'a' : ''} onClick={() => setView('teams')}>Top teams</button>
        <button type="button" className={view === 'women' ? 'a' : ''} onClick={() => setView('women')}>Top Imarians</button>
      </div>

      <div className="jlb-body" style={{ opacity: busy ? 0.6 : 1 }}>
        {view === 'teams' && (teams.length === 0
          ? <p className="jlb-empty">No teams to rank for this week yet.</p>
          : teams.map((t) => (
            <div key={t.head_name} className={`jlb-r${t.mine ? ' me' : ''}`}>
              <span className={`jlb-m ${medal(t.rank)}`}>{t.rank}</span>
              <div>
                <b>{t.mine ? `Your team: ${proper(t.head_name)}'s team` : `${proper(t.head_name)}'s team`}</b>
                {t.most_improved && <span className="jlb-tag">most improved</span>}
                <span className="jlb-bar"><i style={{ width: `${(Number(t.score) / maxScore(teams)) * 100}%` }} /></span>
                <small>{t.size} women</small>
              </div>
              <span className="jlb-sc">{t.score}</span>
            </div>
          )))}

        {view === 'women' && (women.length === 0
          ? <p className="jlb-empty">No scores to rank for this week yet.</p>
          : women.map((w, i) => (
            <div key={`${w.first_name}-${i}`} className={`jlb-r${w.me ? ' me' : ''}`}>
              <span className={`jlb-m ${medal(w.rank)}`}>{w.rank}</span>
              <div>
                <b>{w.me ? 'You' : proper(w.first_name)}</b>
                {w.head_name && <small>{proper(w.head_name)}'s team</small>}
              </div>
              <span className="jlb-sc">{w.score}</span>
            </div>
          )))}
      </div>
      <p className="jlb-foot">
        {view === 'teams' ? 'Top 5 teams of 3 or more. Team score is the average for the week.' : 'Top 10 Imarians this week. Ties share the same rank.'}
        {data.status === 'current' ? ' This week is still running, so the order can change.' : ''}
      </p>
    </section>
  )
}

const CSS = `
.jlb{margin-top:0;background:var(--maroon-900,#4C050B);color:#FBF1E6;border-radius:20px;padding:18px 14px 14px}
.jlb-t{font-family:var(--font-display);font-size:17px;letter-spacing:.07em;line-height:1.2;margin:0;font-weight:700}
.jlb-s{font-size:11.5px;color:#E9C9A6;margin:4px 0 0}
.jlb-chips{display:flex;gap:6px;margin:12px 0 10px;overflow-x:auto;padding-bottom:2px}
.jlb-chip{font-size:12px;padding:6px 12px;border-radius:999px;border:1px solid #7a2a2f;background:transparent;color:#E9C9A6;white-space:nowrap;cursor:pointer}
.jlb-chip.on{background:var(--gold,#DD8E0D);border-color:var(--gold,#DD8E0D);color:#2b0306;font-weight:700}
.jlb-chip.dash{border-style:dashed}
.jlb-seg{display:flex;background:#390308;border-radius:12px;padding:3px;margin-bottom:10px}
.jlb-seg button{flex:1;border:0;background:transparent;font-size:13px;padding:9px 0;border-radius:9px;color:#E9C9A6;cursor:pointer}
.jlb-seg button.a{background:#FBF1E6;color:var(--maroon-900,#4C050B);font-weight:700}
.jlb-body{background:#FBF1E6;border-radius:12px;padding:4px 10px;color:#2b0306}
.jlb-r{display:grid;grid-template-columns:30px minmax(0,1fr) 40px;gap:8px;align-items:center;padding:9px 0;border-bottom:1px solid #F0DCC6}
.jlb-r:last-child{border-bottom:0}
.jlb-r b{font-size:14px;font-weight:600}
.jlb-r small{display:block;font-size:11px;color:#8a5a4a}
.jlb-m{width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;border:1px solid #BE512A;color:#BE512A}
.jlb-m.g{background:#DD8E0D;border-color:#DD8E0D;color:#2b0306}
.jlb-m.c{background:#BE512A;border-color:#BE512A;color:#FBF1E6}
.jlb-m.w{background:#4C050B;border-color:#4C050B;color:#FBF1E6}
.jlb-bar{display:block;height:5px;border-radius:9px;background:#F0DCC6;margin:5px 0 3px;overflow:hidden}
.jlb-bar i{display:block;height:100%;background:linear-gradient(90deg,#BE512A,#DD8E0D)}
.jlb-sc{font-size:15px;font-weight:700;text-align:right;color:var(--maroon-900,#4C050B)}
.jlb-r.me{background:#FCE3CF;border:1.5px solid #BE512A;border-radius:10px;padding:9px 8px;margin:4px 0}
.jlb-tag{font-size:10px;padding:1px 7px;border-radius:8px;background:#DD8E0D;color:#2b0306;margin-left:6px;font-weight:700;vertical-align:1px}
.jlb-empty{font-size:12.5px;color:#8a5a4a;padding:14px 0;text-align:center;margin:0}
.jlb-foot{font-size:11px;color:#E9C9A6;text-align:center;margin:10px 0 0;line-height:1.5}
`
