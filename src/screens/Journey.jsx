import { useEffect, useState } from 'react'
import { rpc } from '../lib/supabase'
import { CSS } from './Home'
import { WeekBars, scoreColor } from '../components/WeekBars'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const fmt = (iso) => `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`

const ICONS = { reading: '📚', class: '🎓', quiz: '📝', mastermind: '🤝', investment: '💰' }

/**
 * "My week": her score for a week of the IMARA Journey, the five activities
 * behind it, and all six weeks side by side.
 */
export default function Journey({ womanId, onError, onSwitchApp }) {
  const [data, setData] = useState(null)
  const [pick, setPick] = useState(null)

  useEffect(() => {
    let off = false
    rpc('imara_journey_score', { p_woman_id: womanId })
      .then((d) => { if (!off) { setData(d); setPick(d.current_week || 1) } })
      .catch((e) => onError?.(e.message))
    return () => { off = true }
  }, [womanId]) // eslint-disable-line react-hooks/exhaustive-deps

  const w = data?.weeks?.find((x) => x.week === pick)

  return (
    <div className="shell fade-in home">
      <style>{CSS}</style>
      <div className="home-hero">
        <div className="home-eyebrow">✦ IMARA Journey</div>
        <h1>my week</h1>
        <p>{w ? `Week ${w.week} · ${fmt(w.start)} – ${fmt(w.end)}` : 'One moment…'}</p>
      </div>

      <div className="home-body">
        {!data ? null : (
          <>
            <div className="home-card">
              <div className="home-lbl">{w?.status === 'current' ? 'This week so far' : `Week ${pick}`}</div>
              <div className="home-amt">{w?.score != null ? `${w.score}%` : '—'}</div>
              <div className="home-bar"><i style={{ width: `${w?.score || 0}%`, background: scoreColor(w?.score) }} /></div>
              <div className="home-sub">{data.average != null ? `6-week average so far: ${data.average}%` : ''}</div>
            </div>

            {w?.items?.length > 0 && (
              <div className="home-card">
                {w.items.map((it, i) => (
                  <div key={it.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '11px 0', borderTop: i ? '1px solid var(--line)' : 0, opacity: it.applicable ? 1 : 0.5 }}>
                    <span style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 0 }}>
                      <span className="home-ic">{ICONS[it.key]}</span>
                      <span style={{ minWidth: 0 }}>
                        <b style={{ fontSize: 13.5, display: 'block' }}>{it.label}</b>
                        <small style={{ color: 'var(--text-soft)', fontSize: 11.5 }}>{it.detail}</small>
                      </span>
                    </span>
                    <span style={{ textAlign: 'right', flex: 'none' }}>
                      <b style={{ fontSize: 13.5 }}>{it.applicable ? `${Math.round(it.points)}/${it.max}` : '–'}</b>
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="home-card">
              <div className="home-lbl">Your 6 weeks</div>
              <WeekBars weeks={data.weeks} selected={pick} onPick={setPick} />
            </div>

            <p className="home-sub" style={{ lineHeight: 1.7 }}>
              Each activity is worth 20 points. An activity only counts when it applies that week
              (for example, no quiz means no quiz points to lose). Reading 5 days of the 7 is full marks.
            </p>
            <button type="button" className="home-btn soft" onClick={onSwitchApp}>Back to Home</button>
          </>
        )}
      </div>
    </div>
  )
}
