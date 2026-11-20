import { useEffect, useState } from 'react'
import { rpc } from '../lib/supabase'

/** Is "Your story" open for her? True only for a paid woman who has not finished it yet. */
export function useSurveyOpen(womanId) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!womanId) return undefined
    let off = false
    rpc('imara_survey_state', { p_woman_id: womanId })
      .then((v) => { if (!off) setOpen(Boolean(v?.eligible && !v?.done)) })
      .catch(() => {})
    return () => { off = true }
  }, [womanId])
  return open
}

/**
 * Home tile: "your story". It sits in the tile grid, in colour so it stands out from the
 * plain tiles. There is no "Not now": it stays until she has finished the survey.
 */
export default function SurveyTile({ onOpen }) {
  return (
    <button type="button" className="home-tile" onClick={onOpen}
      style={{ background: 'var(--maroon-900, #4C050B)', border: '1px solid var(--maroon-900, #4C050B)', position: 'relative' }}>
      <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span className="home-ic" style={{ background: '#DD8E0D', color: '#4C050B' }}>💚</span>
        <span style={{ background: '#DD8E0D', color: '#4C050B', fontSize: 11, fontWeight: 700, padding: '4px 9px', borderRadius: 99 }}>+20 pts</span>
      </span>
      <span>
        <b style={{ color: '#FBEFE6' }}>your story</b>
        <small style={{ color: '#E9C9CC' }}>What has IMARA changed? 4 minutes</small>
      </span>
    </button>
  )
}
